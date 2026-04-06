const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Tentar pegar credenciais do .env
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const urlMatch = content.match(/^VITE_SUPABASE_URL=(.+)$/m);
  const keyMatch = content.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m); // Usando anon aqui, mas servicerole seria melhor
  if (urlMatch) SUPABASE_URL = urlMatch[1].trim();
  if (keyMatch) SUPABASE_KEY = keyMatch[1].trim().replace(/^'|^"|'$|"$/g, '');
}

async function forceConfirm() {
  console.log('>>> Iniciando Missíl de Confirmação Forçada...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. Buscar o pedido de 50 reais pendente
  const { data: orders, error: findErr } = await supabase
    .from('orders')
    .select('id, total, status')
    .eq('status', 'pendente')
    .order('created_at', { ascending: false })
    .limit(5);

  if (findErr) {
    console.error('ERRO ao buscar pedidos:', findErr.message);
    return;
  }

  const targetOrder = orders.find(o => Math.abs(o.total - 50) < 1);

  if (!targetOrder) {
    console.log('ALERTA: Nenhum pedido de R$ 50,00 pendente encontrado. Pedidos recentes:', orders);
    return;
  }

  console.log(`>>> Pedido Encontrado: ${targetOrder.id} (R$ ${targetOrder.total})`);

  // 2. Forçar status para PAGO
  const { error: updErr } = await supabase
    .from('orders')
    .update({ status: 'pago' })
    .eq('id', targetOrder.id);

  if (updErr) {
    console.error('FALHA ao confirmar pedido:', updErr.message);
  } else {
    console.log('✅ OPERAÇÃO CONCLUÍDA: Pedido marcado como PAGO com sucesso!');
    console.log('>>> Aguarde 5 segundos para o site detectar a mudança...');
  }
}

forceConfirm();
