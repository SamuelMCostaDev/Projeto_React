// src/pages/Home.tsx
import reactLogo from "../assets/react.svg";
import viteLogo from "/vite.svg";
import { Counter } from "../components/Counter";
import Modal from "../components/Modal";
import { useState } from "react";

export default function Home() {
  const [open, setOpen] = useState(false);

  return (
    <main className="container">
      <header className="header">
        <a href="https://vite.dev" target="_blank" rel="noreferrer noopener">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer noopener">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </header>

      <h1>Sistema Bancário React</h1>

      <section className="card" style={{ display: "grid", gap: 12 }}>
        <Counter />
        <button onClick={() => setOpen(true)}>Abrir modal</button>
        <p>
          Edite <code>src/pages/Home.tsx</code> para testar HMR.
        </p>
      </section>

      {/* Modal de exemplo */}
      <Modal
        open={open}
        title="Exemplo de modal"
        onClose={() => setOpen(false)}
        onConfirm={() => {
          // coloque aqui a ação de confirmação (ex.: limpar algo)
          setOpen(false);
        }}
        confirmText="Confirmar"
      >
        Isso é um conteúdo dentro da modal. Clique em “Confirmar” para executar
        uma ação (você pode trocar por remover item, limpar lista, etc.).
      </Modal>
    </main>
  );
}
