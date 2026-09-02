import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "./api";

function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

export default ProtectedRoute;
