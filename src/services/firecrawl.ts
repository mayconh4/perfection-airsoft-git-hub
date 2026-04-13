export interface FirecrawlResponse {
  success: boolean;
  data: {
    markdown: string;
    json?: {
      name?: string;
      price?: number;
      brand?: string;
      image_url?: string;
      description?: string;
      button_text?: string;
      specifications?: Record<string, string>;
      external_features?: string[];
      internal_features?: string[];
      [key: string]: any;
    };
    metadata: {
      title?: string;
      description?: string;
      [key: string]: any;
    };
  };
}

export async function scrapeProduct(url: string): Promise<FirecrawlResponse | null> {
  const apiKey = import.meta.env.VITE_FIRECRAWL_API_KEY;

  if (!apiKey) {
    console.error('Firecrawl API Key missing');
    return null;
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url,
        formats: ['json', 'markdown'],
        jsonOptions: {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              price: { type: "number" },
              brand: { type: "string" },
              image_url: { type: "string" },
              images: {
                type: "array",
                items: { type: "string" },
                description: "Array com todas as URLs de imagens do produto (carrossel)"
              },
              description: {
                type: "string",
                description: "Descrição completa do produto, incluindo todos os parágrafos descritivos sobre características, uso e design"
              },
              specifications: {
                type: "object",
                description: "Tabela de especificações técnicas do produto. Inclua TODOS os campos disponíveis como: SKU, marca, comprimento, peso, rosca, capacidade do magazine, gearbox, motor, modos de disparo, blowback, calibre, hop-up, material, FPS, cano interno, etc. Use os nomes dos campos como aparecem na página."
              },
              external_features: {
                type: "array",
                items: { type: "string" },
                description: "Lista de funcionalidades/características EXTERNAS do produto (ex: licenciamento, seletor, segurança, rails)"
              },
              internal_features: {
                type: "array",
                items: { type: "string" },
                description: "Lista de funcionalidades/características INTERNAS do produto (ex: tipo de gearbox, MOSFET, mola, hop up)"
              },
              button_text: {
                type: "string",
                description: "Texto do botão principal de compra/ação na página (ex: 'Adicionar ao Carrinho', 'Avise-me quando chegar', 'Orçamento')"
              }
            },
            required: ["name", "price", "images"]
          }
        }
      })
    });

    if (!response.ok) throw new Error('Falha na requisição ao Firecrawl');

    return await response.json();
  } catch (error) {
    console.error('Firecrawl Error:', error);
    return null;
  }
}
