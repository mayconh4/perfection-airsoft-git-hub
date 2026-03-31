import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '';
const ASAAS_API_URL = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bypass-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { orderId, total, subtotal, serviceFee, items, customerData, isGuest } = body;

    console.log(`[ASAAS-PAYMENT] Processando Pedido: ${orderId} | Total: ${total} | Subtotal: ${subtotal}`);

    // 1. Criar Pedido se for Guest (Padrão tático do sistema)
    let finalOrderId = orderId;
    if (isGuest && (orderId === 'GUEST_NEW')) {
      const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert([{
          user_id: null,
          total: Number(total),
          status: 'pendente',
          customer_data: {
            ...customerData,
            cpf: customerData.cpf?.replace(/\D/g, ''),
            phone: customerData.phone?.replace(/\D/g, '')
          },
          shipping_address: { street: 'Digital', city: 'Online', cep: '00000-000' }
        }])
        .select()
        .single();
      
      if (orderErr) throw new Error(`Erro ao criar pedido DB: ${orderErr.message}`);
      finalOrderId = order.id;

      // Inserir itens do pedido
      const orderItems = items.map((ci: any) => ({
        order_id: finalOrderId,
        product_id: ci.product_id,
        product_name: ci.product_name || ci.product?.name,
        product_price: ci.product_price || ci.product?.price,
        quantity: ci.quantity
      }));
      await supabaseAdmin.from('order_items').insert(orderItems);
    }

    // 2. Identificar o Criador da Rifa e a Wallet para o Split
    // Assumimos que o primeiro item define o recebedor do split (Marketplace de Drops)
    const firstItem = items[0];
    const { data: raffle, error: raffleErr } = await supabaseAdmin
      .from('raffles')
      .select('creator_id')
      .eq('id', firstItem.product_id)
      .single();

    if (raffleErr || !raffle) throw new Error('Rifa não encontrada ou ID inválido.');

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('asaas_wallet_id')
      .eq('id', raffle.creator_id)
      .single();

    if (profileErr || !profile?.asaas_wallet_id) {
       throw new Error('Operador não possui carteira Asaas ativa (KYC incompleto).');
    }

    const walletId = profile.asaas_wallet_id;

    // 3. Reserva de Tickets (Pre-bloqueio)
    const ticketsToReserve = [];
    for (const item of items) {
      if (item.metadata?.type === 'raffle' && Array.isArray(item.metadata.tickets)) {
        for (const tNum of item.metadata.tickets) {
          ticketsToReserve.push({
            raffle_id: item.product_id,
            ticket_number: Number(tNum),
            payment_status: 'pendente',
            payment_id: finalOrderId
          });
        }
      }
    }

    if (ticketsToReserve.length > 0) {
      console.log(`[ASAAS] Reservando ${ticketsToReserve.length} tickets...`);
      const { error: reserveError } = await supabaseAdmin.from('raffle_tickets').insert(ticketsToReserve);
      if (reserveError) throw new Error(`Erro na reserva de tickets: ${reserveError.message}`);
    }

    // 4. Chamada tática ao Asaas para gerar Cobrança PIX com SPLIT
    // O Organizador absorve todas as taxas: 7% operacional + R$ 0,99 de custo de PIX do Asaas
    // Isso garante que o ADM receba os 7% limpos na conta principal
    const platformFeePercent = 0.07;
    const asaasPixCost = 0.99;
    const organizerShare = Number(total) - (Number(total) * platformFeePercent) - asaasPixCost;

    const splitConfig = {
      walletId: walletId,
      fixedValue: Number(organizerShare.toFixed(2))
    };

    const asaasPayload = {
      customer: null, 
      billingType: "PIX",
      value: Number(total),
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0],
      description: `Pedido ${finalOrderId} - Perfection Airsoft`,
      externalReference: finalOrderId,
      split: [splitConfig]
    };

    // Primeiro precisamos de um CUSTOMER no Asaas para criar a cobrança
    const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customerData.name,
        cpfCnpj: customerData.cpf?.replace(/\D/g, ''),
        email: customerData.email,
        mobilePhone: customerData.phone?.replace(/\D/g, '')
      })
    });
    const customer = await customerRes.json();
    if (!customerRes.ok) throw new Error(`Erro Asaas Customer: ${customer.errors?.[0]?.description}`);

    // Cria a Cobrança (Payment)
    const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...asaasPayload, customer: customer.id })
    });
    const payment = await paymentRes.json();
    if (!paymentRes.ok) throw new Error(`Erro Asaas Payment: ${payment.errors?.[0]?.description}`);

    // Busca o QR Code e copia do PIX
    const pixRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/pixQrCode`, {
      method: 'GET',
      headers: { 'access_token': ASAAS_API_KEY }
    });
    const pixData = await pixRes.json();
    if (!pixRes.ok) throw new Error('Erro ao gerar QR Code PIX no Asaas.');

    // 5. Atualizar Pedido com os dados do Asaas
    await supabaseAdmin.from('orders').update({
      mercadopago_id: `ASAAS_${payment.id}`, // Reutilizamos a coluna para cross-ref
      payment_type: 'pix',
      payment_qr_code: pixData.payload, // O payload para o "copia e cola"
      payment_qr_code_base64: pixData.encodedImage, // A imagem base64
      status: 'pendente'
    }).eq('id', finalOrderId);

    return new Response(JSON.stringify({ 
      qr_code: pixData.payload,
      qr_code_base64: pixData.encodedImage,
      amount: total,
      order_id: finalOrderId,
      asaas_id: payment.id
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[ASAAS ERROR]', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
