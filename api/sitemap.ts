import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL     || 'https://seewdqetyolfmqsiyban.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZXdkcWV0eW9sZm1xc2l5YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjY3NzksImV4cCI6MjA4OTI0Mjc3OX0.rDUTp0xPGEvnLd-UTw3RqMEquA3lJE4ESIP6dY1VwYY';

const BASE_URL = 'https://www.perfectionairsoft.com.br';

const STATIC_PAGES = [
  { loc: '/',              changefreq: 'daily',   priority: '1.0' },
  { loc: '/produtos',      changefreq: 'daily',   priority: '0.9' },
  { loc: '/marcas',        changefreq: 'weekly',  priority: '0.8' },
  { loc: '/drop',          changefreq: 'weekly',  priority: '0.8' },
  { loc: '/eventos',       changefreq: 'weekly',  priority: '0.7' },
  { loc: '/categoria/rifles',      changefreq: 'weekly', priority: '0.8' },
  { loc: '/categoria/pistolas',    changefreq: 'weekly', priority: '0.8' },
  { loc: '/categoria/snipers',     changefreq: 'weekly', priority: '0.8' },
  { loc: '/categoria/acessorios',  changefreq: 'weekly', priority: '0.8' },
  { loc: '/categoria/equipamentos',changefreq: 'weekly', priority: '0.8' },
  { loc: '/categoria/bbs',         changefreq: 'weekly', priority: '0.8' },
  { loc: '/categoria/pecas',       changefreq: 'weekly', priority: '0.8' },
  { loc: '/mapas',         changefreq: 'monthly', priority: '0.6' },
  { loc: '/contato',       changefreq: 'monthly', priority: '0.6' },
  { loc: '/create-class',  changefreq: 'monthly', priority: '0.6' },
];

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${BASE_URL}${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  const today = new Date().toISOString().split('T')[0];

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Busca todos os produtos com slug e data de atualização
  const { data: products } = await supabase
    .from('products')
    .select('slug, id, updated_at, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);

  const productUrls = (products || [])
    .filter((p: any) => p.slug || p.id)
    .map((p: any) => {
      const slug = p.slug || p.id;
      const lastmod = (p.updated_at || p.created_at || today).split('T')[0];
      return urlEntry(`/produto/${slug}`, lastmod, 'weekly', '0.7');
    });

  const staticUrls = STATIC_PAGES.map(p => urlEntry(p.loc, today, p.changefreq, p.priority));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join('\n')}
${productUrls.join('\n')}
</urlset>`;

  res.status(200).send(xml);
}
