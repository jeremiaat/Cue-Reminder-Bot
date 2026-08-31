import { Context } from "grammy";
import {
  getPendingReminder,
  confirmPendingReminder,
  discardPendingReminder,
  upsertUser,
} from "../services/reminder.service.js";
import { formatReminderTime } from "../utils/date.utils.js";

export async function handleReminderCallback(ctx: Context) {
  const query = ctx.callbackQuery;
  if (!query?.data) return;

  const user = ctx.from;
  if (!user) {
    await ctx.answerCallbackQuery().catch(() => {});
    return;
  }

  switch (query.data) {
    case "reminder:confirm":
      await handleConfirm(ctx, user.id);
      break;
    case "reminder:cancel":
      await handleCancel(ctx, user.id);
      break;
    default:
      await ctx.answerCallbackQuery().catch(() => {});
  }
}

async function handleConfirm(ctx: Context, telegramId: number) {
  try {
    await upsertUser(
      telegramId,
      ctx.from?.first_name ?? "",
      ctx.from?.username,
      ctx.from?.last_name
    );

    const pending = await getPendingReminder(telegramId);

    // Duplicate confirmation attempts must not create the reminder twice.
    if (!pending) {
      await ctx.answerCallbackQuery({ text: "Expired — please send again." }).catch(() => {});

      await ctx
        .editMessageText("⚠️ This request expired. Please send it again.", {
          reply_markup: undefined,
        })
        .catch(() => {});
      return;
    }

    await confirmPendingReminder(pending.id);

    const timeLabel = formatReminderTime(new Date(pending.remindAt));

    await ctx.answerCallbackQuery({ text: "Saved ✅" }).catch(() => {});

    await ctx.editMessageText(
      `<blockquote>✅ ${escapeHtml(pending.message)}\n⏰ ${timeLabel}</blockquote>\n\n` +
        `I'll remind you then.`,
      { parse_mode: "HTML", reply_markup: undefined }
    ).catch(() => {});
  } catch (err) {
    console.error("Failed to save reminder:", err);
    await ctx.answerCallbackQuery({ text: "Something went wrong. Try again." }).catch(() => {});
    await ctx
      .editMessageText("❌ Failed to save. Please try again.")
      .catch(() => {});
  }
}

async function handleCancel(ctx: Context, telegramId: number) {
  await discardPendingReminder(telegramId);

  await ctx.answerCallbackQuery({ text: "Cancelled." }).catch(() => {});

  await ctx
    .editMessageText("❌ Cancelled — nothing saved.", {
      reply_markup: undefined,
    })
    .catch(() => {});
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
