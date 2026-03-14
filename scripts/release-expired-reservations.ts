import "dotenv/config";
import { releaseExpiredReservations } from "../src/lib/firestore/inventory";

async function main() {
  const result = await releaseExpiredReservations(500);
  console.log(JSON.stringify({
    releasedReservations: result.updated,
    orderReferences: result.orderReferences,
    processedAt: new Date().toISOString(),
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
