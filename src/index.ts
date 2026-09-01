import http from "node:http";
import { bot, init } from "./bot.js";
import { setBotInstance, processDueReminders } from "../services/scheduler.js";

// Node.js server entrypoint (Vercel's Node builder runs this via "main").
// This single process handles everything:
//   POST /api/webhook -> Telegram webhook updates
//   GET/POST /api/cron -> fire due reminders (external cron-jobs.org)
//   any other path    -> health check
//
// The health server binds IMMEDIATELY so the host always sees the port.
// DB init happens in the background — a slow Turso call must never block
// the listener.
let ready = false;
let initError: string | null = null;

// Retry init with backoff — Turso free-tier DBs hibernate after inactivity
// and the first connection attempt often times out while it wakes up.
async function tryInit(attempt: number): Promise<void> {
  try {
    await init();
    setBotInstance(bot);
    ready = true;
    console.log("🤖 Reminder Bot ready");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Init attempt ${attempt} failed: ${msg}`);
    if (attempt < 5) {
      const delay = Math.min(3000 * attempt, 15000);
      console.log(`Retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
      await tryInit(attempt + 1);
    } else {
      initError = msg;
      console.error("Failed to initialize after 5 attempts:", err);
    }
  }
}
tryInit(1);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");

    // POST / or POST /api/webhook -> Telegram update
    if (req.method === "POST" && (url.pathname === "/" || url.pathname === "/api/webhook")) {
      if (!ready) {
        res.writeHead(503).end(
          JSON.stringify({ ok: false, error: "starting", initError })
        );
        return;
      }
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      // Only process if it looks like a Telegram update (has update_id).
      if (parsed.update_id != null) {
        await bot.handleUpdate(parsed);
      }
      res.writeHead(200).end(JSON.stringify({ ok: true }));
      return;
    }

    if (url.pathname === "/api/cron") {
      if (!ready) {
        res.writeHead(503).end(
          JSON.stringify({ ok: false, error: "starting", initError })
        );
        return;
      }
      const secret = process.env.CRON_SECRET;
      if (secret && req.headers.authorization !== `Bearer ${secret}`) {
        res.writeHead(401).end(JSON.stringify({ ok: false, error: "Unauthorized" }));
        return;
      }
      const fired = await processDueReminders();
      res.writeHead(200).end(JSON.stringify({ ok: true, fired }));
      return;
    }

    // Everything else is a health check.
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        bot: "cue-reminder-bot",
        ready,
        initError,
        dbUrl: process.env.TURSO_DATABASE_URL ? "set" : "MISSING",
        dbAuth: process.env.TURSO_AUTH_TOKEN ? "set" : "MISSING",
        cronSecret: process.env.CRON_SECRET ? "set" : "MISSING",
      })
    );
  } catch (err) {
    console.error("Request error:", err);
    res.writeHead(500).end(JSON.stringify({ ok: false, error: "internal" }));
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`🩺 Health server listening on port ${port}`);
});

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}