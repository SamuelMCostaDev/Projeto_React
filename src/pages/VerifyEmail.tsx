// src/pages/VerifyEmail.tsx
import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";

type State =
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const hasRun = useRef(false); // evita rodar 2x no StrictMode

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get("token") || "";

    if (!token) {
      setState({
        status: "error",
        message: "Token ausente. Use o link de confirmação enviado por e-mail.",
      });
      return;
    }

    (async () => {
      try {
        const res = await api(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        // se chegou aqui é porque deu 200
        setState({
          status: "success",
          message: res?.message || "E-mail confirmado com sucesso.",
        });
      } catch (err: any) {
        const msg =
          err?.message ||
          "Token inválido ou expirado. Faça um novo cadastro ou solicite um novo link.";

        setState({
          status: "error",
          message: msg,
        });
      }
    })();
  }, [searchParams]);

  return (
    <section className="container" style={{ maxWidth: 640, padding: "32px 16px" }}>
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <h1 className="h1">Confirmação de e-mail</h1>

        {state.status === "loading" && (
          <p style={{ marginTop: 16 }}>Validando seu token, aguarde…</p>
        )}

        {state.status === "success" && (
          <>
            <p style={{ marginTop: 16, color: "#16a34a", fontWeight: 500 }}>
              {state.message}
            </p>
            <p style={{ marginTop: 24 }}>
              Agora você já pode fazer login normalmente.
            </p>
            <Link to="/login">
              <button style={{ marginTop: 12 }}>Ir para o login</button>
            </Link>
          </>
        )}

        {state.status === "error" && (
          <>
            <p style={{ marginTop: 16, color: "#ef4444" }}>{state.message}</p>
            <p style={{ marginTop: 24 }}>
              Se o problema continuar, faça um novo cadastro usando o mesmo e-mail.
            </p>
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
              <Link to="/signup">
                <button type="button">Cadastrar novamente</button>
              </Link>
              <Link to="/login">
                <button type="button">Ir para o login</button>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
