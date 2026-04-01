const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function list() {
  console.log('[DIAGNÓSTICO TÁTICO] Listando perfis (Saneamento Coluna)...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, asaas_wallet_id, kyc_status');

  if (error) {
    console.error('Erro ao listar:', error.message);
    return;
  }

  console.table(data);
}

list();
