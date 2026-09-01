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

// If the DB/deps take too long, surface a reason instead of hanging on
// 503 "starting" forever (e.g. missing Turso auth token stalls the client).
const INIT_TIMEOUT = 20000;
setTimeout(() => {
  if (!ready && !initError) {
    initError = "init timed out after 20s (check TURSO_DB/AUTH env)";
    console.error(initError);
  }
}, INIT_TIMEOUT);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/api/webhook" && req.method === "POST") {
      if (!ready) {
        res.writeHead(503).end(
          JSON.stringify({ ok: false, error: "starting", initError })
        );
        return;
      }
      const body = await readBody(req);
      await bot.handleUpdate(JSON.parse(body));
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

init()
  .then(() => {
    setBotInstance(bot);
    ready = true;
    console.log("🤖 Reminder Bot ready");
  })
  .catch((err) => {
    initError = err instanceof Error ? err.message : String(err);
    console.error("Failed to initialize the bot:", err);
    // Don't crash — health endpoint stays up and reports initError.
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