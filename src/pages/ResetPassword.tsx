// src/pages/ResetPassword.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../lib/api";

const schema = z
  .object({
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "Senhas diferentes",
  });

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [token, setToken] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  useEffect(() => {
    document.body.classList.add("bg-hero");
    return () => document.body.classList.remove("bg-hero");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get("token") || "";
    setToken(t);

    if (!t) {
      setError("Token inválido ou ausente. Solicite um novo link de recuperação.");
    }
  }, [location.search]);

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setError("Token inválido ou ausente. Solicite um novo link de recuperação.");
      return;
    }

    try {
      setError("");
      setInfo("Redefinindo sua senha...");

      await api("/auth/reset-password", {
        method: "POST",
        json: {
          token,
          password: data.password,
        },
      });

      setInfo("Senha redefinida com sucesso! Você já pode fazer login.");
      // se quiser mandar direto pro login depois de alguns segundos:
      // setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err: any) {
      setInfo("");
      setError(err?.message || "Erro ao redefinir senha. Tente novamente.");
    }
  };

  return (
    <section
      className="container"
      style={{ maxWidth: 560, paddingTop: 32, paddingBottom: 64 }}
    >
      <div className="card" style={{ padding: 28 }}>
        <h1 className="h1">Redefinir senha</h1>

        {error && (
          <div
            style={{
              color: "red",
              marginBottom: 16,
              padding: 12,
              background: "#ffe6e6",
              borderRadius: 4,
              border: "1px solid #ffcccc",
            }}
          >
            {error}
          </div>
        )}

        {info && (
          <div
            style={{
              color: "#155724",
              marginBottom: 16,
              padding: 12,
              background: "#d4edda",
              borderRadius: 4,
              border: "1px solid #c3e6cb",
              fontSize: 14,
            }}
          >
            {info}
          </div>
        )}

        {!token ? (
          <p style={{ marginTop: 8 }}>
            O link parece inválido. Tente solicitar um novo em{" "}
            <Link to="/login">“Esqueci minha senha”</Link>.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="form form--narrow">
            <label>
              Nova senha
              <input type="password" {...register("password")} />
              {errors.password && (
                <small className="error">{errors.password.message}</small>
              )}
            </label>

            <label>
              Confirmar nova senha
              <input type="password" {...register("confirm")} />
              {errors.confirm && (
                <small className="error">{errors.confirm.message}</small>
              )}
            </label>

            <button disabled={isSubmitting} style={{ marginTop: 8 }}>
              {isSubmitting ? "Salvando..." : "Redefinir senha"}
            </button>

            <p style={{ marginTop: 12, textAlign: "center" }}>
              Lembrou da senha? <Link to="/login">Voltar para o login</Link>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
