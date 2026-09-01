import { VercelRequest, VercelResponse } from "@vercel/node";
import type { Update } from "grammy/types";
import { bot, init } from "../src/bot.js";
import { setBotInstance } from "../services/scheduler.js";

// The cron endpoint and the webhook each get a fresh instance per request.
// Cache the init promise so we don't re-bootstrap the DB on every update.
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const b = await getBot();
    if (req.method === "POST" && req.body) {
      await b.handleUpdate(req.body as Update);
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ ok: false });
  }
}
