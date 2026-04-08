import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ASAAS_API_KEY             = Deno.env.get('ASAAS_API_KEY') || '';
// FORÇANDO SANDBOX conforme solicitado
const ASAAS_API_URL             = 'https://sandbox.asaas.com/api/v3';
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bypass-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Tabela de Juros (Exemplo pró: 4.5% fixo + 1.5% por parcela adicional)
function calculateInterest(baseAmount: number, installments: number): number {
  if (installments <= 1) return baseAmount;
  const rates: Record<number, number> = {
    2: 1.05,  // 5% total
    3: 1.07,  // 7% total
    4: 1.09,
    5: 1.11,
    6: 1.13,
    7: 1.15,
    8: 1.17,
    9: 1.19,
    10: 1.21,
    11: 1.23,
    12: 1.25   // 25% total em 12x
  };
  return Number((baseAmount * (rates[installments] || 1)).toFixed(2));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { 
      action, asaasId, orderId, total, items, 
      customerData, isGuest, paymentMethod, 
      creditCard, creditCardHolderInfo, installmentCount 
    } = body;

    // ─────────────────────────────────────────────────────────────────────
    // 0. VERIFICAÇÃO MANUAL DE STATUS
    // ─────────────────────────────────────────────────────────────────────
    if (action === 'CHECK_STATUS' && asaasId) {
      const res = await fetch(`${ASAAS_API_URL}/payments/${asaasId}`, {
        method: 'GET',
        headers: { 'access_token': ASAAS_API_KEY },
      });
      const payment = await res.json();
      if (!res.ok) throw new Error(`Status Check: ${payment.errors?.[0]?.description}`);

      const isPaid = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(payment.status);

      if (isPaid) {
        const finalOrderId = payment.externalReference;
        await supabaseAdmin.from('orders').update({ status: 'pago' }).eq('id', finalOrderId);
        return new Response(JSON.stringify({ status: 'pago', orderId: finalOrderId }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify({ status: payment.status }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // 1. GESTÃO DE PEDIDO
    // ─────────────────────────────────────────────────────────────────────
    let finalOrderId = orderId;
    if (isGuest && orderId === 'GUEST_NEW') {
      const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert([{
          user_id: null,
          total: Number(total),
          status: 'pendente',
          customer_data: {
            ...customerData,
            cpf:   customerData.cpf?.replace(/\D/g, ''),
            phone: customerData.phone?.replace(/\D/g, ''),
          },
          shipping_address: { street: 'Digital', city: 'Online', cep: '00000-000' },
        }])
        .select().single();

      if (orderErr) throw new Error(`Erro ao criar pedido: ${orderErr.message}`);
      finalOrderId = order.id;

      const orderItems = items.map((ci: any) => ({
        order_id:      finalOrderId,
        product_id:    ci.product_id,
        product_name:  ci.product_name,
        product_price: ci.product_price,
        quantity:      ci.quantity,
        metadata:      ci.metadata || null,
      }));
      await supabaseAdmin.from('order_items').insert(orderItems);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. RESOLVER RECEBEDOR (WALLET)
    // ─────────────────────────────────────────────────────────────────────
    const orderDescription = `Pedido ${finalOrderId} - Perfection Airsoft`;

    // ─────────────────────────────────────────────────────────────────────
    // 3. PROCESSAR PAYLOAD ASAAS
    // ─────────────────────────────────────────────────────────────────────
    
    // Criar/Buscar Customer
    const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        customerData.name,
        cpfCnpj:     customerData.cpf?.replace(/\D/g, ''),
        email:       customerData.email,
        mobilePhone: customerData.phone?.replace(/\D/g, ''),
      }),
    });
    const customer = await customerRes.json();
    
    let customerId = customer.id;
    if (!customerRes.ok) {
       // Se o erro for "already registered", buscar por CPF
       const findRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${customerData.cpf?.replace(/\D/g, '')}`, {
         method: 'GET',
         headers: { 'access_token': ASAAS_API_KEY },
       });
       const findData = await findRes.json();
       customerId = findData.data?.[0]?.id;
       if (!customerId) throw new Error(`Asaas Customer: ${customer.errors?.[0]?.description}`);
    }

    const billingType = paymentMethod === 'credit_card' ? 'CREDIT_CARD' : 
                        paymentMethod === 'boleto'      ? 'BOLETO' : 'PIX';

    // Cálculo de valor final com juros para cartão
    let finalValue = Number(total);
    if (billingType === 'CREDIT_CARD' && installmentCount > 1) {
      finalValue = calculateInterest(finalValue, installmentCount);
    }

    const asaasPayload: any = {
      customer:          customerId,
      billingType:       billingType,
      value:             finalValue,
      dueDate:           new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
      description:       orderDescription,
      externalReference: finalOrderId,
    };

    if (billingType === 'CREDIT_CARD') {
      asaasPayload.creditCard = creditCard;
      asaasPayload.creditCardHolderInfo = creditCardHolderInfo;
      if (installmentCount > 1) {
        asaasPayload.installmentCount = installmentCount;
      }
    }

    const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(asaasPayload),
    });
    
    const payment = await paymentRes.json();
    if (!paymentRes.ok) {
      console.error('[ASAAS REJECT]', payment.errors);
      throw new Error(`Asaas: ${payment.errors?.[0]?.description || 'Erro no processamento'}`);
    }

    let responseData: any = {
      order_id: finalOrderId,
      asaas_id: payment.id,
      status:   payment.status,
      billingType: billingType,
      totalAmount: finalValue
    };

    // ─────────────────────────────────────────────────────────────────────
    // 4. TRATAR RETORNOS ESPECÍFICOS
    // ─────────────────────────────────────────────────────────────────────
    
    if (billingType === 'PIX') {
      const pixRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/pixQrCode`, {
        method: 'GET',
        headers: { 'access_token': ASAAS_API_KEY },
      });
      const pixJson = await pixRes.json();
      responseData.qr_code = pixJson.payload;
      responseData.qr_code_base64 = pixJson.encodedImage;
    }

    if (billingType === 'BOLETO') {
      responseData.bankSlipUrl = payment.bankSlipUrl;
      
      // Fallback: Se identificationField não veio no objeto principal, buscar no endpoint específico
      if (!payment.identificationField) {
        const idenRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/identificationField`, {
          method: 'GET',
          headers: { 'access_token': ASAAS_API_KEY },
        });
        const idenJson = await idenRes.json();
        responseData.identificationField = idenJson.identificationField || idenJson.nossoNumero;
        responseData.barCode = idenJson.barCode;
      } else {
        responseData.identificationField = payment.identificationField;
        responseData.barCode = payment.barCode;
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. PERSISTÊNCIA NO BANCO
    // ─────────────────────────────────────────────────────────────────────
    await supabaseAdmin.from('orders').update({
      mercadopago_id: `ASAAS_${payment.id}`,
      payment_type: billingType.toLowerCase(),
      payment_qr_code: responseData.qr_code || null,
      payment_qr_code_base64: responseData.qr_code_base64 || null,
      status: (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED') ? 'pago' : 'pendente',
    }).eq('id', finalOrderId);

    return new Response(JSON.stringify(responseData), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    const errorMessage = err.message || '';
    const isLimitError = errorMessage.toLowerCase().includes('excede o seu limite autorizado');

    if (isLimitError) {
      console.error('[CORE-307] ASAAS_LIMIT_EXCEEDED:', errorMessage);
      return new Response(JSON.stringify({ 
        error: 'Erro 307',
        errorCode: 307,
        type: 'ASAAS_LIMIT_EXCEEDED'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.error('[ASAAS ERROR]', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
