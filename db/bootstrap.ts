import { db } from "./index.js";

// Ensures the required tables exist. Idempotent — safe to run on every
// startup (dev and serverless cold starts).
export async function bootstrapDatabase() {
  await db.$client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER NOT NULL UNIQUE,
      username TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await db.$client.execute(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      remind_at TEXT NOT NULL,
      repeat TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
  `);
}
