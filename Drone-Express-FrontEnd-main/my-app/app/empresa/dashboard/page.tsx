"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  entregasApi, produtosApi, consumidoresApi, devolucoesApi, suporteApi, avaliacoesApi,
  type Empresa, type Entrega, type Produto, type Consumidor, type Devolucao, type Chamado,
  type AvaliacoesEmpresa,
  type EntregaInput, type EntregaUpdate,
  type ProdutoInput,
  type ConsumidorInput,
} from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";


function statusClass(s: string) {
  const l = s.toLowerCase();
  if (l.includes("transito") || l.includes("trânsito")) return "badge badge-transito";
  if (l.includes("entregue") || l.includes("conclu"))   return "badge badge-entregue";
  if (l.includes("cancel"))                              return "badge badge-cancelado";
  return "badge badge-pendente";
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function toLocalDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

function dateToISO(dateStr: string): string | null {
  if (!dateStr) return null;
  return new Date(dateStr + "T12:00:00").toISOString();
}

const STATUS_OPTIONS = ["Pendente", "Em Trânsito", "Entregue", "Cancelado"];


function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.48)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card animate-fade-up"
        style={{ width: "100%", maxWidth: "30rem", maxHeight: "90dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer",
            fontSize: "1.25rem", color: "var(--muted)", padding: "0.25rem" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Confirm({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div className="card" style={{ maxWidth: "22rem", width: "100%", textAlign: "center" }}>
        <p style={{ fontWeight: 600, marginBottom: "1.25rem" }}>{msg}</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button className="btn" style={{ background: "#c0392b", color: "#fff", border: "none" }} onClick={onConfirm}>Excluir</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 70,
      padding: "0.75rem 1.25rem", background: type === "success" ? "#166534" : "#991b1b",
      color: "#fff", borderRadius: "0.625rem", fontWeight: 600, fontSize: "0.875rem",
      boxShadow: "0 8px 24px rgba(0,0,0,0.22)", animation: "fadeUp 0.25s ease both" }}>
      {type === "success" ? "✅ " : "⚠️ "}{msg}
    </div>
  );
}

function BtnRow({ onCancel, saving, label }: { onCancel: () => void; saving: boolean; label: string }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
      <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>
      <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
        {saving ? "Salvando…" : label}
      </button>
    </div>
  );
}


