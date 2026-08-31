import { VercelRequest, VercelResponse } from "@vercel/node";
import { bot, init } from "../src/bot.js";
import { setBotInstance, processDueReminders } from "../services/scheduler.js";

setBotInstance(bot);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Guard the cron endpoint with a secret so only Vercel Cron can trigger it.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    await init();
    const fired = await processDueReminders();
    res.status(200).json({ ok: true, fired });
  } catch (err) {
    console.error("Cron error:", err);
    res.status(500).json({ ok: false });
  }
}
