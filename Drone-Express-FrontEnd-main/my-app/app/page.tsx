import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg)" }}
    >
      <main
        className="card w-full max-w-sm animate-fade-up"
        style={{ borderRadius: "1.5rem" }}
      >
        <section className="flex flex-col items-center gap-7 text-center">
          
          {}
          <div className="flex flex-col items-center gap-2 animate-fade-up animate-fade-up-delay-1">
            
            {}
            <div
              style={{
                background: "var(--primary)",
                borderRadius: "50%",
                width: "110px",
                height: "110px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 20px rgba(0,0,0,0.2)", 
              }}
            >
              {}
              <Image
                src="/dro.svg"
                alt="Drone Express logo"
                width={200}
                height={200}
                priority
              />
            </div>

            <p
              style={{
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "var(--accent)",
                textTransform: "uppercase",
              }}
            >
              Drone Express
            </p>
          </div>

          {}
          <div className="animate-fade-up animate-fade-up-delay-2">
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                color: "var(--fg)",
              }}
            >
              Bem-vindo!
            </h1>
            <p
              style={{
                color: "var(--muted)",
                marginTop: "0.5rem",
                fontSize: "0.9375rem",
              }}
            >
              Selecione a opção desejada
            </p>
          </div>

          <div
            className="w-full animate-fade-up animate-fade-up-delay-3"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <Link href="/rastrear" className="btn btn-primary w-full">
              📦&nbsp; Rastrear meu pedido
            </Link>
            <Link href="/devolucoes" className="btn btn-outline w-full">
              ↩️&nbsp; Solicitar devolução / Minhas Devoluções
            </Link>
            <Link href="/suporte" className="btn btn-outline w-full">
              💬&nbsp; Suporte
            </Link>
            <Link href="/empresa/login" className="btn btn-outline w-full">
              🏢&nbsp; Login Empresa
            </Link>
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Entregas rápidas e inteligentes
          </p>
        </section>
      </main>
    </div>
  );
}