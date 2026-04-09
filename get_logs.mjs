const TOKEN = 'sbp_95d6a1c0e40a378c5c704fc0110f21e724debe27';
const PROJECT_REF = 'seewdqetyolfmqsiyban';

async function getLogs() {
    console.log('Fetching Edge Function logs...');
    try {
        const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/logs?service=functions&limit=20`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await resp.json();
        if (resp.ok) {
            console.log('Logs retrieved:');
            data.forEach(log => {
                console.log(`[${log.timestamp}] ${log.event_message}`);
            });
        } else {
            console.error('Failed to get logs:', resp.status, data);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

getLogs();
