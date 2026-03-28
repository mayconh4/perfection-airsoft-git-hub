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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[DEBUG] Payload recebido:', JSON.stringify(body));

    let { orderId, total, items, customerData, paymentMethod, isGuest } = body;

    if (!MERCADO_PAGO_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'MERCADO_PAGO_TOKEN nao configurado.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const cleanedCpf = customerData?.cpf ? String(customerData.cpf).replace(/\D/g, '') : '';

    // [GUEST] Criar pedido no banco se for novo cliente de rifa
    if (isGuest && (!orderId || orderId === 'GUEST_NEW')) {
       const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: null,
          total: Number(total),
          status: 'pendente',
          customer_data: customerData,
          shipping_address: { street: 'Digital', city: 'Online', cep: '00000-000' }
        })
        .select()
        .single();

       if (orderError || !order) {
         return new Response(JSON.stringify({ error: 'Erro ao registrar pedido guest', details: orderError }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
       }

       orderId = order.id;

       const orderItems = items.map((ci: any) => ({
         order_id: orderId,
         product_id: ci.product_id,
         product_name: ci.product_name || ci.product?.name,
         product_price: ci.product_price || ci.product?.price,
         quantity: ci.quantity,
         metadata: ci.metadata || null
       }));

       await supabase.from('order_items').insert(orderItems);
    }

    if (!orderId || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Payload invalido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Reserva de Tickets
    for (const item of items) {
      if (item.metadata?.type === 'raffle' && item.metadata?.tickets) {
        const ticketsToInsert = item.metadata.tickets.map((num: number) => ({
          raffle_id: item.product_id,
          ticket_number: num,
          payment_status: 'pendente',
          payment_id: orderId,
          user_email: customerData?.email || `guest_${cleanedCpf}@perfection.com`
        }));
        await supabase.from('raffle_tickets').insert(ticketsToInsert);
      }
    }

    // PIX Direto
    if (paymentMethod === 'pix') {
      const paymentBody = {
        transaction_amount: Number(total),
        description: `Pedido ${orderId} - Perfection Airsoft`,
        payment_method_id: 'pix',
        payer: {
          email: customerData?.email || `op_${cleanedCpf}@perfectionairsoft.com.br`,
          identification: { type: 'CPF', number: cleanedCpf || '00000000000' }
        },
        external_reference: orderId,
        notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`
      };

      const payResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentBody)
      });

      const payment = await payResponse.json();

      if (!payResponse.ok) {
        return new Response(JSON.stringify({ error: 'Erro ao gerar PIX MP', details: payment }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(
        JSON.stringify({ 
          qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
          order_id: orderId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ order_id: orderId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
