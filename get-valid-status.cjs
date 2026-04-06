const fs = require('fs');
const path = require('path');

let PROJECT_ID = 'seewdqetyolfmqsiyban';
let TOKEN = '';

const deployEnvPath = path.join(__dirname, '.env.deploy');
if (fs.existsSync(deployEnvPath)) {
  const content = fs.readFileSync(deployEnvPath, 'utf8');
  const tokenMatch = content.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
  if (tokenMatch) TOKEN = tokenMatch[1].trim();
}

async function run() {
  console.log('>>> DECIFRANDO CÓDIGO DE STATUS...');
  
  // Script SQL para ver a constraint de status
  const sql = `
    SELECT 
      cc.check_clause
    FROM 
      information_schema.check_constraints cc
    JOIN 
      information_schema.constraint_column_usage ccu 
      ON cc.constraint_name = ccu.constraint_name
    WHERE 
      ccu.table_name = 'orders' 
      AND ccu.column_name = 'status';
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

    const data = await resp.json();
    
    if (resp.ok && data.length > 0) {
      console.log('✅ CÓDIGOS ENCONTRADOS:', data[0].check_clause);
    } else {
      // Fallback: listar status de pedidos antigos
      const sql2 = "SELECT DISTINCT status FROM public.orders LIMIT 10;";
      const resp2 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql2 })
      });
      const data2 = await resp2.json();
      console.log('💡 STATUS EXISTENTES NO BANCO:', data2);
    }
  } catch (err) {
    console.error('ERRO DE CONEXÃO:', err.message);
  }
}

run();
