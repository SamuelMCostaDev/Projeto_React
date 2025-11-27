import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useEffect, useState } from "react";

const schema = z
  .object({
    name: z.string().min(3, "Mínimo 3 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirm: z.string(),
    terms: z.boolean().refine((v) => v, { message: "Aceite os termos" }),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "Senhas diferentes",
  });

type FormData = z.infer<typeof schema>;

type Toast = {
  type: "success" | "error";
  title: string;
  message: string;
};

export default function Signup() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    document.body.classList.add("bg-hero");
    return () => document.body.classList.remove("bg-hero");
  }, []);

  // some auto-hide for the toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { terms: false },
  });

  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
      };

      await api("/auth/register", {
        method: "POST",
        json: payload,
      });

      setToast({
        type: "success",
        title: "Sucesso!",
        message: "Conta criada com sucesso. Confirme seu e-mail para logar.",
      });

      // dá tempo de ver a toast e depois vai pro login
      setTimeout(
        () => navigate("/login", { replace: true }),
        3500
      );
    } catch (e) {
      const msg = (e as Error).message || "Erro ao cadastrar.";

      if (msg.includes("email já cadastrado") || msg.includes("409")) {
        setToast({
          type: "error",
          title: "E-mail já cadastrado",
          message: "Este e-mail já possui conta. Faça login.",
        });

        setTimeout(() => navigate("/login"), 1500);
      } else {
        setToast({
          type: "error",
          title: "Erro ao cadastrar",
          message: msg,
        });
      }
    }
  };

  return (
    <>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: toast.type === "success" ? "#16a34a" : "#ef4444",
              color: "#ffffff",
              padding: "12px 16px",
              borderRadius: 12,
              boxShadow: "0 10px 25px rgba(15,23,42,0.35)",
              minWidth: 220,
              fontSize: 14,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {toast.title}
            </div>
            <div>{toast.message}</div>
          </div>
        </div>
      )}

      <section className="container" style={{ maxWidth: 560 }}>
        <div className="card" style={{ padding: 28 }}>
          <h1 className="h1">Cadastro</h1>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="form form--narrow"
          >
            <label>
              Nome
              <input {...register("name")} placeholder="Seu nome" />
              {errors.name && (
                <small className="error">{errors.name.message}</small>
              )}
            </label>

            <label>
              E-mail
              <input {...register("email")} placeholder="voce@exemplo.com" />
              {errors.email && (
                <small className="error">{errors.email.message}</small>
              )}
            </label>

            <label>
              Senha
              <input type="password" {...register("password")} />
              {errors.password && (
                <small className="error">{errors.password.message}</small>
              )}
            </label>

            <label>
              Confirmar senha
              <input type="password" {...register("confirm")} />
              {errors.confirm && (
                <small className="error">{errors.confirm.message}</small>
              )}
            </label>

            <label className="checkbox-row">
              <input type="checkbox" {...register("terms")} />
              <span>Aceito os termos</span>
            </label>
            {errors.terms && (
              <small className="error">{errors.terms.message}</small>
            )}

            <button disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Criar conta"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
