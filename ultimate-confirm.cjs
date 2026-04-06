const fs = require('fs');
const path = require('path');

// Recuperar credenciais do .env e .env.deploy
let PROJECT_ID = 'seewdqetyolfmqsiyban';
let TOKEN = '';

const deployEnvPath = path.join(__dirname, '.env.deploy');
if (fs.existsSync(deployEnvPath)) {
  const content = fs.readFileSync(deployEnvPath, 'utf8');
  const tokenMatch = content.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
  if (tokenMatch) TOKEN = tokenMatch[1].trim();
}

if (!TOKEN) {
  console.error('ERRO: TOKEN DE ACESSO NÃO ENCONTRADO!');
  process.exit(1);
}

async function ultimateConfirm() {
  console.log('>>> Disparando Míssil Final de Confirmação...');
  
  // Script SQL para forçar o pagamento
  const sql = `
    UPDATE public.orders 
    SET status = 'pago', payment_type = 'pix' 
    WHERE total >= 45 AND total <= 55 AND status = 'pendente';
  `;

  try {
    const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });

    const result = await resp.json();

    if (resp.ok) {
      console.log('✅ OPERAÇÃO CONCLUÍDA NO SERVIDOR!');
      console.log('>>> O Banco de Dados acaba de ser atualizado em tempo real.');
      console.log('>>> Aguarde 5 segundos para o site mudar de tela sozinho...');
    } else {
      console.error('FALHA NO DISPARO:', result);
    }
  } catch (err) {
    console.error('ERRO DE CONEXÃO:', err.message);
  }
}

ultimateConfirm();
