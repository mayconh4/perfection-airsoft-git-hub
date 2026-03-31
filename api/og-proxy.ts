import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://seewdqetyolfmqsiyban.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

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
  let title = 'Perfection Airsoft | De Operador para Operador';
  let description = 'O ponto de encontro da elite tática. Onde a irmandade do Airsoft se une.';
  let image = 'https://www.perfectionairsoft.com.br/og-image.png';

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 1. Extração de Identificadores
    if (path.startsWith('/drop/')) {
      const slugOrId = path.replace('/drop/', '');
      if (slugOrId && slugOrId !== 'criar') {
        const { data: raffle } = await supabase
          .from('raffles')
          .select('title, description, image_url')
          .or(`id.eq.${slugOrId},slug.eq.${slugOrId}`)
          .single();

        if (raffle) {
          title = `${raffle.title} | Premium Drop`;
          description = raffle.description || description;
          image = raffle.image_url || image;
        }
      }
    } else if (path.startsWith('/produto/')) {
      const id = path.replace('/produto/', '');
      if (id) {
        const { data: product } = await supabase
          .from('products')
          .select('name, description, image_url')
          .eq('id', id)
          .single();

        if (product) {
          title = `${product.name} | Arsenal Elite`;
          description = product.description || description;
          image = product.image_url || image;
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
          title = `${event.title} | Missão Confirmada`;
          description = event.description || description;
          image = event.image_url || image;
        }
      }
    }

    // 2. Buscar o index.html original (template)
    // Usamos a URL base do site instalada no Vercel
    const siteUrl = `${url.protocol}//${url.host}`;
    const response = await fetch(`${siteUrl}/index.html`);
    let html = await response.text();

    // 3. Injeção de Tags via Regex (Padrão SPA)
    html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
    html = html.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title}" />`);
    html = html.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description}" />`);
    html = html.replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${image}" />`);
    html = html.replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${description}" />`);
    
    // Twitter tags
    html = html.replace(/<meta property="twitter:title" content=".*?" \/>/, `<meta property="twitter:title" content="${title}" />`);
    html = html.replace(/<meta property="twitter:description" content=".*?" \/>/, `<meta property="twitter:description" content="${description}" />`);
    html = html.replace(/<meta property="twitter:image" content=".*?" \/>/, `<meta property="twitter:image" content="${image}" />`);

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    // Se falhar, retorna o HTML original (deve ter o og-image.png padrão que salvamos antes)
    const siteUrl = `${url.protocol}//${url.host}`;
    return fetch(`${siteUrl}/index.html`);
  }
}
