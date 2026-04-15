import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// URL canônica — usada para imagens e og:url (nunca depende de headers)
const BASE_URL = 'https://www.perfectionairsoft.com.br';

// Tenta ler o index.html buildado do filesystem (mais confiável que HTTP self-request)
function readIndexHtml(): string | null {
  const candidates = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
    path.join(__dirname, '..', 'dist', 'index.html'),
    path.join(__dirname, '..', 'index.html'),
  ];
  for (const p of candidates) {
    try {
      const content = fs.readFileSync(p, 'utf-8');
      if (content.includes('<html')) return content;
    } catch { /* try next */ }
  }
  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  try {
    const SUPABASE_URL     = process.env.VITE_SUPABASE_URL     || 'https://seewdqetyolfmqsiyban.supabase.co';
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZXdkcWV0eW9sZm1xc2l5YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjY3NzksImV4cCI6MjA4OTI0Mjc3OX0.rDUTp0xPGEvnLd-UTw3RqMEquA3lJE4ESIP6dY1VwYY';

    const type     = req.query?.type as string | undefined;
    const slugOrId = req.query?.slug as string | undefined;

    // Monta URL canônica da página
    let pagePath = '/';
    if (type === 'drop-list')          pagePath = '/drop';
    else if (type === 'eventos-list')  pagePath = '/eventos';
    else if (type === 'produtos-list') pagePath = '/produtos';
    else if (type === 'marcas-list')   pagePath = '/marcas';
    else if (type === 'blog-list')     pagePath = '/blog';
    else if (type && slugOrId)         pagePath = `/${type}/${slugOrId}`;
    const fullUrl = `${BASE_URL}${pagePath}`;

    // Defaults
    let title       = 'Perfection Airsoft | Conectando quem domina o jogo';
    let description = 'O ponto de encontro da elite tática. Onde a irmandade do Airsoft se une por equipamentos de alta performance e drops exclusivos.';
    let image       = `${BASE_URL}/og-home.jpg`;

    if (type === 'drop-list') {
      title       = 'Drops Exclusivos | Perfection Airsoft';
      description = 'Rifas e drops de equipamentos táticos de alta performance. Concorra a itens exclusivos.';
      image       = `${BASE_URL}/og-drop.jpg`;
    } else if (type === 'eventos-list') {
      title       = 'Eventos de Airsoft | Perfection Airsoft';
      description = 'Encontre os melhores eventos e operações de airsoft. Compre seu ingresso e aliste-se.';
    } else if (type === 'produtos-list') {
      title       = 'Loja de Airsoft | Perfection Airsoft';
      description = 'Rifles, pistolas, snipers, acessórios e equipamentos táticos de alta performance.';
    } else if (type === 'marcas-list') {
      title       = 'Marcas | Perfection Airsoft';
      description = 'As melhores marcas do airsoft em um só lugar: G&G, Tokyo Marui, VFC, Krytac e muito mais.';
    } else if (type === 'blog' || type === 'blog-list') {
      title       = 'Blog & Intel | Perfection Airsoft';
      description = 'Artigos técnicos, guias de setup, táticas e o manual de operações do campo de airsoft.';
    }

    const ensureAbsolute = (url: string) =>
      url?.startsWith('http') ? url : `${BASE_URL}${url?.startsWith('/') ? '' : '/'}${url || ''}`;

    // Busca dados dinâmicos
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
        } else if (type === 'blog') {
          const { data } = await supabase.from('blog_posts').select('title,subtitle,cover_image').eq('slug', slugOrId).eq('status', 'published').single();
          if (data) {
            title = `${data.title} | Blog Perfection Airsoft`;
            description = data.subtitle || description;
            if (data.cover_image) image = ensureAbsolute(data.cover_image);
          }
        }
      }
    } catch { /* Supabase falhou — usa defaults */ }

    // ── Lê index.html do filesystem ──────────────────────────────────────────
    let html = readIndexHtml();

    // Fallback: fetch interno (com timeout curto para não travar a função)
    if (!html) {
      try {
        const origin = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : BASE_URL;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(`${origin}/_next-static-index`, { signal: controller.signal }).catch(() => null);
        clearTimeout(timer);
        // Não usamos o fetch interno para evitar loops — usa fallback direto
        if (resp && false) html = await resp.text(); // desabilitado intencionalmente
      } catch { /* ignore */ }
    }

    // Último recurso: HTML mínimo funcional
    if (!html) {
      html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Perfection Airsoft" />
  <meta property="og:title" content="" />
  <meta property="og:description" content="" />
  <meta property="og:image" content="" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="" />
  <meta name="twitter:description" content="" />
  <meta name="twitter:image" content="" />
</head>
<body><div id="root"></div>
<script type="module">
  const base = '${BASE_URL}';
  fetch(base + '/assets/').catch(() => {});
  // Carrega a SPA buscando os assets do build
  fetch(base).then(r => r.text()).then(h => {
    const m = h.match(/src="(\/assets\/[^"]+\.js)"/);
    if (m) { const s = document.createElement('script'); s.type='module'; s.src=m[1]; document.head.appendChild(s); }
    const c = h.match(/href="(\/assets\/[^"]+\.css)"/);
    if (c) { const l = document.createElement('link'); l.rel='stylesheet'; l.href=c[1]; document.head.appendChild(l); }
  }).catch(() => { window.location.href = '${BASE_URL}' + window.location.pathname; });
</script>
</body>
</html>`;
    }

    // ── Injeta OG tags ────────────────────────────────────────────────────────
    const injectMeta = (h: string, prop: string, val: string, isName = false) => {
      const attr = isName ? 'name' : 'property';
      const escaped = val.replace(/"/g, '&quot;');
      const re = new RegExp(`<meta\\s+${attr}=["']${prop}["'][^>]*>`, 'i');
      const tag = `<meta ${attr}="${prop}" content="${escaped}" />`;
      if (re.test(h)) return h.replace(re, tag);
      return h.replace('</head>', `  ${tag}\n</head>`);
    };

    let out = html.replace(/<title>.*?<\/title>/is, `<title>${title}</title>`);
    out = injectMeta(out, 'description',         description, true);
    out = injectMeta(out, 'og:title',            title);
    out = injectMeta(out, 'og:description',      description);
    out = injectMeta(out, 'og:image',            image);
    out = injectMeta(out, 'og:image:width',      '1200');
    out = injectMeta(out, 'og:image:height',     '630');
    out = injectMeta(out, 'og:url',              fullUrl);
    out = injectMeta(out, 'twitter:card',        'summary_large_image');
    out = injectMeta(out, 'twitter:title',       title);
    out = injectMeta(out, 'twitter:description', description);
    out = injectMeta(out, 'twitter:image',       image);

    res.status(200).send(out);

  } catch (err: any) {
    // Nunca deve retornar 500 — serve a SPA sem OG tags em último caso
    console.error('[og] fatal:', err?.message);
    res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Perfection Airsoft</title></head>
<body><div id="root"></div>
<script>window.location.href='${BASE_URL}'+window.location.pathname;</script>
</body></html>`);
  }
}
