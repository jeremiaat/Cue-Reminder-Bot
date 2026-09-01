import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

// Production: point at a hosted Turso database via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
// Development: default to a local SQLite file (works with drizzle-kit and the bot locally).
const url =
  process.env.TURSO_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "file:data/reminders.db";

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
  // Fail fast if the DB is hibernating or unreachable — default timeout is
  // very long and causes init() to hang on cold Vercel instances.
  timeout: 10,
});

export const db = drizzle(client, { schema });
