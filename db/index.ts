import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

// Vercel Turso integration sets TURSO_DB_TURSO_DATABASE_URL.
// Manual setup uses TURSO_DATABASE_URL.
// Development falls back to a local SQLite file.
const url =
  process.env.TURSO_DB_TURSO_DATABASE_URL ||
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "file:data/reminders.db";

const authToken =
  process.env.TURSO_DB_TURSO_AUTH_TOKEN ||
  process.env.TURSO_AUTH_TOKEN;

console.log(`DB url source: ${
  process.env.TURSO_DB_TURSO_DATABASE_URL ? "TURSO_DB_TURSO_DATABASE_URL" :
  process.env.TURSO_DATABASE_URL ? "TURSO_DATABASE_URL" :
  "local fallback"
}`);

const client = createClient({
  url,
  authToken,
  // Fail fast if the DB is hibernating or unreachable — default timeout is
  // very long and causes init() to hang on cold Vercel instances.
  timeout: 10,
});

export const db = drizzle(client, { schema });
