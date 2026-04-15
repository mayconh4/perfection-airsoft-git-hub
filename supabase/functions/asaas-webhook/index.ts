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

// --- HELPER: TEMPLATE DE E-MAIL PREMIUM ---
function buildOrderEmail(data: {
  buyerName: string;
  orderId: string;
  paymentMethod: string;
  totalValue: number;
  orderDate: string;
  type: 'ticket' | 'raffle' | 'product';
  // tickets de evento
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  ticketIds?: string[];
  // rifa
  raffleTitle?: string;
  raffleNumbers?: number[];
  // produto
  items?: Array<{ name: string; qty: number; price: number }>;
}): string {
  const ordRef = data.orderId.slice(0, 8).toUpperCase();
  const payLabel: Record<string, string> = { pix: 'PIX', credit_card: 'Cartão de Crédito', boleto: 'Boleto Bancário', asaas: 'PIX' };
  const payDisplay = payLabel[data.paymentMethod] || data.paymentMethod?.toUpperCase() || 'PIX';
  const totalFmt = Number(data.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── Bloco central dependente do tipo ──────────────────────────────────────
  let mainBlock = '';

  if (data.type === 'ticket' && data.ticketIds?.length) {
    mainBlock = `
      <div style="margin:28px 0 0;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:3px;color:#ffc107;text-transform:uppercase;">Suas Tags de Acesso</p>
        ${data.ticketIds.map((id, i) => `
        <div style="display:flex;align-items:center;gap:14px;background:#0d0d0d;border:1px solid #ffc10730;border-left:3px solid #ffc107;padding:14px 18px;margin-bottom:10px;">
          <div style="background:#ffc107;color:#000;font-size:11px;font-weight:900;padding:6px 10px;letter-spacing:1px;white-space:nowrap;">TAG ${String(i + 1).padStart(2, '0')}</div>
          <div>
            <p style="margin:0;font-size:9px;color:#555;letter-spacing:2px;text-transform:uppercase;">Operador</p>
            <p style="margin:2px 0 4px;font-size:15px;font-weight:900;color:#fff;text-transform:uppercase;">${data.buyerName}</p>
            <p style="margin:0;font-size:10px;color:#ffc107;font-family:monospace;letter-spacing:1px;">#${id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>`).join('')}
        <div style="background:#0d0d0d;border:1px solid #ffc10720;padding:14px 18px;margin-top:4px;">
          <p style="margin:0;font-size:10px;color:#888;line-height:1.6;">
            📍 <strong style="color:#ccc;">${data.eventName}</strong> &nbsp;|&nbsp; 📅 ${data.eventDate} &nbsp;|&nbsp; 🗺 ${data.eventLocation}<br>
            Apresente este e-mail ou informe seu CPF na entrada do evento.
          </p>
        </div>
      </div>`;
  } else if (data.type === 'raffle' && data.raffleNumbers?.length) {
    const numChunks: number[][] = [];
    for (let i = 0; i < data.raffleNumbers.length; i += 8) numChunks.push(data.raffleNumbers.slice(i, i + 8));
    mainBlock = `
      <div style="margin:28px 0 0;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:3px;color:#ffc107;text-transform:uppercase;">Seus Números da Sorte — ${data.raffleTitle}</p>
        ${numChunks.map(chunk => `
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          ${chunk.map(n => `<span style="background:#ffc107;color:#000;font-size:13px;font-weight:900;padding:8px 12px;font-family:monospace;min-width:32px;text-align:center;">${String(n).padStart(2,'0')}</span>`).join('')}
        </div>`).join('')}
        <p style="margin:16px 0 0;font-size:10px;color:#666;line-height:1.5;">Acompanhe o resultado em <a href="https://www.perfectionairsoft.com.br/drop" style="color:#ffc107;">perfectionairsoft.com.br/drop</a></p>
      </div>`;
  } else if (data.items?.length) {
    mainBlock = `
      <div style="margin:28px 0 0;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:3px;color:#ffc107;text-transform:uppercase;">Itens do Pedido</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #222;">
            <th style="text-align:left;font-size:9px;color:#555;letter-spacing:2px;padding:6px 0;text-transform:uppercase;">Produto</th>
            <th style="text-align:center;font-size:9px;color:#555;letter-spacing:2px;padding:6px 0;text-transform:uppercase;">Qtd</th>
            <th style="text-align:right;font-size:9px;color:#555;letter-spacing:2px;padding:6px 0;text-transform:uppercase;">Valor</th>
          </tr>
          ${data.items.map(it => `
          <tr style="border-bottom:1px solid #1a1a1a;">
            <td style="padding:10px 0;font-size:13px;color:#eee;">${it.name}</td>
            <td style="padding:10px 0;font-size:13px;color:#aaa;text-align:center;">${it.qty}×</td>
            <td style="padding:10px 0;font-size:13px;color:#ffc107;text-align:right;font-family:monospace;">${Number(it.price * it.qty).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
          </tr>`).join('')}
        </table>
        <p style="margin:14px 0 0;font-size:10px;color:#666;">Acompanhe seu pedido em <a href="https://www.perfectionairsoft.com.br/dashboard" style="color:#ffc107;">perfectionairsoft.com.br/dashboard</a></p>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmação de Pedido — Perfection Airsoft</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER AMARELO -->
  <tr>
    <td style="background:#ffc107;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:28px 36px 22px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:4px;color:#000;text-transform:uppercase;opacity:0.5;">OPERATIONAL HUB</p>
            <p style="margin:4px 0 0;font-size:26px;font-weight:900;letter-spacing:-1px;color:#000;text-transform:uppercase;line-height:1;">PERFECTION<br>AIRSOFT</p>
          </td>
          <td style="padding:28px 36px 22px;text-align:right;vertical-align:bottom;">
            <p style="margin:0;font-size:9px;font-weight:700;letter-spacing:3px;color:#00000060;text-transform:uppercase;">Recibo</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:900;font-family:monospace;color:#000;letter-spacing:2px;">#${ordRef}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- STATUS BADGE -->
  <tr>
    <td style="background:#111;border-left:1px solid #ffc10720;border-right:1px solid #ffc10720;padding:0 36px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:18px 0;border-bottom:1px solid #ffc10715;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#16a34a20;border:1px solid #16a34a40;padding:6px 14px;">
                  <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:2px;color:#4ade80;text-transform:uppercase;">✓ Pagamento Confirmado</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CORPO PRINCIPAL -->
  <tr>
    <td style="background:#111;border-left:1px solid #ffc10720;border-right:1px solid #ffc10720;padding:28px 36px 0;">
      <p style="margin:0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:2px;">Operador</p>
      <p style="margin:4px 0 24px;font-size:22px;font-weight:900;color:#fff;text-transform:uppercase;">${data.buyerName}</p>

      <!-- Tabela de detalhes do pedido -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ffc10720;background:#0d0d0d;">
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid #ffc10715;border-right:1px solid #ffc10715;width:50%;">
            <p style="margin:0;font-size:9px;color:#555;letter-spacing:2px;text-transform:uppercase;">Data do Pedido</p>
            <p style="margin:4px 0 0;font-size:13px;color:#ccc;font-weight:600;">${data.orderDate}</p>
          </td>
          <td style="padding:14px 18px;border-bottom:1px solid #ffc10715;">
            <p style="margin:0;font-size:9px;color:#555;letter-spacing:2px;text-transform:uppercase;">Forma de Pagamento</p>
            <p style="margin:4px 0 0;font-size:13px;color:#ccc;font-weight:600;">${payDisplay}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px;border-right:1px solid #ffc10715;">
            <p style="margin:0;font-size:9px;color:#555;letter-spacing:2px;text-transform:uppercase;">Nº do Pedido</p>
            <p style="margin:4px 0 0;font-size:13px;color:#ffc107;font-family:monospace;font-weight:700;">#${ordRef}</p>
          </td>
          <td style="padding:14px 18px;">
            <p style="margin:0;font-size:9px;color:#555;letter-spacing:2px;text-transform:uppercase;">Total Pago</p>
            <p style="margin:4px 0 0;font-size:18px;color:#4ade80;font-family:monospace;font-weight:900;">${totalFmt}</p>
          </td>
        </tr>
      </table>

      ${mainBlock}

      <!-- Separador -->
      <div style="height:1px;background:linear-gradient(90deg,transparent,#ffc10740,transparent);margin:32px 0;"></div>
    </td>
  </tr>

  <!-- RODAPÉ -->
  <tr>
    <td style="background:#0d0d0d;border:1px solid #ffc10720;border-top:none;padding:24px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;font-size:10px;color:#444;line-height:1.7;">
              Dúvidas? Fale conosco em <a href="https://www.perfectionairsoft.com.br" style="color:#ffc107;text-decoration:none;">perfectionairsoft.com.br</a><br>
              Este e-mail é o seu comprovante — guarde-o para referência futura.
            </p>
          </td>
          <td style="text-align:right;vertical-align:top;white-space:nowrap;padding-left:20px;">
            <p style="margin:0;font-size:9px;font-weight:700;color:#ffc10760;letter-spacing:3px;text-transform:uppercase;">PERFECTION<br>AIRSOFT</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:8px;color:#2a2a2a;letter-spacing:2px;text-transform:uppercase;">© 2026 PERFECTION AIRSOFT — BRAZIL — OPERATIONAL HUB</p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`;
}

// Wrapper para enviar email via SMTP
async function sendOrderEmail(to: string, subject: string, html: string): Promise<void> {
  if (!SMTP_USERNAME || !SMTP_PASSWORD || !to) return;
  try {
    const client = new SmtpClient();
    await client.connectTLS({ hostname: SMTP_HOSTNAME, port: SMTP_PORT, username: SMTP_USERNAME, password: SMTP_PASSWORD });
    await client.send({ from: SMTP_USERNAME, to, subject, content: 'Sua compra foi confirmada.', html });
    await client.close();
  } catch (err) {
    console.warn('[EMAIL] Falha ao enviar:', err);
  }
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
        const orderDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

        // Tickets de Eventos
        const ticketItems = orderItems.filter((i: any) => i.metadata?.brand === 'TICKET' || i.metadata?.type === 'ticket');
        for (const item of ticketItems) {
          const eventId = item.metadata?.event_id;
          if (!eventId) continue;

          const { data: order } = await supabase.from('orders').select('user_id, customer_data').eq('id', orderId).single();
          const buyerName = order?.customer_data?.name || 'Operador';
          const buyerEmail = order?.customer_data?.email || '';

          // Gerar tickets
          const generatedUuids: string[] = [];
          for (let i = 0; i < (item.quantity || 1); i++) {
            const uuid = crypto.randomUUID();
            generatedUuids.push(uuid);
            await supabase.from('tickets').insert({
              event_id: eventId,
              order_id: orderId,
              buyer_id: order?.user_id || null,
              buyer_name: buyerName,
              buyer_email: buyerEmail,
              buyer_cpf: order?.customer_data?.cpf || '',
              buyer_phone: order?.customer_data?.phone || '',
              status: 'confirmed',
              qr_uuid: uuid,
            });
          }

          const { data: ev } = await supabase.from('events').select('title, date, location, organizer_id, platform_fee').eq('id', eventId).single();
          const evDate = ev?.date ? new Date(ev.date).toLocaleDateString('pt-BR') : '';

          // E-mail premium de confirmação de ingresso
          if (buyerEmail) {
            const html = buildOrderEmail({
              buyerName, orderId, paymentMethod: paymentType,
              totalValue: payment.value, orderDate, type: 'ticket',
              eventName: ev?.title || 'Evento', eventDate: evDate,
              eventLocation: ev?.location || '',
              ticketIds: generatedUuids,
            });
            await sendOrderEmail(buyerEmail, `✅ Ingresso Confirmado — ${ev?.title || 'Evento'} | Perfection Airsoft`, html);
          }

          // WhatsApp — Ingresso confirmado
          const phone = order?.customer_data?.phone || '';
          if (phone) {
            await sendWhatsApp(phone,
              `✅ *Ingresso Confirmado!*\n\nOlá, ${buyerName}!\n\nSeu ingresso para *${ev?.title || 'o evento'}* está confirmado.\n\n📅 Data: ${evDate}\n📍 Local: ${ev?.location || ''}\n\nAcesse seus ingressos em:\nhttps://www.perfectionairsoft.com.br/meus-ingressos`
            );
          }

          // Saldo do Organizador
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
          const { data: raffleOrder } = await supabase.from('orders').select('user_id, customer_data').eq('id', orderId).single();
          const raffleEmail = raffleOrder?.customer_data?.email || '';
          const raffleName = raffleOrder?.customer_data?.name || 'Operador';
          const allRaffleNumbers: number[] = [];
          let raffleTitle = 'Drop';

          for (const item of raffleItems) {
            const raffleId = item.product_id || item.metadata?.raffleId;
            const ticketNumbers: number[] = item.metadata?.tickets || [];
            raffleTitle = item.metadata?.raffleTitle || raffleTitle;
            if (!raffleId || ticketNumbers.length === 0) continue;

            allRaffleNumbers.push(...ticketNumbers);
            const rows = ticketNumbers.map((num: number) => ({
              raffle_id: raffleId,
              user_id: raffleOrder?.user_id || null,
              ticket_number: num,
              payment_status: 'pago',
              payment_id: orderId,
              purchased_at: new Date().toISOString(),
            }));
            await supabase.from('raffle_tickets').upsert(rows, { onConflict: 'raffle_id,ticket_number' });
            await supabase.rpc('increment_sold_tickets', { raffle_id_input: raffleId, amount: ticketNumbers.length }).catch(() => null);
          }

          // E-mail premium de confirmação de rifa
          if (raffleEmail && allRaffleNumbers.length > 0) {
            const html = buildOrderEmail({
              buyerName: raffleName, orderId, paymentMethod: paymentType,
              totalValue: payment.value, orderDate, type: 'raffle',
              raffleTitle, raffleNumbers: allRaffleNumbers,
            });
            await sendOrderEmail(raffleEmail, `🎯 Participação Confirmada — ${raffleTitle} | Perfection Airsoft`, html);
          }

          // WhatsApp — Drop confirmado
          const rafflePhone = raffleOrder?.customer_data?.phone || '';
          if (rafflePhone) {
            const numbers = allRaffleNumbers.join(', ');
            await sendWhatsApp(rafflePhone,
              `🎯 *Participação Confirmada!*\n\nOlá, ${raffleName}!\n\nSeus números no *${raffleTitle}* estão confirmados.\n\n🔢 Números: ${numbers}\n\nBoa sorte! Acompanhe o resultado em:\nhttps://www.perfectionairsoft.com.br/drop`
            );
          }
        }

        // WhatsApp — Produto comprado (pedidos sem ticket/raffle)
        const hasOnlyProducts = ticketItems.length === 0 && raffleItems.length === 0;
        if (hasOnlyProducts) {
          const { data: prodOrder } = await supabase.from('orders').select('customer_data, total').eq('id', orderId).single();
          const prodEmail = prodOrder?.customer_data?.email || '';
          const prodName = prodOrder?.customer_data?.name || 'Operador';

          // E-mail premium de confirmação de produto
          if (prodEmail) {
            const html = buildOrderEmail({
              buyerName: prodName, orderId, paymentMethod: paymentType,
              totalValue: payment.value, orderDate, type: 'product',
              items: orderItems.map((i: any) => ({ name: i.product_name || 'Produto', qty: i.quantity || 1, price: i.product_price || 0 })),
            });
            await sendOrderEmail(prodEmail, `✅ Pedido Confirmado #${orderId.slice(0,8).toUpperCase()} | Perfection Airsoft`, html);
          }

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
