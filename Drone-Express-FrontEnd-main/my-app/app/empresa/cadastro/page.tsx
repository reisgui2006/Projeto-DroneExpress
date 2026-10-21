"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { empresasApi } from "@/lib/api";

export default function EmpresaCadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome_empresa: "",
    email: "",
    cnpj: "",
    telefone: "",
    senha: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/empresas/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
        throw new Error(err.detail ?? `Erro ${res.status}`);
      }

      const empresa = await res.json();
      sessionStorage.setItem("empresa", JSON.stringify(empresa));
      router.push("/empresa/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar empresa.");
    } finally {
      setLoading(false);
    }
  }

  const fields: { name: keyof typeof form; label: string; type: string; placeholder: string }[] = [
    { name: "nome_empresa", label: "Nome da Empresa", type: "text", placeholder: "Logística XPTO Ltda" },
    { name: "email", label: "E-mail", type: "email", placeholder: "contato@empresa.com" },
    { name: "cnpj", label: "CNPJ", type: "text", placeholder: "00.000.000/0001-00" },
    { name: "telefone", label: "Telefone", type: "tel", placeholder: "(11) 99999-9999" },
    { name: "senha", label: "Senha", type: "password", placeholder: "••••••••" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 py-12"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm mb-5 animate-fade-up">
        <Link
          href="/empresa/login"
          style={{
            color: "var(--muted)",
            fontSize: "0.875rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            textDecoration: "none",
          }}
        >
          ← Voltar para Login
        </Link>
      </div>

      <div className="card w-full max-w-sm animate-fade-up animate-fade-up-delay-1">
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.025em" }}>
            Cadastrar Empresa
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Crie sua conta e comece a gerenciar entregas
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {fields.map((f) => (
            <div key={f.name}>
              <label htmlFor={f.name}>{f.label}</label>
              <input
                id={f.name}
                name={f.name}
                className="input"
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.name]}
                onChange={handleChange}
                required
              />
            </div>
          ))}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ marginTop: "0.25rem" }}
          >
            {loading ? "Cadastrando…" : "Criar conta"}
          </button>
        </form>

        {error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}
