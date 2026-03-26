import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const meter = process.argv[2];

  if (!meter) {
    console.error("Usage: npm run egress:test-zesa -- <meter-number>");
    process.exit(1);
  }

  const { egressValidateCustomerAccount } = await import("../src/lib/payments/egress");

  const result = await egressValidateCustomerAccount({
    billerId: "ZETDC",
    customerAccount: meter,
  });

  console.log(JSON.stringify({
    meter,
    result,
    testedAt: new Date().toISOString(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
