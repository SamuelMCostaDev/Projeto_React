import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";

type Account = { id:number; balance:number };
type Tx = { id:number; fromId:number|null; toId:number|null; amount:number; createdAt:string };
type UserWithAccount = { id:number; name:string; email:string; account: { id:number } | null };
type AutoDebitConfig = { id: number; accountId: number; active: boolean };


function money(cents: number) {
  return (cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

function Card({ children, style }: { children:any; style?:any }){
  return <div className="card" style={{ padding:16, borderRadius:12, minWidth:220, ...style }}>{children}</div>;
}

export default function Dashboard() {
  const { accountId, user, logout } = useAuth();
  // aplica o fundo do dashboard no body enquanto estamos nesta página
  useEffect(() => {
    document.body.classList.add("bg-dashboard");

    // aplica via estilo inline para garantir que a imagem em /public seja usada
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
  const [acc, setAcc] = useState<Account|null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [users, setUsers] = useState<UserWithAccount[]>([]);

  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedTo, setSelectedTo] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [autoDebit, setAutoDebit] = useState<AutoDebitConfig | null>(null);
  const [savingAutoDebit, setSavingAutoDebit] = useState(false);


 useEffect(() => {
  if (!accountId) return;
  refresh();
  api("/users").then(setUsers).catch(()=>{});

  // busca config de débito automático da conta
  api(`/auto-debit?accountId=${accountId}`)
    .then((cfg) => setAutoDebit(cfg))
    .catch(() => {
      // se ainda não existir config, só ignoramos o erro
    });
}, [accountId]);


  async function refresh(){
    if (!accountId) return;
    const [a, t] = await Promise.all([
      api(`/accounts/${accountId}`),
      api(`/transactions?accountId=${accountId}`)
    ]);
    setAcc(a); setTxs(t);
  }

  const otherUsers = useMemo(() => users.filter(u => u.account && u.account.id !== acc?.id), [users, acc]);

  async function doTransfer(toId:number) {
    if (!accountId) return;
    setLoading(true);
    try {
      await api("/transfer", { method: "POST", json: { fromId: accountId, toId, amount: Math.round(amount*100) } });
      setTransferOpen(false);
      setAmount(0);
      setSelectedTo(null);
      await refresh();
    } catch (e:any) {
      alert(e?.message ?? "Erro");
    } finally { setLoading(false); }
  }

  async function handleToggleAutoDebit() {
  if (!accountId) return;
  setSavingAutoDebit(true);

  try {
    const nextActive = !autoDebit?.active;

    const updated = await api("/auto-debit", {
      method: "PUT",
      json: {
        accountId,
        active: nextActive,
      },
    });

    setAutoDebit(updated);

    if (nextActive) {
      // Aqui o backend vai disparar o e-mail; no front só avisamos
      alert("Débito automático ativado! Você receberá um e-mail de confirmação.");
    } else {
      alert("Débito automático desativado.");
    }
  } catch (e: any) {
    alert(e?.message ?? "Erro ao salvar débito automático");
  } finally {
    setSavingAutoDebit(false);
  }
}


  return (
    <section className="container">
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Olá, {user?.name}</h2>
            <div>Saldo: <strong>{acc ? money(acc.balance) : "..."}</strong></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={refresh}>Atualizar</button>
            <button onClick={logout}>Sair</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 45 }}>
          <Card>
            <h3>Transferir</h3>
            <p>Envie dinheiro para outra conta usando a lista de contatos.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setTransferOpen(true)}>Fazer transferência</button>
              <button onClick={() => { setSelectedTo(users.find(u=>u.account)?.account?.id ?? null); setTransferOpen(true); }}>Transferência rápida</button>
            </div>
          </Card>

          <Card>
            <h3>Contatos</h3>
            <p>Contas cadastradas (clique em transferir para iniciar).</p>
            <ul style={{ listStyle:"none", padding:0, margin:0, maxHeight:160, overflow:"auto" }}>
              {otherUsers.map(u => (
                <li key={u.id} style={{ display:"flex", justifyContent:"space-between", padding:8, borderBottom:"1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontWeight:600 }}>{u.name}</div>
                    <div style={{ fontSize:12, color:"var(--muted)" }}>Conta #{u.account?.id ?? "-"}</div>
                  </div>
                  {u.account?.id && <button onClick={() => { setSelectedTo(u.account!.id); setTransferOpen(true); }}>Transferir</button>}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3>Extrato</h3>
            <p>Últimas movimentações</p>
            <ul style={{ listStyle:"none", padding:0, margin:0 }}>
              {txs.slice(0,6).map(tx => (
                <li key={tx.id} style={{ borderBottom: "1px solid var(--border)", padding: "8px 0" }}>
                  <div style={{ fontSize:13 }}>{tx.fromId === acc?.id ? "Enviado" : "Recebido"} • <strong>{money(tx.amount)}</strong></div>
                  <div style={{ fontSize:11, color:"var(--muted)" }}>{new Date(tx.createdAt).toLocaleString("pt-BR")}</div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
  <h3>Débito automático</h3>
  <p>Ative para que seus pagamentos recorrentes sejam realizados automaticamente.</p>

  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
      cursor: savingAutoDebit ? "not-allowed" : "pointer",
    }}
  >
    <input
      type="checkbox"
      checked={!!autoDebit?.active}
      onChange={handleToggleAutoDebit}
      disabled={savingAutoDebit}
    />
    <span>{autoDebit?.active ? "Ativado" : "Desativado"}</span>
  </label>

  {savingAutoDebit && (
    <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
      Salvando preferências...
    </div>
  )}

  {autoDebit && autoDebit.active && (
    <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
      Quando você ativar, um e-mail de confirmação é enviado para {user?.email}.
    </div>
  )}
</Card>


          <Card>
            <h3>Ajuda / Suporte</h3>
            <p>Precisa de ajuda? Abra um chamado pelo e-mail suporte@example.com.</p>
          </Card>
        </div>
      </div>

      <Modal open={transferOpen} title="Transferir" onClose={() => setTransferOpen(false)} onConfirm={undefined} hideFooter={true}>
        <div style={{ display:"grid", gap:8, minWidth:240, width: "min(92vw,420px)", boxSizing: "border-box" }}>
          <label>Destinatário
            <select value={selectedTo ?? ""} onChange={e=>setSelectedTo(e.target.value ? Number(e.target.value) : null)}>
              <option value="">-- selecione --</option>
              {otherUsers.map(u => u.account && <option key={u.id} value={u.account.id}>{u.name} — Conta #{u.account.id}</option>)}
            </select>
          </label>

          <label>Valor (R$)
            <input type="number" step="0.01" value={amount || ""} onChange={e=>setAmount(Number(e.target.value))} style={{ width: "100%", boxSizing: "border-box" }} />
          </label>

          <div style={{ display:"flex", gap:8, flexWrap: "wrap" }}>
            {[10,50,100,200].map(v => (
              <button key={v} onClick={() => setAmount(v)} style={{ flex:1, minWidth: 80 }}>R$ {v}</button>
            ))}
          </div>

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={() => setTransferOpen(false)}>Cancelar</button>
            <button disabled={!selectedTo || !amount || loading} onClick={() => selectedTo && doTransfer(selectedTo)}>{loading ? "Enviando..." : "Confirmar"}</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
