"""Testes de comportamento que dependem do banco de dados.

Cobrem os pontos em que PostgreSQL e SQLite se comportam de forma diferente
(fuso horário, chaves estrangeiras, cascatas). Rode com Postgres:

    TEST_DATABASE_URL=postgresql+psycopg://drone:drone@localhost:5432/droneexpress_test pytest
"""
from datetime import datetime, timezone
from io import BytesIO

import pytest
from openpyxl import load_workbook
from sqlalchemy.exc import IntegrityError

from fast_zero import models


# ─── helpers ──────────────────────────────────────────────────────────────────

def _empresa(client, n=1):
    r = client.post("/empresas/", json={
        "nome_empresa": f"Empresa {n}", "email": f"empresa{n}@example.com",
        "cnpj": f"1234567800019{n}", "telefone": "11999999999", "senha": "senha",
    })
    assert r.status_code == 201, r.text
    return r.json()["id_empresa"]


def _consumidor(client, nome="Cliente"):
    r = client.post("/consumidores/", json={"nome": nome, "telefone": "11988888888"})
    assert r.status_code == 201, r.text
    return r.json()["id_consumidor"]


def _produto(client, id_consumidor, id_empresa, nome="Produto"):
    r = client.post("/produtos/", json={
        "nome_produto": nome, "peso": 1.5, "categoria": "Geral",
        "id_consumidor": id_consumidor, "id_empresa": id_empresa,
    })
    assert r.status_code == 201, r.text
    return r.json()["id_produto"]


def _entrega(client, id_empresa, produto_ids=(), inicio="2026-10-18T15:00:00Z",
             conclusao=None, status="Pendente"):
    r = client.post("/entregas/", json={
        "datahorainicio": inicio, "datahoraconclusao": conclusao,
        "status": status, "id_empresa": id_empresa, "produto_ids": list(produto_ids),
    })
    assert r.status_code == 201, r.text
    return r.json()


