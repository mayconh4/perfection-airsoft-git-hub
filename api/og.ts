import { createClient } from '@supabase/supabase-js';

// Motor Server-Side Rendering Vercel (Node.js API)
// Essa função não usa Edge Runtime para garantir acesso a todas as variáveis de ambiente

export default async function handler(req: any, res: any) {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://seewdqetyolfmqsiyban.supabase.co';
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZXdkcWV0eW9sZm1xc2l5YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjY3NzksImV4cCI6MjA4OTI0Mjc3OX0.rDUTp0xPGEvnLd-UTw3RqMEquA3lJE4ESIP6dY1VwYY';

    // Cache no CDN da Vercel para máxima performance (Edge Caching)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    // Recupera a rota original via Query Param passado pelo vercel.json
    const type = req.query?.type;
    const slugOrId = req.query?.slug;

    // Constrói a URL original para o cache e injeção do og:url
    const host = req.headers.host || 'www.perfectionairsoft.com.br';
    const originalPath = type && slugOrId ? `/${type}/${slugOrId}` : '/';
    const fullUrl = `https://${host}${originalPath}`;

    let title = 'Perfection Airsoft | Conectando quem domina o jogo';
    let description = 'O ponto de encontro da elite tática. Onde a irmandade do Airsoft se une por equipamentos de alta performance e drops exclusivos.';
    let image = 'https://www.perfectionairsoft.com.br/images/banner-og-tactical.png';

    // Regras Específicas Requisitadas para a Exclusividade da Home (Raiz)
    if (!type && !slugOrId) {
      title = 'Perfection Airsoft';
      description = 'Conectando quem joga certo';
      image = 'https://www.perfectionairsoft.com.br/og-home.jpg';
    }

    const ensureAbsolute = (urlStr: string) => {
      if (!urlStr) return image;
      if (urlStr.startsWith('http')) return urlStr;
      const productionDomain = 'https://www.perfectionairsoft.com.br';
      return `${productionDomain}${urlStr.startsWith('/') ? '' : '/'}${urlStr}`;
    };

    if (SUPABASE_ANON_KEY && type && slugOrId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Helper unificado para buscar a imagem mais factível
      const getPrimaryImage = (data: any) => {
        if (data.image_url) return ensureAbsolute(data.image_url);
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          return ensureAbsolute(data.images[0]);
        }
        return image; // fallback pra imagem global se as duas falharem
      };

      if (type === 'drop') {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
        const { data } = await supabase.from('raffles').select('title, description, image_url, images').or(isUUID ? `id.eq.${slugOrId}` : `slug.eq.${slugOrId}`).single();
        if (data) {
          title = data.title;
          description = data.description || description;
          image = getPrimaryImage(data);
        }
      } else if (type === 'produto') {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
        const { data } = await supabase.from('products').select('name, description, image_url, images').or(isUUID ? `id.eq.${slugOrId}` : `slug.eq.${slugOrId}`).single();
        if (data) {
          title = data.name;
          description = data.description || description;
          image = getPrimaryImage(data);
        }
      } else if (type === 'eventos') {
        if (slugOrId !== 'criar') {
          const { data } = await supabase.from('events').select('title, description, image_url, images').eq('id', slugOrId).single();
          if (data) {
            title = data.title;
            description = data.description || description;
            image = getPrimaryImage(data);
          }
        }
      }
    }

    // Busca o HTML React puro compilarado
    const siteUrl = 'https://www.perfectionairsoft.com.br';
    let html = '';
    try {
      const resp = await fetch(`${siteUrl}/index.html`);
      html = await resp.text();
    } catch (e) {
      // Fallback extremo
      html = `<!DOCTYPE html><html><head><title>${title}</title></head><body><div id="root"></div></body></html>`;
    }

    // Injeção Server-Side das Tags
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
    
    // As injeções OBRIGATÓRIAS solicitadas
    transformedHtml = injectMeta(transformedHtml, 'og:title', title);
    transformedHtml = injectMeta(transformedHtml, 'og:description', description);
    transformedHtml = injectMeta(transformedHtml, 'og:image', image);
    transformedHtml = injectMeta(transformedHtml, 'og:image:width', '1200');
    transformedHtml = injectMeta(transformedHtml, 'og:image:height', '630');
    // Forçar URL absoluta
    transformedHtml = injectMeta(transformedHtml, 'og:url', fullUrl);
    
    transformedHtml = injectMeta(transformedHtml, 'twitter:card', 'summary_large_image');
    transformedHtml = injectMeta(transformedHtml, 'twitter:title', title);
    transformedHtml = injectMeta(transformedHtml, 'twitter:description', description);
    transformedHtml = injectMeta(transformedHtml, 'twitter:image', image);

    res.status(200).send(transformedHtml);
  } catch (error) {
    console.error('SSR Engine Error:', error);
    // Em caso de falha sistêmica, o SPA React ainda vai rotear normalmente
    res.status(500).send(`<!DOCTYPE html><html><head><title>Perfection Airsoft</title></head><body><div id="root"></div></body></html>`);
  }
}
