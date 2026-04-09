import crypto from 'crypto';

const webhookToken = "whsec_Ebnb6Ee92odJ-cuC3rABYmkD-Sopi45TrJn3nqDiRHk";
const url = "https://seewdqetyolfmqsiyban.supabase.co/functions/v1/asaas-payment";

const payload = {
  event: "PAYMENT_RECEIVED",
  payment: {
    id: "pay_test_0123",
    externalReference: "6256247c-5ba5-4ceb-acc4-e9185aabcc6a", // UUID mock
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
        "asaas-access-token": webhookToken
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
