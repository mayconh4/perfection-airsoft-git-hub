import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

/** 
 * LÓGICA SIMPLIFICADA PARA DEPLOY
 * Comentado SMTP e polyfills experimentais para isolar erro 500
 */

const ASAAS_API_KEY             = Deno.env.get('ASAAS_API_KEY') || '';
const ASAAS_API_URL             = 'https://sandbox.asaas.com/api/v3';
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Configurações de Notificação
const SMTP_HOSTNAME = Deno.env.get("SMTP_HOSTNAME") || "smtp.hostinger.com";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USERNAME = Deno.env.get("SMTP_USERNAME");
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");

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
  const method = req.method;
  if (method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  // Extrai o path após o nome da função para evitar erros de prefixo (v1/functions vs direct)
  const path = url.pathname.split('asaas-checkout-v2').pop() || '/';
  
  console.log(`[CheckoutV2] Requisição recebida - Método: ${method}, Path: ${path}`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ROTA DE AUTO-REPARO (Executar uma vez para consertar o banco)
    if (path === '/fix-db' && method === 'GET') {
      const sql = `
        ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_confirmado BOOLEAN DEFAULT FALSE;
      `;
      // Usar a RPC do Supabase se disponível ou tentar um insert de teste que force o erro para diagnóstico
      // Mas a melhor forma aqui é tentar um insert fantasma para testar as colunas
      return new Response(JSON.stringify({ message: "Rota de reparo ativa. Use para rodar SQL via Dashboard se o CLI falhar." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // WEBHOOK
    if (path === '/webhook' && method === 'POST') {
      const webhookSecret = Deno.env.get('ASAAS_WEBHOOK_SECRET');
      const incomingToken = req.headers.get('asaas-access-token');

      if (webhookSecret && incomingToken !== webhookSecret) {
        console.error("[CheckoutV2] TOKEN DE WEBHOOK INVÁLIDO");
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }

      const payload = await req.json();
      const event = payload.event;
      const payment = payload.payment;

      console.log(`[WEBHOOK] Recebido evento: ${event} para Pagamento ID: ${payment.id}`);

      if (event === 'PAYMENT_CONFIRMED') {
        // 1. Verificar se já não foi processado (Proteção)
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, pix_confirmado')
          .eq('asaas_payment_id', payment.id)
          .single();

        if (existingOrder?.pix_confirmado) {
          console.log(`[WEBHOOK] Pedido ${existingOrder.id} já estava confirmado. Ignorando.`);
          return new Response(JSON.stringify({ success: true, message: 'Already processed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 2. Atualizar exclusivamente por asaas_payment_id
        const { data: order, error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: 'confirmed', 
            pix_confirmado: true 
          })
          .eq('asaas_payment_id', payment.id)
          .select()
          .single();

        if (updateError) {
          console.error("[WEBHOOK] Erro ao atualizar pedido:", updateError);
          return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: corsHeaders });
        }

        if (order) {
          console.log(`[WEBHOOK] SUCESSO: Pedido ${order.id} confirmado automaticamente.`);
        }
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // CREATE ORDER
    if (path === '/create-order' && method === 'POST') {
      const { customerData, total, items } = await req.json();
      let userId = null;
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
          const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
          if (user) userId = user.id;
      }
      
      console.log("[CheckoutV2] Criando pedido para:", customerData.email);
      const { data: order, error: insertError } = await supabase.from('orders').insert({
        user_id: userId,
        status: 'pending',
        total_amount: total,
        customer_email: customerData.email,
        customer_name: customerData.name,
        customer_cpf: customerData.cpf,
        customer_phone: customerData.phone
      }).select().single();

      if (insertError) {
        console.error("[CheckoutV2] ERRO CRÍTICO NO POSTGRES:", insertError.code, insertError.message);
        return new Response(JSON.stringify({ 
          error: `Falha na gravação: [${insertError.code}] ${insertError.message}. Verifique a constraint de status.`, 
          details: insertError 
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      console.log("[CheckoutV2] Pedido gerado:", order.id);

      if (items?.length > 0) {
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

    // GENERATE PAYMENT (Unified)
    if (['/generate-pix', '/generate-card', '/generate-boleto'].includes(path) && method === 'POST') {
      const { orderId, customerData, total, creditCard, creditCardHolderInfo, installmentCount } = await req.json();
      
      // 1. Cliente
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

      // 2. Cobrança
      const billingType = path === '/generate-pix' ? 'PIX' : path === '/generate-boleto' ? 'BOLETO' : 'CREDIT_CARD';
      let finalValue = total;
      if (billingType === 'CREDIT_CARD' && (installmentCount || 1) > 1) {
        finalValue = calculateInterest(total, installmentCount);
      }

      const asaasPayload: any = {
        customer: customerId,
        billingType: billingType,
        value: finalValue,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        description: `Pedido ${orderId.slice(0,8)}`,
        externalReference: orderId
      };

      if (billingType === 'CREDIT_CARD') {
        asaasPayload.creditCard = creditCard;
        asaasPayload.creditCardHolderInfo = creditCardHolderInfo;
        if (installmentCount > 1) asaasPayload.installmentCount = installmentCount;
      }

      const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
        method: 'POST',
        headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(asaasPayload)
      });
      const payment = await paymentRes.json();
      if (!paymentRes.ok) throw new Error(payment.errors?.[0]?.description || 'Erro Asaas');

      await supabase.from('orders').update({ asaas_payment_id: payment.id }).eq('id', orderId);

      // 3. Resultado Específico
      const result: any = { paymentId: payment.id, orderId };

      if (billingType === 'PIX') {
        const qrRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/pixQrCode`, { headers: { 'access_token': ASAAS_API_KEY } });
        const qrData = await qrRes.json();
        result.qrCode = qrData.payload;
        result.qrCodeBase64 = qrData.encodedImage;
      }

      if (billingType === 'BOLETO') {
        result.bankSlipUrl = payment.bankSlipUrl;
        const idenRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/identificationField`, { headers: { 'access_token': ASAAS_API_KEY } });
        const idenJson = await idenRes.json();
        result.identificationField = idenJson.identificationField;
      }

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // STATUS e VERIFICAÇÃO DIRETA
    if (path.startsWith('/status/') && method === 'GET') {
      const orderId = path.split('/').pop();
      const { data } = await supabase.from('orders').select('status, pix_confirmado').eq('id', orderId).single();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (path.startsWith('/verify/') && method === 'GET') {
      const orderId = path.split('/').pop();
      console.log(`[CheckoutV2] Verificação manual solicitada para pedido: ${orderId}`);
      
      // 1. Pegar o ID de pagamento Asaas
      const { data: order } = await supabase.from('orders').select('asaas_payment_id, status').eq('id', orderId).single();
      
      if (!order?.asaas_payment_id) {
        return new Response(JSON.stringify({ error: 'ID de pagamento não encontrado' }), { status: 404, headers: corsHeaders });
      }

      // 2. Consultar o Asaas
      const res = await fetch(`${ASAAS_API_URL}/payments/${order.asaas_payment_id}`, {
        headers: { 'access_token': ASAAS_API_KEY }
      });
      const asaasData = await res.json();

      console.log(`[CheckoutV2] Status no Asaas para ${order.asaas_payment_id}: ${asaasData.status}`);

      // 3. Se confirmado, atualizar Banco
      if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(asaasData.status)) {
        await supabase.from('orders').update({ status: 'confirmed', pix_confirmado: true }).eq('id', orderId);
        return new Response(JSON.stringify({ confirmed: true, status: asaasData.status }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ confirmed: false, status: asaasData.status }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function notifyEmail(email: string, message: string) {
  console.log("Email skip:", email, message);
}

async function notifyWhatsApp(phone: string, message: string) {
  console.log("WhatsApp skip:", phone, message);
}
