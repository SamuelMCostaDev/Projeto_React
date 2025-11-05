import { useMemo, useState } from "react";
import Modal from "../components/Modal";

/** Util simples p/ formatar R$ */
const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Tx = {
  id: string;
  desc: string;
  when: string; // ISO ou texto curto
  value: number; // negativo = débito
};

export default function Home() {
  // mocks de vitrine
  const [show, setShow] = useState(true);
  const [open, setOpen] = useState(false);

  const balance = 12850.42;
  const txs: Tx[] = useMemo(
    () => [
      { id: "t1", desc: "Pix • Padaria Central", when: "hoje, 12:04", value: -24.9 },
      { id: "t2", desc: "Depósito • Salário", when: "ontem, 09:12", value: 5320.0 },
      { id: "t3", desc: "Cartão • Supermercado", when: "qui, 18:40", value: -312.7 },
      { id: "t4", desc: "Pix • João Mendes", when: "qui, 14:05", value: -80.0 },
      { id: "t5", desc: "Rendimento • CDI", when: "seg, 06:00", value: 9.33 },
    ],
    []
  );

  return (
    <main className="container" style={{ display: "grid", gap: 28 }}>
      {/* HERO / BANNER */}
      <section
        className="card"
        style={{
          padding: 28,
          display: "grid",
          gap: 16,
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Bem-vindo ao seu banco digital
        </span>

        <h1 className="h1" style={{ margin: 0, textAlign: "center" }}>
          Sistema Bancário React
        </h1>

        <p style={{ color: "var(--muted)", marginTop: -6 }}>
          Conta digital, transferências instantâneas, cartão sem anuidade e
          investimentos em poucos cliques. Tudo com segurança e performance.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setOpen(true)}>Abrir conta demo</button>
          <button
            onClick={() => window.scrollTo({ top: 9999, behavior: "smooth" })}
            style={{
              background: "transparent",
              color: "var(--fg)",
              border: "1px solid var(--border)",
            }}
          >
            Ver tarifas
          </button>
        </div>
      </section>

      {/* GRELHA PRINCIPAL */}
      <section
        style={{
          display: "grid",
          gap: 18,
          gridTemplateColumns: "1.2fr .8fr",
        }}
      >
        {/* COLUNA ESQUERDA: CARTÃO + EXTRATO */}
        <div style={{ display: "grid", gap: 18 }}>
          {/* CARTÃO DE CONTA */}
          <div
            className="card"
            style={{
              padding: 20,
              display: "grid",
              gap: 14,
              background:
                "linear-gradient(145deg, color-mix(in oklab, var(--accent) 14%, var(--card-bg)) 0%, var(--card-bg) 60%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Conta</div>
                <strong style={{ fontSize: 16 }}>• • • •  5123</strong>
              </div>
              <span
                aria-hidden
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                }}
              >
                Banco React
              </span>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Saldo</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 28, fontWeight: 800 }}>
                  {show ? BRL.format(balance) : "••••••"}
                </span>
                <button
                  onClick={() => setShow((s) => !s)}
                  style={{
                    background: "transparent",
                    color: "var(--fg)",
                    border: "1px solid var(--border)",
                    padding: "6px 10px",
                    borderRadius: 10,
                    fontWeight: 600,
                  }}
                >
                  {show ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            {/* AÇÕES RÁPIDAS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginTop: 6,
              }}
            >
              <button>Pix</button>
              <button
                style={{
                  background: "transparent",
                  color: "var(--fg)",
                  border: "1px solid var(--border)",
                }}
              >
                Pagar
              </button>
              <button
                style={{
                  background: "transparent",
                  color: "var(--fg)",
                  border: "1px solid var(--border)",
                }}
              >
                Transferir
              </button>
            </div>
          </div>

          {/* EXTRATO / LISTA */}
          <div className="card" style={{ padding: 0 }}>
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <strong>Movimentações recentes</strong>
              <button
                style={{
                  background: "transparent",
                  color: "var(--fg)",
                  border: "1px solid var(--border)",
                  padding: "6px 10px",
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                Ver todas
              </button>
            </header>

            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
              }}
            >
              {txs.map((t) => (
                <li
                  key={t.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "grid", gap: 2 }}>
                    <strong style={{ fontSize: 14 }}>{t.desc}</strong>
                    <small style={{ color: "var(--muted)" }}>{t.when}</small>
                  </div>
                  <div
                    style={{
                      alignSelf: "center",
                      fontWeight: 700,
                      color: t.value < 0 ? "#ef4444" : "#16a34a",
                    }}
                  >
                    {t.value < 0 ? "-" : "+"}
                    {BRL.format(Math.abs(t.value))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* COLUNA DIREITA: KPIs + CARTÃO FÍSICO */}
        <aside style={{ display: "grid", gap: 18 }}>
          {/* KPI CARDS */}
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            <Kpi title="Limite cartão" value={BRL.format(7500)} caption="Disponível 68%" />
            <Kpi title="Objetivos" value={BRL.format(420)} caption="Reserva mensal" />
            <Kpi title="Investimentos" value={BRL.format(12890)} caption="+1.2% mês" />
            <Kpi title="Pontos Rewards" value="3.420" caption="Vencem em 90 dias" />
          </div>

          {/* CARTÃO VISUAL */}
          <div
            className="card"
            style={{
              padding: 20,
              borderRadius: 18,
              background:
                "linear-gradient(135deg, #6366f1 0%, color-mix(in oklab, #6366f1 35%, var(--card-bg)) 100%)",
              color: "#fff",
              boxShadow: "var(--shadow)",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.9 }}>Cartão • Platinum</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1.5 }}>
              5282 • • • • • • • •  9012
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.9 }}>
              <small>VALID 12/28</small>
              <small>SAMUEL COSTA</small>
            </div>
          </div>

          {/* BENEFÍCIOS */}
          <div className="card" style={{ padding: 18, display: "grid", gap: 10 }}>
            <strong>Segurança e benefícios</strong>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)" }}>
              <li>🔐 Autenticação por token/JWT</li>
              <li>⚡ Pix e TED com baixa latência</li>
              <li>🛡️ Monitoramento antifraude</li>
              <li>📈 Investimentos com liquidez diária</li>
            </ul>
          </div>
        </aside>
      </section>

      {/* FOOTER DEMO */}
      <section className="card" style={{ padding: 18 }}>
        <small style={{ color: "var(--muted)" }}>
          Esta é uma vitrine de UI. Faça <strong>Sign up</strong> para criar uma conta demo
          e <strong>Login</strong> para acessar recursos autenticados.
        </small>
      </section>

      {/* Modal de exemplo (CTA do banner) */}
      <Modal
        open={open}
        title="Abrir conta demo"
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        confirmText="Ok, entendi"
      >
        Crie uma conta em <strong>Sign up</strong> e faça o primeiro acesso em{" "}
        <strong>Login</strong>. Esta é uma demonstração de interface ― não são
        operações reais.
      </Modal>
    </main>
  );
}

/** Componente KPI simples */
function Kpi(props: { title: string; value: string; caption?: string }) {
  return (
    <div className="card" style={{ padding: 14, display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--muted)" }}>{props.title}</span>
      <strong style={{ fontSize: 18 }}>{props.value}</strong>
      {props.caption && (
        <small style={{ color: "var(--muted)" }}>{props.caption}</small>
      )}
    </div>
  );
}
