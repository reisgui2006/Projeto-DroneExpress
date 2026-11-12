from datetime import datetime

import pytest

from fast_zero import models


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
        outra = models.Empresa(
            nome_empresa="Outra",
            email="outra@example.com",
            cnpj="98765432000199",
            telefone="11911111111",
            senha="senha",
        )
        db.add_all([empresa, outra])
        db.flush()
        entrega = models.Entrega(
            codigo_rastreio="DX123456789BR",
            datahorainicio=datetime.now(),
            status="Em Trânsito",
            id_empresa=empresa.id_empresa,
        )
        db.add(entrega)
        db.commit()
        return empresa.id_empresa, outra.id_empresa, entrega.id_entrega


def _abrir(client, **extra):
    body = {
        "nome": "Cliente",
        "email": "Cliente@Example.com",
        "codigo_rastreio": "dx123456789br",
        "assunto": "Atraso",
        "mensagem": "Meu pedido está atrasado",
    }
    body.update(extra)
    return client.post("/chamados/", json=body)


def test_abrir_e_listar_chamado(client, entrega):
    empresa_id, _, entrega_id = entrega
    response = _abrir(client)

    assert response.status_code == 201
    chamado = response.json()
    assert chamado["id_entrega"] == entrega_id
    assert chamado["codigo_rastreio"] == "DX123456789BR"
    assert chamado["email"] == "cliente@example.com"
    assert chamado["status"] == "Aberto"
    assert chamado["resposta"] is None

    # Cliente consulta pelo e-mail (sem diferenciar maiúsculas)
    response = client.get("/chamados/", params={"email": "CLIENTE@example.com"})
    assert response.status_code == 200
    assert [c["id_chamado"] for c in response.json()["chamados"]] == [chamado["id_chamado"]]

    # Empresa dona da entrega vê o chamado
    response = client.get(f"/empresas/{empresa_id}/chamados/")
    assert response.status_code == 200
    assert [c["id_chamado"] for c in response.json()["chamados"]] == [chamado["id_chamado"]]


def test_chamado_com_codigo_inexistente(client, entrega):
    response = _abrir(client, codigo_rastreio="XX000000000BR")
    assert response.status_code == 404


def test_chamado_exige_campos(client, entrega):
    assert _abrir(client, mensagem="   ").status_code == 422
    assert _abrir(client, email="nao-e-email").status_code == 422


def test_empresa_responde_chamado(client, entrega):
    empresa_id, _, _ = entrega
    chamado_id = _abrir(client).json()["id_chamado"]

    response = client.patch(
        f"/chamados/{chamado_id}/responder",
        params={"empresa_id": empresa_id},
        json={"resposta": "Seu pedido chega amanhã."},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Respondido"
    assert response.json()["resposta"] == "Seu pedido chega amanhã."
    assert response.json()["data_resposta"]

    # Não pode responder duas vezes
    response = client.patch(
        f"/chamados/{chamado_id}/responder",
        params={"empresa_id": empresa_id},
        json={"resposta": "De novo"},
    )
    assert response.status_code == 400


def test_outra_empresa_nao_ve_nem_responde(client, entrega):
    _, outra_id, _ = entrega
    chamado_id = _abrir(client).json()["id_chamado"]

    assert client.get(f"/empresas/{outra_id}/chamados/").json()["chamados"] == []
    response = client.patch(
        f"/chamados/{chamado_id}/responder",
        params={"empresa_id": outra_id},
        json={"resposta": "Oi"},
    )
    assert response.status_code == 404


def test_excluir_entrega_remove_chamados(client, entrega):
    empresa_id, _, entrega_id = entrega
    _abrir(client)

    assert client.delete(f"/entregas/{entrega_id}").status_code == 200
    assert client.get(f"/empresas/{empresa_id}/chamados/").json()["chamados"] == []