function ConsumidorForm({ initial, onSave, onClose }: {
  initial?: Consumidor; onSave: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState({ nome: initial?.nome ?? "", telefone: initial?.telefone ?? "", email: initial?.email ?? "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr(null);
    const body: ConsumidorInput = { nome: form.nome, telefone: form.telefone, email: form.email || undefined };
    try {
      initial ? await consumidoresApi.atualizar(initial.id_consumidor, body) : await consumidoresApi.criar(body);
      onSave();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <label>Nome completo</label>
        <input className="input" type="text" placeholder="João da Silva" required
          value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
      </div>
      <div>
        <label>Telefone</label>
        <input className="input" type="tel" placeholder="(11) 99999-9999" required
          value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} />
      </div>
      <div>
        <label>E-mail de contato <span style={{ color: "var(--muted)", fontWeight: 400 }}>(opcional)</span></label>
        <input className="input" type="email" placeholder="joao@email.com"
          value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
      </div>
      {err && <p style={{ color: "#991b1b", fontSize: "0.875rem" }}>⚠️ {err}</p>}
      <BtnRow onCancel={onClose} saving={saving} label={initial ? "Atualizar" : "Cadastrar"} />
    </form>
  );
}


function ProdutoForm({ empresaId, consumidores, initial, onSave, onClose }: {
  empresaId: number; consumidores: Consumidor[]; initial?: Produto; onSave: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState<ProdutoInput>({
    nome_produto:  initial?.nome_produto  ?? "",
    peso:          initial?.peso          ?? 0,
    categoria:     initial?.categoria     ?? "",
    id_consumidor: initial?.id_consumidor ?? (consumidores[0]?.id_consumidor ?? 0),
    id_empresa:    empresaId,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      initial ? await produtosApi.atualizar(initial.id_produto, form) : await produtosApi.criar(form);
      onSave();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <label>Nome do Produto / Item</label>
        <input className="input" type="text" placeholder="Ex: Tablet Samsung A9" required
          value={form.nome_produto} onChange={e => setForm(p => ({ ...p, nome_produto: e.target.value }))} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label>Peso (kg)</label>
          <input className="input" type="number" step="0.01" min={0.01} required
            value={form.peso} onChange={e => setForm(p => ({ ...p, peso: parseFloat(e.target.value) }))} />
        </div>
        <div>
          <label>Categoria</label>
          <input className="input" type="text" placeholder="Eletrônico" required
            value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} />
        </div>
      </div>
      <div>
        <label>Destinatário (Consumidor)</label>
        {consumidores.length === 0
          ? <p style={{ color: "#991b1b", fontSize: "0.8125rem" }}>Cadastre um consumidor primeiro.</p>
          : <select className="input" value={form.id_consumidor}
              onChange={e => setForm(p => ({ ...p, id_consumidor: parseInt(e.target.value) }))}>
              {consumidores.map(c => (
                <option key={c.id_consumidor} value={c.id_consumidor}>{c.nome} — {c.telefone}</option>
              ))}
            </select>
        }
      </div>
      {err && <p style={{ color: "#991b1b", fontSize: "0.875rem" }}>⚠️ {err}</p>}
      <BtnRow onCancel={onClose} saving={saving} label={initial ? "Atualizar" : "Cadastrar Produto"} />
    </form>
  );
}


function EntregaForm({ empresaId, initial, produtosLivres, consumidores, onSave, onClose }: {
  empresaId: number; initial?: Entrega; produtosLivres: Produto[];
  consumidores: Consumidor[]; onSave: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    datahorainicio:    initial ? toLocalDate(initial.datahorainicio) : new Date().toISOString().slice(0, 10),
    datahoraconclusao: initial?.datahoraconclusao ? toLocalDate(initial.datahoraconclusao) : "",
    status:            initial?.status ?? "Pendente",
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const consNome = (id: number) => consumidores.find(c => c.id_consumidor === id)?.nome ?? `#${id}`;

  function toggleProduto(id: number) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      if (initial) {
        const patch: EntregaUpdate = {
          datahorainicio: dateToISO(form.datahorainicio)!,
          status: form.status,
        };
        if (form.datahoraconclusao) patch.datahoraconclusao = dateToISO(form.datahoraconclusao)!;
        await entregasApi.patch(initial.id_entrega, patch);
        if (selectedIds.length > 0) await entregasApi.associarProdutos(initial.id_entrega, selectedIds);
      } else {
        const body: EntregaInput = {
          datahorainicio: dateToISO(form.datahorainicio)!,
          datahoraconclusao: form.datahoraconclusao ? dateToISO(form.datahoraconclusao) : undefined,
          status: form.status, id_empresa: empresaId, produto_ids: selectedIds,
        };
        await entregasApi.criar(body);
      }
      onSave();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label>Data de Envio</label>
          <input className="input" type="date" required value={form.datahorainicio}
            onChange={e => setForm(p => ({ ...p, datahorainicio: e.target.value }))} />
        </div>
        <div>
          <label>Previsão de Conclusão</label>
          <input className="input" type="date" value={form.datahoraconclusao}
            onChange={e => setForm(p => ({ ...p, datahoraconclusao: e.target.value }))} />
        </div>
      </div>
      <div>
        <label>Status</label>
        <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label>
          {initial ? "Adicionar produtos livres a esta entrega" : "Selecionar produtos para despachar"}
          <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: "0.25rem" }}>(opcional)</span>
        </label>
        {produtosLivres.length === 0
          ? <div style={{ background: "var(--bg)", borderRadius: "0.5rem", padding: "0.75rem 1rem",
              color: "var(--muted)", fontSize: "0.875rem", textAlign: "center" }}>
              Nenhum produto livre disponível.
            </div>
          : <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", maxHeight: "12rem", overflowY: "auto" }}>
              {produtosLivres.map(p => {
                const sel = selectedIds.includes(p.id_produto);
                return (
                  <div key={p.id_produto} onClick={() => toggleProduto(p.id_produto)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "0.625rem 0.875rem", borderRadius: "0.5rem", cursor: "pointer",
                      border: `2px solid ${sel ? "var(--accent)" : "var(--card-border)"}`,
                      background: sel ? "var(--accent-light)" : "var(--bg)", transition: "all 0.15s" }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{p.nome_produto}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {p.categoria} · {p.peso} kg · {consNome(p.id_consumidor)}
                      </p>
                    </div>
                    <div style={{ width: "1.25rem", height: "1.25rem", borderRadius: "50%",
                      background: sel ? "var(--accent)" : "transparent",
                      border: `2px solid ${sel ? "var(--accent)" : "var(--card-border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.625rem", color: "#0d0d0d", fontWeight: 800 }}>
                      {sel && "✓"}
                    </div>
                  </div>
                );
              })}
            </div>
        }
        {selectedIds.length > 0 && (
          <p style={{ fontSize: "0.8125rem", color: "var(--accent)", fontWeight: 700, marginTop: "0.375rem" }}>
            {selectedIds.length} produto{selectedIds.length > 1 ? "s" : ""} selecionado{selectedIds.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
      {err && <p style={{ color: "#991b1b", fontSize: "0.875rem" }}>⚠️ {err}</p>}
      <BtnRow onCancel={onClose} saving={saving} label={initial ? "Atualizar" : "Criar Entrega"} />
    </form>
  );
}


function RelatorioTab({ empresa, entregas, produtos, consumidores }: {
  empresa: Empresa; entregas: Entrega[]; produtos: Produto[]; consumidores: Consumidor[];
}) {
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError]         = useState<string | null>(null);

  const entregues  = entregas.filter(e => e.status.toLowerCase().includes("entregue") || e.status.toLowerCase().includes("conclu"));
  const emTransito = entregas.filter(e => e.status.toLowerCase().includes("transito") || e.status.toLowerCase().includes("trânsito"));
  const pendentes  = entregas.filter(e => e.status.toLowerCase().includes("pendente"));
  const cancelados = entregas.filter(e => e.status.toLowerCase().includes("cancel"));
  const livres     = produtos.filter(p => p.id_entrega === null);
  const consMap    = Object.fromEntries(consumidores.map(c => [c.id_consumidor, c]));

  const statCards = [
    { label: "Total Entregas",  value: entregas.length,    icon: "🚁", color: "var(--fg)"  },
    { label: "Entregues",       value: entregues.length,   icon: "✅", color: "#166534"    },
    { label: "Em Trânsito",     value: emTransito.length,  icon: "📡", color: "#1D4ED8"    },
    { label: "Pendentes",       value: pendentes.length,   icon: "⏳", color: "#92400E"    },
    { label: "Cancelados",      value: cancelados.length,  icon: "❌", color: "#991B1B"    },
    { label: "Total Produtos",  value: produtos.length,    icon: "📦", color: "var(--fg)"  },
    { label: "Produtos Livres", value: livres.length,      icon: "🔓", color: "#92400E"    },
    { label: "Consumidores",    value: consumidores.length,icon: "👤", color: "var(--fg)"  },
  ];

  async function handleDownload() {
    setDownloading(true); setDlError(null);
    try {
      const res  = await fetch(`${BASE_URL}/empresas/${empresa.id_empresa}/relatorio`);
      if (!res.ok) throw new Error("Erro ao gerar relatório");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `relatorio_${empresa.nome_empresa.replace(/\s+/g, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) { setDlError(e instanceof Error ? e.message : "Erro ao baixar"); }
    finally { setDownloading(false); }
  }

  const thStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem", textAlign: "left", fontWeight: 700,
    fontSize: "0.6875rem", color: "var(--muted)", textTransform: "uppercase",
    letterSpacing: "0.05em", borderBottom: "1px solid var(--card-border)", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = { padding: "0.5rem 0.75rem" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      <div className="card" style={{ padding: "1.25rem", background: "var(--primary)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase", letterSpacing: "0.1em" }}>Relatório Completo</p>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#fff",
              letterSpacing: "-0.025em", margin: "0.125rem 0 0.25rem" }}>
              {empresa.nome_empresa}
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.55)" }}>
              CNPJ: {empresa.cnpj} · {empresa.telefone}
            </p>
          </div>
          <button className="btn" onClick={handleDownload} disabled={downloading}
            style={{ background: "var(--accent)", color: "#0d0d0d", fontWeight: 700,
              padding: "0.75rem 1.5rem", fontSize: "0.9375rem",
              boxShadow: "0 4px 16px rgba(212,168,67,0.35)" }}>
            {downloading ? "Gerando…" : "⬇️ Baixar Planilha .xlsx"}
          </button>
        </div>
        {dlError && <p style={{ color: "#fca5a5", fontSize: "0.875rem", marginTop: "0.75rem" }}>⚠️ {dlError}</p>}
      </div>

      {/* Cards KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.625rem" }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: "0.875rem", textAlign: "center" }}>
            <p style={{ fontSize: "1.125rem" }}>{s.icon}</p>
            <p style={{ fontSize: "1.625rem", fontWeight: 900, letterSpacing: "-0.03em",
              lineHeight: 1.1, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: "0.625rem", color: "var(--muted)", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.125rem" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "1.25rem" }}>
        <p style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "1rem" }}>🚁 Entregas</p>
        {entregas.length === 0
          ? <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Nenhuma entrega registrada.</p>
          : <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                <thead><tr style={{ background: "var(--bg)" }}>
                  {["Código Rastreio","Status","Envio","Conclusão","Itens"].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {entregas.map((ent, i) => (
                    <tr key={ent.id_entrega} style={{ background: i % 2 === 1 ? "var(--bg)" : "transparent" }}>
                      <td style={{ ...tdStyle, fontFamily: "var(--font-geist-mono)", fontWeight: 700, fontSize: "0.8125rem" }}>
                        {ent.codigo_rastreio}
                      </td>
                      <td style={tdStyle}><span className={statusClass(ent.status)}>{ent.status}</span></td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{fmt(ent.datahorainicio)}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{fmt(ent.datahoraconclusao)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, textAlign: "center" }}>
                        {produtos.filter(p => p.id_entrega === ent.id_entrega).length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <div className="card" style={{ padding: "1.25rem" }}>
        <p style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "1rem" }}>📦 Produtos</p>
        {produtos.length === 0
          ? <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Nenhum produto cadastrado.</p>
          : <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                <thead><tr style={{ background: "var(--bg)" }}>
                  {["Produto","Categoria","Peso","Destinatário","Telefone","Entrega"].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {produtos.map((p, i) => {
                    const cons = consMap[p.id_consumidor];
                    const cod  = entregas.find(e => e.id_entrega === p.id_entrega)?.codigo_rastreio;
                    return (
                      <tr key={p.id_produto} style={{ background: i % 2 === 1 ? "var(--bg)" : "transparent" }}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{p.nome_produto}</td>
                        <td style={{ ...tdStyle, color: "var(--muted)" }}>{p.categoria}</td>
                        <td style={tdStyle}>{p.peso} kg</td>
                        <td style={tdStyle}>{cons?.nome ?? `#${p.id_consumidor}`}</td>
                        <td style={{ ...tdStyle, color: "var(--muted)" }}>{cons?.telefone ?? "—"}</td>
                        <td style={tdStyle}>
                          {cod
                            ? <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.75rem", fontWeight: 700 }}>{cod}</span>
                            : <span className="badge badge-pendente">Livre</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </div>

      <div className="card" style={{ padding: "1.25rem" }}>
        <p style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "1rem" }}>👤 Consumidores</p>
        {consumidores.length === 0
          ? <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Nenhum consumidor cadastrado.</p>
          : <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                <thead><tr style={{ background: "var(--bg)" }}>
                  {["Nome","Telefone","E-mail Contato","Qtd. Produtos"].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {consumidores.map((c, i) => {
                    const qtd = produtos.filter(p => p.id_consumidor === c.id_consumidor).length;
                    return (
                      <tr key={c.id_consumidor} style={{ background: i % 2 === 1 ? "var(--bg)" : "transparent" }}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{c.nome}</td>
                        <td style={tdStyle}>{c.telefone}</td>
                        <td style={{ ...tdStyle, color: "var(--muted)" }}>{c.email || "—"}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, textAlign: "center" }}>{qtd}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
        A planilha baixada inclui estas tabelas + aba de detalhamento por entrega com todos os itens e destinatários.
      </p>
    </div>
  );
}


type Tab = "consumidores" | "produtos" | "entregas" | "devolucoes" | "suporte" | "avaliacoes" | "relatorio";

const AVALIACOES_VAZIO: AvaliacoesEmpresa = { avaliacoes: [], total: 0, media: null };
type ModalState =
  | { type: "novo-consumidor" }
  | { type: "editar-consumidor"; consumidor: Consumidor }
  | { type: "novo-produto" }
  | { type: "editar-produto";    produto: Produto }
  | { type: "nova-entrega" }
  | { type: "editar-entrega";    entrega: Entrega };

export default function EmpresaDashboardPage() {
  const router = useRouter();
  const [empresa, setEmpresa]               = useState<Empresa | null>(null);
  const [entregas, setEntregas]             = useState<Entrega[]>([]);
  const [produtos, setProdutos]             = useState<Produto[]>([]);
  const [produtosLivres, setProdutosLivres] = useState<Produto[]>([]);
  const [consumidores, setConsumidores]     = useState<Consumidor[]>([]);
  const [devolucoes, setDevolucoes]         = useState<Devolucao[]>([]);
  const [devolucaoEntregaFiltro, setDevolucaoEntregaFiltro] = useState<number | null>(null);
  const [devolucaoEmAtualizacao, setDevolucaoEmAtualizacao] = useState<number | null>(null);
  const [chamados, setChamados]             = useState<Chamado[]>([]);
  const [respostas, setRespostas]           = useState<Record<number, string>>({});
  const [chamadoEmResposta, setChamadoEmResposta] = useState<number | null>(null);
  const [avaliacoes, setAvaliacoes]         = useState<AvaliacoesEmpresa>(AVALIACOES_VAZIO);
  const [loading, setLoading]              = useState(true);
  const [tab, setTab]                       = useState<Tab>("consumidores"); // começa em consumidores
  const [modal, setModal]                   = useState<ModalState | null>(null);
  const [confirm, setConfirm]               = useState<{ msg: string; action: () => void } | null>(null);
  const [toast, setToast]                   = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  const carregar = useCallback(async (emp: Empresa) => {
    setLoading(true);
    try {
      const [todasEntregas, todosProdutos, todosConsumidores, livres] = await Promise.all([
        entregasApi.listar(),
        produtosApi.listar(),
        consumidoresApi.listar(),
        produtosApi.livres(emp.id_empresa),
      ]);
      setEntregas(todasEntregas.filter(e => e.id_empresa === emp.id_empresa));
      setProdutos(todosProdutos.filter(p => p.id_empresa === emp.id_empresa));
      setProdutosLivres(livres);
      setConsumidores(todosConsumidores);
      try {
        setDevolucoes(await devolucoesApi.listarEmpresa(emp.id_empresa));
      } catch (e: unknown) {
        setDevolucoes([]);
        showToast(
          e instanceof Error ? `Dados carregados, mas devoluções indisponíveis: ${e.message}` : "Não foi possível carregar as devoluções.",
          "error",
        );
      }
      try {
        setChamados(await suporteApi.listarEmpresa(emp.id_empresa));
      } catch (e: unknown) {
        setChamados([]);
        showToast(
          e instanceof Error ? `Dados carregados, mas suporte indisponível: ${e.message}` : "Não foi possível carregar os chamados.",
          "error",
        );
      }
      try {
        setAvaliacoes(await avaliacoesApi.listarEmpresa(emp.id_empresa));
      } catch (e: unknown) {
        setAvaliacoes(AVALIACOES_VAZIO);
        showToast(
          e instanceof Error ? `Dados carregados, mas avaliações indisponíveis: ${e.message}` : "Não foi possível carregar as avaliações.",
          "error",
        );
      }
    } catch { showToast("Erro ao carregar dados.", "error"); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("empresa");
    if (!raw) { router.replace("/empresa/login"); return; }
    const emp: Empresa = JSON.parse(raw);
    setEmpresa(emp);
    carregar(emp);
  }, [router, carregar]);

  function afterSave(msg = "Salvo com sucesso!") { setModal(null); showToast(msg); carregar(empresa!); }
  function askDelete(msg: string, action: () => void) { setConfirm({ msg, action }); }
  async function doDelete(fn: () => Promise<unknown>, successMsg: string) {
    setConfirm(null);
    try { await fn(); showToast(successMsg); carregar(empresa!); }
    catch (e: unknown) { showToast(e instanceof Error ? e.message : "Erro.", "error"); }
  }

  async function atualizarDevolucao(devolucao: Devolucao, status: "Aprovada" | "Recusada") {
    setDevolucaoEmAtualizacao(devolucao.id_devolucao);
    try {
      await devolucoesApi.atualizarStatus(devolucao.id_devolucao, empresa!.id_empresa, status);
      showToast(`Solicitação ${status.toLowerCase()}.`);
      await carregar(empresa!);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erro ao atualizar a solicitação.", "error");
    } finally {
      setDevolucaoEmAtualizacao(null);
    }
  }

  async function responderChamado(chamado: Chamado) {
    const resposta = (respostas[chamado.id_chamado] ?? "").trim();
    if (!resposta) { showToast("Escreva uma resposta antes de enviar.", "error"); return; }
    setChamadoEmResposta(chamado.id_chamado);
    try {
      await suporteApi.responder(chamado.id_chamado, empresa!.id_empresa, resposta);
      setRespostas(r => { const novo = { ...r }; delete novo[chamado.id_chamado]; return novo; });
      showToast("Resposta enviada.");
      await carregar(empresa!);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erro ao responder o chamado.", "error");
    } finally {
      setChamadoEmResposta(null);
    }
  }

  if (!empresa) return null;

  const produtosPorEntrega = (id: number) => produtos.filter(p => p.id_entrega === id);
  const consumidorNome     = (id: number) => consumidores.find(c => c.id_consumidor === id)?.nome ?? `#${id}`;
  const devolucoesExibidas = devolucaoEntregaFiltro === null
    ? devolucoes
    : devolucoes.filter(d => d.id_entrega === devolucaoEntregaFiltro);

  const tabCfg: { key: Tab; label: string; count: number | null }[] = [
    { key: "consumidores", label: "👤 Consumidores", count: consumidores.length },
    { key: "produtos",     label: "📦 Produtos",     count: produtos.length     },
    { key: "entregas",     label: "🚁 Entregas",     count: entregas.length     },
    { key: "devolucoes",   label: "↩️ Devoluções",   count: devolucoes.length   },
    { key: "suporte",      label: "💬 Suporte",      count: chamados.filter(c => c.status === "Aberto").length },
    { key: "avaliacoes",   label: "⭐ Avaliações",   count: avaliacoes.total },
    { key: "relatorio",    label: "📊 Relatório",    count: null                },
  ];

  const addLabel: Partial<Record<Tab, string>> = {
    consumidores: "+ Novo Consumidor",
    produtos:     "+ Novo Produto",
    entregas:     "+ Nova Entrega",
  };

  const tabHint: Partial<Record<Tab, string>> = {
    entregas: produtosLivres.length === 0 && produtos.length === 0
      ? "Cadastre produtos antes de criar uma entrega." : undefined,
    produtos: consumidores.length === 0
      ? "Cadastre um consumidor antes de adicionar produtos." : undefined,
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh", paddingBottom: "3rem" }}>

      <header style={{ background: "var(--card)", borderBottom: "1px solid var(--card-border)",
        padding: "0.875rem 1.25rem", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <p style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--accent)",
            textTransform: "uppercase", letterSpacing: "0.12em" }}>Drone Express</p>
          <h1 style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.015em", margin: 0 }}>
            {empresa.nome_empresa}
          </h1>
        </div>
        <button className="btn btn-outline"
          onClick={() => { sessionStorage.removeItem("empresa"); router.push("/"); }}
          style={{ padding: "0.45rem 1rem", fontSize: "0.8125rem" }}>Sair</button>
      </header>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "1.25rem 1rem" }}>

        {/* Stats rápidos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.625rem", marginBottom: "1.25rem" }}>
          {[
            { icon: "👤", label: "Consumidores", val: consumidores.length    },
            { icon: "📦", label: "Produtos",     val: produtos.length         },
            { icon: "🔓", label: "Livres",       val: produtosLivres.length, accent: true },
            { icon: "🚁", label: "Entregas",     val: entregas.length         },
          ].map(s => (
            <div key={s.label} className="card animate-fade-up" style={{ padding: "0.875rem", textAlign: "center" }}>
              <p style={{ fontSize: "1.125rem" }}>{s.icon}</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.1,
                color: s.accent ? "var(--accent)" : "var(--fg)" }}>{loading ? "—" : s.val}</p>
              <p style={{ fontSize: "0.625rem", color: "var(--muted)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="card animate-fade-up animate-fade-up-delay-1"
          style={{ marginBottom: "1.25rem", padding: "0.875rem 1.125rem",
            background: "var(--accent-light)", border: "1px solid var(--accent)" }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 800, color: "var(--accent)",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            Fluxo de trabalho
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {([
              { n: "1", label: "Cadastra Consumidor",               tab: "consumidores" as Tab },
              { n: "2", label: "Cadastra Produto",                  tab: "produtos"     as Tab },
              { n: "3", label: "Cria Entrega + seleciona produtos", tab: "entregas"     as Tab },
            ]).map((step, i, arr) => (
              <div key={step.n} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button onClick={() => setTab(step.tab)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem",
                    background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <span style={{ width: "1.375rem", height: "1.375rem", borderRadius: "50%",
                    background: "var(--primary)", color: "var(--primary-text)", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: "0.6875rem", fontWeight: 900 }}>
                    {step.n}
                  </span>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--fg)",
                    textDecoration: "underline", textDecorationColor: "var(--accent)", textUnderlineOffset: "3px" }}>
                    {step.label}
                  </span>
                </button>
                {i < arr.length - 1 && <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar + botão Adicionar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "1rem", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "0.25rem", background: "var(--card)",
            border: "1px solid var(--card-border)", borderRadius: "var(--radius-full)", padding: "0.25rem" }}>
            {tabCfg.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "0.5rem 0.875rem", borderRadius: "var(--radius-full)", border: "none",
                cursor: "pointer", fontWeight: 700, fontSize: "0.8125rem",
                background: tab === t.key ? "var(--primary)" : "transparent",
                color: tab === t.key ? "var(--primary-text)" : "var(--muted)",
                transition: "all 0.15s", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                {t.label}
                {t.count !== null && (
                  <span style={{ background: tab === t.key ? "rgba(255,255,255,0.18)" : "var(--bg)",
                    borderRadius: "999px", padding: "0 0.35rem", fontSize: "0.6875rem", fontWeight: 800 }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {addLabel[tab] && (
            <button className="btn btn-accent" onClick={() => {
              if (tab === "consumidores") setModal({ type: "novo-consumidor" });
              if (tab === "produtos")     setModal({ type: "novo-produto" });
              if (tab === "entregas")     setModal({ type: "nova-entrega" });
            }} style={{ padding: "0.55rem 1.1rem", fontSize: "0.875rem" }}>
              {addLabel[tab]}
            </button>
          )}
        </div>

        {tabHint[tab] && (
          <div style={{ background: "#fdf3d8", border: "1px solid var(--accent)", borderRadius: "0.625rem",
            padding: "0.625rem 1rem", marginBottom: "1rem", fontSize: "0.875rem", fontWeight: 500 }}>
            💡 {tabHint[tab]}
          </div>
        )}

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: "3rem" }}>Carregando…</p>}

        {!loading && tab === "relatorio" && (
          <RelatorioTab empresa={empresa} entregas={entregas} produtos={produtos} consumidores={consumidores} />
        )}

        {!loading && tab === "consumidores" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {consumidores.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                <p style={{ fontSize: "2rem" }}>👤</p>
                <p style={{ fontWeight: 600, marginTop: "0.5rem" }}>Nenhum consumidor cadastrado</p>
                <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>Cadastre os destinatários antes de registrar produtos.</p>
              </div>
            )}
            {consumidores.map(c => {
              const qtd = produtos.filter(p => p.id_consumidor === c.id_consumidor).length;
              return (
                <div key={c.id_consumidor} className="card animate-fade-up"
                  style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: "1rem" }}>{c.nome}</p>
                      {c.email && <p style={{ fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.1rem" }}>{c.email}</p>}
                    </div>
                    {qtd > 0 && <span className="badge badge-entregue">{qtd} produto{qtd > 1 ? "s" : ""}</span>}
                  </div>
                  <div style={{ background: "var(--bg)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem",
                    display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>📞</span>
                    <p style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{c.telefone}</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-outline" style={{ flex: 1, fontSize: "0.8125rem", padding: "0.45rem" }}
                      onClick={() => setModal({ type: "editar-consumidor", consumidor: c })}>✏️ Editar</button>
                    <button className="btn" style={{ flex: 1, fontSize: "0.8125rem", padding: "0.45rem",
                      background: "#fee2e2", color: "#991b1b", border: "none" }}
                      onClick={() => askDelete(`Excluir ${c.nome}?`,
                        () => doDelete(() => consumidoresApi.deletar(c.id_consumidor), "Consumidor excluído."))}>
                      🗑️ Excluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PRODUTOS ── */}
        {!loading && tab === "produtos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {produtos.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                <p style={{ fontSize: "2rem" }}>📦</p>
                <p style={{ fontWeight: 600, marginTop: "0.5rem" }}>Nenhum produto cadastrado</p>
                <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>Clique em "+ Novo Produto" para registrar um item.</p>
              </div>
            )}
            {produtos.map(p => {
              const livre = p.id_entrega === null;
              return (
                <div key={p.id_produto} className="card animate-fade-up"
                  style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: "1rem" }}>{p.nome_produto}</p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.1rem" }}>{p.categoria} · {p.peso} kg</p>
                    </div>
                    <span className={`badge ${livre ? "badge-pendente" : "badge-transito"}`}>
                      {livre ? "📦 Livre" : "🚁 Em entrega"}
                    </span>
                  </div>
                  <div style={{ background: "var(--bg)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem",
                    display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>👤</span>
                    <div>
                      <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Destinatário</p>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>{consumidorNome(p.id_consumidor)}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-outline" style={{ flex: 1, fontSize: "0.8125rem", padding: "0.45rem" }}
                      onClick={() => setModal({ type: "editar-produto", produto: p })}>✏️ Editar</button>
                    <button className="btn" style={{ flex: 1, fontSize: "0.8125rem", padding: "0.45rem",
                      background: "#fee2e2", color: "#991b1b", border: "none" }}
                      onClick={() => askDelete(`Excluir "${p.nome_produto}"?`,
                        () => doDelete(() => produtosApi.deletar(p.id_produto), "Produto excluído."))}>
                      🗑️ Excluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ENTREGAS ── */}
        {!loading && tab === "entregas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {entregas.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                <p style={{ fontSize: "2rem" }}>🚁</p>
                <p style={{ fontWeight: 600, marginTop: "0.5rem" }}>Nenhuma entrega criada</p>
                <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                  {produtos.length === 0 ? "Cadastre consumidores e produtos primeiro." : 'Clique em "+ Nova Entrega" para despachar.'}
                </p>
              </div>
            )}
            {entregas.map(ent => {
              const itens = produtosPorEntrega(ent.id_entrega);
              const devolucoesDaEntrega = devolucoes.filter(d => d.id_entrega === ent.id_entrega);
              return (
                <div key={ent.id_entrega} className="card animate-fade-up"
                  style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.05em" }}>Código de Rastreio</p>
                      <p style={{ fontFamily: "var(--font-geist-mono)", fontWeight: 800,
                        fontSize: "1rem", letterSpacing: "0.06em" }}>{ent.codigo_rastreio}</p>
                    </div>
                    <span className={statusClass(ent.status)}>{ent.status}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <div style={{ background: "var(--bg)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem" }}>
                      <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Envio</p>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>{fmt(ent.datahorainicio)}</p>
                    </div>
                    <div style={{ background: "var(--bg)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem" }}>
                      <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Conclusão</p>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>{fmt(ent.datahoraconclusao)}</p>
                    </div>
                  </div>
                  {itens.length > 0 && (
                    <div>
                      <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.375rem" }}>
                        Itens ({itens.length})
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        {itens.map(p => (
                          <div key={p.id_produto} style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", background: "var(--bg)", borderRadius: "0.4rem", padding: "0.4rem 0.75rem" }}>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{p.nome_produto}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "0.5rem" }}>{p.categoria}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>→ {consumidorNome(p.id_consumidor)}</span>
                              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--accent)" }}>{p.peso} kg</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ background: "var(--bg)", borderRadius: "0.5rem", padding: "0.75rem",
                    display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <p style={{ fontSize: "0.8125rem", fontWeight: 700 }}>↩️ Devolução</p>
                      {devolucoesDaEntrega.length === 0
                        ? <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Sem solicitação</span>
                        : <span className={statusClass(devolucoesDaEntrega[0].status)}>
                            {devolucoesDaEntrega[0].status}
                          </span>}
                    </div>
                    {devolucoesDaEntrega[0] && (
                      <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
                        {devolucoesDaEntrega[0].motivo}
                      </p>
                    )}
                    <button type="button" className="btn btn-outline"
                      style={{ fontSize: "0.8125rem", padding: "0.45rem" }}
                      onClick={() => {
                        setDevolucaoEntregaFiltro(ent.id_entrega);
                        setTab("devolucoes");
                      }}>
                      Ver devoluções desta entrega
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-outline" style={{ flex: 1, fontSize: "0.8125rem", padding: "0.45rem" }}
                      onClick={() => setModal({ type: "editar-entrega", entrega: ent })}>✏️ Editar</button>
                    <button className="btn" style={{ flex: 1, fontSize: "0.8125rem", padding: "0.45rem",
                      background: "#fee2e2", color: "#991b1b", border: "none" }}
                      onClick={() => askDelete(`Excluir entrega ${ent.codigo_rastreio}?`,
                        () => doDelete(() => entregasApi.deletar(ent.id_entrega), "Entrega excluída."))}>
                      🗑️ Excluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && tab === "devolucoes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {devolucaoEntregaFiltro !== null && (
              <button type="button" className="btn btn-outline" style={{ alignSelf: "flex-start" }}
                onClick={() => setDevolucaoEntregaFiltro(null)}>
                Mostrar todas as devoluções
              </button>
            )}
            {devolucoesExibidas.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                <p style={{ fontSize: "2rem" }}>↩️</p>
                <p style={{ fontWeight: 600, marginTop: "0.5rem" }}>
                  {devolucaoEntregaFiltro === null
                    ? "Nenhuma solicitação de devolução"
                    : "Esta entrega ainda não tem solicitação de devolução"}
                </p>
              </div>
            )}
            {devolucoesExibidas.map(devolucao => (
              <article key={devolucao.id_devolucao} className="card animate-fade-up"
                style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div>
                    <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 700,
                      textTransform: "uppercase" }}>Código de rastreio</p>
                    <p style={{ fontFamily: "var(--font-geist-mono)", fontWeight: 800 }}>
                      {devolucao.codigo_rastreio}
                    </p>
                  </div>
                  <span className={statusClass(devolucao.status)}>{devolucao.status}</span>
                </div>
                <p style={{ fontSize: "0.875rem" }}>
                  <strong>Cliente:</strong> {devolucao.nome_consumidor}
                </p>
                <p style={{ fontSize: "0.875rem" }}>
                  <strong>Motivo:</strong> {devolucao.motivo}
                </p>
                <p style={{ fontSize: "0.875rem" }}>
                  <strong>Produtos:</strong>{" "}
                  {devolucao.produtos.map(produto => produto.nome_produto).join(", ")}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  Solicitada em {fmt(devolucao.data_solicitacao)}
                </p>
                {(devolucao.status === "Pendente" || devolucao.status === "Solicitada") && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button type="button" className="btn btn-primary"
                      disabled={devolucaoEmAtualizacao !== null}
                      onClick={() => atualizarDevolucao(devolucao, "Aprovada")}>
                      {devolucaoEmAtualizacao === devolucao.id_devolucao ? "Salvando…" : "Aprovar"}
                    </button>
                    <button type="button" className="btn btn-outline"
                      disabled={devolucaoEmAtualizacao !== null}
                      onClick={() => atualizarDevolucao(devolucao, "Recusada")}>
                      Recusar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* ── SUPORTE ── */}
        {!loading && tab === "suporte" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {chamados.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                <p style={{ fontSize: "2rem" }}>💬</p>
                <p style={{ fontWeight: 600, marginTop: "0.5rem" }}>Nenhum chamado de suporte</p>
              </div>
            )}
            {chamados.map(c => (
              <article key={c.id_chamado} className="card animate-fade-up"
                style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div>
                    <p style={{ fontWeight: 800 }}>#{c.id_chamado} · {c.assunto}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--font-geist-mono)" }}>
                      {c.codigo_rastreio} · {fmt(c.data_abertura)}
                    </p>
                  </div>
                  <span className={c.status === "Respondido" ? "badge badge-entregue" : "badge badge-pendente"}>
                    {c.status}
                  </span>
                </div>
                <p style={{ fontSize: "0.875rem" }}>
                  <strong>Cliente:</strong> {c.nome} ({c.email})
                </p>
                <p style={{ fontSize: "0.875rem", whiteSpace: "pre-wrap" }}>{c.mensagem}</p>
                {c.status === "Respondido" ? (
                  <div style={{ background: "var(--bg)", borderRadius: "0.5rem", padding: "0.625rem 0.75rem" }}>
                    <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
                      Sua resposta · {fmt(c.data_resposta)}
                    </p>
                    <p style={{ fontSize: "0.875rem", whiteSpace: "pre-wrap" }}>{c.resposta}</p>
                  </div>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); responderChamado(c); }}
                    style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <textarea className="input" rows={3} maxLength={2000} required
                      placeholder="Escreva a resposta para o cliente" aria-label="Resposta"
                      value={respostas[c.id_chamado] ?? ""}
                      onChange={e => setRespostas(r => ({ ...r, [c.id_chamado]: e.target.value }))} />
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}
                      disabled={chamadoEmResposta !== null}>
                      {chamadoEmResposta === c.id_chamado ? "Enviando…" : "Responder"}
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}

        {/* ── AVALIAÇÕES ── */}
        {!loading && tab === "avaliacoes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {avaliacoes.total === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                <p style={{ fontSize: "2rem" }}>⭐</p>
                <p style={{ fontWeight: 600, marginTop: "0.5rem" }}>Nenhuma avaliação ainda</p>
                <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                  Os clientes podem avaliar pela tela de rastreio depois que a entrega for marcada como Entregue.
                </p>
              </div>
            ) : (
              <div className="card" style={{ textAlign: "center", padding: "1.25rem" }}>
                <p style={{ fontSize: "0.6875rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Nota média
                </p>
                <p style={{ fontSize: "2.25rem", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--accent)" }}>
                  {avaliacoes.media?.toFixed(1).replace(".", ",")} ★
                </p>
                <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
                  {avaliacoes.total} avaliaç{avaliacoes.total > 1 ? "ões" : "ão"}
                </p>
              </div>
            )}
            {avaliacoes.avaliacoes.map(a => (
              <article key={a.id_avaliacao} className="card animate-fade-up"
                style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                  <p style={{ fontFamily: "var(--font-geist-mono)", fontWeight: 800 }}>{a.codigo_rastreio}</p>
                  <span aria-label={`${a.nota} de 5 estrelas`} style={{ color: "var(--accent)", fontSize: "1.125rem" }}>
                    {"★".repeat(a.nota)}<span style={{ color: "var(--card-border)" }}>{"★".repeat(5 - a.nota)}</span>
                  </span>
                </div>
                {a.comentario
                  ? <p style={{ fontSize: "0.875rem", whiteSpace: "pre-wrap" }}>{a.comentario}</p>
                  : <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Sem comentário</p>}
                <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Avaliada em {fmt(a.data_avaliacao)}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      {modal?.type === "novo-consumidor" && (
        <Modal title="Novo Consumidor" onClose={() => setModal(null)}>
          <ConsumidorForm onSave={() => afterSave("Consumidor cadastrado!")} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "editar-consumidor" && (
        <Modal title={`Editar · ${modal.consumidor.nome}`} onClose={() => setModal(null)}>
          <ConsumidorForm initial={modal.consumidor} onSave={() => afterSave("Consumidor atualizado!")} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "novo-produto" && (
        <Modal title="Novo Produto" onClose={() => setModal(null)}>
          <ProdutoForm empresaId={empresa.id_empresa} consumidores={consumidores}
            onSave={() => afterSave("Produto cadastrado!")} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "editar-produto" && (
        <Modal title={`Editar · ${modal.produto.nome_produto}`} onClose={() => setModal(null)}>
          <ProdutoForm empresaId={empresa.id_empresa} consumidores={consumidores}
            initial={modal.produto} onSave={() => afterSave("Produto atualizado!")} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "nova-entrega" && (
        <Modal title="Nova Entrega" onClose={() => setModal(null)}>
          <EntregaForm empresaId={empresa.id_empresa} produtosLivres={produtosLivres}
            consumidores={consumidores} onSave={() => afterSave("Entrega criada!")} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === "editar-entrega" && (
        <Modal title={`Editar · ${modal.entrega.codigo_rastreio}`} onClose={() => setModal(null)}>
          <EntregaForm empresaId={empresa.id_empresa} initial={modal.entrega}
            produtosLivres={produtosLivres} consumidores={consumidores}
            onSave={() => afterSave("Entrega atualizada!")} onClose={() => setModal(null)} />
        </Modal>
      )}

      {confirm && <Confirm msg={confirm.msg} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
      {toast   && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}