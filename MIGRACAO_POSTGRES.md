# Migração SQLite → PostgreSQL — resumo

## Começando em 4 comandos (dentro de `Drone-Express-backend-main/`)

```bash
pip install -r requirements.txt
psql -U postgres -f banco/criar_banco.sql   # cria usuário e bancos (1 vez; PostgreSQL já instalado)
cp .env.example .env          # Windows: copy .env.example .env
alembic upgrade head          # cria as tabelas
python -m uvicorn fast_zero.app:app --reload --port 8000
```

O frontend **não precisou de alteração** de código.

## O que mudou e por quê

| Arquivo | Mudança | Motivo |
|---|---|---|
| `fast_zero/database.py` | Lê `DATABASE_URL` do ambiente/`.env`; removido `check_same_thread`; `pool_pre_ping`; convenção de nomes de constraints | Conexão configurável sem senha no código; opção exclusiva do SQLite quebraria no Postgres |
| `fast_zero/models.py` | Colunas de data viraram `DateTime(timezone=True)` (`timestamptz`); `datetime.utcnow` → `utcnow()` com fuso; índices nas colunas de chave estrangeira; removidos índices redundantes nas PKs | Ver "Fuso horário" abaixo; o Postgres não indexa FKs sozinho |
| `fast_zero/app.py` | Removida a criação de tabelas do `lifespan`; CORS via `CORS_ORIGINS`; datas do relatório Excel tratadas com fuso (`APP_TIMEZONE`); removido decorator duplicado em `/relatorio` | Schema agora é papel do Alembic; `now - data_do_banco` daria `TypeError` com datas com fuso |
| `fast_zero/create_tables.py` | Agora chama `alembic upgrade head` | Um único caminho para criar o schema |
| `alembic/`, `alembic.ini` | **Novo.** Migração inicial `0001` (testada: upgrade, downgrade, upgrade e `alembic check` sem diferenças) | Versionar mudanças de schema (o `create_all` não altera tabelas existentes) |
| `scripts/migrate_sqlite_to_postgres.py` | **Novo.** Importa o `fast_zero.db` antigo | Preservar dados existentes |
| `banco/criar_banco.sql`, `.env.example` | **Novos** | Criar usuário/bancos e configurar a conexão sem Docker |
| `requirements.txt`, `pyproject.toml` | + `psycopg[binary]`, `alembic`, `python-dotenv`, `openpyxl`, `tzdata` | `openpyxl` já era usado pelo `app.py` mas **não estava listado**; `tzdata` é necessário para fusos no Windows |
| `tests/` | Fixtures movidas para `conftest.py` (SQLite por padrão, Postgres via `TEST_DATABASE_URL`); novo `test_banco.py` (10 testes) | Cobrir o que difere entre os bancos |
| `.gitignore` | + `.env`, `*.db` | Não versionar senhas nem bancos locais |

## Fuso horário (o ponto mais importante)

O frontend envia datas com `Z` (UTC). Em colunas `timestamp` **sem** fuso, o PostgreSQL converte o valor
usando o fuso da *sessão* do banco. Num servidor configurado em `America/Sao_Paulo`, 15:00 UTC era gravado como 12:00
sem nenhum aviso. Com `timestamptz` o instante fica sempre correto, e a API passa a devolver datas com offset (`...Z`),
que o `new Date()` do frontend já interpreta certo.

## Chaves estrangeiras

O SQLite **não** aplica chaves estrangeiras por padrão; o PostgreSQL aplica. Por isso o script de migração procura
registros órfãos no `fast_zero.db` antes de copiar e recusa prosseguir sem `--drop-orphans`.
As exclusões em cascata (empresa, consumidor, entrega, produto) foram testadas contra o Postgres.

## Ainda pendente (fora do escopo desta migração)

- **Senhas em texto puro** na coluna `empresa.senha` (use hash: argon2 ou bcrypt).
- **Não há autenticação real no backend**: o login do frontend baixa a lista de empresas e não valida a senha.
- Revisar `CORS_ORIGINS` com o domínio real antes do deploy.
