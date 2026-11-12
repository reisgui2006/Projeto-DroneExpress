const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
    throw new Error(err.detail ?? `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}


export interface Consumidor {
  id_consumidor: number;
  nome:     string;
  telefone: string;
  email:    string | null;
}

export interface Empresa {
  id_empresa:   number;
  nome_empresa: string;
  email:        string;
  cnpj:         string;
  telefone:     string;
}

export interface Produto {
  id_produto:    number;
  nome_produto:  string;
  peso:          number;
  categoria:     string;
  id_consumidor: number;
  id_entrega:    number | null;  
  id_empresa:    number;
}

export interface Entrega {
  id_entrega:        number;
  codigo_rastreio:   string;
  datahorainicio:    string;
  datahoraconclusao: string | null;
  status:            string;
  id_empresa:        number;
  nome_empresa:      string;  
}

export interface RastreioPublic {
  codigo_rastreio:   string;
  status:            string;
  nome_empresa:      string;
  datahorainicio:    string;
  datahoraconclusao: string | null;
  produtos: { nome_produto: string; peso: number; categoria: string }[];
  avaliacao: Avaliacao | null;
}

export interface Avaliacao {
  nota:           number;
  comentario:     string | null;
  data_avaliacao: string;
}

export interface AvaliacaoEmpresa extends Avaliacao {
  id_avaliacao:    number;
  codigo_rastreio: string;
}

export interface AvaliacoesEmpresa {
  avaliacoes: AvaliacaoEmpresa[];
  total:      number;
  media:      number | null;
}

export interface Devolucao {
  id_devolucao: number;
  id_entrega: number;
  id_consumidor: number;
  motivo: string;
  status: string;
  data_solicitacao: string;
  codigo_rastreio: string;
  nome_consumidor: string;
  produtos: Pick<Produto, "id_produto" | "nome_produto" | "peso" | "categoria">[];
}

export type EntregaDevolucao = Entrega & { id_consumidor: number; produtos: Produto[] };

export interface DevolucoesCliente {
  entregas_elegiveis: EntregaDevolucao[];
  devolucoes: Devolucao[];
}


export type ConsumidorInput  = { nome: string; telefone: string; email?: string };
export type ConsumidorUpdate = Partial<ConsumidorInput>;

export type EmpresaInput  = { nome_empresa: string; email: string; cnpj: string; telefone: string; senha: string };
export type EmpresaUpdate = Partial<EmpresaInput>;

export type ProdutoInput  = { nome_produto: string; peso: number; categoria: string; id_consumidor: number; id_empresa: number };
export type ProdutoUpdate = Partial<Omit<ProdutoInput, "id_empresa">>;

export type EntregaInput  = { datahorainicio: string; datahoraconclusao?: string | null; status: string; id_empresa: number; produto_ids: number[] };
export type EntregaUpdate = Partial<{ datahorainicio: string; datahoraconclusao: string; status: string }>;


export const consumidoresApi = {
  listar:    ()                               => request<{ consumidores: Consumidor[] }>("/consumidores/").then(r => r.consumidores),
  criar:     (b: ConsumidorInput)             => request<Consumidor>("/consumidores/", { method: "POST",  body: JSON.stringify(b) }),
  atualizar: (id: number, b: ConsumidorInput) => request<Consumidor>(`/consumidores/${id}`, { method: "PUT",   body: JSON.stringify(b) }),
  patch:     (id: number, b: ConsumidorUpdate)=> request<Consumidor>(`/consumidores/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  deletar:   (id: number)                     => request<{ message: string }>(`/consumidores/${id}`, { method: "DELETE" }),
};


