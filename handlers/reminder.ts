import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { formatShortDate } from "../utils/date.utils.js";
import {
  getUserReminders,
  getReminderById,
  markReminderDone,
  cancelReminder,
  deleteReminder,
  getUserById,
} from "../services/reminder.service.js";

export async function listHandler(ctx: Context) {
  const user = ctx.from;
  if (!user) return;

  const reminders = await getUserReminders(user.id);

  if (reminders.length === 0) {
    await ctx.reply(
      `<b>📭 All clear</b>\n\n<i>Type a task with a time to add one.</i>`,
      { parse_mode: "HTML" }
    );
    return;
  }

  const { text, keyboard } = buildListMessage(reminders);

  await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
}

export async function deleteCallback(ctx: Context) {
  const query = ctx.callbackQuery;
  if (!query?.data) return;

  const user = ctx.from;
  if (!user) return;

  const idMatch = query.data.match(/^del:(\d+)$/);
  if (!idMatch) {
    await ctx.answerCallbackQuery().catch(() => {});
    return;
  }

  const reminderId = parseInt(idMatch[1], 10);
  const reminder = await getReminderById(reminderId);
  const owner = await getUserById(user.id);

  // Only allow the owner to delete.
  if (!reminder || !owner || reminder.userId !== owner.id) {
    await ctx.answerCallbackQuery({ text: "Reminder not found or not yours." }).catch(() => {});
    return;
  }

  const deletedName = reminder.message;
  await deleteReminder(reminderId);

  await ctx.answerCallbackQuery({ text: "Deleted" }).catch(() => {});

  // Re-render the remaining list in the same message.
  const remaining = await getUserReminders(user.id);
  if (remaining.length === 0) {
    await ctx
      .editMessageText(
        `<blockquote>🗑 ${escapeHtml(deletedName)}</blockquote>\n\n` +
          `<b>📭 All clear.</b>`,
        { parse_mode: "HTML", reply_markup: undefined }
      )
      .catch(() => {});
    return;
  }

  const { text, keyboard } = buildListMessage(remaining);
  await ctx
    .editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard })
    .catch(() => {});
}

function buildListMessage(reminders: Array<{ id: number; message: string; remindAt: string; repeat: string | null }>) {
  let message = `<b>📋 Reminders</b>\n\n`;
  const keyboard = new InlineKeyboard();

  reminders.forEach((r, i) => {
    const formatted = formatShortDate(new Date(r.remindAt));
    const repeatTag = r.repeat ? ` 🔁` : "";

    message += `${escapeHtml(r.message)}${repeatTag}\n`;
    message += `<i>${formatted}</i>\n\n`;

    const btnLabel = trimButton(`🗑 ${r.message}`, 40);
    keyboard.text(btnLabel, `del:${r.id}`).row();
  });

  message += `<i>Tap a 🗑 button to delete.</i>`;

  return { text: message, keyboard };
}

function trimButton(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export async function doneHandler(ctx: Context) {
  const text = ctx.message?.text?.trim() ?? "";
  const idMatch = text.match(/\/done\s+(\d+)/);

  if (!idMatch) {
    const user = ctx.from;
    if (!user) return;

    const reminders = await getUserReminders(user.id);
    if (reminders.length === 0) {
      await ctx.reply(`<b>📭 Nothing to complete.</b>`, { parse_mode: "HTML" });
      return;
    }

    let msg = `<b>✅ Complete</b>\n\n<i>Send /done &lt;ID&gt;</i>\n\n`;

    reminders.forEach((r, i) => {
      const formatted = formatShortDate(new Date(r.remindAt));
      msg += `${escapeHtml(r.message)}\n<i>${formatted}</i> · ID: <code>${r.id}</code>\n\n`;
    });

    await ctx.reply(msg, { parse_mode: "HTML" });
    return;
  }

  const reminderId = parseInt(idMatch[1]);
  const reminder = await getReminderById(reminderId);

  if (!reminder) {
    await ctx.reply(`<b>❌ Not found.</b>\n\n<i>Use /list to see yours.</i>`, {
      parse_mode: "HTML",
    });
    return;
  }

  await markReminderDone(reminderId);

  await ctx.reply(
    `<blockquote>✅ ${escapeHtml(reminder.message)}</blockquote>\n\n` + `<i>Nice one 💪</i>`,
    { parse_mode: "HTML" }
  );
}

export async function deleteHandler(ctx: Context) {
  const text = ctx.message?.text?.trim() ?? "";
  const idMatch = text.match(/\/delete\s+(\d+)/);

  if (!idMatch) {
    const user = ctx.from;
    if (!user) return;

    const reminders = await getUserReminders(user.id);
    if (reminders.length === 0) {
      await ctx.reply(`<b>📭 Nothing to delete.</b>`, { parse_mode: "HTML" });
      return;
    }

    let msg = `<b>🗑 Delete</b>\n\n<i>Send /delete &lt;ID&gt;</i>\n\n`;

    reminders.forEach((r, i) => {
      const formatted = formatShortDate(new Date(r.remindAt));
      msg += `${escapeHtml(r.message)}\n<i>${formatted}</i> · ID: <code>${r.id}</code>\n\n`;
    });

    await ctx.reply(msg, { parse_mode: "HTML" });
    return;
  }

  const reminderId = parseInt(idMatch[1]);
  const reminder = await getReminderById(reminderId);

  if (!reminder) {
    await ctx.reply(`<b>❌ Not found.</b>`, { parse_mode: "HTML" });
    return;
  }

  await deleteReminder(reminderId);

  await ctx.reply(
    `<blockquote>🗑 ${escapeHtml(reminder.message)}</blockquote>\n\n` + `<i>Removed.</i>`,
    { parse_mode: "HTML" }
  );
}

export async function cancelReminderHandler(ctx: Context) {
  const text = ctx.message?.text?.trim() ?? "";
  const idMatch = text.match(/\/cancel\s+(\d+)/);

  if (!idMatch) {
    const user = ctx.from;
    if (!user) return;

    const reminders = await getUserReminders(user.id);
    if (reminders.length === 0) {
      await ctx.reply(`<b>📭 Nothing to cancel.</b>`, { parse_mode: "HTML" });
      return;
    }

    let msg = `<b>🚫 Cancel</b>\n\n<i>Send /cancel &lt;ID&gt;</i>\n\n`;

    reminders.forEach((r, i) => {
      const formatted = formatShortDate(new Date(r.remindAt));
      msg += `${escapeHtml(r.message)}\n<i>${formatted}</i> · ID: <code>${r.id}</code>\n\n`;
    });

    await ctx.reply(msg, { parse_mode: "HTML" });
    return;
  }

  const reminderId = parseInt(idMatch[1]);
  const reminder = await getReminderById(reminderId);

  if (!reminder) {
    await ctx.reply(`<b>❌ Not found.</b>`, { parse_mode: "HTML" });
    return;
  }

  await cancelReminder(reminderId);

  await ctx.reply(
    `<blockquote>🚫 ${escapeHtml(reminder.message)}</blockquote>\n\n` + `<i>Stopped.</i>`,
    { parse_mode: "HTML" }
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
