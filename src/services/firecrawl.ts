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
          prompt: "Você está extraindo dados de um produto de airsoft. A página pode ter abas ou seções separadas chamadas 'Descrição', 'Características', 'Especificações' ou 'Specs'. Extraia: (1) o texto descritivo narrativo dos parágrafos para o campo 'description'; (2) todos os itens da seção 'Características' como lista para 'external_features'; (3) TODOS os pares chave-valor da seção 'Especificações' ou tabela de specs (ex: Comprimento: 740mm, Peso: 2015g, FPS: 335, Magazine: 110 rounds, Rosca: 14mm CCW, Gearbox: V2, Motor: Long Type, Modos de Disparo, Bateria, Hopup etc.) para o campo 'specifications'. Não omita nenhum campo de especificação.",
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
                description: "Descrição completa do produto em português, incluindo TODOS os parágrafos sobre características, design, uso e benefícios. NÃO inclua especificações técnicas aqui — elas vão no campo specifications."
              },
              specifications: {
                type: "object",
                description: "Extraia TODOS os campos da seção 'Especificações' ou tabela de specs da página. Exemplos de campos: SKU, marca, comprimento (mm), peso líquido (kg), rosca, capacidade do magazine, capacidade (rds), gearbox, motor, modos de disparo, blowback, calibre, hop-up, material, FPS, cano interno, fonte de energia, projéteis, potência, hopup ajustável. Use os nomes dos campos EXATAMENTE como aparecem na página (em português, com unidades se houver)."
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
