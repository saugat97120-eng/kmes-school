// Strips Mongo operator keys ("$where", "$gt", etc.) and dotted keys from
// incoming request data, to block NoSQL injection via query/body/params.
//
// Written to mutate objects in place rather than reassigning req.query,
// since Express 5 exposes req.query as a getter-only property.
function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }
    const value = obj[key];
    if (value && typeof value === "object") {
      sanitizeObject(value);
    }
  }
  return obj;
}

export function sanitizeInput(req, res, next) {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
}
