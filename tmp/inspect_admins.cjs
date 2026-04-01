const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function inspectAdmins() {
  console.log("[HQ INTEL] Listando administradores ativos na base .profiles...");
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'admin');

  if (error) {
    console.error("[ERRO TÁTICO]:", error.message);
  } else {
    console.log("[INSPEÇÃO CONCLUÍDA]:", data);
  }
}

inspectAdmins();
