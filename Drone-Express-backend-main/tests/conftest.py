import os

from dotenv import load_dotenv

# Carrega o .env ANTES de qualquer padrão, para sabermos qual é o banco "real"
# de desenvolvimento (se houver) e nunca apagá-lo por engano.
load_dotenv()
_DEV_DATABASE_URL = os.getenv("DATABASE_URL")

# fast_zero.database exige DATABASE_URL já na importação. Os testes usam o
# próprio engine (fixture test_db) e sobrescrevem get_db, então basta um valor
# válido aqui. Variáveis já definidas (ou vindas do .env) têm prioridade.
os.environ.setdefault("DATABASE_URL", os.getenv("TEST_DATABASE_URL") or "sqlite://")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from fast_zero.app import app  # noqa: E402
from fast_zero.database import Base, get_db  # noqa: E402


def pytest_configure(config):
    """Trava de segurança: a fixture test_db executa drop_all() no banco de testes."""
    test_url = os.getenv("TEST_DATABASE_URL")
    if test_url and _DEV_DATABASE_URL and test_url == _DEV_DATABASE_URL:
        raise pytest.UsageError(
            "TEST_DATABASE_URL é igual a DATABASE_URL. Use um banco separado "
            "para os testes (eles apagam todas as tabelas)."
        )


@pytest.fixture
def test_db(tmp_path):
    """Banco de testes.

    Por padrão usa SQLite temporário (rápido, sem dependências).
    Para rodar contra PostgreSQL, defina TEST_DATABASE_URL, por exemplo:
        TEST_DATABASE_URL=postgresql+psycopg://drone:drone@localhost:5432/droneexpress_test
    """
    test_url = os.getenv("TEST_DATABASE_URL")
    if test_url:
        # Sessão deliberadamente em um fuso diferente de UTC: se alguma coluna de
        # data voltar a ser "sem fuso", os testes de data detectam o deslocamento.
        test_engine = create_engine(
            test_url,
            pool_pre_ping=True,
            connect_args={"options": "-c timezone=America/Sao_Paulo"},
        )
        # Garante banco limpo mesmo que um teste anterior tenha sido interrompido
        Base.metadata.drop_all(bind=test_engine)
    else:
        test_engine = create_engine(
            f"sqlite:///{tmp_path / 'test.db'}",
            connect_args={"check_same_thread": False},
        )
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield session_factory
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


@pytest.fixture
def client(test_db):
    def override_get_db():
        with test_db() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    test_client.close()
    app.dependency_overrides.clear()


@pytest.fixture
def dialect(test_db):
    """Nome do banco em uso nos testes: 'sqlite' ou 'postgresql'."""
    return test_db.kw["bind"].dialect.name
