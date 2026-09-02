import { Navigate } from "react-router-dom";
import { isAdmin } from "./api";

function AdminOnlyRoute({ children }) {
  if (!isAdmin()) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}

export default AdminOnlyRoute;
