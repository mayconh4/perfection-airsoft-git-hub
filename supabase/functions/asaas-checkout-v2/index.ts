import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * PHOENIX UPGRADE (v3 logic on v2 endpoint)
 * Mantendo o endpoint asaas-checkout-v2 para evitar mudanças manuais no dashboard do Asaas.
 * Implementando Realtime, Auditoria e Multi-Checkout (PIX, CARTÃO, BOLETO).
 * deploy: 2026-04-15T00:00:00Z
 */

const ASAAS_API_KEY             = (Deno.env.get('ASAAS_API_KEY') || '').trim();
// URL sempre derivada do prefixo da chave — elimina mismatch de ambiente por configuração errada
// $aact_prod_  → produção  |  qualquer outro prefixo → sandbox
const ASAAS_API_URL             = ASAAS_API_KEY.startsWith('$aact_prod_')
  ? 'https://www.asaas.com/api/v3'
  : 'https://sandbox.asaas.com/api/v3';
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
// Token configurado no painel Asaas → Integrações → Webhooks → "Token de acesso"
const ASAAS_WEBHOOK_TOKEN       = Deno.env.get('ASAAS_WEBHOOK_TOKEN') || '';

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

      // Valida o token de segurança configurado no painel Asaas
      // Se ASAAS_WEBHOOK_TOKEN não estiver configurado ainda, loga aviso mas não bloqueia
      if (ASAAS_WEBHOOK_TOKEN && incomingToken !== ASAAS_WEBHOOK_TOKEN) {
        console.warn('[V3] Webhook rejeitado — token inválido:', incomingToken?.slice(0, 6) ?? 'N/A');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const payload = await req.json() as AsaasPaymentPayload;
      console.log(`[V3] Evento: ${payload.event} | ID: ${payload.payment?.id}`);

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
      const { customerData, total, items, userId } = await req.json();

      console.log(`[V3] create-order | total=${total} | userId=${userId || 'guest'} | items=${items?.length || 0}`);

      const insertData: any = {
        status: 'pendente',
        total_amount: total,
        customer_email: customerData.email,
        customer_name: customerData.name,
        customer_cpf: (customerData.cpf || '').replace(/\D/g, ''),
        customer_phone: (customerData.phone || '').replace(/\D/g, ''),
      };
      // Só inclui user_id se for um UUID válido (evita violação NOT NULL)
      if (userId && typeof userId === 'string' && userId.length > 10) {
        insertData.user_id = userId;
      }

      const { data: order, error } = await supabase.from('orders').insert(insertData).select().single();

      if (error) {
        console.error('[V3] create-order DB error:', JSON.stringify(error));
        throw new Error(error.message || 'Falha ao criar pedido no banco de dados');
      }

      if (items?.length > 0) {
        const isVirtual = (i: any) => i.metadata?.type === 'ticket' || i.metadata?.type === 'raffle' || i.metadata?.brand === 'TICKET' || i.metadata?.brand === 'DROP';
        const orderItems = items.map((i: any) => ({
          order_id: order.id,
          product_id: isVirtual(i) ? null : (i.id || null),
          product_name: i.name,
          quantity: i.quantity,
          product_price: i.price,
          metadata: i.metadata || null
        }));
        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) {
          console.error('[V3] order_items insert error:', JSON.stringify(itemsError));
        }
      }

      return new Response(JSON.stringify(order), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --------------------------------------------------------------------------------------------
    // ROUTE: status/:id
    // --------------------------------------------------------------------------------------------
    if (path.startsWith('status/') && method === 'GET') {
      const orderId = path.split('/').pop();
      const { data } = await supabase.from('orders').select('status').eq('id', orderId).single();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --------------------------------------------------------------------------------------------
    // ROUTE: generate-payment (Unified para PIX, BOLETO, CARD)
    // --------------------------------------------------------------------------------------------
    if (['generate-pix', 'generate-card', 'generate-boleto', 'generate-payment'].includes(path) && method === 'POST') {
      const payloadBody = await req.json();
      const { orderId, customerData, total, installments } = payloadBody;
      const payMethod = payloadBody.method || (path.includes('pix') ? 'pix' : path.includes('boleto') ? 'boleto' : 'card');

      // Diagnóstico: loga URL e prefixo da chave (nunca loga chave completa)
      const keyPrefix = ASAAS_API_KEY.slice(0, 22);
      const isProduction = ASAAS_API_URL.includes('sandbox') === false;
      console.log(`[V3-DIAG] URL: ${ASAAS_API_URL} | isProd: ${isProduction} | KeyPrefix: ${keyPrefix}... | KeyLen: ${ASAAS_API_KEY.length}`);

      // Validações básicas antes de chamar a API
      if (!customerData?.cpf) throw new Error('CPF obrigatório para processar o pagamento.');
      if (!customerData?.name) throw new Error('Nome obrigatório para processar o pagamento.');
      if (!customerData?.email) throw new Error('E-mail obrigatório para processar o pagamento.');
      if (!total || total <= 0) throw new Error('Valor inválido para o pagamento.');

      // 1. Cliente (Sync)
      const sanitizedCpf = customerData.cpf.replace(/\D/g, '');
      const sanitizedPhone = (customerData.phone || '').replace(/\D/g, '');

      if (sanitizedCpf.length < 11) throw new Error('CPF inválido. Verifique os dados e tente novamente.');

      const custRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${sanitizedCpf}`, { headers: { access_token: ASAAS_API_KEY } });
      if (!custRes.ok) {
        const custErr = await custRes.json().catch(() => ({}));
        console.error(`[V3] Erro ao buscar cliente (HTTP ${custRes.status}):`, JSON.stringify(custErr));
        throw new Error(custErr.errors?.[0]?.description || `Falha ao verificar cadastro (HTTP ${custRes.status}). Tente novamente.`);
      }
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
            ...(sanitizedPhone ? { mobilePhone: sanitizedPhone } : {})
          })
        });
        const newCust = await createCust.json();
        if (!createCust.ok) {
          console.error('[V3] Erro ao criar cliente Asaas:', newCust);
          throw new Error(newCust.errors?.[0]?.description || 'Não foi possível registrar seus dados. Verifique o CPF e tente novamente.');
        }
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
