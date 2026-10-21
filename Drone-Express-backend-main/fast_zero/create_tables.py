"""Atalho para aplicar as migrações do Alembic (equivale a `alembic upgrade head`).

Mantido para compatibilidade com o fluxo antigo do README:
    python -m fast_zero.create_tables
"""
from pathlib import Path

from alembic import command
from alembic.config import Config

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def create_all():
    command.upgrade(Config(str(ALEMBIC_INI)), "head")


if __name__ == "__main__":
    create_all()
    print("Migrações aplicadas com sucesso no PostgreSQL.")
