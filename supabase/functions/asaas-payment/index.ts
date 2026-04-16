import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ASAAS_API_KEY             = Deno.env.get('ASAAS_API_KEY') || '';
// Detecção Tática de Ambiente: Prioriza Produção se a chave estiver presente e a URL não for explicitamente definida para Sandbox
const DEFAULT_API_URL           = 'https://www.asaas.com/api/v3';
const ASAAS_API_URL             = Deno.env.get('ASAAS_API_URL') || DEFAULT_API_URL;
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bypass-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Validação Tática de Segredos
  if (!ASAAS_API_KEY) {
    return new Response(JSON.stringify({ error: 'Configuração Incompleta: ASAAS_API_KEY não encontrada' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log(`[ASAAS-PAYMENT] Recebida Requisição Operacional: ${req.method}`);
    const body = await req.json();
    console.log(`[ASAAS-PAYMENT] Payload Recebido:`, JSON.stringify(body, null, 2));

    const { action, asaasId, orderId, userId, total, items, customerData, isGuest } = body;

    // ─────────────────────────────────────────────────────────────────────
    // 0. VERIFICAÇÃO MANUAL DE STATUS (Para Localhost/Fallback)
    // ─────────────────────────────────────────────────────────────────────
    if (action === 'CHECK_STATUS' && asaasId) {
      console.log(`[ASAAS-CHECK] Verificando status do pagamento: ${asaasId}`);
      
      const res = await fetch(`${ASAAS_API_URL}/payments/${asaasId}`, {
        method: 'GET',
        headers: { 'access_token': ASAAS_API_KEY },
      });
      const payment = await res.json();

      if (!res.ok) throw new Error(`Status Check: ${payment.errors?.[0]?.description}`);

      console.log(`[ASAAS-CHECK] Status no Asaas: ${payment.status}`);

      const isPaid = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(payment.status);

      if (isPaid) {
        // Buscar o orderId vinculado a este pagamento no Asaas (externalReference)
        const finalOrderId = payment.externalReference;
        
        // Atualizar status no banco
        const { error: updErr } = await supabaseAdmin
          .from('orders')
          .update({ status: 'pago' })
          .eq('id', finalOrderId);

        if (updErr) throw new Error(`Erro ao atualizar pedido para PAGO: ${updErr.message}`);
        
        // --- ATUALIZAÇÃO TÁTICA DE RIFA/TICKETS ---
        // 1. Marcar tickets como pagos
        const { data: ticketsUpd } = await supabaseAdmin
          .from('raffle_tickets')
          .update({ payment_status: 'pago', purchased_at: new Date().toISOString() })
          .eq('payment_id', finalOrderId)
          .select('raffle_id');

        // 2. Incrementar contador na rifa (Barrinha de progresso)
        if (ticketsUpd && ticketsUpd.length > 0) {
          const raffleId = ticketsUpd[0].raffle_id;
          await supabaseAdmin.rpc('increment_raffle_sold_tickets', { rid: raffleId, count_add: ticketsUpd.length });
        }
        
        return new Response(JSON.stringify({ status: 'pago', orderId: finalOrderId }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify({ status: payment.status }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`[ASAAS-PAYMENT] Pedido: ${orderId} | Total: R$${total}`);

    // ─────────────────────────────────────────────────────────────────────
    // 1. CRIAR PEDIDO PARA GUESTS
    // ─────────────────────────────────────────────────────────────────────
    let finalOrderId = orderId;

    if (isGuest && orderId === 'GUEST_NEW') {
      const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert([{
          user_id: userId || null,
          total: Number(total),
          status: 'pendente',
          customer_data: {
            ...customerData,
            cpf:   customerData.cpf?.replace(/\D/g, ''),
            phone: customerData.phone?.replace(/\D/g, ''),
          },
          shipping_address: { street: 'Digital', city: 'Online', cep: '00000-000' },
        }])
        .select()
        .single();

      if (orderErr) throw new Error(`Erro ao criar pedido: ${orderErr.message}`);
      finalOrderId = order.id;

      // Criar itens com metadata completo
      const orderItems = items.map((ci: any) => ({
        order_id:      finalOrderId,
        product_id:    ci.product_id,
        product_name:  ci.product_name,
        product_price: ci.product_price,
        quantity:      ci.quantity,
        metadata:      ci.metadata || null,
      }));
      await supabaseAdmin.from('order_items').insert(orderItems);
    } else {
      // Garantir que os order_items existentes têm os metadados corretos
      for (const item of items) {
        if (item.metadata) {
          await supabaseAdmin
            .from('order_items')
            .update({ metadata: item.metadata })
            .eq('order_id', finalOrderId)
            .eq('product_id', item.product_id);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. DETECTAR TIPO DE ITEM E RESOLVER WALLET DO RECEBEDOR
    // ─────────────────────────────────────────────────────────────────────
    const firstItem = items[0];
    const itemType  = firstItem?.metadata?.type || firstItem?.metadata?.brand;

    let walletId: string | null = null;
    let creatorId: string | null = null;
    let orderDescription = `Pedido ${finalOrderId}`;

    if (itemType === 'ticket' || firstItem?.metadata?.brand === 'TICKET') {
      // ── INGRESSO DE EVENTO ──
      const eventId = firstItem?.metadata?.event_id;
      if (!eventId) throw new Error('event_id ausente no metadata do ingresso.');

      const { data: ev, error: evErr } = await supabaseAdmin
        .from('events')
        .select('id, title, organizer_id')
        .eq('id', eventId)
        .single();

      if (evErr || !ev) throw new Error(`Evento não encontrado: ${eventId}`);

      creatorId    = ev.organizer_id;
      orderDescription = `Ingresso: ${ev.title}`;

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('asaas_wallet_id')
        .eq('id', creatorId)
        .single();

      if (profile?.asaas_wallet_id) {
        walletId = profile.asaas_wallet_id;
      } else {
        console.warn(`[ASAAS] Organizador ${creatorId} sem wallet configurada — PIX irá para conta principal`);
      }
    } else {
      // ── TICKET DE RIFA (comportamento original) ──
      const raffleId = firstItem?.product_id || firstItem?.metadata?.raffle_id || firstItem?.product?.id;

      const { data: raffle, error: raffleErr } = await supabaseAdmin
        .from('raffles')
        .select('creator_id, title')
        .eq('id', raffleId)
        .single();

      if (raffleErr || !raffle) throw new Error(`Rifa não encontrada: ${raffleId}`);

      creatorId    = raffle.creator_id;
      orderDescription = `Tickets: ${raffle.title}`;

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('asaas_wallet_id')
        .eq('id', creatorId)
        .single();

      if (profile?.asaas_wallet_id) {
        walletId = profile.asaas_wallet_id;
      } else {
        console.warn(`[ASAAS] Criador de rifa ${creatorId} sem wallet — PIX irá para conta principal`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. RESERVAR RAFFLE_TICKETS (apenas para rifas)
    // ─────────────────────────────────────────────────────────────────────
    const ticketsToReserve = [];
    for (const item of items) {
      if ((item.metadata?.type === 'raffle' || item.metadata?.brand === 'DROP') &&
          Array.isArray(item.metadata?.tickets)) {
        for (const tNum of item.metadata.tickets) {
            ticket_number:  Number(tNum),
            user_id:        userId || null,
            payment_status: 'pendente',
            payment_id:     finalOrderId,
          });
        }
      }
    }

    if (ticketsToReserve.length > 0) {
      console.log(`[ASAAS] Verificando disponibilidade e limpando reservas expiradas para ${ticketsToReserve.length} tickets...`);
      
      for (const tReq of ticketsToReserve) {
        // 1. Limpar reservas pendentes expiradas (mais de 5 minutos)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        await supabaseAdmin
          .from('raffle_tickets')
          .delete()
          .eq('raffle_id', tReq.raffle_id)
          .eq('ticket_number', tReq.ticket_number)
          .eq('payment_status', 'pendente')
          .lt('created_at', fiveMinutesAgo);

        // 2. Verificar se o número ainda está ocupado (reservado < 5min ou já pago)
        const { data: existing } = await supabaseAdmin
          .from('raffle_tickets')
          .select('id, payment_status, created_at')
          .eq('raffle_id', tReq.raffle_id)
          .eq('ticket_number', tReq.ticket_number)
          .maybeSingle();

        if (existing) {
          if (existing.payment_status === 'pago') {
             throw new Error(`O número ${tReq.ticket_number} já foi vendido definitivamente.`);
          } else {
             throw new Error(`O número ${tReq.ticket_number} está reservado por outro operador. Tente novamente em alguns minutos.`);
          }
        }
      }

      console.log(`[ASAAS] Reservando ${ticketsToReserve.length} raffle_tickets...`);
      const { error: reserveErr } = await supabaseAdmin.from('raffle_tickets').insert(ticketsToReserve);
      if (reserveErr) throw new Error(`Erro na reserva: ${reserveErr.message}`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. CALCULAR SPLIT E GERAR COBRANÇA PIX NO ASAAS
    // ─────────────────────────────────────────────────────────────────────
    const platformFeePercent = 0.07;
    const asaasPixCost       = 0.99;
    const organizerShare     = Number(total) - (Number(total) * platformFeePercent) - asaasPixCost;

    // SANDBOX MODE: split desabilitado — wallets de subconta nao sao validas no sandbox.
    // Para producao, reativar: const splitConfig = walletId ? [...] : [];
    const splitConfig: any[] = [];



    // Criar Customer no Asaas
    const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        customerData.name,
        cpfCnpj:     customerData.cpf?.replace(/\D/g, ''),
        email:       customerData.email,
        mobilePhone: customerData.phone?.replace(/\D/g, ''),
      }),
    });
    const customer = await customerRes.json();
    if (!customerRes.ok) throw new Error(`Asaas Customer: ${customer.errors?.[0]?.description}`);

    // Criar Cobrança PIX
    const asaasPayload: any = {
      customer:          customer.id,
      billingType:       'PIX',
      value:             Number(total),
      dueDate:           new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0],
      description:       `${orderDescription} - Perfection Airsoft`,
      externalReference: finalOrderId,
    };

    // Só adiciona split se houver wallet configurada
    if (splitConfig.length > 0) {
      asaasPayload.split = splitConfig;
    }

    const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(asaasPayload),
    });
    const payment = await paymentRes.json();
    if (!paymentRes.ok) throw new Error(`Asaas Payment: ${payment.errors?.[0]?.description}`);

    // Buscar QR Code PIX — com retry (Asaas sandbox pode ter delay)
    let pixData: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const pixRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/pixQrCode`, {
        method: 'GET',
        headers: { 'access_token': ASAAS_API_KEY },
      });
      const pixJson = await pixRes.json();
      if (pixRes.ok && (pixJson.payload || pixJson.encodedImage)) {
        pixData = pixJson;
        break;
      }
      console.warn(`[ASAAS] QR Code tentativa ${attempt}/3 falhou:`, JSON.stringify(pixJson));
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500));
    }
    if (!pixData) throw new Error('QR Code PIX nao disponivel apos 3 tentativas. Tente novamente.');

    // ─────────────────────────────────────────────────────────────────────
    // 5. ATUALIZAR PEDIDO COM DADOS DO ASAAS
    // ─────────────────────────────────────────────────────────────────────
    await supabaseAdmin.from('orders').update({
      mercadopago_id:         `ASAAS_${payment.id}`,
      payment_type:            'pix',
      payment_qr_code:         pixData.payload,
      payment_qr_code_base64:  pixData.encodedImage,
      status:                  'pendente',
    }).eq('id', finalOrderId);

    return new Response(JSON.stringify({
      qr_code:        pixData.payload,
      qr_code_base64: pixData.encodedImage,
      amount:         total,
      order_id:       finalOrderId,
      asaas_id:       payment.id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[ASAAS ERROR] Detalhes do erro:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno no processamento do pagamento' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
