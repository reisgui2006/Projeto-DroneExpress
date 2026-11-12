"use client";

import { useState } from "react";
import Link from "next/link";
import { entregasApi, avaliacoesApi, type RastreioPublic } from "@/lib/api";

function Estrelas({ nota }: { nota: number }) {
  return (
    <span aria-label={`${nota} de 5 estrelas`} style={{ color: "var(--accent)", fontSize: "1.25rem", letterSpacing: "0.1em" }}>
      {"★".repeat(nota)}<span style={{ color: "var(--card-border)" }}>{"★".repeat(5 - nota)}</span>
    </span>
  );
}

function AvaliarEntrega({ resultado, onAvaliado }: {
  resultado: RastreioPublic; onAvaliado: (r: RastreioPublic) => void;
}) {
  const [nota, setNota]             = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando]     = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  if (resultado.avaliacao) {
    return (
      <div style={{ marginTop: "1.25rem", background: "var(--bg)", borderRadius: "0.625rem", padding: "0.75rem 1rem" }}>
        <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
          Sua avaliação
        </p>
        <Estrelas nota={resultado.avaliacao.nota} />
        {resultado.avaliacao.comentario && (
          <p style={{ fontSize: "0.875rem", marginTop: "0.25rem", whiteSpace: "pre-wrap" }}>{resultado.avaliacao.comentario}</p>
        )}
      </div>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (nota < 1) { setErro("Escolha uma nota de 1 a 5 estrelas."); return; }
    setEnviando(true);
    setErro(null);
    try {
      const avaliacao = await avaliacoesApi.avaliar(resultado.codigo_rastreio, nota, comentario.trim());
      onAvaliado({ ...resultado, avaliacao });
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar a avaliação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} style={{ marginTop: "1.25rem", background: "var(--bg)", borderRadius: "0.625rem",
      padding: "0.875rem 1rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      <p style={{ fontWeight: 700, fontSize: "0.9375rem" }}>⭐ Avalie esta entrega</p>
      <div role="radiogroup" aria-label="Nota" style={{ display: "flex", gap: "0.25rem" }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onClick={() => { setNota(n); setErro(null); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0.125rem",
              fontSize: "1.75rem", lineHeight: 1, color: n <= nota ? "var(--accent)" : "var(--card-border)" }}>
            ★
          </button>
        ))}
      </div>
      <textarea className="input" rows={2} maxLength={500} placeholder="Comentário (opcional)"
        aria-label="Comentário" value={comentario} onChange={e => setComentario(e.target.value)} />
      {erro && <p role="alert" style={{ color: "#991b1b", fontSize: "0.8125rem" }}>⚠️ {erro}</p>}
      <button className="btn btn-primary" type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar avaliação"}
      </button>
    </form>
  );
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("transito") || s.includes("trânsito")) return "badge badge-transito";
  if (s.includes("entregue") || s.includes("conclu"))   return "badge badge-entregue";
  if (s.includes("cancel"))                              return "badge badge-cancelado";
  return "badge badge-pendente";
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function statusStep(status: string): number {
  const s = status.toLowerCase();
  if (s.includes("cancel"))                              return -1;
  if (s.includes("pendente"))                            return 0;
  if (s.includes("transito") || s.includes("trânsito")) return 1;
  if (s.includes("entregue") || s.includes("conclu"))   return 2;
  return 0;
}

const TIMELINE = [
  { label: "Pedido Registrado", icon: "📋" },
  { label: "Em Trânsito",       icon: "🚁" },
  { label: "Entregue",          icon: "✅" },
];

