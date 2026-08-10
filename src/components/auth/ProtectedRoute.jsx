import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/useAuth";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main aria-busy="true" />;
  }

  if (!user) {
    return (
      <Navigate
        to="/entrar"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;
