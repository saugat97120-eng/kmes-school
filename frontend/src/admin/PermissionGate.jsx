import { hasPermission } from "./api";

// Permission gate: renders children only when the current user holds the
// required permission. A UX control — the backend enforces authorization
// independently on every protected endpoint.
function PermissionGate({ permission, all = [], any = [], children }) {
  if (Array.isArray(all) && all.length && !all.every(hasPermission)) {
    return null;
  }
  if (Array.isArray(any) && any.length && !any.some(hasPermission)) {
    return null;
  }
  if (!all.length && !any.length && !hasPermission(permission)) {
    return null;
  }
  return children;
}

export default PermissionGate;