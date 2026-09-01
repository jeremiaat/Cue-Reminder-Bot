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

- **Webhook-based**: Telegram pushes updates to `POST /api/webhook`. No long-polling process, so no `getUpdates` conflict (409) and no always-on server.
- **External cron**: [cron-jobs.org](https://cron-jobs.org) (or any ping service) calls `POST /api/cron` every minute to fire due reminders. Serverless functions sleep between pings, so the cron ping both wakes the function and fires reminders.
- **Database**: [Turso](https://turso.tech) (hosted libSQL). Tables are **auto-created on startup** — no manual migration needed.
- **Timezone**: all displayed times are formatted in `Africa/Addis_Ababa` (UTC+3); times are stored as UTC.

> This is a **serverless** deployment, not an always-on process.

## 📋 Requirements

- Node.js 18+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A free [Turso](https://turso.tech) database
- A Vercel account

## 🚀 Local Development

```bash
cp .env.example .env
# fill in BOT_TOKEN (TURSO_* can be left empty locally — it uses data/reminders.db)

npm install
npm run dev        # runs Vercel dev server exposing /api/webhook + /api/cron
```

Try it: send your bot *"Buy groceries tomorrow at 5 PM"*, tap **✅ Confirm**, then check `/list` and `/stats`.

## ☁️ Deploy on Vercel (free)

### 1. Create the Turso database

```bash
npm i -g @libsql/turso
turso db create cue-reminder
turso db tokens create cue-reminder   # prints TURSO_AUTH_TOKEN
```

Grab the database URL (format `libsql://<db>-<org>.turso.io`) and the token from the Turso dashboard.

### 2. Push to GitHub

```bash
git add -A && git commit -m "Deploy bot to Vercel"
git push -u origin main
```

### 3. Deploy on Vercel

1. On [vercel.com](https://vercel.com), click **Add New → Project**, connect your GitHub repo.
2. Vercel auto-detects the framework and builds. Set these **environment variables** (Settings → Environment Variables):

   | Variable | Value |
   | --- | --- |
   | `BOT_TOKEN` | Your token from @BotFather |
   | `TURSO_DATABASE_URL` | Your Turso URL |
   | `TURSO_AUTH_TOKEN` | Your Turso auth token |
   | `CRON_SECRET` | Any long random string (used to guard `/api/cron`) |

3. Deploy. You'll get a URL like `https://<project>.vercel.app`.

### 4. Register the Telegram webhook

```bash
WEBHOOK_URL=https://<project>.vercel.app/api/webhook npm run webhook:set
```

Verify: the `/api/webhook` endpoint returns `{"ok":true}` when Telegram pings it.

### 5. Set up the external cron (cron-jobs.org)

1. Create a **free account** at [cron-jobs.org](https://cron-jobs.org).
2. **Create cronjob**:
   - URL: `https://<project>.vercel.app/api/cron`
   - Method: `POST` (or GET)
   - **Headers** (optional, recommended): `Authorization: Bearer <CRON_SECRET>`
   - Schedule: **every minute** (`* * * * *`)
3. Save and enable it. This is what fires your reminders.

> The cron ping keeps Vercel's serverless function warm and triggers reminder delivery every minute.

## ✅ Verify it works

1. Message your bot: *"Buy groceries tomorrow at 5 PM"* → tap **✅ Confirm** → it should reply "I'll remind you then."
2. `/list` should show the reminder.
3. Add a quick one: *"test in 1 minute"* → confirm → within a minute the cron job triggers delivery. You should get the reminder (watch Vercel logs for `⏰ Fired reminder`).

## 🐞 Troubleshooting

- **Bot doesn't reply**: check Vercel function logs (`/api/webhook`). Ensure `BOT_TOKEN` is set and the webhook is registered (`npm run webhook:set`).
- **Reminders don't fire**: confirm the cron job is enabled and `CRON_SECRET` (if set) is passed as a header. Check `/api/cron` returns `{"ok":true,"fired":N}`.
- **`409` conflict**: this happened with the old long-polling setup. With webhook + serverless there is no long-polling, so it can't recur. If it does, run `npm run webhook:delete` and re-register.

## 📜 Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Run the Vercel dev server (local) |
| `npm run build` | Compile TypeScript to `dist/` (validation) |
| `npm run webhook:set` | Register the Telegram webhook (needs `WEBHOOK_URL`) |
| `npm run webhook:delete` | Clear the Telegram webhook |