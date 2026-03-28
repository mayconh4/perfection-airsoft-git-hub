// deploy-create.cjs - Cria a Edge Function mercadopago-payment via POST
'use strict';
const fs   = require('fs');
const path = require('path');

const PROJECT_REF = 'seewdqetyolfmqsiyban';
const TOKEN = 'sbp_0335f32e65cc6e7e9c22015533ff2c03bb033c0e';

async function main() {
    const funcPath = path.join(__dirname, 'supabase', 'functions', 'mercadopago-payment', 'index.ts');
    const code = fs.readFileSync(funcPath, 'utf8');
    const metadata = JSON.stringify({ name: 'mercadopago-payment', verify_jwt: false });

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

    console.log('>>> Tentando criar mercadopago-payment (POST)...');
    const r1 = await fetch('https://api.supabase.com/v1/projects/' + PROJECT_REF + '/functions', {
        method: 'POST', headers, body: bodyBuf
    });
    const b1 = await r1.text();
    console.log('POST status:', r1.status, b1.slice(0, 300));

    if (!r1.ok) {
        console.log('>>> Tentando atualizar (PUT)...');
        const r2 = await fetch('https://api.supabase.com/v1/projects/' + PROJECT_REF + '/functions/mercadopago-payment', {
            method: 'PUT', headers, body: Buffer.from(parts, 'utf8')
        });
        const b2 = await r2.text();
        console.log('PUT status:', r2.status, b2.slice(0, 300));
    }

    // Verifica status atual
    console.log('>>> Listando funcoes...');
    const rl = await fetch('https://api.supabase.com/v1/projects/' + PROJECT_REF + '/functions', {
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
