const TOKEN = 'sbp_95d6a1c0e40a378c5c704fc0110f21e724debe27';
const PROJECT_REF = 'seewdqetyolfmqsiyban';

async function getOrders() {
    try {
        const secretsRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const secrets = await secretsRes.json();
        const serviceKey = secrets.find(s => s.name === 'SUPABASE_SERVICE_ROLE_KEY')?.value;
        const projectUrl = `https://${PROJECT_REF}.supabase.co`;

        console.log(`Checking orders at ${projectUrl}...`);
        const resp = await fetch(`${projectUrl}/rest/v1/orders?select=id,status,created_at&order=created_at.desc&limit=5`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });
        const data = await resp.json();
        console.log('Recent Orders:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

getOrders();
