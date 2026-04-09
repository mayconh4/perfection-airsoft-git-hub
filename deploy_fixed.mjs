import fs from 'fs';

const TOKEN = 'sbp_95d6a1c0e40a378c5c704fc0110f21e724debe27';
const PROJECT_REF = 'seewdqetyolfmqsiyban';

async function deploy(funcName, verifyJwt = false) {
    console.log(`Deploying ${funcName}...`);
    const code = fs.readFileSync(`./supabase/functions/${funcName}/index.ts`, 'utf8');
    
    // 1. Try to see if it exists
    const getRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${funcName}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    
    const method = getRes.ok ? 'PATCH' : 'POST';
    const url = method === 'PATCH' 
        ? `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${funcName}`
        : `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`;

    console.log(`Method: ${method}`);

    const body = method === 'POST' 
        ? { name: funcName, slug: funcName, verify_jwt: verifyJwt, body: code }
        : { body: code, verify_jwt: verifyJwt };

    const resp = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await resp.json();
    if (resp.ok) {
        console.log(`✅ ${funcName} deployed successfully!`);
    } else {
        console.error(`❌ ${funcName} deployment failed!`, resp.status, data);
    }
}

async function main() {
    await deploy('asaas-payment');
    await deploy('asaas-webhook');
}

main();
