import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MELHOR_ENVIO_TOKEN = Deno.env.get('MELHOR_ENVIO_TOKEN') || '';
const MELHOR_ENVIO_URL = 'https://www.melhorenvio.com.br/api/v2/me/shipment/calculate';
const ORIGIN_CEP = '85859318';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, products } = await req.json();
    const cep = (to || '').replace(/\D/g, '');

    if (cep.length !== 8) {
      return new Response(JSON.stringify({ error: 'CEP inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const defaultProducts = [{ width: 15, height: 15, length: 60, weight: 3.5, quantity: 1, insurance_value: 500 }];

    const meBody = {
      from: { postal_code: ORIGIN_CEP },
      to: { postal_code: cep },
      products: products || defaultProducts,
    };

    const response = await fetch(MELHOR_ENVIO_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MELHOR_ENVIO_TOKEN}`,
        'User-Agent': 'TacticalOps (suporte@tacticalops.com.br)',
      },
      body: JSON.stringify(meBody),
    });

    const data = await response.json();

    const ALLOWED = ['jadlog', 'j&t'];

    const options = (Array.isArray(data) ? data : [])
      .filter((opt: any) => !opt.error)
      .filter((opt: any) => {
        const name = (opt.company?.name || opt.name || '').toLowerCase();
        const isAllowedCompany = ALLOWED.some((a: string) => name.includes(a));
        const isExcludedService = name.includes('package centralizado');
        return isAllowedCompany && !isExcludedService;
      })
      .map((opt: any) => ({
        id: opt.id,
        name: opt.name,
        company: opt.company?.name || opt.name,
        logo: opt.company?.picture || '',
        price: parseFloat(opt.custom_price || opt.price || '0'),
        delivery_time: opt.custom_delivery_time || opt.delivery_time || 0,
      }))
      .sort((a: any, b: any) => a.price - b.price);

    return new Response(JSON.stringify({ options }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao calcular frete', details: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
