import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Protected() {
  const { user, loading } = useAuth();

 
  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          Carregando...
        </div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}