import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * PHOENIX UPGRADE (v3 logic on v2 endpoint)
 * Mantendo o endpoint asaas-checkout-v2 para evitar mudanças manuais no dashboard do Asaas.
 * Implementando Realtime, Auditoria e Multi-Checkout (PIX, CARTÃO, BOLETO).
 */

const ASAAS_API_KEY             = Deno.env.get('ASAAS_API_KEY') || '';
const ASAAS_API_URL             = Deno.env.get('ASAAS_API_URL') || 'https://www.asaas.com/api/v3';
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface AsaasPaymentPayload {
  event: string;
  payment: {
    id: string;
    externalReference: string;
    status: string;
    value: number;
    billingType: string;
  };
}

// ------------------------------------------------------------------------------------------------
// UTILS
// ------------------------------------------------------------------------------------------------

function calculateInterest(baseAmount: number, installments: number): number {
  if (installments <= 1) return baseAmount;
  const rates: Record<number, number> = {
    2: 1.05, 3: 1.07, 4: 1.09, 5: 1.11, 6: 1.13,
    7: 1.15, 8: 1.17, 9: 1.19, 10: 1.21, 11: 1.23, 12: 1.25
  };
  return Number((baseAmount * (rates[installments] || 1)).toFixed(2));
}

// ------------------------------------------------------------------------------------------------
// MAIN HANDLER
// ------------------------------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  const method = req.method;
  if (method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  // Captura o path ignorando o prefixo da função
  const path = url.pathname.split('asaas-checkout-v2').pop()?.replace(/^\//, '') || '';

  try {
    // --------------------------------------------------------------------------------------------
    // ROUTE: webhook
    // --------------------------------------------------------------------------------------------
    if (path === 'webhook' && method === 'POST') {
      const incomingToken = req.headers.get('asaas-access-token');
      const payload = await req.json() as AsaasPaymentPayload;

      console.log(`[V3] Evento: ${payload.event} | ID: ${payload.payment?.id} | Token: ${incomingToken?.slice(0, 6) ?? 'N/A'}...`);

      const isConfirmation = [
        'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED',
        'PAYMENT_RECEIVED_IN_CASH', 'PAYMENT_DEPOSITED'
      ].includes(payload.event);

      if (isConfirmation) {
        const paymentId = payload.payment.id;
        const externalRef = payload.payment.externalReference;

        const { data: order } = await supabase
          .from('orders')
          .select('id, status')
          .or(`id.eq.${externalRef},asaas_payment_id.eq.${paymentId}`)
          .maybeSingle();

        if (order && order.status !== 'pago') {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
               status: 'pago',
               pix_confirmado: true,
               asaas_payment_id: paymentId
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`[V3] Erro ao confirmar pedido ${order.id}:`, updateError.message);
            throw updateError;
          }
          console.log(`[V3] Pedido ${order.id} confirmado → status: pago`);
        }
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --------------------------------------------------------------------------------------------
    // ROUTE: create-order
    // --------------------------------------------------------------------------------------------
    if (path === 'create-order' && method === 'POST') {
      const { customerData, total, items } = await req.json();

      const { data: order, error } = await supabase.from('orders').insert({
        status: 'pendente',
        total_amount: total,
        customer_email: customerData.email,
        customer_name: customerData.name,
        customer_cpf: customerData.cpf.replace(/\D/g, ''),
        customer_phone: customerData.phone.replace(/\D/g, '')
      }).select().single();

      if (error) throw error;

      if (items?.length > 0) {
        const orderItems = items.map((i: any) => ({
          order_id: order.id,
          product_id: i.id,
          product_name: i.name,
          quantity: i.quantity,
          product_price: i.price
        }));
        await supabase.from('order_items').insert(orderItems);
      }

      return new Response(JSON.stringify(order), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --------------------------------------------------------------------------------------------
    // ROUTE: status/:id
    // --------------------------------------------------------------------------------------------
    if (path.startsWith('status/') && method === 'GET') {
      const orderId = path.split('/').pop();
      const { data } = await supabase.from('orders').select('status, pix_confirmado').eq('id', orderId).single();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --------------------------------------------------------------------------------------------
    // ROUTE: generate-payment (Unified para PIX, BOLETO, CARD)
    // --------------------------------------------------------------------------------------------
    if (['generate-pix', 'generate-card', 'generate-boleto', 'generate-payment'].includes(path) && method === 'POST') {
      const payloadBody = await req.json();
      const { orderId, customerData, total, installments } = payloadBody;
      const payMethod = payloadBody.method || (path.includes('pix') ? 'pix' : path.includes('boleto') ? 'boleto' : 'card');

      // 1. Cliente (Sync)
      const sanitizedCpf = customerData.cpf.replace(/\D/g, '');
      const custRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${sanitizedCpf}`, { headers: { access_token: ASAAS_API_KEY } });
      const customers = await custRes.json();
      let customerId = customers.data?.[0]?.id;

      if (!customerId) {
        const createCust = await fetch(`${ASAAS_API_URL}/customers`, {
          method: 'POST',
          headers: { access_token: ASAAS_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: customerData.name,
            cpfCnpj: sanitizedCpf,
            email: customerData.email,
            mobilePhone: customerData.phone.replace(/\D/g, '')
          })
        });
        const newCust = await createCust.json();
        if (!createCust.ok) throw new Error(newCust.errors?.[0]?.description || 'Erro Cliente Asaas');
        customerId = newCust.id;
      }

      // 2. Billing
      const billingType = payMethod === 'pix' ? 'PIX' : payMethod === 'boleto' ? 'BOLETO' : 'CREDIT_CARD';
      const finalValue = billingType === 'CREDIT_CARD' ? calculateInterest(total, installments || 1) : total;

      const asaasPayload: any = {
        customer: customerId,
        billingType,
        value: finalValue,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        description: `Op. #${orderId.slice(0,6)} • Perfection Airsoft`,
        externalReference: orderId
      };

      if (billingType === 'CREDIT_CARD') {
        asaasPayload.creditCard = payloadBody.creditCard?.info || payloadBody.creditCard;
        asaasPayload.creditCardHolderInfo = payloadBody.creditCard?.holder || payloadBody.creditCardHolderInfo;
        if (installments > 1) asaasPayload.installmentCount = installments;
      }

      const payRes = await fetch(`${ASAAS_API_URL}/payments`, {
        method: 'POST',
        headers: { access_token: ASAAS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(asaasPayload)
      });
      const payment = await payRes.json();
      if (!payRes.ok) throw new Error(payment.errors?.[0]?.description || 'Erro Pagamento Asaas');

      await supabase.from('orders').update({ asaas_payment_id: payment.id }).eq('id', orderId);

      const responseData: any = { paymentId: payment.id, status: payment.status };

      if (billingType === 'PIX') {
        const qrRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/pixQrCode`, { headers: { access_token: ASAAS_API_KEY } });
        const qrData = await qrRes.json();
        responseData.qrCode = qrData.payload;
        responseData.qrCodeBase64 = qrData.encodedImage;
      } else if (billingType === 'BOLETO') {
        responseData.bankSlipUrl = payment.bankSlipUrl;
        const idRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/identificationField`, { headers: { access_token: ASAAS_API_KEY } });
        const idData = await idRes.json();
        responseData.identificationField = idData.identificationField;
      }

      return new Response(JSON.stringify(responseData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: `Not Found: ${path}` }), { status: 404, headers: corsHeaders });

  } catch (err: any) {
    console.error(`[V3-ERROR] ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
