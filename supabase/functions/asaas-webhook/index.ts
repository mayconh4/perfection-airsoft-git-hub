import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log('[ASAAS-WEBHOOK] Payload recebido:', JSON.stringify(body));

    const event   = body.event;
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
      event === 'PAYMENT_RECEIVED'  ||
      event === 'PAYMENT_SETTLED'
    ) {
      console.log(`[ASAAS-WEBHOOK] Confirmando pagamento do pedido ${orderId}`);

      // ── 1. ATUALIZAR STATUS DO PEDIDO ──────────────────────────────────
      const { error: orderErr } = await supabase
        .from('orders')
        .update({
          status:         'pago',
          payment_status: 'pago',
          payment_type:   'pix',
        })
        .eq('id', orderId);

      if (orderErr) console.error('[WEBHOOK] Erro ao atualizar order:', orderErr.message);

      // ── 2. BUSCAR ITENS DO PEDIDO (com metadata) ───────────────────────
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
          const eventId  = item.metadata?.event_id;
          const quantity = item.quantity || 1;

          if (!eventId) {
            console.warn('[WEBHOOK] Ticket sem event_id no metadata. Pulando.');
            continue;
          }

          console.log(`[WEBHOOK] Criando ${quantity} ingresso(s) para evento ${eventId}`);

          // Buscar dados do comprador via pedido
          const { data: order } = await supabase
            .from('orders')
            .select('user_id, customer_data')
            .eq('id', orderId)
            .single();

          const buyerName  = order?.customer_data?.name  || item.metadata?.buyer_name  || 'Operador';
          const buyerEmail = order?.customer_data?.email || item.metadata?.buyer_email || '';
          const buyerCpf   = order?.customer_data?.cpf   || item.metadata?.buyer_cpf   || '';
          const buyerPhone = order?.customer_data?.phone || item.metadata?.buyer_phone || '';
          const pricePaid  = Number(item.product_price) || Number(payment.value / quantity);

          // Criar um registro de ingresso por unidade
          for (let i = 0; i < quantity; i++) {
            const { error: ticketErr } = await supabase
              .from('tickets')
              .insert({
                event_id:    eventId,
                order_id:    orderId,
                buyer_id:    order?.user_id || null,
                buyer_name:  buyerName,
                buyer_email: buyerEmail,
                buyer_cpf:   buyerCpf,
                buyer_phone: buyerPhone,
                quantity:    1,
                price_paid:  pricePaid,
                payment_id:  payment.id || orderId,
                status:      'confirmed',
                qr_uuid:     crypto.randomUUID(),
              });

            if (ticketErr) {
              console.error(`[WEBHOOK] Erro ao criar ticket ${i + 1}/${quantity}:`, ticketErr.message);
            }
          }

          // Atualizar saldo do organizador do evento
          const { data: ev } = await supabase
            .from('events')
            .select('organizer_id, ticket_price, platform_fee')
            .eq('id', eventId)
            .single();

          if (ev) {
            const totalAmount    = Number(payment.value);
            const platformFeeAmt = (ev.platform_fee / 100) * totalAmount; // platform_fee em %
            const asaasPixCost   = 0.99 * quantity;
            const operatorShare  = totalAmount - platformFeeAmt - asaasPixCost;

            const { data: profile } = await supabase
              .from('profiles')
              .select('trust_level, kyc_status')
              .eq('id', ev.organizer_id)
              .single();

            const isElite =
              (profile?.trust_level || 0) >= 3 &&
              profile?.kyc_status === 'approved';

            const creditField = isElite ? 'available_balance' : 'pending_balance';
            console.log(`[WEBHOOK] Organizador do evento elite: ${isElite} → ${creditField}`);

            const { data: balance } = await supabase
              .from('user_balances')
              .select('*')
              .eq('user_id', ev.organizer_id)
              .single();

            if (balance) {
              const updatePayload: any = {
                total_earned: Number(balance.total_earned || 0) + operatorShare,
                updated_at:   new Date().toISOString(),
              };
              updatePayload[creditField] = Number(balance[creditField] || 0) + operatorShare;
              await supabase.from('user_balances').update(updatePayload).eq('user_id', ev.organizer_id);
            } else {
              const insertPayload: any = {
                user_id:           ev.organizer_id,
                available_balance: isElite ? operatorShare : 0,
                pending_balance:   isElite ? 0 : operatorShare,
                total_earned:      operatorShare,
              };
              await supabase.from('user_balances').insert(insertPayload);
            }
          }
        }

        // ── 2b. PROCESSAR TICKETS DE RIFAS (fluxo original) ──────────────
        if (raffleItems.length > 0) {
          const { data: tickets, error: ticketErr } = await supabase
            .from('raffle_tickets')
            .update({
              payment_status: 'pago',
              purchased_at:   new Date().toISOString(),
            })
            .eq('payment_id', orderId)
            .select('raffle_id');

          if (ticketErr) console.error('[WEBHOOK] Erro ao atualizar raffle_tickets:', ticketErr.message);

          if (tickets && tickets.length > 0) {
            const raffleId = tickets[0].raffle_id;
            const count    = tickets.length;
            console.log(`[WEBHOOK] Incrementando ${count} tickets na rifa ${raffleId}`);

            await supabase.rpc('increment_raffle_sold_tickets', { rid: raffleId, count_add: count });

            // Atualizar saldo do criador da rifa
            const { data: raffle } = await supabase
              .from('raffles')
              .select('creator_id, ticket_price')
              .eq('id', raffleId)
              .single();

            if (raffle) {
              const amount           = Number(payment.value);
              const platformFeePercent = 0.07;
              const asaasPixCost     = 0.99;
              const operatorShare    = amount - (amount * platformFeePercent) - asaasPixCost;

              const { data: profile } = await supabase
                .from('profiles')
                .select('trust_level, kyc_status')
                .eq('id', raffle.creator_id)
                .single();

              const isElite =
                (profile?.trust_level || 0) >= 3 &&
                profile?.kyc_status === 'approved';

              const creditField = isElite ? 'available_balance' : 'pending_balance';
              console.log(`[WEBHOOK] Organizador da rifa elite: ${isElite} → ${creditField}`);

              const { data: balance } = await supabase
                .from('user_balances')
                .select('*')
                .eq('user_id', raffle.creator_id)
                .single();

              if (balance) {
                const updatePayload: any = {
                  total_earned: Number(balance.total_earned || 0) + operatorShare,
                  updated_at:   new Date().toISOString(),
                };
                updatePayload[creditField] = Number(balance[creditField] || 0) + operatorShare;
                await supabase.from('user_balances').update(updatePayload).eq('user_id', raffle.creator_id);
              } else {
                const insertPayload: any = {
                  user_id:           raffle.creator_id,
                  available_balance: isElite ? operatorShare : 0,
                  pending_balance:   isElite ? 0 : operatorShare,
                  total_earned:      operatorShare,
                };
                await supabase.from('user_balances').insert(insertPayload);
              }
            }
          }
        }
      }

    // ─────────────────────────────────────────────────────────────────────
    // CANCELAMENTO
    // ─────────────────────────────────────────────────────────────────────
    } else if (event === 'PAYMENT_CANCELLED' || event === 'PAYMENT_OVERDUE') {
      console.log(`[ASAAS-WEBHOOK] Cancelando pedido ${orderId}`);

      await supabase
        .from('orders')
        .update({ status: 'cancelado', payment_status: 'cancelado' })
        .eq('id', orderId);

      // Cancelar tickets de eventos pendentes
      await supabase
        .from('tickets')
        .update({ status: 'cancelled' })
        .eq('order_id', orderId)
        .eq('status', 'pending');

      // Cancelar raffle_tickets pendentes
      await supabase
        .from('raffle_tickets')
        .update({ payment_status: 'cancelado' })
        .eq('payment_id', orderId)
        .eq('payment_status', 'pendente');
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
