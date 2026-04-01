const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log('[DIAGNÓSTICO TÁTICO] Verificando integridade financeira do Marketplace...');
  
  const { data: raffles, error } = await supabase
    .from('raffles')
    .select('id, title, creator_id, status');

  if (error) {
    console.error('Erro ao buscar sorteios:', error.message);
    return;
  }

  console.log(`Encontrados ${raffles.length} sorteios registrados.`);

  for (const r of raffles) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('asaas_wallet_id, full_name, kyc_status')
      .eq('id', r.creator_id)
      .single();

    const hasWallet = !!profile?.asaas_wallet_id;
    const statusIcon = hasWallet ? '✅ [ATIVO]' : '❌ [BLOQUEADO - SEM CARTEIRA]';
    
    console.log(`- DROP: ${r.title} (${r.status})`);
    console.log(`  OPERADOR: ${profile?.full_name || 'Desconhecido'} | KYC: ${profile?.kyc_status}`);
    console.log(`  STATUS FINANCEIRO: ${statusIcon}`);
    console.log('-----------------------------------');
  }
}

check();
