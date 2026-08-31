import "dotenv/config";
import { bot } from "../src/bot.js";

async function main() {
  await bot.api.deleteWebhook();
  console.log("✅ Webhook removed (long polling can be used).");
}

main().catch((err) => {
  console.error("Failed to delete webhook:", err);
  process.exit(1);
});
