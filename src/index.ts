import { bot, init } from "./bot.js";
import { startScheduler } from "../services/scheduler.js";

await init();

// ── Start everything ──
startScheduler(bot);
bot.start();

console.log("🤖 Reminder Bot is running (long-polling)...");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
