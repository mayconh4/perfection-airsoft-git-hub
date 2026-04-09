import fs from 'fs';

const envFile = process.cwd() + '/.env';
let ANON_KEY = '';
if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    const match = content.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m);
    if (match) ANON_KEY = match[1].trim();
}

const url = "https://seewdqetyolfmqsiyban.supabase.co/functions/v1/asaas-payment";

async function check() {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({ action: "CHECK_STATUS", asaasId: "pay_7020087455080031" }) // Using a random or mock ID
    });
    console.log(res.status, await res.text());
  } catch (err) {
    console.error(err);
  }
}

check();
