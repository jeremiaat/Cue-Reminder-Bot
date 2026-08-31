# 🤖 Cue Reminder Bot

A Telegram reminder bot with **natural-language time parsing** and an inline **confirm-before-save** flow. Type a task with a time in plain English, tap ✅ to confirm, and get reminded at the right moment.

Built with **grammY**, **chrono-node**, **Drizzle ORM**, and **Turso** (hosted SQLite) — deployable to **Vercel** as a webhook + cron.

## ✨ Features

- Parse times naturally: *"Buy groceries tomorrow at 5 PM"*, *"Call mom in 2 hours"*, *"Take meds every day at 8am"*
- Inline **✅ Confirm / ❌ Cancel** buttons — nothing is saved until you confirm
- `/list` with inline **delete** buttons per reminder
- `/done <id>`, `/delete <id>`, `/cancel <id>`, `/stats`
- Repeating reminders (daily / weekly / monthly / yearly)
- Premium messages using Telegram native **blockquotes**

## 🏗 Architecture

- **Webhook**: Telegram sends updates to `/api/webhook` (a Vercel serverless function).
- **Scheduler**: Vercel Cron hits `/api/cron` once a minute; it scans for due reminders and sends them.
- **Database**: [Turso](https://turso.tech) (hosted libSQL). Tables are auto-created on startup — no manual migration needed.

> This project is serverless-first. The local `data/` SQLite file is only a development fallback and is **not** persisted in production.

## 📋 Requirements

- Node.js 18+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A free [Turso](https://turso.tech) database (for production)

## 🚀 Local Development

```bash
cp .env.example .env
# fill in BOT_TOKEN (TURSO_* can be left empty locally — it uses data/reminders.db)

npm install
npm run dev        # long-polling + local scheduler, once a minute
```

Try it: send your bot *"Buy groceries tomorrow at 5 PM"*, tap **✅ Confirm**, then check `/list` and `/stats`.

## ☁️ Deployment on Vercel

### 1. Create the Turso database

```bash
npm i -g @libsql/turso
turso db create cue-reminder
turso db tokens create cue-reminder   # prints TURSO_AUTH_TOKEN
```

Grab the database URL (format `libsql://<db>-<org>.turso.io`) and the token.

### 2. Deploy

Push this repo to GitHub, then import it on Vercel. Set these **environment variables**:

| Variable | Value |
| --- | --- |
| `BOT_TOKEN` | Your token from @BotFather |
| `TURSO_DATABASE_URL` | Your Turso URL |
| `TURSO_AUTH_TOKEN` | Your Turso auth token |
| `CRON_SECRET` | A long random string (used to secure `/api/cron`) |

> Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically, and `/api/cron` verifies it. [Cron requires a paid plan](https://vercel.com/docs/cron-jobs).

### 3. Point Telegram at your webhook

Replace `<YOUR_PRODUCTION_URL>` with your deployed URL, then run:

```bash
npm run webhook:set   # uses WEBHOOK_URL from .env, e.g. https://your-app.vercel.app/api/webhook
```

Verify with:

```bash
# should show the url and pending_update_count: 0
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

### 4. Verify

- Send your bot a message → it responds and shows the confirm buttons.
- Check `https://your-app.vercel.app/api/cron` returns `401` without the secret.

## 🐞 Troubleshooting

- **Reminders don't fire**: make sure the Turso DB is reachable and Vercel Cron is enabled (paid plan). Test `/api/cron` with `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron`.
- **Local dev uses the wrong DB**: leave `TURSO_DATABASE_URL` unset locally.
- **Webhook 404**: re-run `npm run webhook:set` after redeploying (URLs can change).

## 📜 Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local long-polling with a per-minute scheduler |
| `npm start` | Alias for `dev` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run webhook:set` | Set the Telegram webhook to `WEBHOOK_URL` |
| `npm run db:migrate` | Run Drizzle migrations against the configured DB |
