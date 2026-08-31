import cron from "node-cron";
import { Bot } from "grammy";
import {
  getScheduledDueReminders,
  markReminderDone,
  rescheduleReminder,
  getUserByInternalId,
  cleanupStalePending,
} from "./reminder.service.js";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

let botInstance: Bot | null = null;

function getRepeatNextDate(current: Date, repeat: string): Date {
  switch (repeat) {
    case "daily":
      return addDays(current, 1);
    case "weekly":
      return addWeeks(current, 1);
    case "monthly":
      return addMonths(current, 1);
    case "yearly":
      return addYears(current, 1);
    default:
      return addDays(current, 1);
  }
}

// Core worker shared by the local node-cron loop and the serverless
// /cron endpoint. Sends every due, confirmed reminder.
export async function processDueReminders(): Promise<number> {
  if (!botInstance) return 0;

  // Drop stale unconfirmed requests (older than ~30 minutes).
  await cleanupStalePending(
    new Date(Date.now() - 30 * 60 * 1000).toISOString()
  );

  const dueReminders = await getScheduledDueReminders();
  let fired = 0;

  for (const reminder of dueReminders) {
    try {
      const user = await getUserByInternalId(reminder.userId);
      if (!user) continue;

      const repeatLabel = reminder.repeat ? ` 🔄 ${reminder.repeat}` : "";

      await botInstance.api.sendMessage(
        user.telegramId,
        `⏰ <b>Reminder</b>${repeatLabel}\n\n` +
          `<blockquote>${escapeHtml(reminder.message)}</blockquote>\n\n` +
          `<i>Tap /done when finished</i>`,
        { parse_mode: "HTML" }
      );

      if (reminder.repeat) {
        const nextDate = getRepeatNextDate(
          new Date(reminder.remindAt),
          reminder.repeat
        );
        await rescheduleReminder(reminder.id, nextDate);
      } else {
        await markReminderDone(reminder.id);
      }

      fired += 1;
      console.log(
        `⏰ Fired reminder #${reminder.id} "${reminder.message}" to @${user.username ?? user.telegramId}`
      );
    } catch (err) {
      console.error(`Failed to send reminder ${reminder.id}:`, err);
    }
  }

  return fired;
}

// Local development runner only. In production (serverless) the /cron
// endpoint calls processDueReminders() instead.
export function startScheduler(bot: Bot) {
  botInstance = bot;

  processDueReminders().catch((err) =>
    console.error("Scheduler startup error:", err)
  );

  cron.schedule("* * * * *", () => {
    processDueReminders().catch((err) =>
      console.error("Scheduler error:", err)
    );
  });

  console.log("⏰ Scheduler started — checking every minute");
}

export function setBotInstance(bot: Bot) {
  botInstance = bot;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
