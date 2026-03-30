import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    const asaasApiUrl = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3';

    if (!asaasApiKey) {
      throw new Error('Chave da API do Asaas não configurada.');
    }

    // Pega o token do usuario que fez a chamada
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Sem token de autenticação');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Valida o usuário atual
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Usuário não autenticado');

    // Recebe os dados validados do front-end
    const { 
      fullName, 
      email, 
      cpfCnpj, 
      phone, 
      cep, 
      city, 
      street, 
      neighborhood, 
      addressNumber, 
      complement, 
      state 
    } = await req.json();

    if (!fullName || !cpfCnpj || !email || !phone || !cep || !addressNumber) {
      throw new Error('Dados incompletos para criação de subconta Asaas.');
    }

    // Tratar CPF/CNPJ (remover pontuações)
    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanCep = cep.replace(/\D/g, '');

    // 1. CHAMA API DO ASAAS PARA CRIAR CONTA (SUBCONTA)
    const asaasAccountPayload = {
      name: fullName,
      email: email,
      loginEmail: email,
      cpfCnpj: cleanCpfCnpj,
      phone: cleanPhone,
      mobilePhone: cleanPhone,
      address: street,
      addressNumber: addressNumber,
      complement: complement || '',
      province: neighborhood,
      postalCode: cleanCep,
      city: city || 0, // Nota: a API de Subcontas da v3 geralmente pede código IBGE, ou aceita string, em Sandbox as vezes aceita só postalCode
    };

    console.log('Criando subconta no Asaas...', asaasAccountPayload);

    const asaasRes = await fetch(`${asaasApiUrl}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey
      },
      body: JSON.stringify(asaasAccountPayload)
    });

    const asaasData = await asaasRes.json();

    if (!asaasRes.ok) {
      console.error('Erro na API Asaas:', asaasData);
      throw new Error(asaasData.errors?.[0]?.description || 'Erro ao criar subconta no Asaas');
    }

    const { id: walletId, apiKey: subAccountApiKey, object } = asaasData;

    if (object !== 'account' || !walletId) {
      throw new Error('Falha na geração do Wallet ID no Asaas.');
    }

    console.log(`Subconta criada com sucesso! WalletID: ${walletId}`);

    // Cria um Admin Client do Supabase para ignorar RLS e forçar atualização segura do perfil
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. ATUALIZA O PROFILE NO SUPABASE
    // Como a criação deu certo, validamos o kyc_status como 'approved' para habilitar as funções táticas
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        asaas_wallet_id: walletId,
        asaas_api_key: subAccountApiKey, // Opcional salvar, mas caso precise pro futuro
        kyc_status: 'approved'
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Erro ao atualizar profile com Asaas ID:', profileError);
      throw new Error('Subconta criada no Asaas, mas falhou ao vincular ao perfil. Contate o suporte.');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        walletId, 
        message: 'Subconta verificada e criada com sucesso!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Asaas Subaccount Edge Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
