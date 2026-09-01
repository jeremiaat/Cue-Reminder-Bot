import http from "node:http";

// Minimal Node server entrypoint for Vercel's Node.js builder.
//
// This project is serverless: Telegram updates are handled by api/webhook.ts
// and reminders are fired by api/cron.ts. Vercel requires an entrypoint when
// the Framework Preset is Node.js; this satisfies that requirement with a
// tiny health endpoint so the route doesn't 500. It does NOT long-poll.
const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, bot: "cue-reminder-bot" }));
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`🩺 Health server listening on port ${port}`);
});