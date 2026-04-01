const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function deepAudit() {
  console.log("[HQ INTEL] Iniciando Auditoria Profunda de Dados...");
  
  // 1. Verificar Raffles (Drops)
  console.log("\n--- [DROPS / RAFFLES] ---");
  const { data: raffles, error: raffError } = await supabase
    .from('raffles')
    .select('id, title, creator_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (raffError) {
    console.error("ERRO RAFFLES:", raffError.message);
  } else {
    console.log("Últimos Drops no Banco:", raffles);
  }

  // 2. Verificar Perfis Admin
  console.log("\n--- [ADMIN PROFILES] ---");
  const { data: admins, error: admError } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('role', 'admin');

  if (admError) {
    console.error("ERRO ADMINS:", admError.message);
  } else {
    console.log("Administradores detectados:", admins);
  }
}

deepAudit();
