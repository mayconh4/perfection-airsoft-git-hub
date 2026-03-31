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
    console.log('>>> INICIANDO EDGE FUNCTION ASAAS <<<');
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    const asaasApiUrl = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3';

    if (!asaasApiKey) {
      throw new Error('Chave da API do Asaas não configurada.');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Valida o usuário atual (Tenta cabeçalho customizado primeiro para evitar bloqueio do Gateway)
    const bypassToken = req.headers.get('x-bypass-token');
    const authHeader = req.headers.get('Authorization');
    const token = (bypassToken || authHeader?.replace('Bearer ', '') || '').trim();

    let userId = 'teste-123';
    
    if (!token) {
      throw new Error('Sem credenciais de autenticação (Token ausente)');
    }
    
    // Bypass de Teste em maiusculo/minusculo
    if (token.toUpperCase() !== 'TEST_BYPASS') {
      try {
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        
        if (authError || !user) {
          console.error('Auth Error Detalhado:', authError);
          const prefix = token ? token.substring(0, 20) + '...' : 'VAZIO';
          throw new Error(`BLOQUEIO DE SEGURANÇA: [${authError?.message || 'Token Rejeitado'}] | Identificador: ${prefix}`);
        }
        userId = user.id;
      } catch (err: any) {
        throw new Error(`Erro Crítico de Autenticação: ${err.message}`);
      }
    } else {
      console.log('>>> BYPASS DE TESTE ATIVADO PARA DESENVOLVIMENTO <<<');
    }

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
      state,
      birthDate,
      userId: payloadUserId
    } = await req.json();

    if (payloadUserId) {
      console.log('>>> PRIORIZANDO USER ID DO PAYLOAD:', payloadUserId);
      userId = payloadUserId;
    }

    if (!fullName || !cpfCnpj || !email || !phone || !cep || !addressNumber) {
      throw new Error('Dados incompletos para criação de subconta Asaas.');
    }

    // Tratar CPF/CNPJ (remover pontuações)
    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanCep = cep.replace(/\D/g, '');

    const companyType = cleanCpfCnpj.length <= 11 ? 'INDIVIDUAL' : 'LIMITED';

    // Tratar Data de Nascimento (Asaas exige YYYY-MM-DD)
    let asaasBirthDate = birthDate;
    if (asaasBirthDate && asaasBirthDate.includes('/')) {
      const parts = asaasBirthDate.split('/');
      if (parts.length === 3) {
        asaasBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // 1. CHAMA API DO ASAAS PARA CRIAR CONTA (SUBCONTA)
    const asaasAccountPayload = {
      name: fullName,
      email: email,
      loginEmail: email,
      cpfCnpj: cleanCpfCnpj,
      companyType: companyType,
      phone: cleanPhone,
      mobilePhone: cleanPhone,
      address: street,
      addressNumber: addressNumber,
      complement: complement || '',
      province: neighborhood,
      postalCode: cleanCep,
      birthDate: asaasBirthDate, // Exigido para INDIVIDUAL
      incomeValue: 5000 // Renda Mensal (Exigido pelo Asaas para PF)
      // 'city' omitido pois o Asaas exige código IBGE (número). Com o postalCode o Asaas deduz automático.
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

    let asaasData = await asaasRes.json();

    // LÓGICA DE RECUPERAÇÃO TÁTICA (Se CPF já existe, buscar a conta existente no Asaas)
    if (!asaasRes.ok && (asaasData.errors?.[0]?.code === 'account_already_exists' || asaasData.errors?.[0]?.description?.includes('em uso'))) {
      console.log('>>> CPF/CNPJ JÁ EM USO. TENTANDO RECUPERAR CONTA NO ASAAS...');
      const searchRes = await fetch(`${asaasApiUrl}/accounts?cpfCnpj=${cleanCpfCnpj}`, {
        method: 'GET',
        headers: { 'access_token': asaasApiKey }
      });
      const searchData = await searchRes.json();
      if (searchRes.ok && searchData.data && searchData.data.length > 0) {
        asaasData = searchData.data[0];
        console.log('>>> CONTA RECUPERADA COM SUCESSO:', asaasData.id);
      } else {
         throw new Error(asaasData.errors?.[0]?.description || 'Erro ao criar subconta e falha na recuperação.');
      }
    } else if (!asaasRes.ok) {
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
      .eq('id', userId);

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
      JSON.stringify({ error: error.message || 'Erro Desconhecido no Backend' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
