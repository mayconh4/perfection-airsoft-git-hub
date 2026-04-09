const TOKEN = 'sbp_95d6a1c0e40a378c5c704fc0110f21e724debe27';
const PROJECT_REF = 'seewdqetyolfmqsiyban';

async function checkLogs() {
    try {
        console.log(`Checking logs for ${PROJECT_REF}...`);
        const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/asaas-webhook/logs?limit=20`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await resp.json();
        console.log('Webhook Logs:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkLogs();
