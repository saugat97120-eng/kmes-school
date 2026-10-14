// Small helper so validation problems surface as 400s, not generic 500s.
export function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.publicMessage = message;
  return err;
}
