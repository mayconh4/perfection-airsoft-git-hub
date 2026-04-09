const TOKEN = 'sbp_95d6a1c0e40a378c5c704fc0110f21e724debe27';
const PROJECT_REF = 'seewdqetyolfmqsiyban';

async function checkFunction() {
    console.log('Checking function details...');
    try {
        const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/asaas-payment`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await resp.json();
        if (resp.ok) {
            console.log('Function Status:', data.status);
            console.log('Verify JWT:', data.verify_jwt);
            // Supabase API used to have a 'version' or 'updated_at'
            console.log('Updated At:', data.updated_at);
        } else {
            console.error('Failed to get function:', resp.status, data);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkFunction();