export const empresasApi = {
  listar:    ()                              => request<{ empresas: Empresa[] }>("/empresas/").then(r => r.empresas),
  criar:     (b: EmpresaInput)               => request<Empresa>("/empresas/", { method: "POST",  body: JSON.stringify(b) }),
  atualizar: (id: number, b: EmpresaInput)   => request<Empresa>(`/empresas/${id}`, { method: "PUT",   body: JSON.stringify(b) }),
  patch:     (id: number, b: EmpresaUpdate)  => request<Empresa>(`/empresas/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  deletar:   (id: number)                    => request<{ message: string }>(`/empresas/${id}`, { method: "DELETE" }),
  login: async (email: string, _senha: string): Promise<Empresa> => {
    const lista = await empresasApi.listar();
    const empresa = lista.find(e => e.email === email);
    if (!empresa) throw new Error("Empresa não encontrada");
    return empresa;
  },
};


export const produtosApi = {
  listar:    ()                               => request<{ Produtos: Produto[] }>("/produtos/").then(r => r.Produtos),
  livres:    (empresa_id: number)             => request<{ Produtos: Produto[] }>(`/produtos/?empresa_id=${empresa_id}&livres=true`).then(r => r.Produtos),
  criar:     (b: ProdutoInput)                => request<Produto>("/produtos/", { method: "POST",  body: JSON.stringify(b) }),
  atualizar: (id: number, b: ProdutoInput)    => request<Produto>(`/produtos/${id}`, { method: "PUT",   body: JSON.stringify(b) }),
  patch:     (id: number, b: ProdutoUpdate)   => request<Produto>(`/produtos/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  deletar:   (id: number)                     => request<{ message: string }>(`/produtos/${id}`, { method: "DELETE" }),
};


export const entregasApi = {
  listar:           ()                                  => request<{ entregas: Entrega[] }>("/entregas/").then(r => r.entregas),
  criar:            (b: EntregaInput)                   => request<Entrega>("/entregas/", { method: "POST",  body: JSON.stringify(b) }),
  patch:            (id: number, b: EntregaUpdate)      => request<Entrega>(`/entregas/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  deletar:          (id: number)                        => request<{ message: string }>(`/entregas/${id}`, { method: "DELETE" }),
  associarProdutos: (id: number, produto_ids: number[]) => request<Entrega>(`/entregas/${id}/produtos`, { method: "POST", body: JSON.stringify({ produto_ids }) }),
  rastrear:         (codigo: string)                    => request<RastreioPublic>(`/entregas/rastrear/${codigo.toUpperCase()}`),
};


export const devolucoesApi = {
  listarCliente: async (email: string, telefone: string): Promise<DevolucoesCliente> => {
    const normalizarTelefone = (value: string) => value.replace(/\D/g, "");
    const consumidores = await consumidoresApi.listar();
    const correspondentes = consumidores.filter(c =>
      c.email?.trim().toLowerCase() === email.trim().toLowerCase()
      && normalizarTelefone(c.telefone) === normalizarTelefone(telefone),
    );
    if (correspondentes.length === 0) throw new Error("Contato não encontrado.");

    const [entregas, produtos, listasDevolucoes] = await Promise.all([
      entregasApi.listar(),
      produtosApi.listar(),
      Promise.all(correspondentes.map(c =>
        request<{ devolucoes: Omit<Devolucao, "codigo_rastreio" | "nome_consumidor">[] }>(
          `/consumidores/${c.id_consumidor}/devolucoes/`,
        ).then(r => r.devolucoes),
      )),
    ]);
    const consumidorPorId = new Map(correspondentes.map(c => [c.id_consumidor, c.nome]));
    const devolucoes = listasDevolucoes.flat().map(devolucao => ({
      ...devolucao,
      codigo_rastreio: entregas.find(e => e.id_entrega === devolucao.id_entrega)?.codigo_rastreio ?? `#${devolucao.id_entrega}`,
      nome_consumidor: consumidorPorId.get(devolucao.id_consumidor) ?? "Consumidor",
    }));
    const devolucoesAtivas = new Set(
      devolucoes.filter(d => ["Pendente", "Solicitada", "Aprovada"].includes(d.status)).map(d => d.id_entrega),
    );
    const idsConsumidores = new Set(correspondentes.map(c => c.id_consumidor));
    const entregasElegiveis = new Map<number, EntregaDevolucao>();
    for (const produto of produtos) {
      if (!idsConsumidores.has(produto.id_consumidor) || produto.id_entrega === null) continue;
      const entrega = entregas.find(e => e.id_entrega === produto.id_entrega);
      if (!entrega || !/entregue|conclu/i.test(entrega.status) || devolucoesAtivas.has(entrega.id_entrega)) continue;
      const entregaElegivel = entregasElegiveis.get(entrega.id_entrega);
      if (entregaElegivel) {
        entregaElegivel.produtos.push(produto);
      } else {
        entregasElegiveis.set(entrega.id_entrega, {
          ...entrega,
          id_consumidor: produto.id_consumidor,
          produtos: [produto],
        });
      }
    }
    return { entregas_elegiveis: [...entregasElegiveis.values()], devolucoes };
  },
  solicitar: (body: {
    id_consumidor: number;
    id_entrega: number;
    produto_ids: number[];
    motivo: string;
  }) =>
    request<Omit<Devolucao, "codigo_rastreio" | "nome_consumidor">>(
      `/consumidores/${body.id_consumidor}/devolucoes/`,
      {
        method: "POST",
        body: JSON.stringify({
          id_entrega: body.id_entrega,
          produto_ids: body.produto_ids,
          motivo: body.motivo,
        }),
      },
    ),
  listarEmpresa: async (empresaId: number): Promise<Devolucao[]> => {
    const [consumidores, entregas] = await Promise.all([
      consumidoresApi.listar(),
      entregasApi.listar(),
    ]);
    const entregasDaEmpresa = new Map(
      entregas.filter(e => e.id_empresa === empresaId).map(e => [e.id_entrega, e.codigo_rastreio]),
    );
    const listas = await Promise.all(consumidores.map(c =>
      request<{ devolucoes: Omit<Devolucao, "codigo_rastreio" | "nome_consumidor">[] }>(
        `/consumidores/${c.id_consumidor}/devolucoes/`,
      ).then(r => r.devolucoes.map(devolucao => ({
        ...devolucao,
        codigo_rastreio: entregasDaEmpresa.get(devolucao.id_entrega) ?? `#${devolucao.id_entrega}`,
        nome_consumidor: c.nome,
      }))),
    ));
    return listas.flat().filter(d => entregasDaEmpresa.has(d.id_entrega));
  },
  atualizarStatus: (id: number, empresaId: number, status: "Aprovada" | "Recusada") =>
    request<Omit<Devolucao, "codigo_rastreio" | "nome_consumidor">>(
      `/devolucoes/${id}?empresa_id=${empresaId}`,
      {
      method: "PATCH",
      body: JSON.stringify({ status }),
      },
    ),
};

