import { bot, init } from "./bot.js";
import { startScheduler } from "../services/scheduler.js";
import { startHealthServer } from "./server.js";

// 1. Bind the health server FIRST so the host immediately sees the
//    service as live. Never block this on network/DB calls, otherwise
//    Render's health check fails and the deploy appears stuck.
startHealthServer();

// Polling can throw (e.g. transient Telegram 409 if log polling was
// interrupted elsewhere). Retry instead of letting the process die.
async function startPolling() {
  for (;;) {
    try {
      await bot.start();
      return; // never returns normally while polling; only on stop
    } catch (err) {
      console.error("Polling error, restarting in 5s:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// 2. Prepare the database (may take a moment on cold starts). Done in the
//    background so a slow Turso connection can never stall the port.
init()
  .then(async () => {
    // Telegram allows either a webhook or long-polling, never both. Delete
    // any leftover webhook so long-polling always wins cleanly and the bot
    // can't be silenced by a stale webhook URL.
    try {
      await bot.api.deleteWebhook({ drop_pending_updates: true });
    } catch (err) {
      console.error("Failed to clear webhook:", err);
    }

    startScheduler(bot);
    startPolling();
    console.log("🤖 Reminder Bot is running (long-polling)...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  })
  .catch((err) => {
    console.error("Failed to initialize the bot:", err);
    // Keep the process alive so the health server stays responsive;
    // Render will restart the service if it keeps failing.
  });
