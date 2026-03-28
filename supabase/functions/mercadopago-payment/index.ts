import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MERCADO_PAGO_TOKEN = Deno.env.get('MERCADO_PAGO_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MASTER_PRODUCT_ID = '017213a1-6228-48bd-bb71-1154e82ec3eb';
const ORIGIN = 'https://www.perfectionairsoft.com.br';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[DEBUG] Payload recebido:', JSON.stringify(body));

    const { orderId, total, items, customerData, paymentMethod } = body;

    if (!MERCADO_PAGO_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'MERCADO_PAGO_TOKEN nao configurado.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!orderId || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Payload invalido: orderId ou items ausentes.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const cleanedCpf = customerData?.cpf ? String(customerData.cpf).replace(/\D/g, '') : '';

    // [BACKEND SPECIALIST] Processamento de Itens (Rifas vs Produtos)
    for (const item of items) {
      if (item.metadata?.type === 'raffle' && item.metadata?.tickets) {
        console.log(`[RIFA] Registrando tickets para o item: ${item.product_name}`);
        
        const ticketsToInsert = item.metadata.tickets.map((num: number) => ({
          raffle_id: item.product_id,
          ticket_number: num,
          payment_status: 'pendente',
          payment_id: orderId,
          user_email: customerData?.email || 'anonimo'
        }));

        const { error: ticketError } = await supabase
          .from('raffle_tickets')
          .insert(ticketsToInsert);

        if (ticketError) {
          console.error('[ERRO RIFA] Falha ao reservar tickets:', ticketError);
        }
      }
    }

    // [PIX AUTOMATICO] Se for PIX, gera pagamento direto
    if (paymentMethod === 'pix') {
      console.log('[PIX] Gerando pagamento direto...');
      const paymentBody = {
        transaction_amount: Number(total),
        description: `Pedido ${orderId} - Perfection Airsoft`,
        payment_method_id: 'pix',
        payer: {
          email: customerData?.email || 'cliente@perfectionairsoft.com.br',
          first_name: customerData?.name?.split(' ')[0] || 'Cliente',
          last_name: customerData?.name?.split(' ').slice(1).join(' ') || 'Tatico',
          identification: {
            type: 'CPF',
            number: cleanedCpf || '00000000000'
          }
        },
        external_reference: orderId,
        notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`
      };

      const payResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': orderId
        },
        body: JSON.stringify(paymentBody)
      });

      const payment = await payResponse.json();

      if (!payResponse.ok) {
        console.error('[ERROR PIX]', payment);
        return new Response(JSON.stringify({ error: 'Erro ao gerar PIX', details: payment }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(
        JSON.stringify({ 
          qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
          payment_id: payment.id,
          order_id: orderId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FALLBACK: Criar preferência (Shared Checkout) para outros métodos
    console.log('[MP] Criando preferencia de checkout...');
    const preferenceBody: any = {
      items: items.map((i: any) => ({
        id: i.product_id,
        title: i.product_name,
        quantity: i.quantity,
        unit_price: i.product_price,
        currency_id: 'BRL',
      })),
      payer: {
        email: customerData?.email || 'cliente@perfectionairsoft.com.br',
        name: customerData?.name || 'Cliente',
      },
      external_reference: orderId,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
      back_urls: {
        success: `${ORIGIN}/checkout/success`,
        failure: `${ORIGIN}/checkout/error`,
        pending: `${ORIGIN}/checkout/pending`,
      },
      auto_return: 'approved',
      statement_descriptor: 'Perfection Airsoft',
    };

    if (cleanedCpf && cleanedCpf.length >= 11 && cleanedCpf !== '00000000000') {
      preferenceBody.payer.identification = { type: 'CPF', number: cleanedCpf };
    }

    const prefResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceBody),
    });

    const preference = await prefResponse.json();

    if (!prefResponse.ok) {
      return new Response(JSON.stringify({ error: 'Erro no Mercado Pago', details: preference }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const checkout_url = preference.init_point || preference.sandbox_init_point;

    return new Response(
      JSON.stringify({ checkout_url, preference_id: preference.id, order_id: orderId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[ERRO CRITICO]', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

