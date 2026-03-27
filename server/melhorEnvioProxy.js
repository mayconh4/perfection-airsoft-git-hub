// Vite server plugin that proxies /api/shipping to Melhor Envio
// This keeps the token server-side during development

const MELHOR_ENVIO_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNzEyZTE2MzllODhhOTk0NGYxZDM2NjYwNDJiMWRjNDE3MTU4YmZkZTBiMTA1N2E3NmYxMGJlZGVjOTgwOGRlMTk4NDdjM2M0MTY5MzM5OTgiLCJpYXQiOjE3NzM4OTE5NzQuMTIzNjQ5LCJuYmYiOjE3NzM4OTE5NzQuMTIzNjUsImV4cCI6MTgwNTQyNzk3NC4xMDkyMDksInN1YiI6Ijc3MzllZjFhLWFhN2UtNDRjOC05YmY2LTllOWMzZjQ3ODIwNCIsInNjb3BlcyI6WyJjYXJ0LXJlYWQiLCJjYXJ0LXdyaXRlIiwiY29tcGFuaWVzLXJlYWQiLCJjb21wYW5pZXMtd3JpdGUiLCJjb3Vwb25zLXJlYWQiLCJjb3Vwb25zLXdyaXRlIiwibm90aWZpY2F0aW9ucy1yZWFkIiwib3JkZXJzLXJlYWQiLCJwcm9kdWN0cy1yZWFkIiwicHJvZHVjdHMtZGVzdHJveSIsInByb2R1Y3RzLXdyaXRlIiwicHVyY2hhc2VzLXJlYWQiLCJzaGlwcGluZy1jYWxjdWxhdGUiLCJzaGlwcGluZy1jYW5jZWwiLCJzaGlwcGluZy1jaGVja291dCIsInNoaXBwaW5nLWNvbXBhbmllcyIsInNoaXBwaW5nLWdlbmVyYXRlIiwic2hpcHBpbmctcHJldmlldyIsInNoaXBwaW5nLXByaW50Iiwic2hpcHBpbmctc2hhcmUiLCJzaGlwcGluZy10cmFja2luZyIsImVjb21tZXJjZS1zaGlwcGluZyIsInRyYW5zYWN0aW9ucy1yZWFkIiwidXNlcnMtcmVhZCIsInVzZXJzLXdyaXRlIiwid2ViaG9va3MtcmVhZCIsIndlYmhvb2tzLXdyaXRlIiwid2ViaG9va3MtZGVsZXRlIiwidGRlYWxlci13ZWJob29rIl19.sPyOGwFWsqYuL7kSqrh28zjW9YBSG9rkPDLxkc7SPWvtiv_2WWTOoBkU75rZly9uROHvEcVsLoRTdrQqne3yQbeQXobBKkAg4KOYVwGhTKkj4rSdpUZeiZfUjJQT6xE873RRyA1XnaD3xhxsQ8UYwtcyOlFwYLSaEaGtmnPKq-9MiKPAgU2yb0gRin_4bfS-od7TB5Co1BBfbTWdGa3Tjz-AfgnlRUMXSTKWZ4eG6hZCqVoYV-srH-640oCUusgbjBHvIDA95ZrvA88zOiEd8oARlRe2j6y-q-y98yKFBhaxsGBs1x-eZWjrYmjMpo86Lfe1aDjOhLZi_-LvOwqtzESUQvVZgYJMfbk9tvFoYLy2fwkEQh0dGtm51YP56NIJZRgi6ADUOzCqgWoBK5vrERYd0kSNX1HrT7uU1vOqmp0SCdMv-TDnookAcririZwWlLkNw0TUgIZ8i2T6nWin7L-4HLBQqbCUz7qgTluwEFdHiR86-Adj543xSKkmYOpLTLXV10goFP1KrsoAHHUiMW9ayP4WT6jGUCLQi8wa_aJg5RIPdZtH7qdWHfOCe03peYCP00LngK_BsS2togQxPypEf8JnnLV-6xoGeOP0mVb-Ybty16T4cmrIPHbs2DSjXcHZZJe4jugCf-u6uaZg7pOO8hDZxLj7N_PL5chO2Ns';

const MELHOR_ENVIO_URL = 'https://www.melhorenvio.com.br/api/v2/me/shipment/calculate';
const ORIGIN_CEP = '85859318'; // CEP da loja

export function melhorEnvioProxy() {
  return {
    name: 'melhor-envio-proxy',
    configureServer(server) {
      server.middlewares.use('/api/shipping', async (req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { to, products } = JSON.parse(body);

            const cep = (to || '').replace(/\D/g, '');
            if (cep.length !== 8) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'CEP inválido' }));
              return;
            }

            // Default product dimensions (airsoft equipment box)
            const defaultProducts = [{
              width: 15,
              height: 15,
              length: 60,
              weight: 3.5,
              quantity: 1,
              insurance_value: 500,
            }];

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

            const ALLOWED = ['jadlog', 'j&t', 'jt express', 'j & t', 'j&amp;t'];
            // DEBUG: log de todas as transportadoras disponíveis
            console.log('[Melhor Envio] Transportadoras disponíveis:', (Array.isArray(data) ? data : []).filter(o => !o.error).map(o => o.company?.name || o.name));


            const options = (Array.isArray(data) ? data : [])
              .filter(opt => !opt.error)
              .filter(opt => {
                const name = (opt.company?.name || opt.name || '').toLowerCase();
                const isAllowedCompany = ALLOWED.some(a => name.includes(a));
                const isExcludedService = name.includes('package centralizado');
                return isAllowedCompany && !isExcludedService;
              })
              .map(opt => ({
                id: opt.id,
                name: opt.name,
                company: opt.company?.name || opt.name,
                logo: opt.company?.picture || '',
                price: parseFloat(opt.custom_price || opt.price || '0'),
                delivery_time: opt.custom_delivery_time || opt.delivery_time || 0,
              }))
              .sort((a, b) => a.price - b.price);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ options }));
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Erro ao calcular frete', details: String(error) }));
          }
        });
      });
    },
  };
}