export default function RastrearPage() {
  const [codigo, setCodigo]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [resultado, setResultado] = useState<RastreioPublic | null>(null);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    const cod = codigo.trim().toUpperCase();
    if (!cod) return;
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const data = await entregasApi.rastrear(cod);
      setResultado(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao consultar.");
    } finally {
      setLoading(false);
    }
  }

  const step = resultado ? statusStep(resultado.status) : -2;
  const cancelado = step === -1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 pt-12"
      style={{ background: "var(--bg)" }}>

      <div className="w-full max-w-md mb-6 animate-fade-up">
        <Link href="/" style={{ color: "var(--muted)", fontSize: "0.875rem", fontWeight: 600,
          display: "inline-flex", alignItems: "center", gap: "0.25rem", textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>

      <div className="card w-full max-w-md animate-fade-up animate-fade-up-delay-1">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.025em", marginBottom: "0.25rem" }}>
          📦 Rastrear Pedido
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          Digite o código de rastreio (ex: <span style={{ fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "var(--accent)" }}>AA123456789BR</span>)
        </p>

        <form onSubmit={handleBuscar} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label htmlFor="codigo">Código de Rastreio</label>
            <input
              id="codigo"
              className="input"
              type="text"
              placeholder="AA123456789BR"
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              maxLength={13}
              required
              style={{ fontFamily: "var(--font-geist-mono)", fontSize: "1.0625rem", letterSpacing: "0.08em", textTransform: "uppercase" }}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Buscando…" : "Rastrear"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#fee2e2",
            color: "#991b1b", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {resultado && (
        <div className="card w-full max-w-md animate-fade-up" style={{ marginTop: "1.25rem" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
            <div>
              <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Código de Rastreio
              </p>
              <p style={{ fontFamily: "var(--font-geist-mono)", fontWeight: 800,
                fontSize: "1.0625rem", letterSpacing: "0.06em", marginTop: "0.125rem" }}>
                {resultado.codigo_rastreio}
              </p>
            </div>
            <span className={statusClass(resultado.status)}>{resultado.status}</span>
          </div>

          <div style={{ background: "var(--bg)", borderRadius: "0.625rem", padding: "0.75rem 1rem",
            marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🏢</span>
            <div>
              <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.05em" }}>Transportadora</p>
              <p style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{resultado.nome_empresa}</p>
            </div>
          </div>

          {!cancelado && (
            <div style={{ marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.875rem" }}>
                Progresso
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {TIMELINE.map((t, i) => {
                  const done    = i <= step;
                  const current = i === step;
                  const last    = i === TIMELINE.length - 1;
                  return (
                    <div key={t.label} style={{ display: "flex", alignItems: "center", flex: last ? "0 0 auto" : 1 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
                        <div style={{
                          width: "2rem", height: "2rem", borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.875rem",
                          background: done ? "var(--primary)" : "var(--bg)",
                          border: current ? "2.5px solid var(--accent)" : done ? "none" : "2px solid var(--card-border)",
                          transition: "all 0.2s",
                          boxShadow: current ? "0 0 0 4px rgba(212,168,67,0.18)" : "none",
                        }}>
                          {done
                            ? <span style={{ filter: "invert(1)", fontSize: "0.75rem" }}>{t.icon}</span>
                            : <span style={{ fontSize: "0.5rem", color: "var(--muted)" }}>●</span>
                          }
                        </div>
                        <p style={{ fontSize: "0.625rem", fontWeight: 600, color: done ? "var(--fg)" : "var(--muted)",
                          textAlign: "center", whiteSpace: "nowrap", maxWidth: "4.5rem",
                          textOverflow: "ellipsis", overflow: "hidden" }}>
                          {t.label}
                        </p>
                      </div>
                      {!last && (
                        <div style={{
                          flex: 1, height: "2px", margin: "0 0.25rem", marginBottom: "1.25rem",
                          background: i < step ? "var(--primary)" : "var(--card-border)",
                          transition: "background 0.3s",
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {cancelado && (
            <div style={{ background: "#fee2e2", borderRadius: "0.625rem", padding: "0.75rem 1rem",
              marginBottom: "1.25rem", textAlign: "center" }}>
              <p style={{ color: "#991b1b", fontWeight: 700, fontSize: "0.9375rem" }}>❌ Entrega Cancelada</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {[
              { label: "Data de Envio",    value: fmt(resultado.datahorainicio) },
              { label: "Previsão / Conclusão", value: fmt(resultado.datahoraconclusao) },
            ].map(d => (
              <div key={d.label} style={{ background: "var(--bg)", borderRadius: "0.625rem", padding: "0.625rem 0.875rem" }}>
                <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>{d.label}</p>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, marginTop: "0.25rem" }}>{d.value}</p>
              </div>
            ))}
          </div>

          {/* Produtos */}
          {resultado.produtos.length > 0 && (
            <div>
              <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.625rem" }}>
                Itens ({resultado.produtos.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {resultado.produtos.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "var(--bg)", borderRadius: "0.625rem", padding: "0.625rem 0.875rem" }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{p.nome_produto}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{p.categoria}</p>
                    </div>
                    <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--accent)" }}>
                      {p.peso} kg
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resultado.produtos.length === 0 && (
            <p style={{ fontSize: "0.875rem", color: "var(--muted)", textAlign: "center" }}>
              Nenhum item vinculado a esta entrega.
            </p>
          )}

          {step === 2 && (
            <Link href={`/devolucoes?codigo=${encodeURIComponent(resultado.codigo_rastreio)}`}
              className="btn btn-outline w-full"
              style={{ marginTop: "1.25rem" }}>
              ↩️ Solicitar devolução desta entrega
            </Link>
          )}

          {resultado.status.trim().toLowerCase() === "entregue" && (
            <AvaliarEntrega key={resultado.codigo_rastreio} resultado={resultado} onAvaliado={setResultado} />
          )}
        </div>
      )}
    </div>
  );
}