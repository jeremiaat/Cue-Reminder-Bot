import { eq, and, ne, lte, asc, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, reminders } from "../db/schema.js";

export async function upsertUser(
  telegramId: number,
  firstName: string,
  username?: string,
  lastName?: string
) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .get();

  if (existing) {
    await db
      .update(users)
      .set({
        firstName,
        username: username ?? existing.username,
        lastName: lastName ?? existing.lastName,
      })
      .where(eq(users.telegramId, telegramId))
      .run();
    return existing;
  }

  const result = await db
    .insert(users)
    .values({ telegramId, firstName, username, lastName })
    .returning()
    .get();
  return result;
}

// Saves a confirmed reminder with status "scheduled".
export async function saveReminder(
  userId: number,
  task: string,
  remindAt: Date,
  repeat?: string | null
) {
  return db
    .insert(reminders)
    .values({
      userId,
      message: task,
      remindAt: remindAt.toISOString(),
      repeat: repeat ?? null,
      status: "scheduled",
    })
    .returning()
    .get();
}

// ── Pending (unconfirmed) reminders ──────────────────────────────
// Persisted in the DB so the confirm/cancel step survives serverless
// cold starts and separate invocations.

// Store a pending reminder for a user, replacing any earlier one.
export async function storePendingReminder(
  telegramId: number,
  task: string,
  remindAt: Date,
  repeat?: string | null
) {
  const dbUser = await upsertUser(
    telegramId,
    "",
    undefined,
    undefined
  );

  // Clear any existing pending rows for this user.
  await db
    .delete(reminders)
    .where(
      and(eq(reminders.userId, dbUser.id), eq(reminders.status, "pending"))
    )
    .run();

  return db
    .insert(reminders)
    .values({
      userId: dbUser.id,
      message: task,
      remindAt: remindAt.toISOString(),
      repeat: repeat ?? null,
      status: "pending",
    })
    .returning()
    .get();
}

// Fetch the latest pending reminder for a user, if any.
export async function getPendingReminder(telegramId: number) {
  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .get();
  if (!dbUser) return undefined;

  return db
    .select()
    .from(reminders)
    .where(
      and(eq(reminders.userId, dbUser.id), eq(reminders.status, "pending"))
    )
    .orderBy(desc(reminders.createdAt))
    .limit(1)
    .get();
}

// Confirm a pending reminder: convert it to "scheduled".
export async function confirmPendingReminder(id: number) {
  return db
    .update(reminders)
    .set({ status: "scheduled" })
    .where(and(eq(reminders.id, id), eq(reminders.status, "pending")))
    .run();
}

// Cancel pending reminders for a user (discards unconfirmed requests).
export async function discardPendingReminder(telegramId: number) {
  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .get();
  if (!dbUser) return;

  await db
    .delete(reminders)
    .where(
      and(eq(reminders.userId, dbUser.id), eq(reminders.status, "pending"))
    )
    .run();
}

// Remove pending reminders older than the given cutoff (cleanup).
export async function cleanupStalePending(cutoffISO: string) {
  return db
    .delete(reminders)
    .where(
      and(
        eq(reminders.status, "pending"),
        lte(reminders.createdAt, cutoffISO)
      )
    )
    .run();
}

// ── Scheduler ────────────────────────────────────────────────────
// Only confirmed (scheduled) reminders fire; pending ones wait for the
// user to confirm or cancel.
export async function getScheduledDueReminders() {
  const now = new Date().toISOString();
  return db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.status, "scheduled"),
        lte(reminders.remindAt, now)
      )
    )
    .orderBy(asc(reminders.remindAt))
    .all();
}

export async function getReminderById(id: number) {
  return db.select().from(reminders).where(eq(reminders.id, id)).get();
}

export async function markReminderDone(id: number) {
  return db
    .update(reminders)
    .set({ status: "done" })
    .where(eq(reminders.id, id))
    .run();
}

export async function cancelReminder(id: number) {
  return db
    .update(reminders)
    .set({ status: "cancelled" })
    .where(eq(reminders.id, id))
    .run();
}

export async function deleteReminder(id: number) {
  return db.delete(reminders).where(eq(reminders.id, id)).run();
}

export async function getUserReminders(telegramId: number) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .get();
  if (!user) return [];
  return db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, user.id),
        eq(reminders.status, "scheduled")
      )
    )
    .orderBy(asc(reminders.remindAt))
    .all();
}

export async function getUserById(telegramId: number) {
  return db.select().from(users).where(eq(users.telegramId, telegramId)).get();
}

export async function getUserByInternalId(id: number) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export async function getUserReminderCount(telegramId: number) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .get();
  if (!user) {
    return { total: 0, active: 0, done: 0 };
  }
  const all = await db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, user.id))
    .all();
  return {
    total: all.length,
    active: all.filter(
      (r) => r.status !== "done" && r.status !== "cancelled"
    ).length,
    done: all.filter((r) => r.status === "done").length,
  };
}

export async function rescheduleReminder(id: number, newTime: Date) {
  return db
    .update(reminders)
    .set({ remindAt: newTime.toISOString() })
    .where(eq(reminders.id, id))
    .run();
}
