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
    const siteUrl = `${url.protocol}//${url.host}`;
    const response = await fetch(`${siteUrl}/index.html`);
    let html = await response.text();

    // 3. Injeção de Tags via Regex Resiliente (Trabalha com espaços e aspas)
    const injectMeta = (html: string, property: string, content: string, isName = false) => {
      const attr = isName ? 'name' : 'property';
      const regex = new RegExp(`<meta\\s+${attr}=["']${property}["']\\s+content=["'].*?["']\\s*\\/?>`, 'i');
      const newTag = `<meta ${attr}="${property}" content="${content}" />`;
      if (regex.test(html)) {
        return html.replace(regex, newTag);
      }
      return html.replace('</head>', `${newTag}\n</head>`);
    };

    html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
    html = injectMeta(html, 'description', description, true);
    html = injectMeta(html, 'og:title', title);
    html = injectMeta(html, 'og:description', description);
    html = injectMeta(html, 'og:image', image);
    html = injectMeta(html, 'twitter:title', title);
    html = injectMeta(html, 'twitter:description', description);
    html = injectMeta(html, 'twitter:image', image);
    
    return new Response(html, {
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600'
      },
    });
  } catch (err) {
    // Se falhar, retorna o HTML original (deve ter o og-image.png padrão que salvamos antes)
    const siteUrl = `${url.protocol}//${url.host}`;
    return fetch(`${siteUrl}/index.html`);
  }
}
