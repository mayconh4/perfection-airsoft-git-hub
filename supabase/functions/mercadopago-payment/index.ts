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
    console.log('Payload recebido:', JSON.stringify(body));

    const { raffleId, raffleTitle, ticketPrice, ticketNumbers, customerData } = body;

    if (!MERCADO_PAGO_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'MERCADO_PAGO_TOKEN nao configurado no servidor.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!raffleId || !ticketNumbers || ticketNumbers.length === 0 || !ticketPrice) {
      return new Response(
        JSON.stringify({ error: 'Dados da rifa incompletos.', received: body }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalAmount = ticketNumbers.length * ticketPrice;

    // Cria client com service_role para ignorar RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Criar pedido (com service_role, sem limitacao de RLS)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        total: totalAmount,
        status: 'pendente',
        customer_data: {
          name: customerData?.name || 'Cliente Anonimo',
          email: customerData?.email || '',
          cpf: customerData?.cpf || '',
          source: 'rifa'
        },
        shipping_address: { type: 'digital', info: `Rifa: ${raffleTitle}` }
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Erro ao criar pedido:', orderError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar pedido: ${orderError?.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Criar itens do pedido
    const { error: itemsError } = await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: MASTER_PRODUCT_ID,
      product_name: `TICKET RIFA: ${raffleTitle} (#${ticketNumbers.join(', #')})`,
      product_price: ticketPrice,
      quantity: ticketNumbers.length
    });

    if (itemsError) {
      console.error('Erro ao criar itens:', itemsError);
    }

    // 3. Criar raffle_tickets
    const { error: ticketError } = await supabase.from('raffle_tickets').insert(
      ticketNumbers.map((num: number) => ({
        raffle_id: raffleId,
        ticket_number: num,
        payment_status: 'pendente',
        payment_id: order.id
      }))
    );

    if (ticketError) {
      console.error('Erro ao criar tickets:', ticketError);
    }

    // 4. Criar preferência no Mercado Pago
    const preferenceBody: any = {
      items: [{
        id: MASTER_PRODUCT_ID,
        title: `TICKETS: ${raffleTitle}`,
        quantity: ticketNumbers.length,
        unit_price: ticketPrice,
        currency_id: 'BRL',
      }],
      payer: {
        email: customerData?.email || 'cliente@perfectionairsoft.com.br',
        name: customerData?.name || 'Cliente',
      },
      external_reference: order.id,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
      back_urls: {
        success: `${ORIGIN}/checkout/success`,
        failure: `${ORIGIN}/checkout/error`,
        pending: `${ORIGIN}/checkout/pending`,
      },
      auto_return: 'approved',
      statement_descriptor: 'Perfection Airsoft',
    };

    const cleanedCpf = customerData?.cpf ? String(customerData.cpf).replace(/\D/g, '') : '';
    if (cleanedCpf && cleanedCpf.length >= 11 && cleanedCpf !== '00000000000') {
      preferenceBody.payer.identification = { type: 'CPF', number: cleanedCpf };
    }

    console.log('Enviando preference para MP:', JSON.stringify(preferenceBody));

    const prefResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceBody),
    });

    const preference = await prefResponse.json();
    console.log('Resposta MP:', JSON.stringify(preference));

    if (!prefResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Mercado Pago rejeitou a preferencia.',
          status: prefResponse.status,
          details: preference,
        }),
        { status: prefResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const checkout_url = preference.init_point || preference.sandbox_init_point;

    return new Response(
      JSON.stringify({ checkout_url, preference_id: preference.id, order_id: order.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: String(error?.message || error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
