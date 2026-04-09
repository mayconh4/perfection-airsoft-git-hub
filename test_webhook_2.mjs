import fs from 'fs';
import path from 'path';

const envFile = process.cwd() + '/.env';
let ANON_KEY = '';
if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    const match = content.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m);
    if (match) ANON_KEY = match[1].trim();
}

const webhookToken = "whsec_Ebnb6Ee92odJ-cuC3rABYmkD-Sopi45TrJn3nqDiRHk";
const url = "https://seewdqetyolfmqsiyban.supabase.co/functions/v1/asaas-payment";

const payload = {
  event: "PAYMENT_CONFIRMED",
  payment: {
    id: "pay_test_0123",
    externalReference: "d8328eb0-d664-4eaf-8fb8-37ebdaba1a90", // mock UUID, should not crash
    email: "cliente.teste@example.com",
    mobilePhone: "11999999999"
  }
};

async function testWebhook() {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "asaas-access-token": webhookToken,
        "Authorization": `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error("Error:", err);
  }
}

testWebhook();
