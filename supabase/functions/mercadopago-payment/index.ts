import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MERCADO_PAGO_TOKEN = Deno.env.get('MERCADO_PAGO_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Recebido payload:', JSON.stringify(body));

    const { orderId, customerData, items, total } = body;

    if (!MERCADO_PAGO_TOKEN) {
      console.error('MERCADO_PAGO_TOKEN não configurado!');
      return new Response(
        JSON.stringify({ error: 'Configuração de pagamento ausente no servidor.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!orderId || !total || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Dados do pedido incompletos.', received: body }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const origin = 'https://www.perfectionairsoft.com.br';

    // Monta o payload de Preferência do Checkout Pro (mais estável e universal)
    const preferenceBody: any = {
      items: items.map((item: any) => ({
        id: item.product_id || 'RAFFLE_ITEM',
        title: String(item.product_name || 'Produto').slice(0, 256),
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.product_price) || 0,
        currency_id: 'BRL',
      })),
      payer: {
        email: customerData?.email || 'cliente@email.com',
        name: customerData?.name || 'Cliente',
      },
      external_reference: String(orderId),
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
      back_urls: {
        success: `${origin}/checkout/success`,
        failure: `${origin}/checkout/error`,
        pending: `${origin}/checkout/pending`,
      },
      auto_return: 'approved',
      statement_descriptor: 'Perfection Airsoft',
    };

    // CPF (opcional para não causar rejeição)
    const cleanedCpf = customerData?.cpf ? String(customerData.cpf).replace(/\D/g, '') : '';
    if (cleanedCpf && cleanedCpf.length >= 11 && cleanedCpf !== '00000000000') {
      preferenceBody.payer.identification = { type: 'CPF', number: cleanedCpf };
    }

    console.log('Enviando para Mercado Pago:', JSON.stringify(preferenceBody));

    const prefResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceBody),
    });

    const preference = await prefResponse.json();
    console.log('Resposta do Mercado Pago:', JSON.stringify(preference));

    if (!prefResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Mercado Pago rejeitou a preferência.',
          status: prefResponse.status,
          details: preference,
        }),
        { status: prefResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retorna a URL de checkout (sandbox usa sandbox_init_point)
    const checkout_url = preference.init_point || preference.sandbox_init_point;

    return new Response(
      JSON.stringify({ checkout_url, preference_id: preference.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro inesperado na Edge Function:', error);
    return new Response(
      JSON.stringify({ error: String(error?.message || error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
