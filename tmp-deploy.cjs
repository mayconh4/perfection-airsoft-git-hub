const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'seewdqetyolfmqsiyban';
const TOKEN = 'sbp_c6979994c3fc8dbbbb25468e154401f265d2b8c2';
const funcName = 'asaas-webhook';

async function deploy() {
    const funcPath = path.join(__dirname, 'supabase', 'functions', funcName, 'index.ts');
    const code = fs.readFileSync(funcPath, 'utf8');
    const metadata = JSON.stringify({ name: funcName, verify_jwt: false });

    // Use a simpler approach for multipart
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="metadata"\r\n`;
    body += `Content-Type: application/json\r\n\r\n`;
    body += `${metadata}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="index.ts"\r\n`;
    body += `Content-Type: application/typescript\r\n\r\n`;
    body += `${code}\r\n`;
    body += `--${boundary}--\r\n`;

    const bodyBuffer = Buffer.from(body, 'utf8');

    console.log(`Deploying ${funcName} to ${PROJECT_REF}...`);

    const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${funcName}`;
    
    try {
        const resp = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: bodyBuffer
        });

        const text = await resp.text();
        console.log(`Status: ${resp.status}`);
        console.log(`Response: ${text}`);
    } catch (e) {
        console.error('Error:', e);
    }
}

deploy();
