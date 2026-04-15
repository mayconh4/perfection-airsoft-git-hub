import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://www.perfectionairsoft.com.br';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  const SUPABASE_URL      = process.env.VITE_SUPABASE_URL      || 'https://seewdqetyolfmqsiyban.supabase.co';
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZXdkcWV0eW9sZm1xc2l5YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjY3NzksImV4cCI6MjA4OTI0Mjc3OX0.rDUTp0xPGEvnLd-UTw3RqMEquA3lJE4ESIP6dY1VwYY';

  const type     = (req.query?.type  as string) || '';
  const slugOrId = (req.query?.slug  as string) || '';

  // ── Defaults ──────────────────────────────────────────────────────────────
  let title       = 'Perfection Airsoft | Conectando quem domina o jogo';
  let description = 'O ponto de encontro da elite tática. Equipamentos de alta performance e drops exclusivos.';
  let image       = `${BASE_URL}/og-home.jpg`;

  if (type === 'drop-list') {
    title       = 'Drops Exclusivos | Perfection Airsoft';
    description = 'Rifas e drops de equipamentos táticos de alta performance.';
    image       = `${BASE_URL}/og-drop.jpg`;
  } else if (type === 'eventos-list') {
    title       = 'Eventos de Airsoft | Perfection Airsoft';
    description = 'Os melhores eventos e operações de airsoft. Compre seu ingresso e aliste-se.';
  } else if (type === 'produtos-list') {
    title       = 'Loja | Perfection Airsoft';
    description = 'Rifles, pistolas, snipers, acessórios e equipamentos táticos de alta performance.';
  } else if (type === 'marcas-list') {
    title       = 'Marcas | Perfection Airsoft';
    description = 'G&G, Tokyo Marui, VFC, Krytac e muito mais em um só lugar.';
  } else if (type === 'blog') {
    title       = 'Blog & Intel | Perfection Airsoft';
    description = 'Artigos técnicos, guias de setup e o manual de operações do campo de airsoft.';
  }

  // ── Busca dados dinâmicos ─────────────────────────────────────────────────
  if (slugOrId) {
    try {
      const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const abs = (url: string) =>
        url?.startsWith('http') ? url : `${BASE_URL}/${(url || '').replace(/^\//, '')}`;

      if (type === 'produto') {
        const isUUID = /^[0-9a-f-]{36}$/i.test(slugOrId);
        const { data } = await db.from('products')
          .select('name,description,image_url,images')
          .or(isUUID ? `id.eq.${slugOrId}` : `slug.eq.${slugOrId}`)
          .single();
        if (data) {
          title       = `${data.name} | Perfection Airsoft`;
          description = data.description || description;
          image       = data.image_url ? abs(data.image_url)
                      : Array.isArray(data.images) && data.images[0] ? abs(data.images[0]) : image;
        }
      } else if (type === 'drop') {
        const isUUID = /^[0-9a-f-]{36}$/i.test(slugOrId);
        const { data } = await db.from('raffles')
          .select('title,description,image_url,images')
          .or(isUUID ? `id.eq.${slugOrId}` : `slug.eq.${slugOrId}`)
          .single();
        if (data) {
          title       = `${data.title} | Perfection Airsoft`;
          description = data.description || description;
          image       = data.image_url ? abs(data.image_url)
                      : Array.isArray(data.images) && data.images[0] ? abs(data.images[0]) : image;
        }
      } else if (type === 'eventos') {
        const { data } = await db.from('events')
          .select('title,description,image_url')
          .eq('id', slugOrId)
          .single();
        if (data) {
          title       = `${data.title} | Perfection Airsoft`;
          description = data.description || description;
          if (data.image_url) image = abs(data.image_url);
        }
      } else if (type === 'blog') {
        const { data } = await db.from('blog_posts')
          .select('title,subtitle,cover_image')
          .eq('slug', slugOrId)
          .eq('status', 'published')
          .single();
        if (data) {
          title       = `${data.title} | Blog Perfection Airsoft`;
          description = data.subtitle || description;
          if (data.cover_image) image = abs(data.cover_image);
        }
      }
    } catch (_) { /* usa defaults */ }
  }

  // ── URL canônica ──────────────────────────────────────────────────────────
  let pagePath = '/';
  if      (type === 'drop-list')          pagePath = '/drop';
  else if (type === 'eventos-list')       pagePath = '/eventos';
  else if (type === 'produtos-list')      pagePath = '/produtos';
  else if (type === 'marcas-list')        pagePath = '/marcas';
  else if (type === 'blog' && !slugOrId)  pagePath = '/blog';
  else if (type && slugOrId)             pagePath = `/${type}/${slugOrId}`;

  const e = (s: string) => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');

  // ── Resposta HTML ─────────────────────────────────────────────────────────
  // OG tags para bots + carrega a SPA para usuários reais
  res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}" />
  <meta property="og:type"         content="website" />
  <meta property="og:site_name"    content="Perfection Airsoft" />
  <meta property="og:title"        content="${e(title)}" />
  <meta property="og:description"  content="${e(description)}" />
  <meta property="og:image"        content="${e(image)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url"          content="${e(BASE_URL + pagePath)}" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${e(title)}" />
  <meta name="twitter:description" content="${e(description)}" />
  <meta name="twitter:image"       content="${e(image)}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="128x128" href="/favicon.png" />
</head>
<body>
  <div id="root"></div>
  <script>
    // Carrega a SPA: busca o index.html raiz para extrair os asset hashes do build
    fetch('/?_og=1')
      .then(function(r){ return r.text(); })
      .then(function(html){
        var js  = html.match(/src="(\\/assets\\/[^"]+\\.js)"/);
        var css = html.match(/href="(\\/assets\\/[^"]+\\.css)"/);
        if(css){ var l=document.createElement('link'); l.rel='stylesheet'; l.href=css[1]; document.head.appendChild(l); }
        if(js){  var s=document.createElement('script'); s.type='module'; s.src=js[1]; document.head.appendChild(s); }
        if(!js && !css){ window.location.replace('/'); }
      })
      .catch(function(){ window.location.replace('/'); });
  </script>
</body>
</html>`);
}
