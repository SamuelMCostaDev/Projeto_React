import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";

type Account = { id: number; balance: number };
type Tx = {
  id: number;
  fromId: number | null;
  toId: number | null;
  amount: number;
  createdAt: string;
};
type UserWithAccount = {
  id: number;
  name: string;
  email: string;
  account: { id: number } | null;
};

type AutoDebitConfig = {
  id: number;
  accountId: number;
  active: boolean;
  dueDay: number | null;
};

type Toast = {
  type: "success" | "error";
  title: string;
  message: string;
};

type CardCharge = {
  id: number;
  description: string;
  amount: number;
  createdAt: string;
  paid?: boolean;
};

type CreditCardInfo = {
  id: number;
  brand: string;
  last4: string;
  limit: number;
  invoiceAmount: number;
  availableLimit: number;
  charges: CardCharge[];
};

const MIN_TRANSFER_TIME_MS = 5000;

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function Card({ children, style }: { children: any; style?: any }) {
  return (
    <div
      className="card"
      style={{ padding: 16, borderRadius: 12, minWidth: 220, ...style }}
    >
      {children}
    </div>
  );
}

function ToggleSwitch(props: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  const { checked, disabled, onChange } = props;

  return (
    <label
      className={`toggle-switch ${disabled ? "toggle-switch--disabled" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        role="switch"
        aria-checked={checked}
      />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}

/* ---------- Dropdown custom para dia do débito ---------- */

// ---------- Dropdown custom para dia do débito ----------

type DebitDaySelectProps = {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
};

function DebitDaySelect({ value, onChange, disabled }: DebitDaySelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // garante que só consideramos "preenchido" se for número mesmo
  const hasValue = typeof value === "number" && !Number.isNaN(value);
  const label = hasValue ? `Dia ${value}` : "Selecione o dia do débito";

  const days = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: "100%",
        marginTop: 4,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: disabled ? "#f5f5f5" : "#ffffff",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* texto do "input" */}
        <span
          style={{
            color: hasValue ? "#111827" : "#6b7280", // mais escuro quando tem valor
            fontWeight: hasValue ? 600 : 400,
          }}
        >
          {label}
        </span>

        {/* chevron */}
        <span
          style={{
            fontSize: 18,
            color: "var(--muted)",
            marginLeft: 8,
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%", // sempre pra baixo
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 220,
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid var(--border)",
            borderRadius: 8,
            zIndex: 20,
            boxShadow: "0 12px 30px rgba(15,23,42,0.35)",
          }}
        >
          <div
            style={{
              padding: "6px 12px",
              fontSize: 12,
              color: "var(--muted)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            
          </div>

          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            <div
              style={{
                padding: "6px 12px",
                fontSize: 13,
                cursor: "pointer",
                background: value === null ? "#eef2ff" : "#ffffff",
              }}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Sem dia definido
            </div>

            {days.map((d) => (
              <div
                key={d}
                onClick={() => {
                  onChange(d);
                  setOpen(false);
                }}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  background: value === d ? "#eef2ff" : "#ffffff",
                  borderTop: "1px solid #f3f4f6",
                }}
              >
                Dia {d}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



/* ===================== DASHBOARD ===================== */

export default function Dashboard() {
  const { accountId, user, logout } = useAuth();

  // aplica o fundo do dashboard no body
  useEffect(() => {
    document.body.classList.add("bg-dashboard");

    const prev = {
      backgroundImage: document.body.style.backgroundImage,
      backgroundSize: document.body.style.backgroundSize,
      backgroundPosition: document.body.style.backgroundPosition,
      backgroundRepeat: document.body.style.backgroundRepeat,
      backgroundAttachment: document.body.style.backgroundAttachment,
    };
    document.body.style.backgroundImage = "url('/bg-dashboard-hd.webp')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";

    return () => {
      document.body.classList.remove("bg-dashboard");
      document.body.style.backgroundImage = prev.backgroundImage;
      document.body.style.backgroundSize = prev.backgroundSize;
      document.body.style.backgroundPosition = prev.backgroundPosition;
      document.body.style.backgroundRepeat = prev.backgroundRepeat;
      document.body.style.backgroundAttachment = prev.backgroundAttachment;
    };
  }, []);

  const [acc, setAcc] = useState<Account | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [users, setUsers] = useState<UserWithAccount[]>([]);

  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedTo, setSelectedTo] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const [autoDebit, setAutoDebit] = useState<AutoDebitConfig | null>(null);
  const [savingAutoDebit, setSavingAutoDebit] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const [cardInfo, setCardInfo] = useState<CreditCardInfo | null>(null);
  const [payingInvoice, setPayingInvoice] = useState(false);

  // dia escolhido (1–28 ou null)
  const [debitDay, setDebitDay] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (autoDebit && autoDebit.dueDay != null) {
      setDebitDay(autoDebit.dueDay);
    }
  }, [autoDebit]);

  useEffect(() => {
    if (!accountId) return;
    refresh();
    api("/users")
      .then(setUsers)
      .catch(() => {});

    api(`/auto-debit?accountId=${accountId}`)
      .then((cfg) => setAutoDebit(cfg))
      .catch(() => {});

    loadCard();
  }, [accountId]);

  async function loadCard() {
    if (!accountId) return;
    try {
      const card = await api(`/card?accountId=${accountId}`);
      setCardInfo(card);
    } catch {
      // silencioso
    }
  }

  async function refresh() {
    if (!accountId) return;
    const [a, t] = await Promise.all([
      api(`/accounts/${accountId}`),
      api(`/transactions?accountId=${accountId}`),
    ]);
    setAcc(a);
    setTxs(t);
  }

  const otherUsers = useMemo(
    () => users.filter((u) => u.account && u.account.id !== acc?.id),
    [users, acc]
  );

  async function doTransfer(toId: number) {
    if (!accountId) return;
    setLoading(true);
    const startedAt = Date.now();

    try {
      await api("/transfer", {
        method: "POST",
        json: { fromId: accountId, toId, amount: Math.round(amount * 100) },
      });

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_TRANSFER_TIME_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_TRANSFER_TIME_MS - elapsed)
        );
      }

      setTransferOpen(false);
      setAmount(0);
      setSelectedTo(null);
      await refresh();

      setToast({
        type: "success",
        title: "Sucesso!",
        message: "Transferência realizada.",
      });
    } catch (e: any) {
      alert(e?.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function handlePayInvoice() {
    if (!accountId || !cardInfo) return;

    if (!cardInfo.invoiceAmount) {
      setToast({
        type: "error",
        title: "Nada a pagar",
        message: "Sua fatura já está em dia.",
      });
      return;
    }

    setPayingInvoice(true);
    const startedAt = Date.now();

    try {
      const res = await api("/card/pay", {
        method: "POST",
        json: { accountId },
      });

      const elapsed = Date.now() - startedAt;
      if (elapsed < 1500) {
        await new Promise((r) => setTimeout(r, 1500 - elapsed));
      }

      await refresh();
      setCardInfo(res.card);

      setToast({
        type: "success",
        title: "Fatura paga!",
        message: "Pagamento da fatura realizado com sucesso.",
      });
    } catch (e: any) {
      setToast({
        type: "error",
        title: "Erro ao pagar fatura",
        message: e?.message ?? "Não foi possível pagar a fatura.",
      });
    } finally {
      setPayingInvoice(false);
    }
  }

  async function saveAutoDebitConfig(
  nextActive: boolean,
  nextDay: number | null
) {
  if (!accountId) return;
  setSavingAutoDebit(true);

  try {
    const updated = await api("/auto-debit", {
      method: "PUT",
      json: {
        accountId,
        active: nextActive,
        dueDay: nextDay,
      },
    });

    // mantém apenas o que veio do backend
    setAutoDebit(updated);

    setToast({
      type: "success",
      title: "Sucesso!",
      message: nextActive
        ? "Débito automático atualizado."
        : "Débito automático desativado.",
    });
  } catch (e: any) {
    setToast({
      type: "error",
      title: "Erro",
      message:
        e?.message ?? "Erro ao salvar configuração de débito automático.",
    });
  } finally {
    setSavingAutoDebit(false);
  }
}


  async function handleToggleAutoDebit(nextActive: boolean) {
    const dayToUse = nextActive ? debitDay ?? 5 : debitDay;
    await saveAutoDebitConfig(nextActive, dayToUse);
  }

  function handleChangeDebitDay(day: number | null) {
  // Atualiza imediatamente o label do dropdown
  setDebitDay(day);

  // Se já existe config no backend, só manda salvar em segundo plano
  if (autoDebit) {
    saveAutoDebitConfig(autoDebit.active, day);
  }
}


  return (
    <section className="container">
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

      <div style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2>Olá, {user?.name}</h2>
            <div>
              Saldo:{" "}
              <strong>{acc ? money(acc.balance) : "..."}</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={refresh}>Atualizar</button>
            <button onClick={logout}>Sair</button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 45,
          }}
        >
          <Card>
            <h3>Transferir</h3>
            <p>Envie dinheiro para outra conta usando a lista de contatos.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setTransferOpen(true)}>
                Fazer transferência
              </button>
              <button
                onClick={() => {
                  setSelectedTo(
                    users.find((u) => u.account)?.account?.id ?? null
                  );
                  setTransferOpen(true);
                }}
              >
                Transferência rápida
              </button>
            </div>
          </Card>

          <Card>
            <h3>Contatos</h3>
            <p>Contas cadastradas (clique em transferir para iniciar).</p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                maxHeight: 160,
                overflow: "auto",
              }}
            >
              {otherUsers.map((u) => (
                <li
                  key={u.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: 8,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      Conta #{u.account?.id ?? "-"}
                    </div>
                  </div>
                  {u.account?.id && (
                    <button
                      onClick={() => {
                        setSelectedTo(u.account!.id);
                        setTransferOpen(true);
                      }}
                    >
                      Transferir
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3>Extrato</h3>
            <p>Últimas movimentações</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {txs.slice(0, 6).map((tx) => (
                <li
                  key={tx.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    padding: "8px 0",
                  }}
                >
                  <div style={{ fontSize: 13 }}>
                    {tx.fromId === acc?.id ? "Enviado" : "Recebido"} •{" "}
                    <strong>{money(tx.amount)}</strong>
                  </div>
                  <div
                    style={{ fontSize: 11, color: "var(--muted)" }}
                  >
                    {new Date(tx.createdAt).toLocaleString("pt-BR")}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3>Débito automático</h3>
            <p>
              Ative para que seus pagamentos recorrentes sejam
              realizados automaticamente.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 16,
                gap: 12,
              }}
            >
              <div style={{ fontSize: 14, color: "var(--muted)" }}>
                {autoDebit?.active ? "Ativado" : "Desativado"}
              </div>

              <ToggleSwitch
                checked={!!autoDebit?.active}
                disabled={savingAutoDebit}
                onChange={handleToggleAutoDebit}
              />
            </div>

            <label
              style={{
                display: "block",
                marginTop: 32,
                fontSize: 14,
              }}
            >
              Dia do débito
              <DebitDaySelect
                value={debitDay}
                onChange={handleChangeDebitDay}
                disabled={savingAutoDebit}
              />
            </label>

            {savingAutoDebit && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "var(--muted)",
                }}
              >
                Salvando preferências...
              </div>
            )}

            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              {autoDebit?.active ? (
                debitDay ? (
                  <>Os débitos serão realizados todo dia {debitDay}.</>
                ) : (
                  <>Escolha o dia do mês para realizar o débito automático.</>
                )
              ) : (
                <>Ao ativar, um e-mail de confirmação será enviado para {user?.email}.</>
              )}
            </div>
          </Card>

          <Card>
            <h3>Fatura do cartão</h3>

            {!cardInfo ? (
              <p
                style={{
                  fontSize: 14,
                  color: "var(--muted)",
                  marginTop: 8,
                }}
              >
                Carregando informações do cartão...
              </p>
            ) : (
              <>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    color: "var(--muted)",
                  }}
                >
                  {cardInfo.brand} •••• {cardInfo.last4}
                </div>

                <div style={{ marginTop: 8, fontSize: 14 }}>
                  Limite total:{" "}
                  <strong>{money(cardInfo.limit)}</strong>
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 14,
                    color: "var(--muted)",
                  }}
                >
                  Limite disponível:{" "}
                  <strong>{money(cardInfo.availableLimit)}</strong>
                </div>

                <div style={{ marginTop: 12, fontSize: 16 }}>
                  Fatura atual:{" "}
                  <strong>
                    {money(cardInfo.invoiceAmount)}
                  </strong>
                </div>

                <button
                  style={{ marginTop: 12, width: "100%" }}
                  disabled={
                    payingInvoice ||
                    !cardInfo.invoiceAmount ||
                    !acc ||
                    acc.balance < cardInfo.invoiceAmount
                  }
                  onClick={handlePayInvoice}
                >
                  {payingInvoice ? "Pagando fatura..." : "Pagar fatura"}
                </button>

                {acc && acc.balance < cardInfo.invoiceAmount && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "#ef4444",
                    }}
                  >
                    Saldo insuficiente para pagar a fatura.
                  </div>
                )}

                {cardInfo.charges.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginBottom: 4,
                      }}
                    >
                      Gastos recentes na fatura:
                    </div>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        maxHeight: 120,
                        overflow: "auto",
                      }}
                    >
                      {cardInfo.charges.slice(0, 5).map((c) => (
                        <li
                          key={c.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            padding: "4px 0",
                          }}
                        >
                          <span>{c.description}</span>
                          <span>{money(c.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card>
            <h3>Ajuda / Suporte</h3>
            <p style={{marginTop: 100}}>
              Precisa de ajuda? Abra um chamado pelo e-mail
              suporte@example.com.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={transferOpen}
        title="Transferir"
        onClose={() => setTransferOpen(false)}
        onConfirm={undefined}
        hideFooter={true}
      >
        <div
          style={{
            display: "grid",
            gap: 8,
            minWidth: 240,
            width: "min(92vw,420px)",
            boxSizing: "border-box",
          }}
        >
          <label>
            Destinatário
            <select
              value={selectedTo ?? ""}
              onChange={(e) =>
                setSelectedTo(
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              <option value="">-- selecione --</option>
              {otherUsers.map(
                (u) =>
                  u.account && (
                    <option key={u.id} value={u.account.id}>
                      {u.name} — Conta #{u.account.id}
                    </option>
                  )
              )}
            </select>
          </label>

          <label>
            Valor (R$)
            <input
              type="number"
              step="0.01"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </label>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {[10, 50, 100, 200].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                style={{ flex: 1, minWidth: 80 }}
              >
                R$ {v}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            {loading && (
              <div
                style={{
                  marginRight: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "var(--muted)",
                }}
              >
                <span className="loader-circle" />
                <span>Processando transferência...</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setTransferOpen(false)}
            >
              Cancelar
            </button>
            <button
              disabled={!selectedTo || !amount || loading}
              onClick={() => selectedTo && doTransfer(selectedTo)}
            >
              {loading ? "Enviando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
