const TOKEN = 'sbp_95d6a1c0e40a378c5c704fc0110f21e724debe27';
const PROJECT_REF = 'seewdqetyolfmqsiyban';

async function getEnvs() {
    console.log('Fetching Edge Function secrets...');
    try {
        const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await resp.json();
        if (resp.ok) {
            console.log('Secrets found:', data.map(s => s.name).join(', '));
        } else {
            console.error('Failed to get secrets:', resp.status, data);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

getEnvs();
