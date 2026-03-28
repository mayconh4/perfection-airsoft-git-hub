import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MERCADO_PAGO_TOKEN = Deno.env.get('MERCADO_PAGO_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Webhook MP recebido:', body);

    // O Mercado Pago envia notificações de vários tipos (payment, plan, etc)
    // Estamos interessados apenas em 'payment'
    if (body.type === 'payment' || body.action === 'payment.updated') {
      const paymentId = body.data?.id || body.id;

      if (!paymentId) throw new Error('ID do pagamento não encontrado');

      // 1. Consultar detalhes do pagamento no Mercado Pago
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}` }
      });
      
      const payment = await response.json();
      const orderId = payment.external_reference;
      const status = payment.status; // approved, pending, rejected, etc.

      if (!orderId) throw new Error('Referência do pedido não encontrada no pagamento');

      // 2. Atualizar o banco de dados Supabase
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      let finalStatus = 'pendente';
      if (status === 'approved') finalStatus = 'pago';
      if (status === 'rejected' || status === 'cancelled') finalStatus = 'cancelado';

      console.log(`Atualizando Pedido #${orderId} para status: ${finalStatus}`);

      // A. Atualizar Tabela de Pedidos (Orders) - Sempre necessário
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: finalStatus,
          payment_status: finalStatus,
          mercadopago_id: String(paymentId),
          payment_type: payment.payment_type_id
        })
        .eq('id', orderId);

      if (orderError) {
        console.error('Erro ao atualizar tabela orders:', orderError);
        // Não jogamos erro ainda, pois pode ser um ticket antigo com prefixo TICK_
      }

      // B. Atualizar Tabela de Rifas (Raffle Tickets) - Se houver tickets vinculados
      const { data: tickets, error: ticketError } = await supabase
        .from('raffle_tickets')
        .update({ 
          payment_status: finalStatus,
          purchased_at: finalStatus === 'pago' ? new Date().toISOString() : null
        })
        .eq('payment_id', orderId)
        .select('raffle_id');
      
      if (ticketError) {
        console.error('Erro ao atualizar tabela raffle_tickets:', ticketError);
      }

      // C. Lógica de Split e Gestão de Saldos (Se aprovado)
      if (finalStatus === 'pago' && tickets && tickets.length > 0) {
        const raffleId = tickets[0].raffle_id;
        const totalPurchased = tickets.length;
        const totalAmount = payment.transaction_amount;

        try {
          // 1. Buscar Configurações de Taxas e Criador da Rifa
          const [ { data: config }, { data: raffle } ] = await Promise.all([
            supabase.from('platform_config').select('*').limit(1).single(),
            supabase.from('raffles').select('creator_id').eq('id', raffleId).single()
          ]);

          if (config && raffle) {
            const fixedFee = (config.fixed_fee_per_ticket || 2.50) * totalPurchased;
            const operatorShare = totalAmount - fixedFee;
            const creatorId = raffle.creator_id;

            console.log(`[SPLIT] Total: R$ ${totalAmount} | Taxa Plataforma: R$ ${fixedFee} | Operador: R$ ${operatorShare}`);

            // 2. Registrar Transações Financeiras (Histórico)
            await supabase.from('financial_transactions').insert([
              { order_id: orderId, raffle_id: raffleId, type: 'fee_platform', amount: fixedFee },
              { order_id: orderId, raffle_id: raffleId, type: 'payout_operator', amount: operatorShare, recipient_uid: creatorId }
            ]);

            // 3. Atualizar Saldo do Operador (Transação Atômica via RPC recomendada no futuro)
            // Para agora, faremos um update simples ou via RPC se for implementado
            const { data: balanceData } = await supabase.from('user_balances').select('available_balance, total_earned').eq('user_id', creatorId).single();
            
            if (balanceData) {
              await supabase.from('user_balances').update({
                available_balance: Number(balanceData.available_balance) + operatorShare,
                total_earned: Number(balanceData.total_earned) + operatorShare,
                updated_at: new Date().toISOString()
              }).eq('user_id', creatorId);
            } else {
              // Primeiro ganho do operador: Criar registro
              await supabase.from('user_balances').insert({
                user_id: creatorId,
                available_balance: operatorShare,
                total_earned: operatorShare
              });
            }

            console.log(`[WALLET] Saldo de ${creatorId} atualizado com +R$ ${operatorShare}`);
          }
        } catch (splitErr) {
          console.error('Erro no processamento do SPLIT:', splitErr);
        }

        // D. Incrementar o contador de vendas na rifa (Se aprovado)
        const { error: raffleErr } = await supabase.rpc('increment_raffle_sold_tickets', { 
          rid: raffleId, 
          count_add: totalPurchased 
        });

        if (raffleErr) {
          console.error('Erro ao chamar RPC increment_raffle_sold_tickets:', raffleErr);
        }
      }

      console.log(`Sincronização concluída para #${orderId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro no Webhook:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
