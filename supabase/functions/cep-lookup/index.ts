import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MELHOR_ENVIO_TOKEN = Deno.env.get('MELHOR_ENVIO_TOKEN') || '';
const MELHOR_ENVIO_CEP_URL = 'https://www.melhorenvio.com.br/api/v2/cep';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Aceita tanto GET /cep-lookup?cep=... quanto POST { cep: ... }
    const url = new URL(req.url);
    let cep = url.searchParams.get('cep');

    if (!cep && req.method === 'POST') {
      const body = await req.json();
      cep = body.cep;
    }

    const cleanCep = (cep || '').replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return new Response(JSON.stringify({ error: 'CEP deve ter 8 dígitos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch(`${MELHOR_ENVIO_CEP_URL}/${cleanCep}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${MELHOR_ENVIO_TOKEN}`,
        'User-Agent': 'TacticalOps (suporte@tacticalops.com.br)',
      },
    });

    if (!response.ok) {
       // Se o Melhor Envio falhar ou CEP não existir
       console.error('[CEP-Lookup] Erro na API Melhor Envio:', response.status);
       return new Response(JSON.stringify({ error: 'CEP não encontrado, por favor verifique' }), {
         status: 404,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       });
    }

    const data = await response.json();

    // Mapeamento para formato amigável
    // API Melhor Envio v2/cep returns:
    // { "address": "...", "district": "...", "city": { "name": "..." }, "state": { "letter": "..." } }
    const result = {
      street: data.address || '',
      district: data.district || '',
      city: data.city?.name || '',
      state: data.state?.letter || '',
      cep: cleanCep
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CEP-Lookup] Erro Fatal:', error);
    return new Response(JSON.stringify({ error: 'Erro ao consultar CEP' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
