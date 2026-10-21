"""Copia os dados de um banco SQLite antigo (fast_zero.db) para o PostgreSQL.

Uso (na raiz do backend, com DATABASE_URL apontando para o Postgres de destino
e as migrações já aplicadas com `alembic upgrade head`):

    python -m scripts.migrate_sqlite_to_postgres --sqlite fast_zero.db

Opções:
    --dry-run        faz tudo e desfaz no final (nada é gravado)
    --drop-orphans   descarta registros órfãos em vez de abortar
    --truncate       esvazia as tabelas de destino antes de copiar

O que o script faz:
  1. Confere se o destino tem as tabelas (alembic upgrade head) e está vazio.
  2. Lê o SQLite e procura registros órfãos. O SQLite não aplica chaves
     estrangeiras por padrão, então o arquivo pode conter, por exemplo, um
     produto apontando para uma entrega que não existe mais. O PostgreSQL
     recusaria esses registros.
  3. Converte datas antigas (sem fuso) para UTC. O sistema antigo sempre
     gravava horários em UTC, só que sem a informação de fuso.
  4. Copia tudo em UMA transação, na ordem de dependência das tabelas.
  5. Ajusta as sequences (contadores de id) para o próximo INSERT não colidir.
  6. Compara a contagem de linhas origem x destino.
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import create_engine, func, inspect, select, text

from fast_zero import models  # noqa: F401  (registra as tabelas no metadata)
from fast_zero.database import Base, engine as pg_engine


def ler_origem(sqlite_engine, tabelas):
    """Lê todas as linhas do SQLite (tabelas ausentes viram lista vazia)."""
    existentes = set(inspect(sqlite_engine).get_table_names())
    dados: dict[str, list[dict]] = {}
    with sqlite_engine.connect() as conn:
        for t in tabelas:
            if t.name not in existentes:
                dados[t.name] = []
                continue
            dados[t.name] = [dict(r._mapping) for r in conn.execute(select(t))]
    return dados


def normalizar_datas(tabelas, dados):
    """Datas sem fuso (naive) do SQLite são UTC -> viram datetime com tzinfo UTC."""
    for t in tabelas:
        colunas_dt = [c.name for c in t.columns if c.type.python_type is datetime]
        for linha in dados[t.name]:
            for nome in colunas_dt:
                v = linha.get(nome)
                if isinstance(v, datetime) and v.tzinfo is None:
                    linha[nome] = v.replace(tzinfo=timezone.utc)


def encontrar_orfaos(tabelas, dados):
    """Retorna {tabela: [(linha, descricao), ...]} de linhas com FK sem pai."""
    # conjunto de chaves existentes por (tabela, tupla_de_colunas)
    cache: dict[tuple, set] = {}

    def chaves(tabela_nome, colunas):
        k = (tabela_nome, tuple(colunas))
        if k not in cache:
            cache[k] = {
                tuple(l[c] for c in colunas) for l in dados[tabela_nome]
            }
        return cache[k]

    orfaos: dict[str, list] = {}
    for t in tabelas:
        for fk in t.foreign_key_constraints:
            filhos = [e.parent.name for e in fk.elements]
            pais = [e.column.name for e in fk.elements]
            pai_tabela = fk.referred_table.name
            existentes = chaves(pai_tabela, pais)
            for linha in dados[t.name]:
                valor = tuple(linha[c] for c in filhos)
                if any(v is None for v in valor):
                    continue  # FK nula é permitida
                if valor not in existentes:
                    desc = f"{t.name}.{','.join(filhos)}={valor} -> {pai_tabela} inexistente"
                    orfaos.setdefault(t.name, []).append((linha, desc))
    return orfaos


def remover_orfaos(tabelas, dados):
    """Remove órfãos repetidamente (remover um pai pode orfanar filhos)."""
    removidos: list[str] = []
    while True:
        orfaos = encontrar_orfaos(tabelas, dados)
        if not orfaos:
            return removidos
        for nome, itens in orfaos.items():
            ids = {id(linha) for linha, _ in itens}
            dados[nome] = [l for l in dados[nome] if id(l) not in ids]
            removidos.extend(desc for _, desc in itens)


def resetar_sequences(conn, tabelas):
    for t in tabelas:
        pk = list(t.primary_key.columns)
        if len(pk) != 1 or pk[0].type.python_type is not int:
            continue  # tabela associativa (PK composta): sem sequence
        col = pk[0].name
        conn.execute(
            text(
                f"SELECT setval(pg_get_serial_sequence('{t.name}', '{col}'), "
                f"COALESCE((SELECT MAX({col}) FROM {t.name}), 1), "
                f"(SELECT MAX({col}) FROM {t.name}) IS NOT NULL)"
            )
        )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sqlite", default="fast_zero.db", help="caminho do arquivo SQLite de origem")
    ap.add_argument("--dry-run", action="store_true", help="não grava nada (rollback no final)")
    ap.add_argument("--drop-orphans", action="store_true", help="descarta registros órfãos")
    ap.add_argument("--truncate", action="store_true", help="esvazia o destino antes de copiar")
    args = ap.parse_args()

    if pg_engine.dialect.name != "postgresql":
        print(f"ERRO: DATABASE_URL aponta para '{pg_engine.dialect.name}', esperado postgresql.")
        return 1
    origem = Path(args.sqlite)
    if not origem.is_file():
        print(f"ERRO: arquivo SQLite não encontrado: {origem}")
        return 1

    tabelas = list(Base.metadata.sorted_tables)  # ordem de dependência (pais primeiro)
    sqlite_engine = create_engine(f"sqlite:///{origem.resolve()}")

    # 1) destino pronto?
    existentes_pg = set(inspect(pg_engine).get_table_names())
    faltando = [t.name for t in tabelas if t.name not in existentes_pg]
    if faltando:
        print(f"ERRO: tabelas ausentes no PostgreSQL: {', '.join(faltando)}")
        print("Rode antes:  alembic upgrade head")
        return 1

    # 2) leitura + 3) datas
    dados = ler_origem(sqlite_engine, tabelas)
    normalizar_datas(tabelas, dados)
    print("Linhas lidas do SQLite:")
    for t in tabelas:
        print(f"  {t.name:22} {len(dados[t.name]):>6}")

    # 2b) órfãos
    orfaos = encontrar_orfaos(tabelas, dados)
    if orfaos:
        total = sum(len(v) for v in orfaos.values())
        print(f"\nATENÇÃO: {total} registro(s) órfão(s) (violam chave estrangeira):")
        for itens in orfaos.values():
            for _, desc in itens[:10]:
                print(f"  - {desc}")
        if not args.drop_orphans:
            print("\nO PostgreSQL não aceita esses registros. Corrija a origem ou use --drop-orphans.")
            return 1
        removidos = remover_orfaos(tabelas, dados)
        print(f"--drop-orphans: {len(removidos)} registro(s) descartado(s) (incluindo dependentes).")

    # 4) cópia em uma transação
    with pg_engine.connect() as conn:
        trans = conn.begin()
        try:
            if args.truncate:
                nomes = ", ".join(t.name for t in tabelas)
                conn.execute(text(f"TRUNCATE {nomes} RESTART IDENTITY CASCADE"))
            else:
                nao_vazias = [
                    t.name for t in tabelas
                    if conn.execute(select(func.count()).select_from(t)).scalar_one() > 0
                ]
                if nao_vazias:
                    print(f"\nERRO: destino não está vazio ({', '.join(nao_vazias)}). Use --truncate para esvaziar.")
                    trans.rollback()
                    return 1

            for t in tabelas:
                if dados[t.name]:
                    conn.execute(t.insert(), dados[t.name])

            # 5) sequences
            resetar_sequences(conn, tabelas)

            # 6) conferência
            print("\nConferência (origem x destino):")
            ok = True
            for t in tabelas:
                n_dst = conn.execute(select(func.count()).select_from(t)).scalar_one()
                n_src = len(dados[t.name])
                marca = "OK" if n_src == n_dst else "DIVERGE"
                ok &= n_src == n_dst
                print(f"  {t.name:22} {n_src:>6} {n_dst:>6}  {marca}")
            if not ok:
                print("\nERRO: contagens divergem; nada foi gravado.")
                trans.rollback()
                return 1

            if args.dry_run:
                trans.rollback()
                print("\n--dry-run: tudo certo, nada foi gravado.")
            else:
                trans.commit()
                print("\nMigração concluída com sucesso.")
        except Exception:
            trans.rollback()
            raise
    return 0


if __name__ == "__main__":
    sys.exit(main())
