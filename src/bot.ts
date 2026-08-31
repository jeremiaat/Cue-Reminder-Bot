import { Bot } from "grammy";
import "dotenv/config";
import { bootstrapDatabase } from "../db/bootstrap.js";
import { startHandler, helpHandler, statsHandler } from "../handlers/start.js";
import {
  listHandler,
  doneHandler,
  deleteHandler,
  cancelReminderHandler,
  deleteCallback,
} from "../handlers/reminder.js";
import { handleMessage } from "../handlers/message.handler.js";
import { handleReminderCallback } from "../handlers/reminder.callback.js";

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("BOT_TOKEN is missing in .env");
}

export const bot = new Bot(token);

// ── Commands ──
bot.command("start", startHandler);
bot.command("help", helpHandler);
bot.command("list", listHandler);
bot.command("done", doneHandler);
bot.command("delete", deleteHandler);
bot.command("cancel", cancelReminderHandler);
bot.command("stats", statsHandler);

// ── Callback queries ──
bot.callbackQuery(/^reminder:(confirm|cancel)$/, handleReminderCallback);
bot.callbackQuery(/^del:\d+$/, deleteCallback);

// ── Natural language reminder flow ──
bot.on("message:text", handleMessage);

// ── Error handler ──
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Idempotent schema bootstrap. Call before handling updates.
export async function init() {
  await bootstrapDatabase();
  return bot;
}
