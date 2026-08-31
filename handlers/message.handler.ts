import { Context, InlineKeyboard } from "grammy";
import { parseReminder } from "../services/reminder-parser.service.js";
import { upsertUser, storePendingReminder } from "../services/reminder.service.js";
import { formatReminderTime } from "../utils/date.utils.js";

export async function handleMessage(ctx: Context) {
  const user = ctx.from;
  const text = ctx.message?.text;
  if (!user || !text) return;

  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("/")) return;

  // Ensure the user exists in the database.
  await upsertUser(user.id, user.first_name, user.username, user.last_name);

  const parsed = parseReminder(trimmed);

  // No recognizable date/time — guide the user, don't create anything.
  if (!parsed.remindAt || !parsed.task) {
    await ctx.reply(
      `I couldn't find a time 🕐\n\n` +
        `<blockquote>Try: <i>"Buy groceries tomorrow at 5 PM"</i></blockquote>`,
      { parse_mode: "HTML" }
    );
    return;
  }

  const normalizedTask = parsed.task;
  if (!normalizedTask || normalizedTask.length === 0) {
    await ctx.reply(
      `I found a time but not the task ✍️\n\n` +
        `<blockquote>Try: <i>"Buy groceries tomorrow at 5 PM"</i></blockquote>`,
      { parse_mode: "HTML" }
    );
    return;
  }

  // Store a pending (unconfirmed) reminder for this user, replacing any previous one.
  await storePendingReminder(user.id, normalizedTask, parsed.remindAt, null);

  const timeLabel = formatReminderTime(parsed.remindAt);

  const keyboard = new InlineKeyboard()
    .text("✅ Confirm", "reminder:confirm")
    .text("❌ Cancel", "reminder:cancel");

  await ctx.reply(
    `<blockquote>📌 ${escapeHtml(normalizedTask)}\n⏰ ${timeLabel}</blockquote>\n\n` +
      `Keep?`,
    { parse_mode: "HTML", reply_markup: keyboard }
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
