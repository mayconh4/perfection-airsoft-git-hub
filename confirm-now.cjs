const fs = require('fs');
const path = require('path');

let PROJECT_ID = 'seewdqetyolfmqsiyban';
let TOKEN = '';

// Ler o token do .env.deploy
const deployEnvPath = path.join(__dirname, '.env.deploy');
if (fs.existsSync(deployEnvPath)) {
  const content = fs.readFileSync(deployEnvPath, 'utf8');
  const tokenMatch = content.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
  if (tokenMatch) TOKEN = tokenMatch[1].trim();
}

async function run() {
  console.log('>>> DISPARANDO MÍSSIL DE CONFIRMAÇÃO FINAL...');
  
  if (!TOKEN) {
    console.error('ERRO: TOKEN DE ACESSO NÃO ENCONTRADO!');
    return;
  }

  // Comand SQL exato enviado pelo Maycon
  const sql = "UPDATE public.orders SET status = 'pago', payment_type = 'pix' WHERE total >= 40 AND total <= 60 AND status = 'pendente';";

  try {
    const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });

    const data = await resp.json();
    
    if (resp.ok) {
      console.log('✅ SUCESSO TOTAL NO DISPARO!');
      console.log('>>> O Banco foi atualizado. Sua tela mudará em 5 segundos.');
    } else {
      console.error('ALERTA: O servidor recusou o disparo automático. Resposta:', JSON.stringify(data));
      console.log('>>> RECOMENDAÇÃO: Rode o comando SQL diretamente no Dashboard do Supabase para destravar agora mesmo!');
    }
  } catch (err) {
    console.error('ERRO DE TRANSMISSÃO:', err.message);
  }
}

run();
