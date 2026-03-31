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
    const { raffleId, winnerId } = await req.json();

    if (!raffleId) throw new Error('Raffle ID é obrigatório.');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Verificar a Rifra e o Vencedor
    const { data: winner, error: winnerErr } = await supabase
      .from('raffle_winners')
      .select('*, raffles(creator_id, ticket_price)')
      .eq('raffle_id', raffleId)
      .single();

    if (winnerErr || !winner) throw new Error('Vencedor ou Rifra não encontrados.');
    if (winner.payout_released) throw new Error('O pagamento desta rifa já foi liberado.');

    // 2. Calcular o Valor Total a ser liberado (Vendas Pagas)
    const { data: tickets, error: ticketErr } = await supabase
      .from('raffle_tickets')
      .select('id')
      .eq('raffle_id', raffleId)
      .eq('payment_status', 'pago');

    if (ticketErr || !tickets) throw new Error('Erro ao calcular tickets.');

    const count = tickets.length;
    const ticketPrice = winner.raffles.ticket_price || 0;
    const totalAmount = count * ticketPrice;
    
    // Aplicar as mesmas taxas do webhook (7% + 0.99 por ticket?)
    // Nota: No webhook calculamos por pagamento. Aqui somamos o líquido.
    const platformFeePercent = 0.07;
    const asaasPixCost = 0.99; // Aproximação média
    
    const operatorShareTotal = totalAmount - (totalAmount * platformFeePercent) - (count * asaasPixCost);

    console.log(`[RELEASE] Liberando R$ ${operatorShareTotal} para o usuário ${winner.raffles.creator_id}`);

    // 3. Mover Saldo (Transação)
    const { data: balance, error: balanceErr } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', winner.raffles.creator_id)
      .single();

    if (balanceErr || !balance) throw new Error('Saldo do usuário não encontrado.');

    const newPending = Math.max(0, Number(balance.pending_balance) - operatorShareTotal);
    const newAvailable = Number(balance.available_balance) + operatorShareTotal;

    const { error: updateErr } = await supabase
      .from('user_balances')
      .update({
        pending_balance: newPending,
        available_balance: newAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', winner.raffles.creator_id);

    if (updateErr) throw updateErr;

    // 4. Marcar como Liberado
    await supabase
      .from('raffle_winners')
      .update({ payout_released: true })
      .eq('raffle_id', raffleId);

    return new Response(JSON.stringify({ 
      success: true, 
      releasedAmount: operatorShareTotal,
      newAvailable: newAvailable
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
