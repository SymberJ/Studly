import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth/useAuth";

/** Chroni wszystkie trasy wymagające zalogowania.
 *  Podczas ładowania sesji (Supabase) pokazuje spinner. */
export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="full-center">
        <div className="spinner" aria-label="Ładowanie…" />
      </div>
    );
  }

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" state={{ from: location }} replace />;
};
