import { createClient } from '@supabase/supabase-js';

// Usar variáveis do ambiente do Vite (import.meta.env proxy ou process.env)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://seewdqetyolfmqsiyban.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function asaasStatusProxy() {
  return {
    name: 'asaas-status-proxy',
    configureServer(server) {
      server.middlewares.use('/api/pedido/status/', async (req, res, next) => {
        if (req.method !== 'GET') return next();

        // Extrai o ID da URL '/api/pedido/status/uuid-do-pedido' filtrando partes vazias
        const parts = req.url.split('?')[0].split('/').filter(p => p !== '');
        const id = parts[parts.length - 1];

        if (!id || id === 'status') {
           res.statusCode = 400;
           res.setHeader('Content-Type', 'application/json');
           return res.end(JSON.stringify({ error: 'ID do pedido ausente ou inválido', status: 400 }));
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        try {
          const { data, error } = await supabaseAdmin
            .from('orders')
            .select('status')
            .eq('id', id)
            .single();

          if (error || !data) {
             res.end(JSON.stringify({ pixConfirmado: false, error: error?.message || 'Pedido não encontrado' }));
             return;
          }

          const isConfirmed = data.status === 'pago' || data.status === 'confirmed';
          
          res.end(JSON.stringify({ 
             pixConfirmado: isConfirmed,
             statusAtual: data.status
          }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ pixConfirmado: false, error: err.message }));
        }
      });

      server.middlewares.use('/api/pagamento/retorno', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body);
            console.log("WEBHOOK CHEGOU:", payload);

            // Validar de múltiplas formas se o status é o explícito 'CONFIRMED' como ordenado:
            const isConfirmed = 
              payload.status === 'CONFIRMED' || 
              payload.payment?.status === 'CONFIRMED' || 
              payload.event === 'PAYMENT_CONFIRMED';

            const orderId = payload.payment?.externalReference || payload.id;

            if (isConfirmed && orderId) {
               // Atualiza banco para refletir pixConfirmado implicitamente através do status 'pago'
               await supabaseAdmin.from('orders').update({ status: 'pago' }).eq('id', orderId);
               console.log('✅ Pedido atualizado no banco via Webhook Local!');
            }

            res.end(JSON.stringify({ success: true, processed: isConfirmed }));
          } catch(err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    }
  };
}
