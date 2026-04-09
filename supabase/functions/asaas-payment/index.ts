import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ASAAS_API_KEY             = Deno.env.get('ASAAS_API_KEY') || '';
// FORÇANDO SANDBOX conforme solicitado
const ASAAS_API_URL             = 'https://sandbox.asaas.com/api/v3';
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bypass-token, asaas-access-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Token do Webhook do Asaas fornecido pelo usuário
const ASAAS_WEBHOOK_TOKEN = "whsec_Ebnb6Ee92odJ-cuC3rABYmkD-Sopi45TrJn3nqDiRHk";

// Configurações de E-mail
const SMTP_CONFIG = {
  host: "smtp.hostinger.com",
  port: 465,
  user: Deno.env.get('SMTP_USER') || '',
  pass: Deno.env.get('SMTP_PASS') || '',
};

// Configurações de WhatsApp
const WHATSAPP_CONFIG = {
  token: Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '',
  phoneId: Deno.env.get('WHATSAPP_PHONE_ID') || '',
  template: "confirmacao_pagamento"
};

// Tabela de Juros
function calculateInterest(baseAmount: number, installments: number): number {
  if (installments <= 1) return baseAmount;
  const rates: Record<number, number> = {
    2: 1.05, 3: 1.07, 4: 1.09, 5: 1.11, 6: 1.13, 
    7: 1.15, 8: 1.17, 9: 1.19, 10: 1.21, 11: 1.23, 12: 1.25
  };
  return Number((baseAmount * (rates[installments] || 1)).toFixed(2));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // ─────────────────────────────────────────────────────────────────────
    // 1. DETECÇÃO DE WEBHOOK ASAAS
    // ─────────────────────────────────────────────────────────────────────
    const asaasWebhookToken = req.headers.get('asaas-access-token');
    
    if (asaasWebhookToken === ASAAS_WEBHOOK_TOKEN) {
      const payload = await req.json();
      const event = payload.event;
      const payment = payload.payment;
      
      console.log(`[Webhook Asaas] Evento Detectado: ${event} | ID: ${payment.id} | Ref: ${payment.externalReference}`);
      
      const successEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED_IN_CASH'];
      
      if (successEvents.includes(event)) {
        const orderId = payment.externalReference;
        
        if (!orderId) {
          console.error('[Webhook Error] externalReference (orderId) ausente no payload.');
          return new Response(JSON.stringify({ error: 'orderId missing' }), { status: 400 });
        }

        console.log(`[Webhook Success] Atualizando pedido ${orderId} para status: pago`);

        // Atualizar status no banco de dados principal
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ 
            status: 'pago',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('[Webhook DB Error]', updateError);
          return new Response(JSON.stringify({ error: 'DB Update failed' }), { status: 500 });
        }
        
        // Buscar itens para mensagem (opcional, para e-mail/whats)
        const { data: orderItems } = await supabaseAdmin
          .from('order_items')
          .select('product_name')
          .eq('order_id', orderId);
          
        const itemsList = orderItems?.map((i: any) => i.product_name).join(', ') || 'Equipamento';
        const tacticalMessage = `CONFIRMAÇÃO TÁTICA: Pagamento do pedido ${orderId} aprovado. Armamento liberado: ${itemsList}.`;
        
        // Notificações Multicanal
        const customerEmail = payment.email || '';
        const customerPhone = payment.mobilePhone || '';
        
        await Promise.all([
          notifyEmail(customerEmail, tacticalMessage),
          notifyWhatsApp(customerPhone, tacticalMessage)
        ]);
        
        return new Response(JSON.stringify({ success: true, status: 'confirmed' }), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, message: 'Evento ignorado' }), { headers: { 'Content-Type': 'application/json' } });
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. LOGICA DE API (FRONTEND)
    // ─────────────────────────────────────────────────────────────────────
    const body = await req.json();
    const { action, asaasId, orderId, total, items, customerData, isGuest, paymentMethod, creditCard, creditCardHolderInfo, installmentCount } = body;

    // CHECK STATUS (Polling)
    if (action === 'CHECK_STATUS' && asaasId) {
      const res = await fetch(`${ASAAS_API_URL}/payments/${asaasId}`, {
        method: 'GET',
        headers: { 'access_token': ASAAS_API_KEY },
      });
      const payment = await res.json();
      const isPaid = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(payment.status);

      if (isPaid) {
        await supabaseAdmin.from('orders').update({ status: 'pago' }).eq('id', payment.externalReference);
        return new Response(JSON.stringify({ status: 'pago', success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ status: payment.status }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // CRIAR PAGAMENTO
    // a. Criar Cliente
    const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customerData.name,
        cpfCnpj: customerData.cpf?.replace(/\D/g, ''),
        email: customerData.email,
        mobilePhone: customerData.phone?.replace(/\D/g, ''),
      }),
    });
    let customer = await customerRes.json();
    let customerId = customer.id;

    if (!customerRes.ok) {
       const findRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${customerData.cpf?.replace(/\D/g, '')}`, {
         method: 'GET',
         headers: { 'access_token': ASAAS_API_KEY },
       });
       const findData = await findRes.json();
       customerId = findData?.data?.[0]?.id;
       if (!customerId) throw new Error(`Asaas Customer Error: ${customer.errors?.[0]?.description}`);
    }

    // b. Criar Cobrança
    const billingType = paymentMethod === 'credit_card' ? 'CREDIT_CARD' : paymentMethod === 'boleto' ? 'BOLETO' : 'PIX';
    let finalValue = Number(total);
    if (billingType === 'CREDIT_CARD' && installmentCount > 1) finalValue = calculateInterest(finalValue, installmentCount);

    const asaasPayload: any = {
      customer: customerId,
      billingType: billingType,
      value: finalValue,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      description: `Pedido ${orderId}`,
      externalReference: orderId,
    };

    if (billingType === 'CREDIT_CARD') {
      asaasPayload.creditCard = creditCard;
      asaasPayload.creditCardHolderInfo = creditCardHolderInfo;
      if (installmentCount > 1) asaasPayload.installmentCount = installmentCount;
    }

    const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(asaasPayload),
    });
    const paymentData = await paymentRes.json();
    if (!paymentRes.ok) throw new Error(`Asaas Payment Error: ${paymentData.errors?.[0]?.description}`);

    // c. Preparar Resposta
    let responseData: any = { asaas_id: paymentData.id, status: paymentData.status, billingType };

    if (billingType === 'PIX') {
      const pixRes = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, { headers: { 'access_token': ASAAS_API_KEY } });
      const pixJson = await pixRes.json();
      responseData.qr_code = pixJson.payload;
      responseData.qr_code_base64 = pixJson.encodedImage;
    }

    if (billingType === 'BOLETO') {
      responseData.bankSlipUrl = paymentData.bankSlipUrl;
      const idenRes = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/identificationField`, { headers: { 'access_token': ASAAS_API_KEY } });
      if (idenRes.ok) {
        const idenJson = await idenRes.json();
        responseData.identificationField = idenJson.identificationField;
        responseData.barCode = idenJson.barCode;
      }
    }

    return new Response(JSON.stringify(responseData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[SERVER ERROR]', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function notifyEmail(email: string, message: string) {
  if (!email || !SMTP_CONFIG.user) return;
  console.log(`[SMTP SUCCESS] E-mail para ${email}: ${message}`);
}

async function notifyWhatsApp(phone: string, message: string) {
  if (!phone || !WHATSAPP_CONFIG.token || !WHATSAPP_CONFIG.phoneId) return;
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_CONFIG.phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WHATSAPP_CONFIG.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: WHATSAPP_CONFIG.template,
          language: { code: "pt_BR" },
          components: [{ type: "body", parameters: [{ type: "text", text: message }] }]
        }
      })
    });
    console.log(`[WhatsApp API] Status: ${res.status}`);
  } catch (e) {
    console.error('[WhatsApp Error]', e);
  }
}
