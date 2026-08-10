import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/useAuth";

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main className="admin-route-loading" aria-busy="true">Carregando painel...</main>;
  }

  if (!user) {
    return <Navigate to="/entrar" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  }

  if (user.app_metadata?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;
