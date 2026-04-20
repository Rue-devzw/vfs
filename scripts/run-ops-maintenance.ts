import "dotenv/config";
import { runOperationsMaintenance } from "../src/lib/ops";

async function main() {
  const result = await runOperationsMaintenance();
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
