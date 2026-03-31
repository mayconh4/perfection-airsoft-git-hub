import { createClient } from '@supabase/supabase-js';

// @ts-ignore - Vercel Edge Runtime handles process.env
const SUPABASE_URL = (globalThis as any).process?.env?.VITE_SUPABASE_URL || 'https://seewdqetyolfmqsiyban.supabase.co';
// @ts-ignore
const SUPABASE_ANON_KEY = (globalThis as any).process?.env?.VITE_SUPABASE_ANON_KEY || '';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const userAgent = req.headers.get('user-agent') || '';
  const isBot = /bot|facebookexternalhit|whatsapp|telegram|twitterbot|googlebot|bingbot/i.test(userAgent);

  // Se não for um robô, deixa o Vercel servir o index.html normal do SPA
  // (O vercel.json cuidará de não entrar aqui para usuários normais se configurado com redirects específicos)
  
  const path = url.pathname;
  let title = 'Perfection Airsoft | Conectando quem domina o jogo';
  let description = 'O ponto de encontro da elite tática. Onde a irmandade do Airsoft se une.';
  let image = 'https://www.perfectionairsoft.com.br/og-image.png';

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 1. Extração de Identificadores (Busca Dual: ID ou Slug)
    if (path.startsWith('/drop/')) {
      const slugOrId = path.replace('/drop/', '');
      if (slugOrId && slugOrId !== 'criar') {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
        const { data: raffle } = await supabase
          .from('raffles')
          .select('title, description, image_url')
          .or(isUUID ? `id.eq.${slugOrId}` : `slug.eq.${slugOrId}`)
          .single();

        if (raffle) {
          title = `${raffle.title} | Premium Drop`;
          description = raffle.description || description;
          image = raffle.image_url || image;
        }
      }
    } else if (path.startsWith('/produto/')) {
      const slugOrId = path.replace('/produto/', '');
      if (slugOrId) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
        const { data: product } = await supabase
          .from('products')
          .select('name, description, image_url')
          .or(isUUID ? `id.eq.${slugOrId}` : `slug.eq.${slugOrId}`)
          .single();

        if (product) {
          title = `${product.name} | Arsenal Elite`;
          description = product.description || description;
          image = product.image_url || image;
        }
      }
    }

    // 2. Buscar o index.html original (template)
    // Usamos um fallback para localhost em desenvolvimento e o host real em produção
    const siteUrl = url.origin;
    let html = '';
    
    try {
      const response = await fetch(`${siteUrl}/index.html`, {
        headers: { 'User-Agent': 'Vercel Edge Function' }
      });
      html = await response.text();
    } catch (e) {
      // Fallback extremo se o fetch falhar
      html = `<!DOCTYPE html><html><head><title>${title}</title></head><body><div id="root"></div></body></html>`;
    }

    // 3. Injeção de Tags via Regex Resiliente
    const injectMeta = (htmlContent: string, property: string, contentValue: string, isName = false) => {
      const attr = isName ? 'name' : 'property';
      const regex = new RegExp(`<meta\\s+${attr}=["']${property}["']\\s+content=["'].*?["']\\s*\\/?>`, 'i');
      const newTag = `<meta ${attr}="${property}" content="${contentValue}" />`;
      
      if (regex.test(htmlContent)) {
        return htmlContent.replace(regex, newTag);
      }
      
      // Se não encontrar, injeta logo após o <title> ou antes do </head>
      if (htmlContent.includes('</head>')) {
        return htmlContent.replace('</head>', `${newTag}\n</head>`);
      }
      return htmlContent + newTag;
    };

    let transformedHtml = html;
    transformedHtml = transformedHtml.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
    transformedHtml = injectMeta(transformedHtml, 'description', description, true);
    transformedHtml = injectMeta(transformedHtml, 'og:title', title);
    transformedHtml = injectMeta(transformedHtml, 'og:description', description);
    transformedHtml = injectMeta(transformedHtml, 'og:image', image);
    transformedHtml = injectMeta(transformedHtml, 'og:url', url.href);
    transformedHtml = injectMeta(transformedHtml, 'twitter:card', 'summary_large_image');
    transformedHtml = injectMeta(transformedHtml, 'twitter:title', title);
    transformedHtml = injectMeta(transformedHtml, 'twitter:description', description);
    transformedHtml = injectMeta(transformedHtml, 'twitter:image', image);
    
    return new Response(transformedHtml, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      },
    });
  } catch (err) {
    return new Response('Internal Engine Error', { status: 500 });
  }
}
