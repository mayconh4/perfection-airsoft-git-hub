#!/usr/bin/env node
/**
 * deploy-ticket-functions.cjs
 * Deploy das Edge Functions: asaas-payment e asaas-webhook
 * Usa o mesmo padrão do deploy-functions.cjs existente no projeto.
 */

const fs   = require('fs');
const path = require('path');

const PROJECT_REF = 'seewdqetyolfmqsiyban';
const FUNCTIONS   = ['asaas-payment', 'asaas-webhook'];

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
  console.error('ERRO: SUPABASE_ACCESS_TOKEN não encontrado!');
  process.exit(1);
}

async function deployFunction(funcName) {
  const funcPath = path.join(__dirname, 'supabase', 'functions', funcName, 'index.ts');
  if (!fs.existsSync(funcPath)) {
    console.log(`  SKIP: ${funcName} (arquivo não encontrado)`);
    return;
  }

  const code = fs.readFileSync(funcPath, 'utf8');
  const metadata = JSON.stringify({ name: funcName, verify_jwt: false });

  // Monta multipart/form-data manualmente (igual ao deploy-functions.cjs original)
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const crlf = '\r\n';
  const parts = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="metadata"',
    'Content-Type: application/json',
    '',
    metadata,
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="index.ts"',
    'Content-Type: application/typescript',
    '',
    code,
    `--${boundary}--`,
    ''
  ].join(crlf);

  const bodyBuffer = Buffer.from(parts, 'utf8');

  console.log(`\nDeployando: ${funcName} (${Math.round(bodyBuffer.length / 1024)}kb)...`);

  // Tenta PATCH (atualizar função existente) → depois PUT → depois POST
  for (const [method, url] of [
    ['PATCH', `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${funcName}`],
    ['PUT',   `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${funcName}`],
    ['POST',  `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`],
  ]) {
    try {
      const resp = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length.toString(),
        },
        body: bodyBuffer,
      });

      const responseText = await resp.text();

      if (resp.ok) {
        console.log(`  ✅ [${method}] ${funcName} → status ${resp.status}`);
        return;
      } else if (resp.status !== 404 && resp.status !== 405) {
        console.log(`  ❌ [${method}] ${resp.status}: ${responseText.slice(0, 200)}`);
      }
    } catch (e) {
      console.log(`  ERRO [${method}]: ${e.message}`);
    }
  }
  console.log(`  ⚠️  ${funcName}: nenhum método de deploy funcionou.`);
}

async function main() {
  console.log('\n>>> Deploy: asaas-payment + asaas-webhook (suporte a tickets)');

  for (const func of FUNCTIONS) {
    await deployFunction(func);
  }

  // Health check
  console.log('\n>>> Health check...');
  for (const func of FUNCTIONS) {
    try {
      const r = await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/${func}`, {
        method: 'OPTIONS',
      });
      console.log(`  ${func}: HTTP ${r.status}`);
    } catch (e) {
      console.log(`  ${func}: ERRO - ${e.message}`);
    }
  }

  console.log('\n=== DEPLOY CONCLUÍDO ===\n');
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(1);
});
