import fs from 'fs';

const API_KEY = 'fc-8c366cbd77114cb3b5d3dfd4bb61f170';
const BASE_URL = 'https://api.firecrawl.dev/v1';

async function startCrawl() {
  console.log('--- INICIANDO CRAWL TÁTICO: ARSENAL SPORTS ---');
  
  try {
    const response = await fetch(`${BASE_URL}/crawl`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://www.arsenalsports.com/',
        limit: 500,
        scrapeOptions: {
          formats: ['json'],
          jsonOptions: {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                price: { type: "number" },
                brand: { type: "string" },
                image_url: { type: "string", description: "Primary product image URL" },
                images: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Array containing URLs for ALL product images on the page (e.g. thumbnails, main picture, gallery)."
                },
                description: { 
                  type: "string",
                  description: "A descrição completa e detalhada do produto"
                },
                specs: {
                  type: "object",
                  properties: {
                    fps: { type: "string", description: "FPS (Velocidade) do equipamento" },
                    material: { type: "string", description: "Material de fabricação (ex: Full Metal, Polímero)" },
                    capacity: { type: "string", description: "Capacidade do magazine/carregador" },
                    weight: { type: "string", description: "Peso do equipamento" },
                    length: { type: "string", description: "Comprimento do equipamento" },
                    power_source: { type: "string", description: "Fonte de energia (ex: Gás, Bateria, Mola)" },
                    firing_mode: { type: "string", description: "Modo de disparo (ex: Semi, Auto, Safe)" },
                    range: { type: "string", description: "Alcance efetivo ou máximo da arma" }
                  },
                  description: "Especificações técnicas táticas detalhadas do produto extraídas da página. Preencha apenas o que existir."
                }
              },
              required: ["name", "price"]
            }
          }
        },
        includePaths: ['/produto/.*']
      })
    });

    const data = await response.json();
    
    // Na v1 do Firecrawl, o ID vem no campo 'id'
    const jobId = data.id || data.jobId;

    if (jobId) {
      console.log(`SUCESSO! Job ID: ${jobId}`);
      fs.writeFileSync('crawl_status.json', JSON.stringify({ jobId, status: 'started', timestamp: new Date().toISOString() }, null, 2));
      console.log('Aguardando processamento... (Isso pode levar alguns minutos)');
      
      // Iniciando loop de monitoramento simples
      checkStatus(jobId);
    } else {
      console.error('ERRO AO INICIAR:', data);
    }
  } catch (error) {
    console.error('FALHA NA OPERAÇÃO:', error);
  }
}

async function checkStatus(jobId) {
  try {
    const response = await fetch(`${BASE_URL}/crawl/${jobId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    const data = await response.json();
    
    console.log(`Status: ${data.status} | Scraped: ${data.completed} / ${data.total}`);
    
    if (data.status === 'completed') {
      console.log('--- EXTRAÇÃO CONCLUÍDA! Aplicando Fórmula Tática... ---');
      const dollarRate = 5.70;
      const fixedTax = 0.35;
      
      const processedData = data.data.map(item => {
        if (item.json?.price) {
          const usd = item.json.price;
          const brl = ((usd + fixedTax) * dollarRate) * 1.25 * 1.25;
          item.json.price_brl = brl.toFixed(2);
          item.json.usd_price = usd;
        }
        return item;
      });

      fs.writeFileSync('arsenal_products_full.json', JSON.stringify(processedData, null, 2));
      console.log(`Total de produtos processados: ${processedData.length}`);
    } else if (data.status === 'failed') {
      console.error('Crawl falhou:', data.error);
    } else {
      // Tentar novamente em 30 segundos
      setTimeout(() => checkStatus(jobId), 30000);
    }
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    setTimeout(() => checkStatus(jobId), 60000);
  }
}

startCrawl();
