import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user } = useAuth();
  const loc = useLocation();
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc }} />;
}
