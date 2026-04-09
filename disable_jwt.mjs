import fs from 'fs';
import path from 'path';

const PROJECT_REF = 'seewdqetyolfmqsiyban';
const envFile = process.cwd() + '/.env.deploy';
let TOKEN = '';
if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    const match = content.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
    if (match) TOKEN = match[1].trim();
}

async function disableJwt() {
    try {
        const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/asaas-payment`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ verify_jwt: false })
        });
        const data = await resp.text();
        console.log('Status', resp.status);
        console.log('Result:', data);
    } catch (err) {
        console.error('Error', err);
    }
}

disableJwt();
