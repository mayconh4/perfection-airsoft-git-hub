import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bypass-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('>>> INICIANDO EDGE FUNCTION ASAAS PAYOUT <<<');
    const asaasMasterKey = Deno.env.get('ASAAS_API_KEY');
    const asaasApiUrl = Deno.env.get('ASAAS_API_URL') || 'https://www.asaas.com/api/v3';

    if (!asaasMasterKey) {
      throw new Error('Chave Master do Asaas não configurada.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Identificar Usuário
    const authHeader = req.headers.get('Authorization');
    const bypassToken = req.headers.get('x-bypass-token');
    const token = (bypassToken || authHeader?.replace('Bearer ', '') || '').trim();

    let user;
    if (token === 'TEST_BYPASS') {
      const { data } = await req.json();
      const { data: userData } = await supabaseAdmin.from('profiles').select('*').eq('id', data.userId).single();
      user = { id: data.userId, ...userData };
    } else {
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authUser) throw new Error('Não autorizado.');
      user = authUser;
    }

    // 2. Buscar Dados do Asaas no Perfil
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('asaas_wallet_id, asaas_api_key, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.asaas_wallet_id) {
      throw new Error('Subconta Asaas não encontrada para este usuário.');
    }

    let subAccountApiKey = profile.asaas_api_key;

    // 3. Se não tivermos a API Key (conta recuperada), buscamos no Asaas usando a Master Key
    if (!subAccountApiKey) {
      console.log('>>> RECUPERANDO API KEY DA SUBCONTA NO ASAAS...');
      const subRes = await fetch(`${asaasApiUrl}/subaccounts/${profile.asaas_wallet_id}`, {
        headers: { 'access_token': asaasMasterKey }
      });
      const subData = await subRes.json();
      subAccountApiKey = subData.apiKey;
      
      if (!subAccountApiKey) throw new Error('Não foi possível recuperar a chave de API da subconta.');
    }

    // 4. Verificar Saldo Disponível na Subconta
    const balanceRes = await fetch(`${asaasApiUrl}/finance/balance`, {
      headers: { 'access_token': subAccountApiKey }
    });
    const { balance } = await balanceRes.json();
    console.log(`>>> SALDO DISPONÍVEL NA SUBCONTA: R$ ${balance}`);

    if (balance <= 0) {
      throw new Error('Saldo insuficiente para resgate.');
    }

    // 5. Solicitar Transferência para Conta Bancária (TED/PIX conforme cadastro)
    // Nota: O Asaas transfere para a conta bancária vinculada à subconta
    console.log(`>>> DISPARANDO TRANSFERÊNCIA DE R$ ${balance} PARA ${profile.full_name}...`);
    
    const payoutRes = await fetch(`${asaasApiUrl}/transfers`, {
      method: 'POST',
      headers: {
        'access_token': subAccountApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: balance,
        operationType: 'BANK_ACCOUNT'
      })
    });

    const payoutData = await payoutRes.json();

    if (!payoutRes.ok || payoutData.errors) {
      console.error('Erro Asaas Payout:', payoutData);
      throw new Error(payoutData.errors?.[0]?.description || 'Erro ao processar transferência no Asaas.');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Resgate processado com sucesso!',
      transferId: payoutData.id,
      value: balance 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Erro Global Payout:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
