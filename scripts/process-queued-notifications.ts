import "dotenv/config";
import { processQueuedNotifications } from "../src/lib/firestore/notifications";

async function main() {
  const result = await processQueuedNotifications(100);
  console.log(JSON.stringify({
    ...result,
    processedAt: new Date().toISOString(),
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
