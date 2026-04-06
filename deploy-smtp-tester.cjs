#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');

const PROJECT_REF = 'seewdqetyolfmqsiyban';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZXdkcWV0eW9sZm1xc2l5YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjY3NzksImV4cCI6MjA4OTI0Mjc3OX0.rDUTp0xPGEvnLd-UTw3RqMEquA3lJE4ESIP6dY1VwYY';

let TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  const envFile = path.join(__dirname, '.env.deploy');
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    const match = content.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
    if (match) TOKEN = match[1].trim();
  }
}
if (!TOKEN) { console.error('ERRO: token nao encontrado!'); process.exit(1); }

async function deployFunction(funcName) {
  const funcPath = path.join(__dirname, 'supabase', 'functions', funcName, 'index.ts');
  if (!fs.existsSync(funcPath)) { console.log('SKIP: ' + funcName + ' nao encontrado'); return; }

  const code = fs.readFileSync(funcPath, 'utf8');
  const metadata = JSON.stringify({ name: funcName, verify_jwt: false });

  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
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

  const bodyBuffer = Buffer.from(parts, 'utf8');
  console.log('\nDeployando: ' + funcName + ' (' + Math.round(bodyBuffer.length / 1024) + 'kb)...');

  for (const attempt of [
    { method: 'PATCH', url: 'https://api.supabase.com/v1/projects/' + PROJECT_REF + '/functions/' + funcName },
    { method: 'POST',  url: 'https://api.supabase.com/v1/projects/' + PROJECT_REF + '/functions' },
  ]) {
    try {
      const resp = await fetch(attempt.url, {
        method: attempt.method,
        headers: {
          'Authorization': 'Bearer ' + TOKEN,
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
        },
        body: bodyBuffer,
      });
      const responseText = await resp.text();
      if (resp.ok) {
        console.log('  OK [' + attempt.method + '] status ' + resp.status);
        return true;
      }
      console.log('  [' + attempt.method + '] ' + resp.status + ': ' + responseText.slice(0, 200));
    } catch (e) {
      console.log('  ERRO [' + attempt.method + ']: ' + e.message);
    }
  }
  return false;
}

async function callSmtpTester() {
  console.log('\n>>> Chamando smtp-tester (aguarde 3s para propagacao)...');
  await new Promise(function(r) { setTimeout(r, 3000); });
  
  const resp = await fetch('https://' + PROJECT_REF + '.supabase.co/functions/v1/smtp-tester', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + ANON_KEY,
    },
    body: JSON.stringify({ test: true }),
  });
  
  const text = await resp.text();
  console.log('  HTTP Status: ' + resp.status);
  
  try {
    const json = JSON.parse(text);
    if (json.success) {
      console.log('  SMTP OK! E-mail enviado para maycontuliofs@gmail.com');
      console.log('  >> Verifique sua caixa de entrada agora!');
    } else {
      console.log('  SMTP FALHOU: ' + (json.error || 'erro desconhecido'));
      if (json.stack) console.log('  Stack: ' + json.stack.slice(0, 400));
    }
  } catch(e) {
    console.log('  Resposta bruta: ' + text.slice(0, 400));
  }
}

async function main() {
  console.log('=== DEPLOY smtp-tester + TESTE SMTP ===');
  await deployFunction('smtp-tester');
  await callSmtpTester();
  console.log('\n=== FIM ===');
}

main().catch(function(e) { console.error(e); process.exit(1); });
