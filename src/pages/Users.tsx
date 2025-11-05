// src/pages/Users.tsx
import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Tx = {
  id: number;
  fromId: number;
  toId: number;
  amount: number;       // em centavos
  createdAt: string;
};

type Account = {
  id: number;
  userId: number;
  balance: number;      // em centavos
  createdAt: string;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  password?: string;    // vem no payload do server, mas não usamos
  createdAt: string;
  account: Account | null;
  recentTx: Tx[];       // <- ESTE É O NOME CERTO QUE O SERVER RETORNA
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Users() {
  const [data, setData] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const res: UserRow[] = await api("/users"); // GET http://localhost:4000/users
        setData(res);
      } catch (e: any) {
        setError(e?.message || "NETWORK_ERROR");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p style={{ padding: 24 }}>Carregando…</p>;
  if (error)   return <p style={{ padding: 24, color: "tomato" }}>Erro: {error}</p>;
  if (!data.length) return <p style={{ padding: 24 }}>Nenhum usuário cadastrado.</p>;

  return (
    <section className="container" style={{ display: "grid", gap: 16 }}>
      <h1 className="h1" style={{ textAlign: "left" }}>Histórico de Transações</h1>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        {data.map((u) => {
          const accId = u.account?.id ?? null;
          return (
            <li key={u.id} className="card" style={{ padding: 16 }}>
              {/* Cabeçalho */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 style={{ margin: 0 }}>{u.name}</h3>
                <small style={{ opacity: .7 }}>{u.email}</small>
              </div>

              {/* Conta / Saldo */}
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 0",
                  borderTop: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                }}
              >
                <div>
                  <small style={{ color: "var(--muted)" }}>Conta</small>
                  <div><strong>{accId ?? "—"}</strong></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <small style={{ color: "var(--muted)" }}>Saldo</small>
                  <div>
                    <strong>
                      {typeof u.account?.balance === "number"
                        ? BRL.format(u.account.balance / 100)
                        : "—"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Transações recentes */}
              <div style={{ marginTop: 12 }}>
                <strong>Transações recentes</strong>
                {!u.recentTx || u.recentTx.length === 0 ? (
                  <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
                    Nenhuma transação localizada
                  </p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 6 }}>
                    {u.recentTx.map((t) => {
                      const credit = accId !== null && t.toId === accId;
                      const sign = credit ? "+" : "-";
                      return (
                        <li key={t.id} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>
                            {credit ? "⬇️ Crédito" : "⬆️ Débito"} —{" "}
                            {BRL.format(Math.abs(t.amount) / 100)}
                          </span>
                          <small style={{ opacity: .7 }}>
                            {new Date(t.createdAt).toLocaleString("pt-BR")}
                          </small>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
