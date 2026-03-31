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
    const ensureAbsolute = (urlStr: string) => {
      if (!urlStr) return image;
      if (urlStr.startsWith('http')) return urlStr;
      // Forçar o domínio de produção para garantir que crawlers externos acessem a imagem
      const productionDomain = 'https://www.perfectionairsoft.com.br';
      return `${productionDomain}${urlStr.startsWith('/') ? '' : '/'}${urlStr}`;
    };

    // ... (restante da lógica de extração permanece igual)
    // 1. Extração de Identificadores (Busca Dual: ID ou Slug)
    // ...
    // (Pulei para a injeção para ser breve no replacement, mas a lógica de extração deve ser mantida)
    
    // (Recriando o bloco completo para evitar erro de match)
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
            title = raffle.title;
            description = raffle.description || description;
            image = ensureAbsolute(raffle.image_url || '');
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
            title = product.name;
            description = product.description || description;
            image = ensureAbsolute(product.image_url || '');
          }
        }
      } else if (path.startsWith('/eventos/')) {
        const id = path.replace('/eventos/', '');
        if (id && id !== 'criar') {
          const { data: event } = await supabase
            .from('events')
            .select('title, description, image_url')
            .eq('id', id)
            .single();
  
          if (event) {
            title = event.title;
            description = event.description || description;
            image = ensureAbsolute(event.image_url || '');
          }
        }
      }

    // 2. Buscar o index.html original (template)
    const siteUrl = 'https://www.perfectionairsoft.com.br';
    let html = '';
    
    try {
      const response = await fetch(`${siteUrl}/index.html`, {
        headers: { 'User-Agent': 'Vercel Edge SEO Proxy' }
      });
      html = await response.text();
    } catch (e) {
      html = `<!DOCTYPE html><html><head><title>${title}</title></head><body><div id="root"></div></body></html>`;
    }

    // 3. Injeção de Tags via Regex Resiliente
    const injectMeta = (htmlContent: string, property: string, contentValue: string, isName = false) => {
      const attr = isName ? 'name' : 'property';
      const regex = new RegExp(`<meta\\s+${attr}=["']${property}["']\\s+content=["'].*?["']\\s*\\/?>`, 'i');
      const newTag = `<meta ${attr}="${property}" content="${contentValue}" />`;
      if (regex.test(htmlContent)) return htmlContent.replace(regex, newTag);
      if (htmlContent.includes('</head>')) return htmlContent.replace('</head>', `${newTag}\n</head>`);
      return htmlContent + newTag;
    };

    let transformedHtml = html;
    transformedHtml = transformedHtml.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
    transformedHtml = injectMeta(transformedHtml, 'description', description, true);
    transformedHtml = injectMeta(transformedHtml, 'og:title', title);
    transformedHtml = injectMeta(transformedHtml, 'og:description', description);
    transformedHtml = injectMeta(transformedHtml, 'og:image', image);
    transformedHtml = injectMeta(transformedHtml, 'og:image:width', '1200');
    transformedHtml = injectMeta(transformedHtml, 'og:image:height', '630');
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
