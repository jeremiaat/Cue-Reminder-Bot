import { bot, init } from "./bot.js";
import { startScheduler } from "../services/scheduler.js";
import { startHealthServer } from "./server.js";

await init();

// Keep the host's health checks satisfied (required on Render/Railway).
startHealthServer();

// ── Start everything ──
startScheduler(bot);
bot.start();

console.log("🤖 Reminder Bot is running (long-polling)...");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
