import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
// A margem de +R$0,50 é aplicada pelo PricingContext no frontend — não somamos aqui

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // AwesomeAPI — cotação comercial USD→BRL em tempo real (grátis, BR)
    const apiRes = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
      headers: { 'Accept': 'application/json' }
    });

    if (!apiRes.ok) throw new Error(`AwesomeAPI retornou ${apiRes.status}`);

    const data = await apiRes.json();
    const rawRate = parseFloat(data['USDBRL']?.bid ?? '0');

    if (!rawRate || rawRate < 3 || rawRate > 25) {
      throw new Error(`Cotação inválida recebida: ${rawRate}`);
    }

    // Salva a cotação REAL — a margem operacional (+R$0,50) é somada pelo PricingContext
    const finalRate = Math.round(rawRate * 100) / 100;

    // Atualiza admin_config — o Realtime propaga pra todos os clientes conectados
    const { error } = await supabase
      .from('admin_config')
      .update({
        dollar_rate: finalRate,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'global');

    if (error) throw error;

    console.log(`[Dollar] Cotação real salva: R$ ${finalRate.toFixed(2)} (site exibirá R$ ${(finalRate + 0.50).toFixed(2)})`);

    return new Response(
      JSON.stringify({
        success: true,
        rawRate: finalRate,
        operationalRate: finalRate + 0.50,
        updatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error(`[Dollar Error] ${err.message}`);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
