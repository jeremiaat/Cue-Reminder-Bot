# 🤖 Cue Reminder Bot

A Telegram reminder bot with **natural-language time parsing** and an inline **confirm-before-save** flow. Type a task with a time in plain English, tap ✅ to confirm, and get reminded at the right moment.

Built with **grammY**, **chrono-node**, **Drizzle ORM**, and **Turso** (hosted SQLite).

## ✨ Features

- Parse times naturally: *"Buy groceries tomorrow at 5 PM"*, *"Call mom in 2 hours"*, *"Take meds every day at 8am"*
- Inline **✅ Confirm / ❌ Cancel** buttons — nothing is saved until you confirm
- `/list` with inline **delete** buttons per reminder
- `/done <id>`, `/delete <id>`, `/cancel <id>`, `/stats`
- Repeating reminders (daily / weekly / monthly / yearly)
- Premium messages using Telegram native **blockquotes**

## 🏗 Architecture

- **Long-polling**: the bot runs as a persistent Node.js process. This is how Telegram updates are received — the app must stay online.
- **Scheduler**: a per-minute in-process job scans for due reminders and sends them. Because it lives inside the running process, it works on **free** hosting plans (no paid cron needed).
- **Health server**: a tiny HTTP server on `$PORT` keeps Render's health checks happy and self-pings every 5 minutes to prevent Render's free tier from sleeping after 15 minutes of inactivity.
- **Database**: [Turso](https://turso.tech) (hosted libSQL). Tables are **auto-created on startup** — no manual migration needed.

> This project runs as an **always-on** bot (not serverless). The local `data/` SQLite file is only a development fallback.

## 📋 Requirements

- Node.js 18+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A free [Turso](https://turso.tech) database

## 🚀 Local Development

```bash
cp .env.example .env
# fill in BOT_TOKEN (TURSO_* can be left empty locally — it uses data/reminders.db)

npm install
npm run dev        # long-polling + per-minute scheduler + health server
```

Try it: send your bot *"Buy groceries tomorrow at 5 PM"*, tap **✅ Confirm**, then check `/list` and `/stats`.

## ☁️ Deploy on Render (free)

The bot runs as an always-on Render **web service**. Reminders fire from an in-process scheduler, and a self-ping keeps the free instance from sleeping.

### 1. Create the Turso database

```bash
npm i -g @libsql/turso
turso db create cue-reminder
turso db tokens create cue-reminder   # prints TURSO_AUTH_TOKEN
```

Grab the database URL (format `libsql://<db>-<org>.turso.io`) and the token from the Turso dashboard.

### 2. Push to GitHub

```bash
git add -A && git commit -m "Prepare for Render deployment"
git push -u origin main
```

### 3. Deploy on Render

1. On [render.com](https://render.com), click **New → Web Service**, connect your GitHub repo, and choose this repo.
2. Render auto-detects Node. Set these **environment variables**:

   | Variable | Value |
   | --- | --- |
   | `BOT_TOKEN` | Your token from @BotFather |
   | `TURSO_DATABASE_URL` | Your Turso URL |
   | `TURSO_AUTH_TOKEN` | Your Turso auth token |

3. Confirm the settings (a `render.yaml` blueprint is also included in the repo):

   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm run start:prod`
   - **Health check path:** `/` (Render pings this)
   - **Instance type:** Free

4. Deploy. Check the logs for `🤖 Reminder Bot is running (long-polling)...` and `🩺 Health server listening on port 10000`.

> **Important:** with long-polling you do **not** set a webhook. If a webhook is already configured, clear it once with `npm run webhook:delete`.

## ✅ Verify it works

1. Message your bot: *"Buy groceries tomorrow at 5 PM"* → tap **✅ Confirm** → it should reply "I'll remind you then."
2. `/list` should show the reminder.
3. Add a quick one: *"test in 1 minute"* → confirm → wait ~60s. The bot should send you the reminder (watch Render logs for `⏰ Fired reminder`).

## 🐞 Troubleshooting

- **Bot doesn't reply**: check Render logs. Ensure `BOT_TOKEN` is set.
- **Reminders don't fire**: confirm the process stays up and `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` are set so the scheduler can read the DB.
- **Service shows unhealthy**: it must bind `$PORT`. The health server does this automatically.
- **`404` / webhook conflict**: run `npm run webhook:delete` to ensure no webhook is configured.
- **Local dev uses the wrong DB**: leave `TURSO_DATABASE_URL` unset locally.

## 📜 Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local long-polling + scheduler + health server |
| `npm start` | Build + run the bot |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run the compiled bot (Render start command) |
| `npm run webhook:delete` | Clear a leftover Telegram webhook |
