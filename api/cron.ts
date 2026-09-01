import { VercelRequest, VercelResponse } from "@vercel/node";
import { bot, init } from "../src/bot.js";
import { setBotInstance, processDueReminders } from "../services/scheduler.js";

let initPromise: Promise<import("grammy").Bot> | null = null;
function getBot() {
  if (!initPromise) {
    initPromise = init().then((b) => {
      setBotInstance(b);
      return b;
    });
  }
  return initPromise;
}

// External cron (cron-jobs.org) calls this every minute to fire due reminders.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    await getBot();
    const fired = await processDueReminders();
    res.status(200).json({ ok: true, fired });
  } catch (err) {
    console.error("Cron error:", err);
    res.status(500).json({ ok: false });
  }
}