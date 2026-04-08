import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MELHOR_ENVIO_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYjMzYmFiZGViYzEyZGE0Njc4YjVmMWIxZjkwMzU2MGYwYmU0ODJjYTU3M2RmOTcwOTJlNjI0ZjMwZjk1OGZkZWMyZjllZjEwYWVhN2MwZWIiLCJpYXQiOjE3NzU2NTUyNDQuMDMxMjc1LCJuYmYiOjE3NzU2NTUyNDQuMDMxMjc3LCJleHAiOjE4MDcxOTEyNDQuMDE4NzgzLCJzdWIiOiI3NzM5ZWYxYS1hYTdlLTQ0YzgtOWJmNi05ZTljM2Y0NzgyMDQiLCJzY29wZXMiOlsiY2FydC1yZWFkIiwiY2FydC13cml0ZSIsImNvbXBhbmllcy1yZWFkIiwiY29tcGFuaWVzLXdyaXRlIiwiY291cG9ucy1yZWFkIiwiY291cG9ucy13cml0ZSIsIm5vdGlmaWNhdGlvbnMtcmVhZCIsIm9yZGVycy1yZWFkIiwicHJvZHVjdHMtcmVhZCIsInByb2R1Y3RzLWRlc3Ryb3kiLCJwcm9kdWN0cy13cml0ZSIsInB1cmNoYXNlcy1yZWFkIiwic2hpcHBpbmctY2FsY3VsYXRlIiwic2hpcHBpbmctY2FuY2VsIiwic2hpcHBpbmctY2hlY2tvdXQiLCJzaGlwcGluZy1jb21wYW5pZXMiLCJzaGlwcGluZy1nZW5lcmF0ZSIsInNoaXBwaW5nLXByZXZpZXciLCJzaGlwcGluZy1wcmludCIsInNoaXBwaW5nLXNoYXJlIiwic2hpcHBpbmcttHJhY2tpbmciLCJlY29tbWVyY2Utc2hpcHBpbmciLCJ0cmFuc2FjdGlvbnMtcmVhZCIsInVzZXJzLXJlYWQiLCJ1c2Vycy13cml0ZSIsIndlYmhvb2tzLXJlYWQiLCJ3ZWJob29rcy13cml0ZSIsIndlYmhvb2tzLWRlbGV0ZSIsInRkZWFsZXItd2ViaG9vayJdfQ.xYYI5XgH0ucS2s81XuZf8aexCYUBfVIb-qo8eQtci9HNvtJXcudAKkrKy7FtRBBL5hSxF1jY8ZHfqLIuD_bZ34PHJ97H3_CZHmq0PGJp9nNCbadJC7Fvu_3wUwlweHL1ZPsALd0dunpb-MKAHmhS0uBNGTjG3RULQMmPKFRBLF6zSspnE38FosW0ar6Sb4OmtcbuW7u4JfSFXo6PV7DAhcBvBfpMBB2W6yfmxOip9hzkcc9VmgOIYZlh3o67VkM0aAlgIAjCphdjKKKZw_48N7uCg4BAcUjWHea-wTa2lB-9hTrTBOn8gB0fqMVlWSQmdV9Q6iOwNxt88hqBd-eqNp5Y2s7LerQObsKsSFT2dEge0k_1wi01mV9Pkdnz4wwXe2B8j-e97K7su6HCwuQPEJh0aN40LEz8n4jRFCZMlUi7Y8YBIYMJU8h8UFm2bkCs1yQClYpXmVbeZDRfLRZMUPZlZBg4b7Co9cVlBmNKsvv3Kyyf97UFfZTLp6y-xrpDinqYs-lb6OtSE5f-SrCSzinGxh5C_lwtXZddNg6mi5MO8PKg93ffhmDBAamMMEQMYOYRCHjI8BgsmxXMaY4Quta34TPRRs6b2YnHu06WI8ZpssJELhEie2ECrtyMTGP2xquT50NJiqKihFErweNz-YQ0-1CsXvCbqQEG88ucZEI";
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
