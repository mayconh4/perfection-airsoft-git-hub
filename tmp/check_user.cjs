const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Carregar .env da pasta raiz
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL || 'https://seewdqetyolfmqsiyban.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function checkUser() {
  const email = 'maycontuliofs@gmail.com';
  console.log(`[HQ INTEL] Verificando protocolo para: ${email}...`);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, email')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log(`[BLOQUEIO] Protocolo ${email} não encontrado na base .profiles. Usuário precisa se registrar no site.`);
    } else {
      console.error("[ERRO TÁTICO]:", error.message);
    }
  } else {
    console.log("[INSPEÇÃO CONCLUÍDA]:", data);
    if (data.role !== 'admin') {
      console.log(`[RECOMENDAÇÃO] O usuário existe mas a role '${data.role}' não possui privilégios de Admin.`);
    } else {
      console.log("[STATUS] ACESSO MESTRE CONFIRMADO.");
    }
  }
}

checkUser();
