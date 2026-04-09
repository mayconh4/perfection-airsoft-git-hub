#!/usr/bin/env node
// deploy-functions.js - Script de deploy de Edge Functions sem Docker
// Uso: node deploy-functions.js

const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'seewdqetyolfmqsiyban';
const FUNCTIONS = [
    'mercadopago-payment', 
    'mercadopago-webhook', 
    'asaas-create-subaccount',
    'asaas-payment',
    'asaas-webhook',
    'cep-lookup'
];

// Lê o token
let TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
    const envFile = path.join(__dirname, '.env.deploy');
    if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        const match = content.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
        if (match) TOKEN = match[1].trim();
    }
}

if (!TOKEN) {
    console.error('ERRO: SUPABASE_ACCESS_TOKEN nao encontrado!');
    process.exit(1);
}

async function deployFunction(funcName) {
    const funcPath = path.join(__dirname, 'supabase', 'functions', funcName, 'index.ts');
    if (!fs.existsSync(funcPath)) {
        console.log(`  SKIP: ${funcName} (arquivo nao encontrado)`);
        return;
    }

    const code = fs.readFileSync(funcPath, 'utf8');
    
    // Tenta PUT primeiro (atualizar), depois POST (criar)
    for (const [method, url] of [
        ['PUT', `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${funcName}`],
        ['POST', `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`]
    ]) {
        try {
            const formData = new FormData();
            formData.append('metadata', JSON.stringify({ name: funcName, verify_jwt: false }));
            formData.append('file', new Blob([code], { type: 'application/typescript' }), 'index.ts');

            const resp = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${TOKEN}`
                },
                body: formData
            });

            const responseText = await resp.text();

            if (resp.ok) {
                console.log(`  OK [${method}]: ${funcName} (status ${resp.status})`);
                return;
            } else {
                // Se for 404 no PUT, ignoramos e tentamos o POST
                if (method === 'PUT' && resp.status === 404) continue;
                console.log(`  FALHA [${method}] ${resp.status}: ${responseText.slice(0, 200)}`);
            }
        } catch (e) {
            console.log(`  ERRO [${method}]: ${e.message}`);
        }
    }
}

async function main() {
    console.log('\n>>> Fazendo deploy das Edge Functions via Management API...');
    
    for (const func of FUNCTIONS) {
        await deployFunction(func);
    }

    // Health check
    console.log('\n>>> Health check...');
    for (const func of FUNCTIONS) {
        try {
            const r = await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/${func}`, {
                method: 'OPTIONS'
            });
            console.log(`  ${func}: ${r.status}`);
        } catch (e) {
            console.log(`  ${func}: ERRO - ${e.message}`);
        }
    }

    console.log('\n========================================');
    console.log('   DEPLOY DE FUNCTIONS CONCLUIDO!   ');
    console.log('========================================\n');
}

main().catch(e => {
    console.error('Erro fatal:', e);
    process.exit(1);
});
