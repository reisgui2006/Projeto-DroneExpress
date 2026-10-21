# 🚁 Drone Express

Sistema completo de gerenciamento e rastreamento de entregas por drone, desenvolvido como projeto acadêmico (AP1 + AP2). Composto por uma API REST em **FastAPI** (Python) e um frontend moderno em **Next.js 16** com **TypeScript**.

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Tecnologias](#-tecnologias)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação e Execução](#-instalação-e-execução)
- [Banco de Dados](#-banco-de-dados)
- [Endpoints da API](#-endpoints-da-api)
- [Páginas do Frontend](#-páginas-do-frontend)
- [Funcionalidades](#-funcionalidades)
- [Equipe](#-equipe)

---

## 🎯 Visão Geral

O Drone Express é uma plataforma que conecta **empresas de logística** e **consumidores**, permitindo:

- Empresas gerenciem seus consumidores, produtos e entregas em um painel dedicado
- Consumidores rastreiem pedidos pelo **código de rastreio** (formato `AA999999999BR`)
- Geração de **relatórios detalhados em planilha Excel** com gráficos e KPIs

### Fluxo de trabalho

```
1. Empresa cadastra Consumidor (destinatário)
        ↓
2. Empresa cadastra Produto (vinculado ao consumidor)
        ↓
3. Empresa cria Entrega e seleciona os produtos a despachar
        ↓
4. Consumidor rastreia pelo código gerado automaticamente
```

---

## 🛠 Tecnologias

### Backend (AP1)
| Tecnologia | Versão | Uso |
|---|---|---|
| Python | 3.12+ | Linguagem principal |
| FastAPI | latest | Framework web / API REST |
| SQLAlchemy | latest | ORM / banco de dados |
| SQLite | — | Banco de dados local |
| Pydantic | v2 | Validação de schemas |
| openpyxl | 3.1+ | Geração de planilhas Excel |
| Uvicorn | latest | Servidor ASGI |

### Frontend (AP2)
| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 16 | Framework React |
| React | 19 | Biblioteca de UI |
| TypeScript | 5+ | Tipagem estática |
| Tailwind CSS | v4 | Estilização |
| Geist | — | Tipografia |

---

## 📁 Estrutura do Projeto

```
drone-express/
│
├── fast_zero/                  # Backend FastAPI
│   ├── __init__.py
│   ├── app.py                  # Rotas e lógica principal
│   ├── models.py               # Modelos SQLAlchemy
│   ├── schemas.py              # Schemas Pydantic
│   └── database.py             # Configuração do banco
│
├── my-app/                     # Frontend Next.js
│   ├── app/
│   │   ├── page.tsx            # Página inicial (Home)
│   │   ├── layout.tsx          # Layout raiz
│   │   ├── globals.css         # Design system / variáveis CSS
│   │   ├── rastrear/
│   │   │   └── page.tsx        # Rastreio público por código
│   │   └── empresa/
│   │       ├── login/
│   │       │   └── page.tsx    # Login da empresa
│   │       ├── cadastro/
│   │       │   └── page.tsx    # Cadastro de nova empresa
│   │       └── dashboard/
│   │           └── page.tsx    # Painel de gestão da empresa
│   └── lib/
│       └── api.ts              # Cliente HTTP e tipos TypeScript
│
├── fast_zero.db                # Banco SQLite (gerado automaticamente)
├── seed.py                     # Script para popular dados de teste
├── reset_db.py                 # Script para resetar o banco
└── requirements.txt            # Dependências Python
```

---

## ✅ Pré-requisitos

- **Python** 3.12 ou superior
- **Node.js** 18 ou superior
- **npm** ou **yarn**
- **pip**

---

## 🚀 Instalação e Execução

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/drone-express.git
cd drone-express
```

### 2. Backend (FastAPI)

```bash
# Instale as dependências Python
pip install -r requirements.txt

# (Opcional) Popule o banco com dados de teste
python seed.py

# Suba o servidor
uvicorn fast_zero.app:app --reload
```

> A API ficará disponível em **http://localhost:8000**
> Documentação interativa: **http://localhost:8000/docs**

### 3. Frontend (Next.js)

```bash
cd my-app

# Instale as dependências
npm install

# Configure a URL da API (opcional — padrão já é localhost:8000)
# Crie um arquivo .env.local na pasta my-app/
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Suba o servidor de desenvolvimento
npm run dev
```

> O frontend ficará disponível em **http://localhost:3000**

### 4. Rodando os dois simultaneamente

Abra dois terminais:

```bash
# Terminal 1 — Backend
uvicorn fast_zero.app:app --reload

# Terminal 2 — Frontend
cd my-app && npm run dev
```

---

## 🗄 Banco de Dados

O projeto usa **SQLite** com arquivo local `fast_zero.db`, criado automaticamente na primeira execução.

### Resetar o banco

Caso precise recriar as tabelas do zero (ex: após mudanças nos models):

```bash
python reset_db.py
```

### Popular com dados de teste

O `seed.py` cria automaticamente 2 empresas, 4 consumidores, 10 produtos e 4 entregas com todos os status para facilitar os testes:

```bash
python seed.py
```

Saída esperada ao rodar o seed:

```
🏢 Criando empresas...
   ✓ DroneLog Sudeste Ltda  (login: contato@dronelog.com.br / senha: senha123)
   ✓ VoaDrone Logística ME  (login: admin@voadrone.com.br / senha: senha456)

👤 Criando consumidores...
   ✓ Ana Beatriz Souza
   ✓ Carlos Eduardo Lima
   ...

🚁 Criando entregas...
   ✓ DX748291035BR  [Entregue]
   ✓ KL192837465BR  [Em Trânsito]
   ...

📦 Criando produtos...
   ✓ Smartphone Samsung Galaxy S24    Eletrônico   0.19kg  [→ entrega #1]
   ✓ Clean Code — Robert C. Martin    Livro        0.55kg  [📦 livre]
   ...
```

---

## 🔌 Endpoints da API

### Raiz
| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/` | Health check |

### Consumidores
| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/consumidores/` | Cadastrar consumidor |
| `GET` | `/consumidores/` | Listar todos |
| `PUT` | `/consumidores/{id}` | Atualizar completamente |
| `PATCH` | `/consumidores/{id}` | Atualizar parcialmente |
| `DELETE` | `/consumidores/{id}` | Remover |

### Empresas
| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/empresas/` | Cadastrar empresa |
| `GET` | `/empresas/` | Listar todas |
| `PUT` | `/empresas/{id}` | Atualizar completamente |
| `PATCH` | `/empresas/{id}` | Atualizar parcialmente |
| `DELETE` | `/empresas/{id}` | Remover |
| `GET` | `/empresas/{id}/relatorio` | Baixar relatório `.xlsx` |

### Produtos
| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/produtos/` | Cadastrar produto |
| `GET` | `/produtos/` | Listar (suporta `?empresa_id=` e `?livres=true`) |
| `PUT` | `/produtos/{id}` | Atualizar completamente |
| `PATCH` | `/produtos/{id}` | Atualizar parcialmente |
| `DELETE` | `/produtos/{id}` | Remover |

### Entregas
| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/entregas/` | Criar entrega (com produtos) |
| `GET` | `/entregas/` | Listar todas |
| `GET` | `/entregas/rastrear/{codigo}` | Rastrear por código público |
| `POST` | `/entregas/{id}/produtos` | Associar produtos livres |
| `PATCH` | `/entregas/{id}` | Atualizar status/datas |
| `DELETE` | `/entregas/{id}` | Remover (libera produtos) |

### Exemplos de uso

```bash
# Criar consumidor
curl -X POST http://localhost:8000/consumidores/ \
  -H "Content-Type: application/json" \
  -d '{"nome": "João Silva", "telefone": "(11) 99999-0000"}'

# Rastrear entrega
curl http://localhost:8000/entregas/rastrear/DX748291035BR

# Listar produtos livres de uma empresa
curl "http://localhost:8000/produtos/?empresa_id=1&livres=true"

# Baixar relatório Excel
curl -O http://localhost:8000/empresas/1/relatorio
```

---

## 🖥 Páginas do Frontend

| Rota | Descrição | Acesso |
|---|---|---|
| `/` | Tela inicial com navegação | Público |
| `/rastrear` | Rastreio de pedido por código | Público |
| `/empresa/login` | Login da empresa | Público |
| `/empresa/cadastro` | Cadastro de nova empresa | Público |
| `/empresa/dashboard` | Painel completo de gestão | Autenticado |

---

## ⚙️ Funcionalidades

### Painel da Empresa
- **Consumidores** — cadastro, edição e exclusão de destinatários (sem login/senha, apenas contato)
- **Produtos** — cadastro com nome, peso, categoria e destinatário; produto nasce "livre" (sem entrega)
- **Entregas** — criação com seleção visual dos produtos livres a despachar; código de rastreio gerado automaticamente no formato `AA999999999BR`; status: Pendente, Em Trânsito, Entregue, Cancelado
- **Relatório** — visualização em tabelas e download de planilha `.xlsx` com 5 abas:
  - **Resumo Executivo** — KPIs, gráfico de pizza (status), gráfico de barras (categorias)
  - **Entregas** — tabela detalhada com gráfico de status
  - **Produtos** — tabela com gráfico de categorias
  - **Consumidores** — tabela com totais por destinatário
  - **Detalhamento** — cada entrega com seus itens e sub-totais

### Rastreio Público
- Busca pelo código (`AA999999999BR`)
- Exibe nome da empresa transportadora
- Timeline visual de progresso (Registrado → Em Trânsito → Entregue)
- Lista de itens da entrega

### Dark Mode
Suporte nativo via `prefers-color-scheme`, sem configuração necessária.

---

## 👥 Equipe

**Grupo FGCMJ** — Disciplina de Desenvolvimento Web  

| Nome | Função |
|---|---|
| Filipe Machado de Souza | Frontend |
| Guilherme Oliveira Reis| Backend + FrontEnd|
| Carlos Eduardo da Costa Viana | Backend |
| Michael Lucas Ramos da Silveira| Frontend |
| Jadson Oliveira Porto | Integração |

---

## 📄 Licença

Este projeto foi desenvolvido para fins acadêmicos todos créditos a equipe.