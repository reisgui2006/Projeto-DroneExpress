"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { devolucoesApi, type DevolucoesCliente } from "@/lib/api";

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "aprovada") return "badge badge-entregue";
  if (normalized === "recusada") return "badge badge-cancelado";
  return "badge badge-pendente";
}

export default function DevolucoesPage() {
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [data, setData] = useState<DevolucoesCliente | null>(null);
  const [entregaId, setEntregaId] = useState("");
  const [produtosSelecionados, setProdutosSelecionados] = useState<number[]>([]);
  const [codigoSelecionado, setCodigoSelecionado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    setCodigoSelecionado(new URLSearchParams(window.location.search).get("codigo")?.toUpperCase() ?? "");
  }, []);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    setMensagem(null);
    setConfirmando(false);
    try {
      const resultado = await devolucoesApi.listarCliente(email.trim(), telefone.trim());
      setData(resultado);
      const entregaPreselecionada = resultado.entregas_elegiveis.find(
        entrega => entrega.codigo_rastreio.toUpperCase() === codigoSelecionado,
      );
      const entregaInicial = entregaPreselecionada ?? resultado.entregas_elegiveis[0];
      setEntregaId(entregaInicial?.id_entrega.toString() ?? "");
      setProdutosSelecionados(entregaInicial?.produtos.map(produto => produto.id_produto) ?? []);
    } catch (err: unknown) {
      setData(null);
      setEntregaId("");
      setProdutosSelecionados([]);
      setErro(err instanceof Error ? err.message : "Não foi possível consultar as devoluções.");
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarSolicitacao() {
    const entregaSolicitante = data?.entregas_elegiveis.find(
      entrega => entrega.id_entrega === Number(entregaId),
    );
    if (!entregaSolicitante) {
      setErro("Selecione uma entrega concluída válida.");
      return;
    }
    if (produtosSelecionados.length === 0) {
      setErro("Selecione ao menos um produto para continuar.");
      return;
    }
    setSalvando(true);
    setErro(null);
    setMensagem(null);
    try {
      await devolucoesApi.solicitar({
        id_consumidor: entregaSolicitante.id_consumidor,
        id_entrega: entregaSolicitante.id_entrega,
        produto_ids: produtosSelecionados,
        motivo: motivo.trim(),
      });
      const resultado = await devolucoesApi.listarCliente(email.trim(), telefone.trim());
      setData(resultado);
      setEntregaId(
        resultado.entregas_elegiveis[0]?.id_entrega.toString()
        ?? "",
      );
      setProdutosSelecionados([]);
      setMotivo("");
      setConfirmando(false);
      setMensagem("Solicitação registrada. Você pode acompanhar o status abaixo.");
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Não foi possível solicitar a devolução.");
    } finally {
      setSalvando(false);
    }
  }

  const entregaSelecionada = data?.entregas_elegiveis.find(
    entrega => entrega.id_entrega.toString() === entregaId,
  );
  const produtosEscolhidos = entregaSelecionada?.produtos.filter(
    produto => produtosSelecionados.includes(produto.id_produto),
  ) ?? [];

  return (
    <main className="min-h-screen p-4 pt-10" style={{ background: "var(--bg)" }}>
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" style={{ color: "var(--muted)", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
          ← Voltar
        </Link>

        <section className="card animate-fade-up" style={{ marginTop: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.025em" }}>
            ↩️ Solicitar devolução
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0.4rem 0 1.25rem" }}>
            Informe o email e telefone cadastrados para localizar suas entregas concluídas e solicitações.
          </p>

          <form onSubmit={consultar} style={{ display: "grid", gap: "0.875rem" }}>
            <div>
              <label htmlFor="devolucao-email">Email cadastrado</label>
              <input id="devolucao-email" className="input" type="email" autoComplete="email"
                value={email} onChange={e => {
                  setEmail(e.target.value);
                  setData(null);
                  setProdutosSelecionados([]);
                }}
                required />
            </div>
            <div>
              <label htmlFor="devolucao-telefone">Telefone cadastrado</label>
              <input id="devolucao-telefone" className="input" type="tel" autoComplete="tel"
                value={telefone} onChange={e => {
                  setTelefone(e.target.value);
                  setData(null);
                  setProdutosSelecionados([]);
                }}
                required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={carregando}>
              {carregando ? "Consultando…" : "Consultar minhas devoluções"}
            </button>
          </form>

          {erro && (
            <p role="alert" style={{ color: "#991b1b", background: "#fee2e2", borderRadius: "0.5rem",
              padding: "0.75rem", marginTop: "1rem", fontSize: "0.875rem" }}>{erro}</p>
          )}
          {mensagem && (
            <p role="status" style={{ color: "#166534", background: "#dcfce7", borderRadius: "0.5rem",
              padding: "0.75rem", marginTop: "1rem", fontSize: "0.875rem" }}>{mensagem}</p>
          )}
        </section>

        {data && (
          <>
            <section className="card animate-fade-up" style={{ marginTop: "1rem" }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 800, marginBottom: "0.875rem" }}>
                Solicitar devolução
              </h2>
              {data.entregas_elegiveis.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                  Não há entregas concluídas disponíveis para devolução no momento.
                </p>
              ) : (
                <form onSubmit={e => { e.preventDefault(); setErro(null); setConfirmando(true); }}
                  style={{ display: "grid", gap: "0.875rem" }}>
                  <div>
                    <label htmlFor="entrega-devolucao">Entrega concluída</label>
                    <select id="entrega-devolucao" className="input" value={entregaId}
                      onChange={e => {
                        const novaEntregaId = e.target.value;
                        const novaEntrega = data.entregas_elegiveis.find(
                          entrega => entrega.id_entrega.toString() === novaEntregaId,
                        );
                        setEntregaId(novaEntregaId);
                        setProdutosSelecionados(
                          novaEntrega?.produtos.map(produto => produto.id_produto) ?? [],
                        );
                        setErro(null);
                      }} required>
                      {data.entregas_elegiveis.map(entrega => (
                        <option key={entrega.id_entrega} value={entrega.id_entrega}>
                          {entrega.codigo_rastreio} — {entrega.status}
                        </option>
                      ))}
                    </select>
                  </div>
                  {entregaSelecionada && (
                    <fieldset style={{ border: "1px solid var(--card-border)", borderRadius: "0.625rem",
                      padding: "0.875rem", display: "grid", gap: "0.625rem" }}>
                      <legend style={{ fontWeight: 700, padding: "0 0.25rem" }}>
                        Produtos para devolver
                      </legend>
                      {entregaSelecionada.produtos.map(produto => (
                        <label key={produto.id_produto} style={{ display: "flex", alignItems: "flex-start",
                          gap: "0.625rem", cursor: "pointer", fontWeight: 400 }}>
                          <input type="checkbox" value={produto.id_produto}
                            checked={produtosSelecionados.includes(produto.id_produto)}
                            onChange={e => setProdutosSelecionados(atual =>
                              e.target.checked
                                ? [...atual, produto.id_produto]
                                : atual.filter(id => id !== produto.id_produto),
                            )} />
                          <span>
                            <strong>{produto.nome_produto}</strong>
                            <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem" }}>
                              {produto.categoria} · {produto.peso} kg
                            </span>
                          </span>
                        </label>
                      ))}
                      <p style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                        Os produtos desta entrega vêm selecionados. Desmarque os que não deseja devolver.
                      </p>
                    </fieldset>
                  )}
                  <div>
                    <label htmlFor="motivo-devolucao">Motivo</label>
                    <textarea id="motivo-devolucao" className="input" rows={4} minLength={5}
                      maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)}
                      placeholder="Explique o motivo da devolução" required />
                  </div>
                  <button className="btn btn-primary" type="submit"
                    disabled={!entregaId || produtosSelecionados.length === 0}>
                    Continuar
                  </button>
                  {confirmando && entregaSelecionada && (
                    <div role="group" aria-label="Confirmar solicitação"
                      style={{ background: "var(--accent-light)", border: "1px solid var(--accent)",
                        borderRadius: "0.625rem", padding: "0.875rem", display: "grid", gap: "0.75rem" }}>
                      <p style={{ fontSize: "0.875rem" }}>
                        Confirmar a devolução da entrega <strong>{entregaSelecionada.codigo_rastreio}</strong>
                        {" "}e dos produtos selecionados:{" "}
                        <strong>{produtosEscolhidos.map(produto => produto.nome_produto).join(", ")}</strong>.
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button type="button" className="btn btn-outline" onClick={() => setConfirmando(false)}>
                          Voltar
                        </button>
                        <button type="button" className="btn btn-primary" disabled={salvando}
                          onClick={confirmarSolicitacao}>
                          {salvando ? "Enviando…" : "Confirmar solicitação"}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </section>

            <section className="card animate-fade-up" style={{ marginTop: "1rem" }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 800, marginBottom: "0.875rem" }}>
                Minhas Devoluções
              </h2>
              {data.devolucoes.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                  Você ainda não tem solicitações de devolução.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {data.devolucoes.map(devolucao => (
                    <article key={devolucao.id_devolucao}
                      style={{ border: "1px solid var(--card-border)", borderRadius: "0.625rem",
                        padding: "0.875rem", display: "grid", gap: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem",
                        alignItems: "center", flexWrap: "wrap" }}>
                        <strong style={{ fontFamily: "var(--font-geist-mono)" }}>{devolucao.codigo_rastreio}</strong>
                        <span className={statusClass(devolucao.status)}>{devolucao.status}</span>
                      </div>
                      <p style={{ fontSize: "0.875rem" }}>{devolucao.motivo}</p>
                      <p style={{ fontSize: "0.875rem" }}>
                        <strong>Produtos:</strong>{" "}
                        {devolucao.produtos.map(produto => produto.nome_produto).join(", ")}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        Solicitada em {new Date(devolucao.data_solicitacao).toLocaleDateString("pt-BR")}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
