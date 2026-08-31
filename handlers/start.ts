import { Context } from "grammy";
import { upsertUser, getUserReminderCount } from "../services/reminder.service.js";

export async function startHandler(ctx: Context) {
  const user = ctx.from;
  if (!user) return;

  await upsertUser(
    user.id,
    user.first_name,
    user.username,
    user.last_name
  );

  const name = user.first_name;
  const stats = await getUserReminderCount(user.id);

  await ctx.reply(
    `<b>👋 ${escapeHtml(name)}</b>\n\n` +
      `I turn plain text into reminders. Just type naturally — I'll confirm before saving.\n\n` +
      `<blockquote><i>"Call dentist in 2 hours"</i>\n<i>"Workout tomorrow at 7am"</i></blockquote>\n\n` +
      `Commands: /list · /stats · /help`,
    { parse_mode: "HTML" }
  );
}

export async function helpHandler(ctx: Context) {
  await ctx.reply(
    `<b>📖 Help</b>\n\n` +
      `Just type a task with a time — e.g.\n\n` +
      `<blockquote><i>"Buy groceries tomorrow at 5pm"</i>\n<i>"Take meds every day at 8am"</i>\n<i>"Pay rent next friday at 10am"</i></blockquote>\n\n` +
      `<b>Commands</b>\n` +
      `/list — show &amp; delete your reminders\n` +
      `/done &lt;id&gt; — complete one\n` +
      `/stats — your dashboard\n\n` +
      `Times: "in 2 hours", "tomorrow at 9am", "every day at 8am".`,
    { parse_mode: "HTML" }
  );
}

export async function statsHandler(ctx: Context) {
  const user = ctx.from;
  if (!user) return;

  const stats = await getUserReminderCount(user.id);

  const bar = (filled: number, total: number) => {
    if (total === 0) return "░░░░░░░░░░";
    const filledBars = Math.round((filled / total) * 10);
    return "█".repeat(filledBars) + "░".repeat(10 - filledBars);
  };

  const completionRate =
    stats.total > 0
      ? Math.round((stats.done / stats.total) * 100)
      : 0;

  const emoji =
    completionRate >= 80
      ? "🏆"
      : completionRate >= 50
        ? "💪"
        : stats.total === 0
          ? "🚀"
          : "📈";

  await ctx.reply(
    `<b>${emoji} Dashboard</b>\n\n` +
      `Total  <b>${stats.total}</b>  ·  ✅ ${stats.done}  ·  ⏳ ${stats.active}\n\n` +
      `<blockquote>${bar(stats.done, stats.total)} <b>${completionRate}%</b> complete</blockquote>`,
    { parse_mode: "HTML" }
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
