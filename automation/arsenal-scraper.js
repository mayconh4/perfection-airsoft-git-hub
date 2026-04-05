/**
 * ARSENAL TACTICAL SCRAPER
 * Extrai dados completos de produtos do site Arsenal Airsoft
 * Suporte a: Carrossel de fotos (images array), Especificações Técnicas, Preço e Marca.
 */

const apiKey = 'fc-8c366cbd77114cb3b5d3dfd4bb61f170'; // Firecrawl API Key

async function scrapeArsenalProduct(productUrl) {
  console.log(`Iniciando extração elite de: ${productUrl}...`);
  
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url: productUrl,
        formats: ['extract'],
        // Seletor para galeria de imagens
        extract: {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              brand: { type: "string" },
              price_text: { type: "string" },
              image_url: { type: "string" },
              images: { 
                type: "array", 
                items: { type: "string" },
                description: "TODAS as URLs de imagens da galeria/carrossel do produto" 
              },
              description: { type: "string" },
              specifications: { type: "string" }
            },
            required: ["name", "image_url", "images"]
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl Error: ${response.status} - ${errorText}`);
    }

    const { data } = await response.json();
    
    // Tratamento de dados para o banco Perfection Airsoft
    const productData = {
      name: data.extract.name,
      brand: data.extract.brand,
      price: parseFloat(data.extract.price_text?.replace(/[^\d.,]/g, '').replace(',', '.') || 0),
      image_url: data.extract.image_url,
      images: data.extract.images, // Carrossel Completo
      description: data.extract.description,
      slug: data.extract.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      badge: "ARSENAL TÁTICO",
      condition: "Novo",
      status: "active"
    };

    console.log('Extração Concluída com Sucesso!');
    console.log('Imagens Capturadas:', productData.images.length);
    
    return productData;

  } catch (error) {
    console.error('Falha na Missão de Extração:', error.message);
    return null;
  }
}

// Exemplo de uso (Altere o link abaixo para testar)
const targetUrl = 'https://www.arsenalsports.com/produto/rifle-airsoft-gbbr-vfc-bcm-mcmr-11-5.html';

scrapeArsenalProduct(targetUrl).then(result => {
  if (result) {
    console.log(JSON.stringify(result, null, 2));
  }
});
