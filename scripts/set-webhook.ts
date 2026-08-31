import "dotenv/config";
import { bot } from "../src/bot.js";

async function main() {
  const url = process.env.WEBHOOK_URL;
  if (!url) {
    console.error('Set WEBHOOK_URL first (see .env.example).');
    process.exit(1);
  }

  await bot.api.setWebhook(url);
  console.log(`✅ Webhook set to ${url}`);
}

main().catch((err) => {
  console.error("Failed to set webhook:", err);
  process.exit(1);
});
