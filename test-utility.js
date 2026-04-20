const apiKey = "f9986a86-dbcf-4045-90e8-4398a0e83927";
const apiSecret = "eff46c0f-4be9-4dee-846c-141b1fe1179c";

async function test(url) {
  console.log("Testing:", url);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "x-api-secret": apiSecret,
    },
    body: JSON.stringify({ billerCode: "ZETDC", accountNumber: "123456789" })
  });
  console.log("Status:", response.status);
  console.log("Body:", await response.text());
}

async function run() {
  await test("https://zbnet.zb.co.zw/wallet_sandbox_api/utilities/v1/customer-validation");
  await test("https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/utilities/v1/customer-validation");
  await test("https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/v1/utilities/customer-validation");
}
run();
