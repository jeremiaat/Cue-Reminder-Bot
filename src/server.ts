import http from "node:http";

// Render (and most PaaS) expects the service to bind an HTTP port and
// respond to health checks. This tiny server does that. It also
// self-pings every 5 minutes so Render's free tier doesn't put the
// service to sleep after 15 minutes of inactivity.
export function startHealthServer() {
  const port = Number(process.env.PORT) || 8080;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, bot: "cue-reminder-bot" }));
  });

  server.listen(port, () => {
    console.log(`🩺 Health server listening on port ${port}`);
  });

  // Self-ping to avoid Render's 15-minute idle sleep.
  const url = `http://127.0.0.1:${port}/`;
  setInterval(() => {
    fetch(url)
      .then(() => console.log("💓 internal keep-alive ping sent"))
      .catch((err) =>
        console.error("Keep-alive ping failed:", err && err.message)
      );
  }, 5 * 60 * 1000);

  return server;
}
