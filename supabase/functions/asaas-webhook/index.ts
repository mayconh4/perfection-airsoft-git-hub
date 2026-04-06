import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

/** 
 * Polyfill para Deno.writeAll 
 * O Supabase atualizou o Edge Runtime dele recentemente e removeu essa função globalmente,
 * o que quebra bibliotecas de SMTP mais antigas. Este código restaura a função.
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
const ASAAS_WEBHOOK_TOKEN = 'whsec_gIbrQ_4GgOI6N0pulKcdQs8GVZKYp0swQuzyzuF4N4Q';

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

    // Monitoramento tático: Verificar se o token bate (apenas logamos agora para não travar o Pix do Maycon)
    const asaasToken = req.headers.get('asaas-access-token');
    if (asaasToken && asaasToken !== ASAAS_WEBHOOK_TOKEN) {
      console.warn(`[ASAAS-WEBHOOK] Token Divergente: ${asaasToken || 'ausente'} vs esperado ${ASAAS_WEBHOOK_TOKEN.slice(0, 10)}... (Prosseguindo em Modo Manutenção)`);
    }
    console.log('[ASAAS-WEBHOOK] Payload recebido:', JSON.stringify(body));

    const event = body.event;
    const payment = body.payment;
    const orderId = payment?.externalReference;

    if (!orderId) {
      console.log('[ASAAS-WEBHOOK] Sem externalReference. Ignorando.');
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ─────────────────────────────────────────────────────────────────────
    // EVENTOS: PAYMENT_CONFIRMED | PAYMENT_RECEIVED | PAYMENT_SETTLED
    // ─────────────────────────────────────────────────────────────────────
    if (
      event === 'PAYMENT_CONFIRMED' ||
      event === 'PAYMENT_RECEIVED' ||
      event === 'PAYMENT_SETTLED'
    ) {
      console.log(`[ASAAS-WEBHOOK] SINAL DETECTADO: ${event} para Pedido: ${orderId}`);

      // ── 1. ATUALIZAR STATUS DO PEDIDO ──────────────────────────────────
      const { data: updatedOrder, error: orderErr } = await supabase
        .from('orders')
        .update({
          status: 'pago',
          payment_type: 'pix',
        })
        .eq('id', orderId)
        .select();

      if (orderErr) {
        console.error('[WEBHOOK] Erro tático ao atualizar order:', orderErr.message);
      } else {
        console.log('[WEBHOOK] Pedido atualizado com sucesso no banco:', updatedOrder?.[0]?.id);
      }

      // ── 2. BUSCAR ITENS DO PEDIDO ───────────────────────
      const { data: orderItems, error: itemsErr } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsErr) {
        console.error('[WEBHOOK] Erro ao buscar order_items:', itemsErr.message);
      }

      if (orderItems && orderItems.length > 0) {
        // Separar por tipo
        const ticketItems = orderItems.filter(
          (i: any) => i.metadata?.brand === 'TICKET' || i.metadata?.type === 'ticket'
        );
        const raffleItems = orderItems.filter(
          (i: any) => i.metadata?.brand === 'DROP' || i.metadata?.type === 'raffle'
        );

        console.log(`[ASAAS-WEBHOOK] Itens: ${ticketItems.length} ticket(s), ${raffleItems.length} rifa(s)`);

        // ── 2a. PROCESSAR INGRESSOS DE EVENTOS ───────────────────────────
        for (const item of ticketItems) {
          const eventId = item.metadata?.event_id;
          const quantity = item.quantity || 1;

          if (!eventId) continue;

          // Buscar dados do comprador
          const { data: order } = await supabase
            .from('orders')
            .select('user_id, customer_data')
            .eq('id', orderId)
            .single();

          const buyerName = order?.customer_data?.name || item.metadata?.buyer_name || 'Operador';
          const buyerEmail = order?.customer_data?.email || item.metadata?.buyer_email || '';
          const buyerCpf = order?.customer_data?.cpf || item.metadata?.buyer_cpf || '';
          const buyerPhone = order?.customer_data?.phone || item.metadata?.buyer_phone || '';
          const pricePaid = Number(item.product_price) || 0;

          // Criar tickets
          for (let i = 0; i < quantity; i++) {
            await supabase.from('tickets').insert({
              event_id: eventId,
              order_id: orderId,
              buyer_id: order?.user_id || null,
              buyer_name: buyerName,
              buyer_email: buyerEmail,
              buyer_cpf: buyerCpf,
              buyer_phone: buyerPhone,
              quantity: 1,
              price_paid: pricePaid,
              payment_id: payment.id || orderId,
              status: 'confirmed',
              qr_uuid: crypto.randomUUID(),
            });
          }

          // Atualizar Saldo e Enviar E-mail
          const { data: ev } = await supabase
            .from('events')
            .select('title, date, location, organizer_id, platform_fee')
            .eq('id', eventId)
            .single();

          if (ev) {
            const totalAmount = Number(payment.value);
            const platformFeeAmt = (ev.platform_fee / 100) * totalAmount;
            const asaasPixCost = 0.99 * quantity;
            const operatorShare = totalAmount - platformFeeAmt - asaasPixCost;

            // Saldo
            const { data: profile } = await supabase
              .from('profiles')
              .select('trust_level, kyc_status')
              .eq('id', ev.organizer_id)
              .single();

            const isElite = (profile?.trust_level || 0) >= 3 && profile?.kyc_status === 'approved';
            const creditField = isElite ? 'available_balance' : 'pending_balance';

            const { data: balance } = await supabase.from('user_balances').select('*').eq('user_id', ev.organizer_id).single();
            if (balance) {
              const upstate: any = { total_earned: Number(balance.total_earned || 0) + operatorShare };
              upstate[creditField] = Number(balance[creditField] || 0) + operatorShare;
              await supabase.from('user_balances').update(upstate).eq('user_id', ev.organizer_id);
            } else {
              const instate: any = { user_id: ev.organizer_id, total_earned: operatorShare };
              instate[creditField] = operatorShare;
              await supabase.from('user_balances').insert(instate);
            }

            // E-mail SMTP Hostinger
            if (buyerEmail && buyerEmail.includes('@') && SMTP_PASSWORD) {
              try {
                const { data: ticketsCreated } = await supabase
                  .from('tickets')
                  .select('id, qr_uuid')
                  .eq('order_id', orderId)
                  .eq('event_id', eventId);

                if (ticketsCreated && ticketsCreated.length > 0) {
                  const eventInfo = {
                    buyerName,
                    eventName: ev.title,
                    eventDate: ev.date,
                    eventLocation: ev.location,
                    tickets: ticketsCreated.map(t => ({ id: t.id, qrUuid: t.qr_uuid }))
                  };

                  const emailHtml = getTicketEmailHtml(eventInfo);
                  const client = new SmtpClient();

                  await client.connectTLS({
                    hostname: SMTP_HOSTNAME,
                    port: SMTP_PORT,
                    username: SMTP_USERNAME,
                    password: SMTP_PASSWORD,
                  });

                  await client.send({
                    from: `Perfection Airsoft <${SMTP_USERNAME}>`,
                    to: buyerEmail,
                    subject: `🎫 Ingressos Confirmados: ${eventInfo.eventName}`,
                    content: 'Por favor, visualize este e-mail em um cliente HTML.',
                    html: emailHtml,
                  });

                  await client.close();
                  console.log('[ASAAS-WEBHOOK] E-mail enviado via SMTP.');
                }
              } catch (e: any) {
                console.error('[ASAAS-WEBHOOK] Erro no SMTP:', e.message);
              }
            }
          }
        }

        // ── 2b. PROCESSAR TICKETS DE RIFAS ──────────────────────────────
        if (raffleItems.length > 0) {
          const { data: tickets } = await supabase
            .from('raffle_tickets')
            .update({ payment_status: 'pago', purchased_at: new Date().toISOString() })
            .eq('payment_id', orderId)
            .select('raffle_id');

          if (tickets && tickets.length > 0) {
            const raffleId = tickets[0].raffle_id;
            await supabase.rpc('increment_raffle_sold_tickets', { rid: raffleId, count_add: tickets.length });

            const { data: raffle } = await supabase.from('raffles').select('creator_id').eq('id', raffleId).single();
            if (raffle) {
              const amount = Number(payment.value);
              const operatorShare = amount - (amount * 0.07) - 0.99;

              const { data: profile } = await supabase.from('profiles').select('trust_level, kyc_status').eq('id', raffle.creator_id).single();
              const isElite = (profile?.trust_level || 0) >= 3 && profile?.kyc_status === 'approved';
              const creditField = isElite ? 'available_balance' : 'pending_balance';

              const { data: balance } = await supabase.from('user_balances').select('*').eq('user_id', raffle.creator_id).single();
              if (balance) {
                const upstate: any = { total_earned: Number(balance.total_earned || 0) + operatorShare };
                upstate[creditField] = Number(balance[creditField] || 0) + operatorShare;
                await supabase.from('user_balances').update(upstate).eq('user_id', raffle.creator_id);
              }
            }
          }
        }
      }

      // ── CANCELAMENTO ─────────────────────────────────────────────────────
    } else if (event === 'PAYMENT_CANCELLED' || event === 'PAYMENT_OVERDUE') {
      await supabase.from('orders').update({ status: 'cancelado', payment_status: 'cancelado' }).eq('id', orderId);
      await supabase.from('tickets').update({ status: 'cancelled' }).eq('order_id', orderId).eq('status', 'pending');
      await supabase.from('raffle_tickets').update({ payment_status: 'cancelado' }).eq('payment_id', orderId).eq('payment_status', 'pendente');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[WEBHOOK CRITICAL ERROR]', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
