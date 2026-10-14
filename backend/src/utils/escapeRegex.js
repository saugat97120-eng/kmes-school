// Escape user input before using it inside a MongoDB $regex so that characters
// such as "(" or "[" are matched literally instead of crashing the query.
export function escapeRegex(value) {
  return String(value).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
