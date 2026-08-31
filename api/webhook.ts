import { VercelRequest, VercelResponse } from "@vercel/node";
import { bot, init } from "../src/bot.js";
import { setBotInstance } from "../services/scheduler.js";

setBotInstance(bot);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const b = await init();
    if (req.method === "POST") {
      const update = req.body;
      await b.handleUpdate(update);
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ ok: false });
  }
}
