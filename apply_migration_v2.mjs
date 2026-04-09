const TOKEN = 'sbp_95d6a1c0e40a378c5c704fc0110f21e724debe27';
const PROJECT_REF = 'seewdqetyolfmqsiyban';
const QUERY = `ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pix_confirmado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;`;

async function runSql() {
  try {
    const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/query`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: QUERY })
    });
    const data = await resp.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}
runSql();