export interface Chamado {
  id_chamado:      number;
  id_entrega:      number;
  codigo_rastreio: string;
  nome:            string;
  email:           string;
  assunto:         string;
  mensagem:        string;
  status:          "Aberto" | "Respondido";
  resposta:        string | null;
  data_abertura:   string;
  data_resposta:   string | null;
}

export type ChamadoInput = { nome: string; email: string; codigo_rastreio: string; assunto: string; mensagem: string };

export const suporteApi = {
  abrir:         (b: ChamadoInput)  => request<Chamado>("/chamados/", { method: "POST", body: JSON.stringify(b) }),
  listarCliente: (email: string)    => request<{ chamados: Chamado[] }>(`/chamados/?email=${encodeURIComponent(email.trim())}`).then(r => r.chamados),
  listarEmpresa: (empresaId: number) => request<{ chamados: Chamado[] }>(`/empresas/${empresaId}/chamados/`).then(r => r.chamados),
  responder:     (id: number, empresaId: number, resposta: string) =>
    request<Chamado>(`/chamados/${id}/responder?empresa_id=${empresaId}`, { method: "PATCH", body: JSON.stringify({ resposta }) }),
};

export const avaliacoesApi = {
  avaliar:       (codigo: string, nota: number, comentario: string) =>
    request<Avaliacao>(`/entregas/rastrear/${encodeURIComponent(codigo.trim().toUpperCase())}/avaliacao`, {
      method: "POST", body: JSON.stringify({ nota, comentario }),
    }),
  listarEmpresa: (empresaId: number) => request<AvaliacoesEmpresa>(`/empresas/${empresaId}/avaliacoes/`),
};
