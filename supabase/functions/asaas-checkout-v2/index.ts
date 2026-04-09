import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ASAAS_API_KEY             = Deno.env.get('ASAAS_API_KEY') || '';
const ASAAS_API_URL             = 'https://sandbox.asaas.com/api/v3';
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const ASAAS_WEBHOOK_TOKEN = "whsec_Ebnb6Ee92odJ-cuC3rABYmkD-Sopi45TrJn3nqDiRHk";

// Configurações de Notificação
const SMTP_CONFIG = { user: Deno.env.get('SMTP_USER') || '' };
const WHATSAPP_CONFIG = {
  token: Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '',
  phoneId: Deno.env.get('WHATSAPP_PHONE_ID') || '',
  template: "confirmacao_pagamento"
};

Deno.serve(async (req: Request) => {
  const method = req.method;
  if (method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  // Remove o prefixo da função para roteamento limpo
  const path = url.pathname.replace(/\/functions\/v1\/asaas-checkout-v2/, '');
  
  console.log(`[asaas-v2] Request: ${method} ${path}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ─────────────────────────────────────────────────────────────────────
    // 1. WEBHOOK (POST /webhook)
    // ─────────────────────────────────────────────────────────────────────
    if (path === '/webhook' && method === 'POST') {
      const payload = await req.json();
      console.log("[asaas-v2] Webhook received:", payload.event);

      const event = payload.event;
      const payment = payload.payment;

      if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        const asaasPaymentId = payment.id;
        
        const { data: order, error: updateErr } = await supabase
          .from('orders')
          .update({ status: 'confirmed', pix_confirmado: true })
          .eq('asaas_payment_id', asaasPaymentId)
          .select()
          .single();

        if (updateErr) {
          console.error(`[asaas-v2] Webhook update error:`, updateErr);
        } else if (order) {
          console.log(`[asaas-v2] Order ${order.id} confirmed via webhook.`);
          const tacticalMessage = `CONFIRMAÇÃO TÁTICA: Pagamento aprovado. Pedido ${order.id.slice(0,8)} ATIVADO.`;
          await Promise.all([
            notifyEmail(order.customer_email, tacticalMessage),
            notifyWhatsApp(payment.mobilePhone, tacticalMessage)
          ]);
        }
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. CREATE ORDER (POST /create-order)
    // ─────────────────────────────────────────────────────────────────────
    if (path === '/create-order' && method === 'POST') {
      const { customerData, total, items } = await req.json();
      console.log(`[asaas-v2] Creating order for: ${customerData.email}`);

      // Identificar usuário se houver token
      let userId = null;
      const authHeader = req.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.replace("Bearer ", "");
          // Tenta pegar o user, se falhar continua como guest
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) userId = user.id;
      }
      
      const { data: order, error } = await supabase.from('orders').insert({
        user_id: userId,
        status: 'pending',
        pix_confirmado: false,
        total_amount: total,
        customer_email: customerData.email,
        customer_name: customerData.name,
        customer_cpf: customerData.cpf,
        customer_phone: customerData.phone
      }).select().single();

      if (error) {
          console.error("[asaas-v2] Database error creating order:", error);
          throw error;
      }

      // Inserir itens
      if (items && items.length > 0) {
        const orderItems = items.map((item: any) => ({
            order_id: order.id,
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price
        }));
        await supabase.from('order_items').insert(orderItems);
      }

      return new Response(JSON.stringify(order), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. GENERATE PIX (POST /generate-pix)
    // ─────────────────────────────────────────────────────────────────────
    if (path === '/generate-pix' && method === 'POST') {
      const { orderId, customerData, total } = await req.json();
      console.log(`[asaas-v2] Generating PIX for order: ${orderId}`);

      if (!ASAAS_API_KEY) throw new Error("ASAAS_API_KEY is not configured in Edge Function secrets.");

      // a. Criar/Buscar Cliente
      const customerRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${customerData.cpf.replace(/\D/g, '')}`, {
        headers: { 'access_token': ASAAS_API_KEY }
      });
      const customers = await customerRes.json();
      let customerId = customers.data?.[0]?.id;

      if (!customerId) {
        const createCust = await fetch(`${ASAAS_API_URL}/customers`, {
          method: 'POST',
          headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: customerData.name,
            cpfCnpj: customerData.cpf.replace(/\D/g, ''),
            email: customerData.email,
            mobilePhone: customerData.phone.replace(/\D/g, '')
          })
        });
        const newCust = await createCust.json();
        customerId = newCust.id;
      }

      // b. Criar Cobrança Pix
      const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
        method: 'POST',
        headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value: total,
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          description: `Pedido ${orderId.slice(0,8)}`,
          externalReference: orderId
        })
      });
      const payment = await paymentRes.json();
      if (!paymentRes.ok) throw new Error(payment.errors?.[0]?.description || 'Erro Asaas ao criar cobrança');

      // c. Salvar asaas_payment_id
      await supabase.from('orders').update({ asaas_payment_id: payment.id }).eq('id', orderId);

      // d. Gerar QR Code
      const qrRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/pixQrCode`, {
        headers: { 'access_token': ASAAS_API_KEY }
      });
      const qrData = await qrRes.json();

      return new Response(JSON.stringify({
        paymentId: payment.id,
        qrCode: qrData.payload,
        qrCodeBase64: qrData.encodedImage,
        orderId: orderId
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. STATUS (GET /status/{id})
    // ─────────────────────────────────────────────────────────────────────
    if (path.startsWith('/status/') && method === 'GET') {
      const parts = path.split('/');
      const orderId = parts[parts.length - 1];

      const { data, error } = await supabase
        .from('orders')
        .select('status, pix_confirmado')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Rota não encontrada' }), { status: 404, headers: corsHeaders });

  } catch (err: any) {
    console.error("[asaas-v2] ERROR:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

async function notifyEmail(email: string, message: string) {
  if (!email || !SMTP_CONFIG.user) return;
  console.log(`[SMTP-NOTIFICATION] E-mail para ${email}: ${message}`);
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
    console.log(`[WHATS_API] Status: ${res.status}`);
  } catch (e) {
    console.error('[WHATS_ERROR]', e);
  }
}
