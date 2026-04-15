import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

/** 
 * Polyfill para Deno.writeAll 
 */
if (!(Deno as any).writeAll) {
  (Deno as any).writeAll = async (w: any, data: Uint8Array) => {
    let nwritten = 0;
    while (nwritten < data.length) {
      nwritten += await w.write(data.subarray(nwritten));
    }
  };
}

const SMTP_HOSTNAME = Deno.env.get('SMTP_HOSTNAME') || 'smtp.hostinger.com';
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT')) || 465;
const SMTP_USERNAME = Deno.env.get('SMTP_USERNAME') || '';
const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD') || '';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') || '';

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID') || '';
const ZAPI_TOKEN       = Deno.env.get('ZAPI_TOKEN') || '';

// ── WhatsApp via Z-API ─────────────────────────────────────────────────────
async function sendWhatsApp(rawPhone: string, message: string): Promise<void> {
  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !rawPhone) return;
  try {
    const phone = rawPhone.replace(/\D/g, '');
    const e164  = phone.startsWith('55') ? phone : `55${phone}`;
    await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164, message }),
      }
    );
  } catch (err) {
    console.warn('[WHATSAPP] Falha ao enviar mensagem:', err);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- HELPER: TEMPLATE DE E-MAIL ---
function getTicketEmailHtml(data: {
  buyerName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  tickets: Array<{ qrUuid: string; id: string }>;
}) {
  const ticketSections = data.tickets.map((ticket, index) => `
    <div style="border: 2px solid #ffc107; padding: 25px; margin-bottom: 25px; background: #000; color: #fff; text-align: center;">
      <h3 style="color: #ffc107; text-transform: uppercase; margin-top: 0; font-size: 14px; letter-spacing: 2px;">Tag de Operador #${index + 1}</h3>
      <div style="border: 1px solid #ffc10720; padding: 15px; margin: 15px 0; background: #1a1a15;">
        <p style="margin: 0; font-size: 10px; color: #666; text-transform: uppercase;">Identificação</p>
        <p style="margin: 5px 0 0 0; font-size: 18px; color: #fff; font-weight: 900; text-transform: uppercase;">${data.buyerName}</p>
      </div>
      <div style="display: flex; justify-content: center; gap: 20px; margin-top: 15px;">
        <div style="flex: 1; border-right: 1px solid #333; padding-right: 10px;">
          <p style="margin: 0; font-size: 8px; color: #666; text-transform: uppercase;">ID Missão</p>
          <p style="margin: 3px 0 0 0; font-size: 12px; color: #ffc107; font-family: monospace;">#${ticket.qrUuid.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1a1a15; border: 1px solid #ffc10720; }
    .header { background-color: #ffc107; padding: 30px; text-align: center; }
    .content { padding: 30px; line-height: 1.6; }
    .hud-line { height: 2px; background: linear-gradient(90deg, transparent, #ffc107, transparent); margin: 20px 0; }
    .footer { padding: 20px; text-align: center; color: #444; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0d0d0d; text-transform: uppercase; letter-spacing: -1px;">PERFECTION AIRSOFT</h1>
    </div>
    <div class="content">
      <h2 style="text-transform: uppercase; letter-spacing: 2px; color: #ffc107; font-size: 18px;">Protocolo de Missão Disponível</h2>
      <p>Operador <strong>${data.buyerName}</strong>,</p>
      <p>Seu acesso para a missão <strong>${data.eventName}</strong> foi confirmado com sucesso.</p>
      
      <div style="background: #000; padding: 15px; border-left: 3px solid #ffc107; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>Data:</strong> ${data.eventDate}</p>
        <p style="margin: 0; font-size: 14px;"><strong>Local:</strong> ${data.eventLocation}</p>
      </div>

      <div class="hud-line"></div>

      ${ticketSections}

      <p style="margin-top: 30px; font-size: 12px; color: #888; border-top: 1px solid #333; padding-top: 10px;">
        <strong>Instrução Tática:</strong> Apresente este documento ou informe seu Nome/CPF no QG do evento para validação de entrada. 
        Sua presença será conferida manualmente em nossa lista de operadores autorizados.
      </p>
    </div>
    <div class="footer">
      © 2026 PERFECTION AIRSOFT // OPERATIONAL HUB // BRAZIL
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log('[ASAAS-WEBHOOK] Payload recebido:', JSON.stringify(body));

    const asaasToken = req.headers.get('asaas-access-token');
    if (asaasToken && asaasToken !== ASAAS_WEBHOOK_TOKEN) {
      console.warn(`[ASAAS-WEBHOOK] Token Divergente.`);
    }

    const event = body.event;
    const payment = body.payment;
    const orderId = payment?.externalReference;

    if (!orderId) return new Response(JSON.stringify({ status: 'ignored' }), { headers: corsHeaders });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (
      event === 'PAYMENT_CONFIRMED' ||
      event === 'PAYMENT_RECEIVED' ||
      event === 'PAYMENT_SETTLED'
    ) {
      console.log(`[ASAAS-WEBHOOK] SINAL DETECTADO: ${event} para Pedido: ${orderId}`);

      // Mapear billingType para payment_type do banco
      const billingTypeMap: Record<string, string> = {
        'PIX': 'pix',
        'BOLETO': 'boleto',
        'CREDIT_CARD': 'credit_card'
      };
      const paymentType = billingTypeMap[payment.billingType] || 'asaas';

      // ── 1. ATUALIZAR STATUS DO PEDIDO ──
      console.log(`[ASAAS-WEBHOOK] Atualizando banco de dados para ID: ${orderId} -> pago`);
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'pago',
          payment_type: paymentType,
          payment_id: payment.id
        })
        .eq('id', orderId);

      if (updateError) {
        console.error(`[ASAAS-WEBHOOK] Erro ao atualizar pedido ${orderId}:`, updateError);
        throw updateError;
      }
      console.log(`[ASAAS-WEBHOOK] Pedido ${orderId} marcado como pago.`);

      // ── 2. PROCESSAR ITENS ──
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (orderItems && orderItems.length > 0) {
        // Tickets de Eventos
        const ticketItems = orderItems.filter((i: any) => i.metadata?.brand === 'TICKET' || i.metadata?.type === 'ticket');
        for (const item of ticketItems) {
          const eventId = item.metadata?.event_id;
          if (!eventId) continue;

          const { data: order } = await supabase.from('orders').select('user_id, customer_data').eq('id', orderId).single();
          const buyerName = order?.customer_data?.name || 'Operador';
          const buyerEmail = order?.customer_data?.email || '';

          // Gerar tickets
          for (let i = 0; i < (item.quantity || 1); i++) {
            await supabase.from('tickets').insert({
              event_id: eventId,
              order_id: orderId,
              buyer_id: order?.user_id || null,
              buyer_name: buyerName,
              buyer_email: buyerEmail,
              buyer_cpf: order?.customer_data?.cpf || '',
              buyer_phone: order?.customer_data?.phone || '',
              status: 'confirmed',
              qr_uuid: crypto.randomUUID(),
            });
          }

            // WhatsApp — Ingresso confirmado
          const phone = order?.customer_data?.phone || '';
          if (phone) {
            const { data: ev0 } = await supabase.from('events').select('title,date,location').eq('id', eventId).single();
            const evDate = ev0?.date ? new Date(ev0.date).toLocaleDateString('pt-BR') : '';
            await sendWhatsApp(phone,
              `✅ *Ingresso Confirmado!*\n\nOlá, ${order?.customer_data?.name || 'Operador'}!\n\nSeu ingresso para *${ev0?.title || 'o evento'}* está confirmado.\n\n📅 Data: ${evDate}\n📍 Local: ${ev0?.location || ''}\n\nAcesse seus ingressos em:\nhttps://www.perfectionairsoft.com.br/meus-ingressos`
            );
          }

          // Saldo do Organizador
          const { data: ev } = await supabase.from('events').select('title, date, location, organizer_id, platform_fee').eq('id', eventId).single();
          if (ev) {
            const amount = Number(payment.value);
            const netAmount = amount - (amount * (ev.platform_fee / 100)) - (payment.billingType === 'PIX' ? 0.99 : 2.49);
            
            const { data: balance } = await supabase.from('user_balances').select('*').eq('user_id', ev.organizer_id).single();
            if (balance) {
              await supabase.from('user_balances').update({ 
                total_earned: Number(balance.total_earned || 0) + netAmount,
                available_balance: Number(balance.available_balance || 0) + netAmount 
              }).eq('user_id', ev.organizer_id);
            }
          }
        }

        // Tickets de Rifas
        const raffleItems = orderItems.filter((i: any) => i.metadata?.brand === 'DROP' || i.metadata?.type === 'raffle');
        if (raffleItems.length > 0) {
          await supabase.from('raffle_tickets')
            .update({ payment_status: 'pago', purchased_at: new Date().toISOString() })
            .eq('payment_id', orderId);

          // WhatsApp — Drop confirmado
          const { data: raffleOrder } = await supabase.from('orders').select('customer_data').eq('id', orderId).single();
          const rafflePhone = raffleOrder?.customer_data?.phone || '';
          if (rafflePhone) {
            const raffleTitle = raffleItems[0]?.metadata?.raffleTitle || 'o Drop';
            const numbers = raffleItems.flatMap((i: any) => i.metadata?.tickets || []).join(', ');
            await sendWhatsApp(rafflePhone,
              `🎯 *Participação Confirmada!*\n\nOlá, ${raffleOrder?.customer_data?.name || 'Operador'}!\n\nSeus números no *${raffleTitle}* estão confirmados.\n\n🔢 Números: ${numbers}\n\nBoa sorte! Acompanhe o resultado em:\nhttps://www.perfectionairsoft.com.br/drop`
            );
          }
        }

        // WhatsApp — Produto comprado (pedidos sem ticket/raffle)
        const hasOnlyProducts = ticketItems.length === 0 && raffleItems.length === 0;
        if (hasOnlyProducts) {
          const { data: prodOrder } = await supabase.from('orders').select('customer_data, total').eq('id', orderId).single();
          const prodPhone = prodOrder?.customer_data?.phone || '';
          if (prodPhone) {
            const total = Number(prodOrder?.total || payment.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const itemNames = orderItems.map((i: any) => `• ${i.product_name || i.name || 'Produto'} (x${i.quantity || 1})`).join('\n');
            await sendWhatsApp(prodPhone,
              `✅ *Pedido Confirmado!*\n\nOlá, ${prodOrder?.customer_data?.name || 'Operador'}!\n\nSeu pedido *#${orderId.slice(0, 8).toUpperCase()}* foi confirmado.\n\n${itemNames}\n\n💰 Total: ${total}\n\nAcompanhe em:\nhttps://www.perfectionairsoft.com.br/dashboard`
            );
          }
        }
      }
    } else if (event === 'PAYMENT_CANCELLED' || event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_REFUNDED') {
      await supabase.from('orders').update({ status: 'cancelado' }).eq('id', orderId);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
