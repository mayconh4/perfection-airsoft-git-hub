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
    console.log('[ASAAS-WEBHOOK] Integrado:', JSON.stringify(body));

    const event = body.event;
    const payment = body.payment;
    const orderId = payment?.externalReference;

    if (!orderId) {
      console.log('[ASAAS-WEBHOOK] Aviso: Notificação sem External Reference. Ignorando.');
      return new Response(JSON.stringify({ status: 'ignored' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Mapeamento de Eventos Asaas
    // PAYMENT_CONFIRMED: Pix pago ou Cartão aprovado
    // PAYMENT_RECEIVED: Pix compensado (Asaas já recebeu o valor)
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_SETTLED') {
      console.log(`[ASAAS-WEBHOOK] Confirmando Pedido #${orderId}`);

      // 1. Atualizar Status do Pedido
      const { error: orderErr } = await supabase
        .from('orders')
        .update({ 
          status: 'pago',
          payment_status: 'pago',
          payment_type: 'pix'
        })
        .eq('id', orderId);

      if (orderErr) console.error('[WEBHOOK ERROR] Erro ao atualizar Orders:', orderErr.message);

      // 2. Atualizar Tickets de Rifa
      const { data: tickets, error: ticketErr } = await supabase
        .from('raffle_tickets')
        .update({ 
          payment_status: 'pago',
          purchased_at: new Date().toISOString()
        })
        .eq('payment_id', orderId)
        .select('raffle_id');

      if (ticketErr) console.error('[WEBHOOK ERROR] Erro ao atualizar Tickets:', ticketErr.message);

      // 3. Incrementar contador de vendas (RPC)
      if (tickets && tickets.length > 0) {
        const raffleId = tickets[0].raffle_id;
        const count = tickets.length;
        console.log(`[ASAAS-WEBHOOK] Incrementando ${count} tickets na rifa ${raffleId}`);
        await supabase.rpc('increment_raffle_sold_tickets', { rid: raffleId, count_add: count });
        
        // 4. Atualizar Saldo do Operador (Transação Financeira com Trava de Segurança)
        // O valor entra como PENDENTE até que a entrega seja confirmada ou o prazo de segurança expire.
        const { data: raffle } = await supabase.from('raffles').select('creator_id, ticket_price').eq('id', raffleId).single();
        if (raffle) {
          const amount = Number(payment.value);
          const platformFeePercent = 0.07;
          const asaasPixCost = 0.99;
          
          // Cálculo: Organizador paga a taxa do ADM (7%) + Custo do Asaas (R$ 0,99)
          const operatorShare = amount - (amount * platformFeePercent) - asaasPixCost;
          
          // 4. Buscar Nível de Confiança do Organizador
          const { data: profile } = await supabase.from('profiles').select('trust_level').eq('id', raffle.creator_id).single();
          const isElite = (profile?.trust_level || 0) >= 3;

          const { data: balance } = await supabase.from('user_balances').select('*').eq('user_id', raffle.creator_id).single();
          
          const creditField = isElite ? 'available_balance' : 'pending_balance';
          console.log(`[ASAAS-WEBHOOK] Organizador Elite: ${isElite} -> Jogando p/ ${creditField}`);

          if (balance) {
            const updatePayload: any = {
              total_earned: Number(balance.total_earned || 0) + operatorShare,
              updated_at: new Date().toISOString()
            };
            updatePayload[creditField] = Number(balance[creditField] || 0) + operatorShare;

            await supabase.from('user_balances').update(updatePayload).eq('user_id', raffle.creator_id);
          } else {
            const insertPayload: any = {
              user_id: raffle.creator_id,
              available_balance: isElite ? operatorShare : 0,
              pending_balance: isElite ? 0 : operatorShare,
              total_earned: operatorShare
            };
            await supabase.from('user_balances').insert(insertPayload);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('[WEBHOOK CRITICAL ERROR]', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
