// src/layout/Layout.tsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? "#646cff" : "inherit",
    textDecoration: "none",
    padding: "4px 6px",
    borderRadius: 8,
  });

  const handleLogout = () => {
    logout();
    nav("/signup", { replace: true });
  };

  return (
    // <<< AQUI: o fundo cobre a página inteira, inclusive o header
    <div className="bg-hero" style={{ minHeight: "100dvh" }}>
      <nav
        className="topbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: 24,            // padding aqui em vez de um <div> branco
          marginBottom: 16,
          background: "transparent",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <NavLink to="/" style={linkStyle}>Home</NavLink>

          {user && (
            <>
              <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
              <NavLink to="/users" style={linkStyle}>Histórico de Transações</NavLink>
            </>
          )}

          {!user && (
            <>
              <NavLink to="/signup" style={linkStyle}>Cadastro</NavLink>
              <NavLink to="/login" style={linkStyle}>Login</NavLink>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {user && (
            <button
              onClick={handleLogout}
              style={{
                background: "transparent",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              Sair
            </button>
          )}
          <button onClick={toggle}>Tema: {theme}</button>
        </div>
      </nav>

      {/* O resto da página */}
      <div style={{ padding: "0 24px 24px" }}>
        <Outlet />
      </div>
    </div>
  );
}
