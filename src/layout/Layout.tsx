// src/layout/Layout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? "#646cff" : "inherit",
  });

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
          <NavLink to="/" style={linkStyle}>Home</NavLink>
          <NavLink to="/users" style={linkStyle}>Users</NavLink>
          <NavLink to="/signup" style={linkStyle}>Sign up</NavLink>

          {user ? (
            <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
          ) : (
            <NavLink to="/login" style={linkStyle}>Login</NavLink>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {user && (
            <button onClick={logout} title="Sair">
              Sair
            </button>
          )}
          <button onClick={toggle} title="Alternar tema">
            Tema: {theme}
          </button>
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
