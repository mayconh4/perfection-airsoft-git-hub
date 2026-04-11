import { createClient } from '@supabase/supabase-js';

// Motor Server-Side Rendering Vercel (Node.js API)
// Injeta tags OG/Twitter dinâmicas no index.html antes de servir ao cliente

export default async function handler(req: any, res: any) {
  // Cache no CDN da Vercel
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://seewdqetyolfmqsiyban.supabase.co';
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZXdkcWV0eW9sZm1xc2l5YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjY3NzksImV4cCI6MjA4OTI0Mjc3OX0.rDUTp0xPGEvnLd-UTw3RqMEquA3lJE4ESIP6dY1VwYY';

  const type = req.query?.type as string | undefined;
  const slugOrId = req.query?.slug as string | undefined;

  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'www.perfectionairsoft.com.br') as string;
  const proto = (req.headers['x-forwarded-proto'] || 'https') as string;
  const origin = `${proto}://${host}`;

  let originalPath = '/';
  if (type === 'drop-list') originalPath = '/drop';
  else if (type && slugOrId) originalPath = `/${type}/${slugOrId}`;
  const fullUrl = `${origin}${originalPath}`;

  let title = 'Perfection Airsoft | Conectando quem domina o jogo';
  let description = 'O ponto de encontro da elite tática. Onde a irmandade do Airsoft se une por equipamentos de alta performance e drops exclusivos.';
  let image = `${origin}/og-home.jpg`;

  if (!type && !slugOrId) {
    title = 'Perfection Airsoft';
    description = 'Perfection Airsoft | Conectando quem domina o jogo';
  } else if (type === 'drop-list') {
    title = 'Drops Perfection Airsoft';
    description = 'Conectando quem joga certo';
    image = `${origin}/og-drop.jpg`;
  }

  const ensureAbsolute = (url: string) =>
    url?.startsWith('http') ? url : `${origin}${url?.startsWith('/') ? '' : '/'}${url || ''}`;

  try {
    if (type && slugOrId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const getPrimaryImage = (data: any) => {
        if (data.image_url) return ensureAbsolute(data.image_url);
        if (Array.isArray(data.images) && data.images.length > 0) return ensureAbsolute(data.images[0]);
        return image;
      };

      if (type === 'drop') {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
        const { data } = await supabase.from('raffles').select('title,description,image_url,images').or(isUUID ? `id.eq.${slugOrId}` : `slug.eq.${slugOrId}`).single();
        if (data) { title = data.title; description = data.description || description; image = getPrimaryImage(data); }
      } else if (type === 'produto') {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
        const { data } = await supabase.from('products').select('name,description,image_url,images').or(isUUID ? `id.eq.${slugOrId}` : `slug.eq.${slugOrId}`).single();
        if (data) { title = data.name; description = data.description || description; image = getPrimaryImage(data); }
      } else if (type === 'eventos' && slugOrId !== 'criar') {
        const { data } = await supabase.from('events').select('title,description,image_url,images').eq('id', slugOrId).single();
        if (data) { title = data.title; description = data.description || description; image = getPrimaryImage(data); }
      }
    }
  } catch { /* Supabase falhou — continua com defaults */ }

  // Busca o index.html do próprio deployment (dist é gitignored; usar URL é o único caminho)
  let html = '';
  try {
    const resp = await fetch(`${origin}/index.html`, {
      headers: { 'x-og-internal': '1' }, // evita loop de rewrite (ver vercel.json)
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    html = await resp.text();
  } catch {
    // Último recurso: servir redirect direto para o index.html estático
    // Evita loop: /index.html serve o arquivo estático, não chama /api/og
    res.setHeader('Location', '/index.html');
    return res.status(302).end();
  }

  // Injeção das tags OG
  const injectMeta = (h: string, prop: string, val: string, isName = false) => {
    const attr = isName ? 'name' : 'property';
    const re = new RegExp(`<meta\\s+${attr}=["']${prop}["']\\s+content=["'].*?["']\\s*/?>`, 'i');
    const tag = `<meta ${attr}="${prop}" content="${val.replace(/"/g, '&quot;')}" />`;
    if (re.test(h)) return h.replace(re, tag);
    return h.includes('</head>') ? h.replace('</head>', `${tag}\n</head>`) : h + tag;
  };

  let out = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
  out = injectMeta(out, 'description', description, true);
  out = injectMeta(out, 'og:title', title);
  out = injectMeta(out, 'og:description', description);
  out = injectMeta(out, 'og:image', image);
  out = injectMeta(out, 'og:image:width', '1200');
  out = injectMeta(out, 'og:image:height', '630');
  out = injectMeta(out, 'og:url', fullUrl);
  out = injectMeta(out, 'twitter:card', 'summary_large_image');
  out = injectMeta(out, 'twitter:title', title);
  out = injectMeta(out, 'twitter:description', description);
  out = injectMeta(out, 'twitter:image', image);

  res.status(200).send(out);
}
