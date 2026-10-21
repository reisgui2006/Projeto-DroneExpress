"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { empresasApi } from "@/lib/api";

export default function EmpresaLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const empresa = await empresasApi.login(email, senha);
      sessionStorage.setItem("empresa", JSON.stringify(empresa));
      router.push("/empresa/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm mb-5 animate-fade-up">
        <Link
          href="/"
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
          ← Voltar
        </Link>
      </div>

      <div className="card w-full max-w-sm animate-fade-up animate-fade-up-delay-1">
        <div style={{ marginBottom: "1.75rem", textAlign: "center" }}>
          <div
            style={{
              width: "3rem",
              height: "3rem",
              background: "var(--primary)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              margin: "0 auto 0.875rem",
            }}
          >
            🏢
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 900,
              letterSpacing: "-0.025em",
            }}
          >
            Login Empresa
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Acesse o painel da sua empresa
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="empresa@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              className="input"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ marginTop: "0.25rem" }}
          >
            {loading ? "Entrando…" : "Entrar"}
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

        <p
          style={{
            marginTop: "1.25rem",
            textAlign: "center",
            fontSize: "0.8125rem",
            color: "var(--muted)",
          }}
        >
          Empresa ainda não cadastrada?{" "}
          <Link
            href="/empresa/cadastro"
            style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
          >
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
