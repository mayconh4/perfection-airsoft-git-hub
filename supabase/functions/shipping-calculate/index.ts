import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MELHOR_ENVIO_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYjMzYmFiZGViYzEyZGE0Njc4YjVmMWIxZjkwMzU2MGYwYmU0ODJjYTU3M2RmOTcwOTJlNjI0ZjMwZjk1OGZkZWMyZjllZjEwYWVhN2MwZWIiLCJpYXQiOjE3NzU2NTUyNDQuMDMxMjc1LCJuYmYiOjE3NzU2NTUyNDQuMDMxMjc3LCJleHAiOjE4MDcxOTEyNDQuMDE4NzgzLCJzdWIiOiI3NzM5ZWYxYS1hYTdlLTQ0YzgtOWJmNi05ZTljM2Y0NzgyMDQiLCJzY29wZXMiOlsiY2FydC1yZWFkIiwiY2FydC13cml0ZSIsImNvbXBhbmllcy1yZWFkIiwiY29tcGFuaWVzLXdyaXRlIiwiY291cG9ucy1yZWFkIiwiY291cG9ucy13cml0ZSIsIm5vdGlmaWNhdGlvbnMtcmVhZCIsIm9yZGVycy1yZWFkIiwicHJvZHVjdHMtcmVhZCIsInByb2R1Y3RzLWRlc3Ryb3kiLCJwcm9kdWN0cy13cml0ZSIsInB1cmNoYXNlcy1yZWFkIiwic2hpcHBpbmctY2FsY3VsYXRlIiwic2hpcHBpbmctY2FuY2VsIiwic2hpcHBpbmctY2hlY2tvdXQiLCJzaGlwcGluZy1jb21wYW5pZXMiLCJzaGlwcGluZy1nZW5lcmF0ZSIsInNoaXBwaW5nLXByZXZpZXciLCJzaGlwcGluZy1wcmludCIsInNoaXBwaW5nLXNoYXJlIiwic2hpcHBpbmcttHJhY2tpbmciLCJlY29tbWVyY2Utc2hpcHBpbmciLCJ0cmFuc2FjdGlvbnMtcmVhZCIsInVzZXJzLXJlYWQiLCJ1c2Vycy13cml0ZSIsIndlYmhvb2tzLXJlYWQiLCJ3ZWJob29rcy13cml0ZSIsIndlYmhvb2tzLWRlbGV0ZSIsInRkZWFsZXItd2ViaG9vayJdfQ.xYYI5XgH0ucS2s81XuZf8aexCYUBfVIb-qo8eQtci9HNvtJXcudAKkrKy7FtRBBL5hSxF1jY8ZHfqLIuD_bZ34PHJ97H3_CZHmq0PGJp9nNCbadJC7Fvu_3wUwlweHL1ZPsALd0dunpb-MKAHmhS0uBNGTjG3RULQMmPKFRBLF6zSspnE38FosW0ar6Sb4OmtcbuW7u4JfSFXo6PV7DAhcBvBfpMBB2W6yfmxOip9hzkcc9VmgOIYZlh3o67VkM0aAlgIAjCphdjKKKZw_48N7uCg4BAcUjWHea-wTa2lB-9hTrTBOn8gB0fqMVlWSQmdV9Q6iOwNxt88hqBd-eqNp5Y2s7LerQObsKsSFT2dEge0k_1wi01mV9Pkdnz4wwXe2B8j-e97K7su6HCwuQPEJh0aN40LEz8n4jRFCZMlUi7Y8YBIYMJU8h8UFm2bkCs1yQClYpXmVbeZDRfLRZMUPZlZBg4b7Co9cVlBmNKsvv3Kyyf97UFfZTLp6y-xrpDinqYs-lb6OtSE5f-SrCSzinGxh5C_lwtXZddNg6mi5MO8PKg93ffhmDBAamMMEQMYOYRCHjI8BgsmxXMaY4Quta34TPRRs6b2YnHu06WI8ZpssJELhEie2ECrtyMTGP2xquT50NJiqKihFErweNz-YQ0-1CsXvCbqQEG88ucZEI";
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
