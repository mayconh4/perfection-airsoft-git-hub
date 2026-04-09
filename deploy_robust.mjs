import fs from 'fs';

const TOKEN = 'sbp_95d6a1c0e40a378c5c704fc0110f21e724debe27';
const PROJECT_REF = 'seewdqetyolfmqsiyban';

async function deploy(funcName, verifyJwt = false) {
    console.log(`Deploying ${funcName} (Cleanup & Deploy)...`);
    const code = fs.readFileSync(`./supabase/functions/${funcName}/index.ts`, 'utf8');
    
    // 1. DELETE EXPLICITO (Limpeza de Estado)
    console.log(`Cleaning up ${funcName}...`);
    await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${funcName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    // 2. AGUARDAR PROPAGAÇÃO
    await new Promise(r => setTimeout(r, 2000));

    // 3. POST (Criação Limpa)
    const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`;
    console.log(`Target URL: ${url}`);

    const formData = new FormData();
    formData.append('metadata', JSON.stringify({ 
        name: funcName, 
        slug: funcName, 
        verify_jwt: verifyJwt 
    }));
    formData.append('file', new Blob([code], { type: 'application/typescript' }), 'index.ts');

    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}` },
        body: formData
    });

    const text = await resp.text();
    console.log(`Status: ${resp.status}`);
    try {
        const data = JSON.parse(text);
        if (resp.ok) {
            console.log(`✅ ${funcName} deployed successfully!`);
        } else {
            console.error(`❌ ${funcName} deployment failed!`, data);
        }
    } catch (e) {
        console.log('Response (text):', text.slice(0, 200));
        if (resp.ok) console.log(`✅ ${funcName} deployed successfully!`);
    }
}

async function main() {
    await deploy('asaas-payment');
    await deploy('asaas-webhook');
}

main();