def _instante(valor: str) -> datetime:
    """Interpreta a data devolvida pela API como instante (sem fuso = UTC)."""
    dt = datetime.fromisoformat(valor.replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _grafo_completo(client):
    """empresa -> 2 produtos -> entrega 'Entregue' -> devolução de 1 produto."""
    emp = _empresa(client)
    cons = _consumidor(client)
    p1 = _produto(client, cons, emp, "P1")
    p2 = _produto(client, cons, emp, "P2")
    ent = _entrega(client, emp, [p1, p2])
    r = client.patch(f"/entregas/{ent['id_entrega']}", json={"status": "Entregue"})
    assert r.status_code == 200, r.text
    r = client.post(f"/consumidores/{cons}/devolucoes/", json={
        "id_entrega": ent["id_entrega"], "produto_ids": [p1], "motivo": "Defeito",
    })
    assert r.status_code == 201, r.text
    return emp, cons, ent["id_entrega"], [p1, p2], r.json()["id_devolucao"]


def _contagens(test_db):
    with test_db() as db:
        return {
            "empresa": db.query(models.Empresa).count(),
            "consumidores": db.query(models.Consumidor).count(),
            "entregas": db.query(models.Entrega).count(),
            "produtos": db.query(models.Produto).count(),
            "devolucoes": db.query(models.Devolucao).count(),
            "assoc": db.execute(models.devolucao_produtos.select()).fetchall().__len__(),
        }


# ─── datas ────────────────────────────────────────────────────────────────────

def test_data_utc_preserva_o_instante(client):
    emp = _empresa(client)
    _entrega(client, emp, inicio="2026-10-18T15:00:00Z", conclusao="2026-10-20T15:00:00Z")
    r = client.get("/entregas/")
    item = r.json()["entregas"][0]
    assert _instante(item["datahorainicio"]) == datetime(2026, 10, 18, 15, 0, tzinfo=timezone.utc)
    assert _instante(item["datahoraconclusao"]) == datetime(2026, 10, 20, 15, 0, tzinfo=timezone.utc)


def test_data_com_offset_preserva_o_instante(client, dialect):
    """12:00-03:00 == 15:00 UTC. Em colunas 'sem fuso' (SQLite) o offset é perdido."""
    if dialect != "postgresql":
        pytest.skip("SQLite descarta o fuso; o comportamento correto é do PostgreSQL (timestamptz)")
    emp = _empresa(client)
    _entrega(client, emp, inicio="2026-10-18T12:00:00-03:00")
    item = client.get("/entregas/").json()["entregas"][0]
    assert _instante(item["datahorainicio"]) == datetime(2026, 10, 18, 15, 0, tzinfo=timezone.utc)


def test_devolucao_data_solicitacao_e_instante_atual(client):
    _, cons, ent, produtos, dev = _grafo_completo(client)
    agora = datetime.now(timezone.utc)
    item = client.get(f"/consumidores/{cons}/devolucoes/").json()["devolucoes"][0]
    delta = abs((agora - _instante(item["data_solicitacao"])).total_seconds())
    assert delta < 60  # se o fuso do banco deslocasse o valor, daria horas de diferença


# ─── relatório Excel ──────────────────────────────────────────────────────────

def test_relatorio_excel_gera_planilha_valida(client):
    emp = _empresa(client)
    cons = _consumidor(client)
    p1 = _produto(client, cons, emp, "P1")
    p2 = _produto(client, cons, emp, "P2")
    _entrega(client, emp, [p1], status="Em Trânsito")                       # sem conclusão
    _entrega(client, emp, [p2], conclusao="2026-10-20T15:00:00Z", status="Entregue")  # com conclusão
    r = client.get(f"/empresas/{emp}/relatorio")
    assert r.status_code == 200, r.text
    assert "spreadsheetml" in r.headers["content-type"]
    wb = load_workbook(BytesIO(r.content))
    assert len(wb.sheetnames) >= 1


# ─── integridade referencial ──────────────────────────────────────────────────

def test_postgres_recusa_chave_estrangeira_inexistente(test_db, dialect):
    if dialect != "postgresql":
        pytest.skip("SQLite não aplica chaves estrangeiras por padrão")
    with test_db() as db:
        db.add(models.Consumidor(nome="C", telefone="1"))
        db.add(models.Empresa(nome_empresa="E", email="e@e.com", cnpj="1", telefone="1", senha="s"))
        db.flush()
        db.add(models.Produto(nome_produto="X", peso=1, categoria="G",
                              id_consumidor=1, id_empresa=1, id_entrega=999))
        with pytest.raises(IntegrityError):
            db.flush()


def test_email_e_cnpj_sao_unicos(client, test_db):
    _empresa(client, 1)
    base = {"nome_empresa": "Outra", "telefone": "1", "senha": "s"}
    r = client.post("/empresas/", json={**base, "email": "empresa1@example.com", "cnpj": "99999999000199"})
    assert r.status_code == 400
    r = client.post("/empresas/", json={**base, "email": "novo@example.com", "cnpj": "12345678000191"})
    assert r.status_code == 400
    # E o próprio banco também barra (garantia final, mesmo sem a checagem da API)
    with test_db() as db:
        db.add(models.Empresa(nome_empresa="Dup", email="empresa1@example.com",
                              cnpj="55555555000155", telefone="1", senha="s"))
        with pytest.raises(IntegrityError):
            db.flush()


# ─── exclusões em cascata (com FKs aplicadas no PostgreSQL) ──────────────────

def test_excluir_empresa_remove_tudo_que_depende_dela(client, test_db):
    emp, cons, ent, produtos, dev = _grafo_completo(client)
    r = client.delete(f"/empresas/{emp}")
    assert r.status_code == 200, r.text
    c = _contagens(test_db)
    assert c["empresa"] == 0
    assert c["entregas"] == 0
    assert c["produtos"] == 0
    assert c["devolucoes"] == 0
    assert c["assoc"] == 0
    assert c["consumidores"] == 1  # o consumidor é independente da empresa


def test_excluir_consumidor_remove_produtos_e_devolucoes(client, test_db):
    emp, cons, ent, produtos, dev = _grafo_completo(client)
    r = client.delete(f"/consumidores/{cons}")
    assert r.status_code == 200, r.text
    c = _contagens(test_db)
    assert c["consumidores"] == 0
    assert c["produtos"] == 0
    assert c["devolucoes"] == 0
    assert c["assoc"] == 0
    assert c["empresa"] == 1 and c["entregas"] == 1  # empresa e entrega permanecem


def test_excluir_entrega_libera_produtos_e_remove_devolucoes(client, test_db):
    emp, cons, ent, produtos, dev = _grafo_completo(client)
    r = client.delete(f"/entregas/{ent}")
    assert r.status_code == 200, r.text
    c = _contagens(test_db)
    assert c["entregas"] == 0
    assert c["devolucoes"] == 0
    assert c["assoc"] == 0
    assert c["produtos"] == 2  # produtos continuam existindo...
    with test_db() as db:
        assert all(p.id_entrega is None for p in db.query(models.Produto).all())  # ...livres


def test_excluir_produto_remove_vinculo_com_devolucao(client, test_db):
    emp, cons, ent, produtos, dev = _grafo_completo(client)
    r = client.delete(f"/produtos/{produtos[0]}")  # produto que está na devolução
    assert r.status_code == 200, r.text
    c = _contagens(test_db)
    assert c["produtos"] == 1
    assert c["assoc"] == 0
    assert c["devolucoes"] == 1  # a devolução em si permanece
