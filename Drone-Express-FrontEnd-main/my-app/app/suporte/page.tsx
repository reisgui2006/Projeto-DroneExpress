"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { suporteApi, type Chamado } from "@/lib/api";

const FORM_VAZIO = { nome: "", email: "", codigo_rastreio: "", assunto: "", mensagem: "" };

function statusClass(status: string) {
  return status === "Respondido" ? "badge badge-entregue" : "badge badge-pendente";
}

const alertaErro = { color: "#991b1b", background: "#fee2e2", borderRadius: "0.5rem",
  padding: "0.75rem", marginTop: "1rem", fontSize: "0.875rem" } as const;
const alertaOk = { color: "#166534", background: "#dcfce7", borderRadius: "0.5rem",
  padding: "0.75rem", marginTop: "1rem", fontSize: "0.875rem" } as const;

export default function SuportePage() {
  const [form, setForm] = useState(FORM_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [emailConsulta, setEmailConsulta] = useState("");
  const [chamados, setChamados] = useState<Chamado[] | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);

  // Permite abrir já com o código: /suporte?codigo=DX123456789BR
  useEffect(() => {
    const codigo = new URLSearchParams(window.location.search).get("codigo");
    if (codigo) setForm(f => ({ ...f, codigo_rastreio: codigo.toUpperCase() }));
  }, []);

  async function buscarChamados(email: string) {
    setConsultando(true);
    setErroConsulta(null);
    try {
      setChamados(await suporteApi.listarCliente(email));
    } catch (err: unknown) {
      setChamados(null);
      setErroConsulta(err instanceof Error ? err.message : "Não foi possível consultar os chamados.");
    } finally {
      setConsultando(false);
    }
  }

  async function abrirChamado(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErroEnvio(null);
    setMensagem(null);
    try {
      const chamado = await suporteApi.abrir({
        nome: form.nome.trim(),
        email: form.email.trim(),
        codigo_rastreio: form.codigo_rastreio.trim().toUpperCase(),
        assunto: form.assunto.trim(),
        mensagem: form.mensagem.trim(),
      });
      setMensagem(`Chamado #${chamado.id_chamado} aberto! Acompanhe a resposta abaixo.`);
      setForm(FORM_VAZIO);
      setEmailConsulta(chamado.email);
      await buscarChamados(chamado.email);
    } catch (err: unknown) {
      setErroEnvio(err instanceof Error ? err.message : "Não foi possível abrir o chamado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen p-4 pt-10" style={{ background: "var(--bg)" }}>
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" style={{ color: "var(--muted)", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
          ← Voltar
        </Link>

        <section className="card animate-fade-up" style={{ marginTop: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.025em" }}>
            💬 Suporte
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0.4rem 0 1.25rem" }}>
            Teve algum problema com sua entrega? Abra um chamado e a empresa responsável responderá por aqui.
          </p>

          <form onSubmit={abrirChamado} style={{ display: "grid", gap: "0.875rem" }}>
            <div>
              <label htmlFor="suporte-nome">Seu nome</label>
              <input id="suporte-nome" className="input" autoComplete="name" required
                value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <label htmlFor="suporte-email">Email para contato</label>
              <input id="suporte-email" className="input" type="email" autoComplete="email" required
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label htmlFor="suporte-codigo">Código de rastreio</label>
              <input id="suporte-codigo" className="input" placeholder="Ex: DX123456789BR" required
                style={{ fontFamily: "var(--font-geist-mono)", textTransform: "uppercase" }}
                value={form.codigo_rastreio} onChange={e => setForm({ ...form, codigo_rastreio: e.target.value })} />
            </div>
            <div>
              <label htmlFor="suporte-assunto">Assunto</label>
              <input id="suporte-assunto" className="input" maxLength={120} required
                placeholder="Ex: Entrega atrasada"
                value={form.assunto} onChange={e => setForm({ ...form, assunto: e.target.value })} />
            </div>
            <div>
              <label htmlFor="suporte-mensagem">Mensagem</label>
              <textarea id="suporte-mensagem" className="input" rows={4} maxLength={2000} required
                placeholder="Descreva o problema"
                value={form.mensagem} onChange={e => setForm({ ...form, mensagem: e.target.value })} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={enviando}>
              {enviando ? "Enviando…" : "Abrir chamado"}
            </button>
          </form>

          {erroEnvio && <p role="alert" style={alertaErro}>{erroEnvio}</p>}
          {mensagem && <p role="status" style={alertaOk}>{mensagem}</p>}
        </section>

        <section className="card animate-fade-up" style={{ marginTop: "1rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 800, marginBottom: "0.875rem" }}>
            Meus chamados
          </h2>
          <form onSubmit={e => { e.preventDefault(); buscarChamados(emailConsulta); }}
            style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input className="input" type="email" required placeholder="Email usado no chamado"
              aria-label="Email usado no chamado" style={{ flex: "1 1 14rem" }}
              value={emailConsulta} onChange={e => setEmailConsulta(e.target.value)} />
            <button className="btn btn-outline" type="submit" disabled={consultando}>
              {consultando ? "Consultando…" : "Consultar"}
            </button>
          </form>

          {erroConsulta && <p role="alert" style={alertaErro}>{erroConsulta}</p>}

          {chamados && chamados.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "1rem" }}>
              Nenhum chamado encontrado para este email.
            </p>
          )}

          {chamados && chamados.length > 0 && (
            <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
              {chamados.map(c => (
                <article key={c.id_chamado}
                  style={{ border: "1px solid var(--card-border)", borderRadius: "0.625rem",
                    padding: "0.875rem", display: "grid", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem",
                    alignItems: "center", flexWrap: "wrap" }}>
                    <strong>#{c.id_chamado} · {c.assunto}</strong>
                    <span className={statusClass(c.status)}>{c.status}</span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--font-geist-mono)" }}>
                    {c.codigo_rastreio} · aberto em {new Date(c.data_abertura).toLocaleDateString("pt-BR")}
                  </p>
                  <p style={{ fontSize: "0.875rem", whiteSpace: "pre-wrap" }}>{c.mensagem}</p>
                  {c.resposta ? (
                    <div style={{ background: "var(--accent-light)", borderRadius: "0.5rem", padding: "0.625rem 0.75rem" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)" }}>Resposta da empresa</p>
                      <p style={{ fontSize: "0.875rem", whiteSpace: "pre-wrap" }}>{c.resposta}</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Aguardando resposta da empresa.</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
