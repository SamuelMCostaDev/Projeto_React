// Login.tsx
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";

type F = { email: string; password: string };

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm<F>();
  const { login } = useAuth();
  const nav = useNavigate();

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

const onSubmit = async (data: F) => {
  try {
    setError("");
    await login(data.email, data.password);

    // mostra toast por 2.5s
    setToast("Login realizado com sucesso!");
    setTimeout(() => setToast(""), 3000);

    // redireciona depois de 1.2s (usuário vê a toast antes de sair da página)
    setTimeout(() => {
      nav("/dashboard", { replace: true });
    }, 2000);
  } catch (err: any) {
    setError(err?.message || "Erro ao fazer login. Verifique suas credenciais.");
  }
};



 return (
  <section className="container" style={{ maxWidth: 560 }}>
    {/* Toast de sucesso (some sozinho) */}
    {toast && (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          background: "rgba(56,142,60,.95)",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,.18)",
          zIndex: 9999,
          fontWeight: 600,
        }}
      >
        {toast}
      </div>
    )}

    <div className="card" style={{ padding: 28 }}>
      <h1 className="h1">Login</h1>

      {error && (
        <div
          style={{
            color: "red",
            marginBottom: 16,
            padding: 12,
            background: "#ffe6e6",
            borderRadius: 8,
            border: "1px solid #ffcccc",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <form className="form form--narrow" onSubmit={handleSubmit(onSubmit)}>
        <label>
          E-mail
          <input
            type="email"
            {...register("email", {
              required: "E-mail é obrigatório",
              pattern: { value: /^\S+@\S+$/i, message: "E-mail inválido" },
            })}
          />
          {errors.email && (
            <span style={{ color: "red", fontSize: 14 }}>{errors.email.message}</span>
          )}
        </label>

        <label>
          Senha
          <input
            type="password"
            {...register("password", {
              required: "Senha é obrigatória",
              minLength: { value: 6, message: "Senha deve ter pelo menos 6 caracteres" },
            })}
          />
          {errors.password && (
            <span style={{ color: "red", fontSize: 14 }}>{errors.password.message}</span>
          )}
        </label>

        <button type="submit">Entrar</button>
      </form>

      <p style={{ marginTop: 12, textAlign: "center" }}>
        Novo aqui? <Link to="/signup">Crie sua conta</Link>
      </p>
    </div>
  </section>
);

}
