// src/layout/Layout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 24 }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <NavLink
            to="/"
            style={({ isActive }) => ({ color: isActive ? "#646cff" : "inherit" })}
          >
            Home
          </NavLink>

          {/* aparece só quando logado e com o novo rótulo */}
          {user && (
            <NavLink
              to="/users"
              style={({ isActive }) => ({ color: isActive ? "#646cff" : "inherit" })}
            >
              Histórico de Transações
            </NavLink>
          )}

          {/* públicos quando NÃO logado */}
          {!user && (
            <>
              <NavLink
                to="/signup"
                style={({ isActive }) => ({ color: isActive ? "#646cff" : "inherit" })}
              >
                Sign up
              </NavLink>
              <NavLink
                to="/login"
                style={({ isActive }) => ({ color: isActive ? "#646cff" : "inherit" })}
              >
                Login
              </NavLink>
            </>
          )}

          {/* opcional: botão sair quando logado */}
          {user && (
            <button
              onClick={logout}
              style={{
                background: "transparent",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "4px 10px",
                cursor: "pointer",
              }}
              title="Sair"
            >
              Sair
            </button>
          )}
        </div>

        <button onClick={toggle} title="Alternar tema">
          Tema: {theme}
        </button>
      </nav>

      <Outlet />
    </div>
  );
}
