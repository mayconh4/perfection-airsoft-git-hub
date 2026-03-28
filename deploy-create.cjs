// deploy-create.cjs - Cria/Atualiza Edge Functions via Management API (Multipart)
'use strict';
const fs   = require('fs');
const path = require('path');

const PROJECT_REF = 'seewdqetyolfmqsiyban';
const TOKEN = 'sbp_f96b51f3c1062efd229f05670f09e698caaf6b32';
const FUNCTIONS = ['mercadopago-payment', 'mercadopago-webhook'];

async function deployFunction(funcName) {
    console.log(`\n>>> Iniciando deploy de: ${funcName}`);
    const funcPath = path.join(__dirname, 'supabase', 'functions', funcName, 'index.ts');
    
    if (!fs.existsSync(funcPath)) {
        console.error(`ERRO: Arquivo nao encontrado em ${funcPath}`);
        return;
    }

    const code = fs.readFileSync(funcPath, 'utf8');
    const metadata = JSON.stringify({ name: funcName, verify_jwt: false });

    const boundary = '----Boundary' + Date.now();
    const crlf = '\r\n';
    const parts = [
        '--' + boundary,
        'Content-Disposition: form-data; name="metadata"',
        'Content-Type: application/json',
        '',
        metadata,
        '--' + boundary,
        'Content-Disposition: form-data; name="file"; filename="index.ts"',
        'Content-Type: application/typescript',
        '',
        code,
        '--' + boundary + '--',
        ''
    ].join(crlf);

    const bodyBuf = Buffer.from(parts, 'utf8');
    const headers = {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': String(bodyBuf.length)
    };

    const urlBase = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`;
    
    // Tenta atualizar primeiro (PUT)
    console.log(`    [PUT] Atualizando ${funcName}...`);
    const putResp = await fetch(`${urlBase}/${funcName}`, { method: 'PUT', headers, body: bodyBuf });
    const putBody = await putResp.text();
    console.log('    Status:', putResp.status, putBody.slice(0, 100));

    if (!putResp.ok) {
        // Se PUT falhar (404), tenta criar (POST)
        console.log(`    [POST] Criando ${funcName}...`);
        const postResp = await fetch(urlBase, { method: 'POST', headers, body: bodyBuf });
        const postBody = await postResp.text();
        console.log('    Status:', postResp.status, postBody.slice(0, 100));
    }
}

async function main() {
    for (const func of FUNCTIONS) {
        await deployFunction(func);
    }
    
    console.log('\n>>> Revisando status final...');
    const rl = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
        headers: { 'Authorization': 'Bearer ' + TOKEN }
    });
    const dl = await rl.json();
    if (Array.isArray(dl)) {
        dl.forEach(f => console.log(' -', f.slug, f.status));
    } else {
        console.log(JSON.stringify(dl));
    }
}

main().catch(e => { console.error('ERRO:', e); process.exit(1); });

