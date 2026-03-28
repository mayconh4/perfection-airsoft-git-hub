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
    const rawBody = await req.text();
    console.log('[PAYLOAD RAW]:', rawBody);
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'JSON Invalido', details: e.message }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { raffleId, raffleTitle, ticketPrice, ticketNumbers, customerData } = body;

    console.log('[DEBUG] Processando Checkout:', { raffleId, raffleTitle, ticketNumbersCount: ticketNumbers?.length });

    if (!MERCADO_PAGO_TOKEN) {
      console.error('[ERRO] MERCADO_PAGO_TOKEN faltando');
      return new Response(JSON.stringify({ error: 'Configuracao do servidor incompleta (MP TOKEN).' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Validacao Robusta
    const isValid = raffleId && Array.isArray(ticketNumbers) && ticketNumbers.length > 0 && ticketPrice;
    if (!isValid) {
      console.error('[ERRO] Dados incompletos:', { raffleId, ticketNumbers, ticketPrice });
      return new Response(JSON.stringify({ 
        error: 'Dados da rifa incompletos ou invalidos.', 
        received: { raffleId, hasTickets: !!ticketNumbers, count: ticketNumbers?.length, ticketPrice }
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const totalAmount = ticketNumbers.length * ticketPrice;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Criar Pedido
    console.log('[STEP 1] Criando pedido no Supabase (Service Role)...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        total: totalAmount,
        status: 'pendente',
        customer_data: {
          name: customerData?.name || 'Cliente Anonimo',
          email: customerData?.email || '',
          cpf: customerData?.cpf || '',
          source: 'rifa_v2'
        },
        shipping_address: { type: 'digital', info: `Rifa: ${raffleTitle || 'Sorteio'}` }
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('[ERRO STEP 1] Falha ao criar pedido:', orderError);
      throw new Error(`Falha na criacao do pedido: ${orderError?.message || 'Erro desconhecido'}`);
    }
    console.log('[OK] Pedido criado:', order.id);

    // 2. Criar Itens
    console.log('[STEP 2] Criando itens do pedido...');
    const { error: itemsError } = await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: MASTER_PRODUCT_ID,
      product_name: `TICKET RIFA: ${raffleTitle || 'Sorteio'} (#${ticketNumbers.join(', #')})`,
      product_price: ticketPrice,
      quantity: ticketNumbers.length
    });

    if (itemsError) console.warn('[AVISO] Erro ao criar itens (nao fatal):', itemsError);

    // 3. Criar Raffle Tickets
    console.log('[STEP 3] Criando registros de tickets...');
    const { error: ticketError } = await supabase.from('raffle_tickets').insert(
      ticketNumbers.map((num: any) => ({
        raffle_id: raffleId,
        ticket_number: Number(num),
        payment_status: 'pendente',
        payment_id: order.id
      }))
    );

    if (ticketError) {
        console.error('[ERRO STEP 3] Falha ao registrar tickets:', ticketError);
        // Nao vamos abortar aqui, mas logar pesado
    }

    // 4. Criar Preferencia no Mercado Pago
    console.log('[STEP 4] Gerando link de pagamento Mercado Pago...');
    const preferenceBody = {
      items: [{
        id: MASTER_PRODUCT_ID,
        title: `TICKETS: ${raffleTitle || 'Sorteio Tactical'}`,
        quantity: ticketNumbers.length,
        unit_price: Number(ticketPrice),
        currency_id: 'BRL',
      }],
      payer: {
        email: customerData?.email || 'vendas@perfectionairsoft.com.br',
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
      (preferenceBody.payer as any).identification = { type: 'CPF', number: cleanedCpf };
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceBody),
    });

    const preference = await mpResponse.json();
    
    if (!mpResponse.ok) {
        console.error('[ERRO STEP 4] Mercado Pago recusou preferencia:', preference);
        throw new Error(`Mercado Pago erro: ${preference?.message || mpResponse.statusText}`);
    }

    console.log('[OK] Checkout URL gerada com sucesso.');
    const checkout_url = preference.init_point || preference.sandbox_init_point;

    return new Response(
      JSON.stringify({ checkout_url, order_id: order.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[CRITICAL] Erro na Edge Function:', error.message || error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno no servidor.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
