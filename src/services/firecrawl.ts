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
              description: { type: "string" }
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
