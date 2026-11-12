from datetime import datetime

import pytest

from fast_zero import models

CODIGO = "DX123456789BR"


@pytest.fixture
def entrega(test_db):
    with test_db() as db:
        empresa = models.Empresa(
            nome_empresa="Drone Express",
            email="empresa@example.com",
            cnpj="12345678000199",
            telefone="11999999999",
            senha="senha",
        )
        db.add(empresa)
        db.flush()
        entrega = models.Entrega(
            codigo_rastreio=CODIGO,
            datahorainicio=datetime.now(),
            status="Entregue",
            id_empresa=empresa.id_empresa,
        )
        db.add(entrega)
        db.commit()
        return empresa.id_empresa, entrega.id_entrega


def _avaliar(client, codigo=CODIGO, **body):
    return client.post(f"/entregas/rastrear/{codigo}/avaliacao", json=body)


def test_avaliar_entrega_e_ver_no_rastreio(client, entrega):
    response = _avaliar(client, codigo=CODIGO.lower(), nota=5, comentario="  Rápido!  ")
    assert response.status_code == 201
    assert response.json()["nota"] == 5
    assert response.json()["comentario"] == "Rápido!"

    rastreio = client.get(f"/entregas/rastrear/{CODIGO}").json()
    assert rastreio["avaliacao"]["nota"] == 5


def test_rastreio_sem_avaliacao_retorna_null(client, entrega):
    assert client.get(f"/entregas/rastrear/{CODIGO}").json()["avaliacao"] is None


def test_comentario_e_opcional(client, entrega):
    response = _avaliar(client, nota=3, comentario="   ")
    assert response.status_code == 201
    assert response.json()["comentario"] is None


@pytest.mark.parametrize("nota", [0, 6])
def test_nota_fora_de_1_a_5(client, entrega, nota):
    assert _avaliar(client, nota=nota).status_code == 422


def test_so_uma_avaliacao_por_entrega(client, entrega):
    assert _avaliar(client, nota=4).status_code == 201
    assert _avaliar(client, nota=1).status_code == 409


def test_nao_avalia_antes_de_entregar(client, test_db, entrega):
    with test_db() as db:
        db.query(models.Entrega).filter_by(codigo_rastreio=CODIGO).first().status = "Em Trânsito"
        db.commit()
    assert _avaliar(client, nota=5).status_code == 400


def test_codigo_inexistente(client, entrega):
    assert _avaliar(client, codigo="XX000000000BR", nota=5).status_code == 404


def test_empresa_ve_avaliacoes_e_media(client, test_db, entrega):
    empresa_id, _ = entrega
    vazio = client.get(f"/empresas/{empresa_id}/avaliacoes/").json()
    assert vazio == {"avaliacoes": [], "total": 0, "media": None}

    with test_db() as db:
        db.add(models.Entrega(codigo_rastreio="DX000000002BR", datahorainicio=datetime.now(),
                              status="Entregue", id_empresa=empresa_id))
        db.commit()
    _avaliar(client, nota=5)
    _avaliar(client, codigo="DX000000002BR", nota=4)

    dados = client.get(f"/empresas/{empresa_id}/avaliacoes/").json()
    assert dados["total"] == 2
    assert dados["media"] == 4.5
    assert {a["codigo_rastreio"] for a in dados["avaliacoes"]} == {CODIGO, "DX000000002BR"}


def test_excluir_entrega_remove_avaliacao(client, entrega):
    empresa_id, entrega_id = entrega
    _avaliar(client, nota=5)
    assert client.delete(f"/entregas/{entrega_id}").status_code == 200
    assert client.get(f"/empresas/{empresa_id}/avaliacoes/").json()["total"] == 0
