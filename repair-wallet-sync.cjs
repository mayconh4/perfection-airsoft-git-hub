const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function repair() {
  const MAYCON_ID = '1be2a4e4-bc8d-4cda-a2a8-a05dc0792efa';
  const FUNCTIONAL_WALLET = '5d5a74f1-f5cd-4b10-89f2-caa738ef4853';

  console.log(`[REARAÇÃO TÁTICA] Vinculando Wallet ${FUNCTIONAL_WALLET} ao Operador ${MAYCON_ID}...`);
  
  const { error } = await supabase
    .from('profiles')
    .update({ asaas_wallet_id: FUNCTIONAL_WALLET })
    .eq('id', MAYCON_ID);

  if (error) {
    console.error('Falha na reparação:', error.message);
  } else {
    console.log('REPARAÇÃO CONCLUÍDA. Marketplace liberado para este operador.');
  }
}

repair();
