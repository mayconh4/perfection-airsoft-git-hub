const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function extract() {
  console.log('[REPARAÇÃO TÁTICA] Extraindo dados para provisionamento Asaas...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('full_name', '%Maycon%')
    .single();

  if (error || !data) {
    console.error('Perfil não encontrado:', error?.message);
    return;
  }

  console.log('DADOS ENCONTRADOS:');
  console.log(JSON.stringify(data, null, 2));
}

extract();
