import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    const asaasApiUrl = Deno.env.get('ASAAS_API_URL') || 'https://www.asaas.com/api/v3';

    if (!asaasApiKey) throw new Error('ASAAS_API_KEY not configured');

    const { walletId } = await req.json();
    if (!walletId) throw new Error('Wallet ID is required');

    console.log(`[ASAAS-SIMULATE] Simulating approval for wallet: ${walletId}`);

    // Em Sandbox, atualizar dados bancários e documentos para permitir aprovação
    // 1. Atualizar dados bancários (Fake)
    await fetch(`${asaasApiUrl}/accounts/${walletId}/bankAccount`, {
      method: 'POST',
      headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bank: { code: '001' },
        agency: '0001',
        account: '123456',
        accountDigit: '7',
        bankAccountType: 'CONTA_CORRENTE',
        name: 'SIMULACAO SANDBOX',
        cpfCnpj: '00000000000'
      })
    });

    // 2. Chamar o endpoint de simulação de aprovação (Hack de Sandbox)
    const approveRes = await fetch(`${asaasApiUrl}/accounts/${walletId}/simulateApproval`, {
      method: 'POST',
      headers: { 'access_token': asaasApiKey }
    });

    const approveData = await approveRes.json();

    return new Response(JSON.stringify({ success: true, data: approveData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
