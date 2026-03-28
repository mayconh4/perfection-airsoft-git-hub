import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MERCADO_PAGO_TOKEN = Deno.env.get('MERCADO_PAGO_TOKEN') || '';

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
    const { orderId, customerData, items, paymentMethod, total } = await req.json();

    if (!MERCADO_PAGO_TOKEN) {
      throw new Error('MERCADO_PAGO_TOKEN não configurado');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const payload: any = {
      external_reference: orderId,
      description: `Pedido #${orderId} - Perfection Airsoft`,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
      payer: {
        email: customerData.email,
        first_name: customerData.name.split(' ')[0],
        last_name: customerData.name.split(' ').slice(1).join(' '),
        identification: {
          type: "CPF",
          number: customerData.cpf.replace(/\D/g, '')
        }
      },
      additional_info: {
        items: items.map((item: any) => ({
          id: item.product_id,
          title: item.product_name,
          quantity: item.quantity,
          unit_price: item.product_price
        }))
      }
    };

    if (paymentMethod === 'pix') {
      payload.payment_method_id = 'pix';
      payload.transaction_amount = total;
    } else {
      const origin = 'https://www.perfectionairsoft.com.br';
      
      const preferenceBody: any = {
        items: items.map((item: any) => ({
          title: item.product_name,
          quantity: item.quantity,
          unit_price: item.product_price,
          currency_id: 'BRL'
        })),
        payer: {
          email: customerData.email,
          name: customerData.name,
        },
        external_reference: orderId,
        notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
        back_urls: {
          success: `${origin}/checkout/success`,
          failure: `${origin}/checkout/error`,
          pending: `${origin}/checkout/pending`,
        },
        auto_return: 'approved',
      };

      // Limpar e validar CPF
      const cleanedCpf = customerData.cpf ? String(customerData.cpf).replace(/\D/g, '') : '';
      if (cleanedCpf && cleanedCpf.length >= 11 && cleanedCpf !== '00000000000') {
        preferenceBody.payer.identification = {
          type: 'CPF',
          number: cleanedCpf
        };
      }

      const prefResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferenceBody)
      });
      
      const preference = await prefResponse.json();
      
      if (!prefResponse.ok) {
        console.error('Mercado Pago Error (Preference):', preference);
        return new Response(JSON.stringify({ 
          error: 'Erro ao gerar preferência de pagamento', 
          details: preference 
        }), {
          status: prefResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ checkout_url: preference.init_point }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Criar pagamento PIX
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `order_${orderId}`
      },
      body: JSON.stringify(payload)
    });

    const payment = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago Error (PIX):', payment);
      return new Response(JSON.stringify({ 
        error: 'Erro ao gerar pagamento PIX', 
        details: payment 
      }), {
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      id: payment.id,
      status: payment.status,
      qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
