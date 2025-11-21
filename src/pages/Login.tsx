import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

type F = { email: string; password: string };

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<F>();
  const { login } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    document.body.classList.add("bg-hero");

    const prev = {
      backgroundImage: document.body.style.backgroundImage,
      backgroundSize: document.body.style.backgroundSize,
      backgroundPosition: document.body.style.backgroundPosition,
      backgroundRepeat: document.body.style.backgroundRepeat,
      backgroundAttachment: document.body.style.backgroundAttachment,
    };
    document.body.style.backgroundImage = "url('/bg-landing-hd.webp')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";

    return () => {
      document.body.classList.remove("bg-hero");
      document.body.style.backgroundImage = prev.backgroundImage;
      document.body.style.backgroundSize = prev.backgroundSize;
      document.body.style.backgroundPosition = prev.backgroundPosition;
      document.body.style.backgroundRepeat = prev.backgroundRepeat;
      document.body.style.backgroundAttachment = prev.backgroundAttachment;
    };
  }, []);

  const onSubmit = async (data: F) => {
    const email = (data.email || "").trim();

    // 👉 MODO RECUPERAÇÃO: botão "Entrar" vira "Enviar e-mail de recuperação"
    if (recoveryMode) {
      if (!email) {
        setInfo("");
        setError("Informe o e-mail para recuperar a senha.");
        return;
      }

      try {
        setError("");
        setInfo("Enviando e-mail de recuperação...");

        await api("/auth/forgot-password", {
          method: "POST",
          json: { email },
        });

        setInfo(
          "Se este e-mail estiver cadastrado, você receberá uma mensagem com instruções para redefinir sua senha."
        );
      } catch (err: any) {
        setInfo("");
        setError(
          err?.message ||
            "Não foi possível iniciar a recuperação de senha. Tente novamente."
        );
      }

      return;
    }

    // 👉 MODO NORMAL: login
    try {
      setError("");
      setInfo("");
      await login(email, data.password);
      nav("/dashboard", { replace: true });
    } catch (err: any) {
      setError(
        err.message || "Erro ao fazer login. Verifique suas credenciais."
      );
    }
  };

  function handleForgotPassword() {
    setRecoveryMode(true);
    setError("");
    setInfo(
      "Informe seu e-mail e clique em 'Enviar link de recuperação' para receber as instruções."
    );
  }

  return (
    <section
      className="container"
      style={{ maxWidth: 760, paddingTop: 32, paddingBottom: 64 }}
    >
      <div
        className="card"
        style={{ padding: 32, maxWidth: 640, margin: "0 auto" }}
      >
        <h1 className="h1">Login</h1>

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

        <form className="form form--narrow" onSubmit={handleSubmit(onSubmit)}>
          <label>
            E-mail
            <input
              type="email"
              {...register("email", {
                required: "E-mail é obrigatório",
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: "E-mail inválido",
                },
              })}
              style={{ height: 28 }}
            />
            {errors.email && (
              <span style={{ color: "red", fontSize: 14 }}>
                {errors.email.message}
              </span>
            )}
          </label>

          {!recoveryMode && (
            <label>
              Senha
              <input
                type="password"
                {...register("password", {
                  required: "Senha é obrigatória",
                  minLength: {
                    value: 6,
                    message: "Senha deve ter pelo menos 6 caracteres",
                  },
                })}
                style={{ height: 28 }}
              />
              {errors.password && (
                <span style={{ color: "red", fontSize: 14 }}>
                  {errors.password.message}
                </span>
              )}
            </label>
          )}

          <button type="submit" style={{ height: 44 }}>
            {recoveryMode ? "Enviar link de recuperação" : "Entrar"}
          </button>
        </form>

        <p style={{ marginTop: 12, textAlign: "center" }}>
          Novo aqui? <Link to="/signup">Crie sua conta</Link>
        </p>

        <p style={{ marginTop: 8, textAlign: "center" }}>
          <button
            type="button"
            onClick={handleForgotPassword}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#3366ff",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Esqueci minha senha
          </button>
        </p>
      </div>
    </section>
  );
}
