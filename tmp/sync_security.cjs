const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function syncAndSecurity() {
  console.log("[HQ INTEL] Iniciando Procedimento de Manutenção de Segurança...");

  // 1. Investigar Perfil do Criador do Drop sumido (33ce...)
  const creatorId = '33ce247c-f3d1-47ae-a88f-2f9208cacd3a';
  const { data: creator, error: crError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', creatorId)
    .single();

  if (crError) {
    if (crError.code === 'PGRST116') {
      console.log(`[ALERTA] Perfil do criador (${creatorId}) NÃO EXISTE na tabela profiles. Isso quebra o join de listagem.`);
    } else {
      console.error("ERRO CRIADOR:", crError.message);
    }
  } else {
    console.log("Perfil do criador encontrado:", creator);
  }

  // 2. CORREÇÃO DE SEGURANÇA: Downgrade do ID 1be... (maycontuliomkd) para 'user'
  const targetAdminId = '1be2a4e4-bc8d-4cda-a2a8-a05dc0792efa';
  console.log(`[SEGURANÇA] Realizando downgrade do perfil ${targetAdminId} para 'user'...`);
  
  // Como o RLS pode bloquear o update via anon key, usaremos o serviço se possível ou indicaremos ao usuário
  const { error: upError } = await supabase
    .from('profiles')
    .update({ role: 'user' })
    .eq('id', targetAdminId);

  if (upError) {
    console.error(`[FALHA DE PERMISSÃO]: O RLS bloqueou a alteração direta. O usuário precisará rodar o SQL no painel Supabase.`);
  } else {
    console.log("[SUCESSO] Perfil rebaixado para 'user'.");
  }
}

syncAndSecurity();
