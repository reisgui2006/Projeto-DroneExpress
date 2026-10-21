"""Configuração do banco de dados (PostgreSQL).

A URL de conexão vem da variável de ambiente DATABASE_URL (ou de um arquivo
.env na raiz do backend). Exemplo:

    DATABASE_URL=postgresql+psycopg://drone:drone@localhost:5432/droneexpress
"""
import os

from dotenv import load_dotenv
from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL não definida. Copie .env.example para .env e ajuste, "
        "ou exporte a variável. Ex.: "
        "postgresql+psycopg://drone:drone@localhost:5432/droneexpress"
    )

# Aceita as URLs no formato que provedores como Heroku/Railway/Render
# costumam fornecer ("postgres://..." ou "postgresql://...") e força o
# driver psycopg v3, que é o instalado neste projeto.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# pool_pre_ping evita erros após o servidor derrubar conexões ociosas.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Convenção de nomes: garante nomes de constraints/índices previsíveis,
# o que torna as migrações do Alembic estáveis e reversíveis.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

Base = declarative_base(metadata=MetaData(naming_convention=NAMING_CONVENTION))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
