import { config } from "dotenv";
config({ path: ".env.local" });

import { DigitalService } from "./src/lib/digital-service-logic";

async function run() {
  try {
    const result = await DigitalService.vendDigitalFulfilment("DSTV", {
      orderReference: "digi_1778667733490_8715",
      gatewayReference: "OJBS6215EHSZ",
      accountNumber: "4117068963",
      amountUsd: 26, 
      serviceMeta: {
        paymentType: "BOUQUET",
        bouquet: "PRM", // Let's guess premium or Dstv Bouquet
        months: "1",
        addon: "None",
        customerName: "Test User",
        currencyCode: "840"
      }
    });
    console.log("Success:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
    if (error && typeof error === 'object' && 'responseDetails' in error) {
      console.error("responseDetails:", (error as any).responseDetails);
    }
    if (error && typeof error === 'object' && 'responseBody' in error) {
      console.error("responseBody:", (error as any).responseBody);
    }
  }
}

run();
