import { Navigate } from "react-router-dom";
import { hasPermission, isAuthenticated, getUser } from "./api";

// Permission-aware route guard.
//
// - `permission`: the permission required to view the route.
// - `admin`: when true, requires the admin role (for routes that are
//   genuinely administrative regardless of a single permission).
//
// Redirects unauthenticated users to login and unauthorized users to /admin.
// This is a frontend UX guard — the backend enforces every protected endpoint.
function PermissionRoute({ permission, admin, children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  if (admin) {
    const user = getUser();
    if (user?.role !== "admin") {
      return <Navigate to="/admin" replace />;
    }
    return children;
  }
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}

export default PermissionRoute;