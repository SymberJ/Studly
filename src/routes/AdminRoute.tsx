import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth/useAuth";

/** Guard dla tras /admin/*. Dostęp tylko dla roli 'admin'. */
export const AdminRoute = () => {
  const { user } = useAuth();

  return user?.role === "admin"
    ? <Outlet />
    : <Navigate to="/dashboard" replace />;
};
