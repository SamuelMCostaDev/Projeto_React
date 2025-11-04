import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Account = { id:number; balance:number };
type Tx = { id:number; fromId:number|null; toId:number|null; amount:number; createdAt:string };

function money(cents: number) {
  return (cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

export default function Dashboard() {
  const { accountId, user, logout } = useAuth();
  const [acc, setAcc] = useState<Account|null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [toId, setToId] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    if (!accountId) return;
    api(`/accounts/${accountId}`).then(setAcc);
    api(`/transactions?accountId=${accountId}`).then(setTxs);
  }, [accountId]);

  async function transfer() {
    await api("/transfer", { method:"POST", body: JSON.stringify({ fromId: accountId, toId, amount: Math.round(amount*100) }) });
    // refresh
    const [a, t] = await Promise.all([
      api(`/accounts/${accountId}`),
      api(`/transactions?accountId=${accountId}`)
    ]);
    setAcc(a); setTxs(t); setAmount(0);
  }

  return (
    <section className="container">
      <div className="card" style={{ padding: 24 }}>
        <h2>Olá, {user?.name}</h2>
        <p>Saldo: <strong>{acc ? money(acc.balance) : "..."}</strong></p>

        <div className="form form--narrow" style={{ marginTop: 16 }}>
          <label>Conta destino (ID)
            <input type="number" value={toId} onChange={e=>setToId(Number(e.target.value))}/>
          </label>
          <label>Valor (R$)
            <input type="number" step="0.01" value={amount} onChange={e=>setAmount(Number(e.target.value))}/>
          </label>
          <button onClick={transfer} disabled={!toId || !amount}>Transferir</button>
          <button onClick={logout}>Sair</button>
        </div>

        <h3 style={{ marginTop: 24 }}>Últimas movimentações</h3>
        <ul style={{ listStyle:"none", padding:0 }}>
          {txs.map(tx => (
            <li key={tx.id} style={{ borderBottom: "1px solid var(--border)", padding: "8px 0" }}>
              {tx.fromId === acc?.id ? "Enviado" : "Recebido"} • {money(tx.amount)} • {new Date(tx.createdAt).toLocaleString("pt-BR")}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
