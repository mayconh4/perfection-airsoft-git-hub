const fs = require('fs');
const path = require('path');

const apiKey = 'fc-8c366cbd77114cb3b5d3dfd4bb61f170'; // Sua API Key do Firecrawl
const arsenalFile = path.join(__dirname, '../arsenal_products_full.json');

// Função para extrair dados fiéis de um produto
async function scrapeProduct(url) {
  console.log(`\nTactical Intel: Raspando ${url}...`);
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url,
        formats: ['json'],
        jsonOptions: {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              brand: { type: "string" },
              price: { type: "number" },
              description: { 
                type: "string", 
                description: "Descrição completa e tática do produto no container #product-tab-description. Preserve parágrafos e detalhes técnicos importantes. Formate em Markdown." 
              },
              specs: {
                type: "object",
                description: "Especificações técnicas do container #product-tab-additional (Peso, FPS, Comprimento, Gearbox, Hop-up, Material, etc.)",
                additionalProperties: { type: "string" }
              },
              image_url: { type: "string" }
            },
            required: ["name", "description"]
          }
        }
      })
    });

    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    // console.log('DEBUG Response:', JSON.stringify(data, null, 2));
    
    // Na API v1 do Firecrawl, o resultado da extração estruturada 
    // com formats: ['json'] fica em data.data
    return data.data || data.json || data;
  } catch (error) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Falha ao raspar ${url}:`, error.message);
    return null;
  }
}

async function runBatch() {
  const products = JSON.parse(fs.readFileSync(arsenalFile, 'utf8'));
  const targetProducts = products; // Processar todo o arsenal
  
  console.log(`\nIniciando Operação de Fidelidade: ${targetProducts.length} alvos identificados.`);
  
  const finalArsenal = [];
  let count = 0;

  for (const item of targetProducts) {
    count++;
    const url = item.metadata.sourceURL || item.metadata.ogUrl;
    
    // Tenta capturar os dados novos
    const data = await scrapeProduct(url);
    
    if (data && data.description) {
      // Mescla dados antigos (preservando metadados e imagem original) com os novos dados fiéis
      finalArsenal.push({
        metadata: item.metadata,
        json: {
          ...item.json,
          name: data.name || item.json.name,
          brand: data.brand || item.json.brand,
          description: data.description, // Aqui está a fidelidade!
          specs: data.specs || {},
          price: data.price || item.json.price
        }
      });
      console.log(`\x1b[32m[${count}/${targetProducts.length}]\x1b[0m ${data.name || 'Produto'} atualizado com fidelidade.`);
    } else {
      // Se falhar, mantém o antigo para não perder dados
      finalArsenal.push(item);
      console.log(`\x1b[33m[${count}/${targetProducts.length}]\x1b[0m Mantendo dados originais para ${url}`);
    }

    // Rate limiting preventivo
    await new Promise(r => setTimeout(r, 500));
    
    // Backup incremental a cada 20 produtos
    if (count % 20 === 0) {
      fs.writeFileSync(arsenalFile, JSON.stringify(finalArsenal, null, 2));
      console.log(`\x1b[34m[CHECKPOINT]\x1b[0m Backup incremental salvo.`);
    }
  }

  fs.writeFileSync(arsenalFile, JSON.stringify(finalArsenal, null, 2));
  console.log(`\nMissão Cumprida: Arsenal atualizado com sucesso em ${arsenalFile}`);
}

runBatch();
