import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MERCADO_PAGO_TOKEN = Deno.env.get('MERCADO_PAGO_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const MERCADO_PAGO_TOKEN = Deno.env.get('MERCADO_PAGO_TOKEN');

    // Validação de Segredos
    if (!SUPABASE_SERVICE_ROLE_KEY || !MERCADO_PAGO_TOKEN) {
      const missing = !SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : 'MERCADO_PAGO_TOKEN';
      console.error(`[ERRO] Secret ${missing} não configurada`);
      return new Response(JSON.stringify({ 
        error: 'Erro de Configuração', 
        details: `Secret ${missing} não encontrada no Supabase. Use a CLI para definir.` 
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    console.log('[DEBUG] Ordem recebida:', body.orderId);

    const { orderId, total, items, customerData, isGuest } = body;

    // 1. Criar Pedido se for Guest (via REST API direta para ser mais rápido)
    let finalOrderId = orderId;
    if (isGuest && (orderId === 'GUEST_NEW')) {
      console.log('[DEBUG] Registrando pedido via REST...');
      const orderResp = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: null,
          total: Number(total),
          status: 'pendente',
          customer_data: {
            ...customerData,
            cpf: customerData.cpf?.replace(/\D/g, ''),
            phone: customerData.phone?.replace(/\D/g, '')
          },
          shipping_address: { street: 'Digital', city: 'Online', cep: '00000-000' }
        })
      });

      const orders = await orderResp.json();
      if (!orderResp.ok) throw new Error(`DB Error: ${JSON.stringify(orders)}`);
      finalOrderId = orders[0].id;
      console.log('[DEBUG] Pedido criado:', finalOrderId);

      // Itens (REST Direct)
      const orderItems = items.map((ci: any) => ({
        order_id: finalOrderId,
        product_id: ci.product_id,
        product_name: ci.product_name || ci.product?.name,
        product_price: ci.product_price || ci.product?.price,
        quantity: ci.quantity
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify(orderItems)
      });
    }

    const cleanedCpf = customerData?.cpf ? String(customerData.cpf).replace(/\D/g, '') : '';
    const guestEmail = `op_${cleanedCpf}@perfectionairsoft.com.br`;
    const payerEmail = (customerData?.email && customerData.email.includes('@') && !customerData.email.includes(' ')) 
      ? customerData.email 
      : guestEmail;

    console.log('[DEBUG] 7 - Chamando MP para:', payerEmail);

    const payResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': finalOrderId
      },
      body: JSON.stringify({
        transaction_amount: Number(total),
        description: `Pedido ${finalOrderId}`,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          identification: { type: 'CPF', number: cleanedCpf || '00000000000' }
        },
        external_reference: finalOrderId,
        notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`
      })
    });

    const payment = await payResponse.json();

    if (!payResponse.ok) {
      console.error('[ERRO MP]', JSON.stringify(payment));
      return new Response(JSON.stringify({ 
        error: 'Erro MP', 
        details: payment.message || payment.cause?.[0]?.description || 'Dados Inválidos' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ 
      qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
      amount: payment.transaction_amount || total,
      order_id: finalOrderId 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[ERRO FATAL]', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
