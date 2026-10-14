// Loads backend/.env exactly once, BEFORE any other module reads process.env.
// `override` is intentionally false: real environment variables (Render, CI,
// tests) must always win over a developer's local .env file.
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env"), quiet: true });
