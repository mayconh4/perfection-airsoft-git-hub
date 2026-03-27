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

      if (orderId.startsWith('TICK_')) {
        // Fluxo de Rifas/Drops
        console.log(`Processando pagamento de Ticket: ${orderId}`);
        const { error } = await supabase
          .from('raffle_tickets')
          .update({ 
            payment_status: finalStatus,
            purchased_at: finalStatus === 'pago' ? new Date().toISOString() : null
          })
          .eq('payment_id', orderId);
        
        if (error) throw error;
      } else {
        // Fluxo de Pedidos Normais
        const { error } = await supabase
          .from('orders')
          .update({ 
            payment_status: finalStatus,
            mercadopago_id: String(paymentId),
            payment_type: payment.payment_type_id
          })
          .eq('id', orderId);

        if (error) throw error;
      }

      console.log(`Referência #${orderId} atualizada para ${finalStatus}`);
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
