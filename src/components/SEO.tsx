import { useEffect } from 'react';

const SITE_NAME = 'Perfection Airsoft';
const SITE_URL = 'https://www.perfectionairsoft.com.br';

export interface SEOProduct {
  name: string;
  image?: string | null;
  description?: string | null;
  brand?: string | null;
  price?: number | null;
  slug?: string | null;
}

export interface SEOBreadcrumb {
  name: string;
  url: string;
}

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  product?: SEOProduct;
  breadcrumbs?: SEOBreadcrumb[];
}

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/og-home.jpg`,
  sameAs: ['https://instagram.com/perfectionairsoft'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: 'Portuguese',
  },
};

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/busca?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

function buildProductSchema(product: SEOProduct, pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image ? (product.image.startsWith('http') ? product.image : `${SITE_URL}${product.image}`) : undefined,
    description: product.description || undefined,
    url: pageUrl,
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand }
      : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: product.price != null ? String(product.price) : undefined,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };
}

function buildBreadcrumbSchema(breadcrumbs: SEOBreadcrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url.startsWith('http') ? crumb.url : `${SITE_URL}${crumb.url}`,
    })),
  };
}

function upsertMeta(selector: string, attrKey: string, attrVal: string, content: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrKey, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertNameMeta(name: string, content: string) {
  upsertMeta(`meta[name="${name}"]`, 'name', name, content);
}

function upsertPropertyMeta(property: string, content: string) {
  upsertMeta(`meta[property="${property}"]`, 'property', property, content);
}

function upsertLdJson(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeLdJson(id: string) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function upsertCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertHreflang(hreflang: string, href: string) {
  let el = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'alternate';
    el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function SEO({
  title,
  description = 'Perfection Airsoft — A maior loja de airsoft do Brasil. Rifles, pistolas, acessórios e equipamentos táticos importados. Compre com segurança e receba em todo o Brasil.',
  image = `${SITE_URL}/og-home.jpg`,
  url,
  product,
  breadcrumbs,
}: SEOProps) {
  const pageUrl = url || (typeof window !== 'undefined' ? window.location.href : SITE_URL);

  // Build the final title
  const fullTitle = title
    ? (title.includes(SITE_NAME)
        ? title
        : `${title} | ${SITE_NAME} — Loja Airsoft Brasil`)
    : `${SITE_NAME} | Loja de Airsoft Online — Rifles, Pistolas e Equipamentos Táticos`;

  const ogImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  useEffect(() => {
    // ── Core ───────────────────────────────────────────────
    document.title = fullTitle;
    upsertNameMeta('description', description);
    upsertNameMeta('keywords', 'airsoft, loja airsoft, airsoft brasil, rifle airsoft, pistola airsoft, acessórios airsoft, equipamentos táticos, airsoft importado, comprar airsoft, perfection airsoft');
    upsertNameMeta('author', SITE_NAME);
    upsertNameMeta('robots', 'index, follow');

    // ── Canonical & Hreflang ───────────────────────────────
    upsertCanonical(pageUrl);
    upsertHreflang('pt-BR', pageUrl);
    upsertHreflang('x-default', pageUrl);

    // ── Open Graph ─────────────────────────────────────────
    upsertPropertyMeta('og:type', 'website');
    upsertPropertyMeta('og:locale', 'pt_BR');
    upsertPropertyMeta('og:site_name', SITE_NAME);
    upsertPropertyMeta('og:title', fullTitle);
    upsertPropertyMeta('og:description', description);
    upsertPropertyMeta('og:image', ogImage);
    upsertPropertyMeta('og:image:width', '1200');
    upsertPropertyMeta('og:image:height', '630');
    upsertPropertyMeta('og:url', pageUrl);

    // ── Twitter Card ───────────────────────────────────────
    upsertPropertyMeta('twitter:card', 'summary_large_image');
    upsertPropertyMeta('twitter:title', fullTitle);
    upsertPropertyMeta('twitter:description', description);
    upsertPropertyMeta('twitter:image', ogImage);
    upsertPropertyMeta('twitter:url', pageUrl);

    // ── JSON-LD: Organization ──────────────────────────────
    upsertLdJson('ld-organization', ORG_SCHEMA);

    // ── JSON-LD: WebSite with SearchAction ────────────────
    upsertLdJson('ld-website', WEBSITE_SCHEMA);

    // ── JSON-LD: Product (optional) ───────────────────────
    if (product) {
      upsertLdJson('ld-product', buildProductSchema(product, pageUrl));
    } else {
      removeLdJson('ld-product');
    }

    // ── JSON-LD: BreadcrumbList (optional) ────────────────
    if (breadcrumbs && breadcrumbs.length > 0) {
      upsertLdJson('ld-breadcrumb', buildBreadcrumbSchema(breadcrumbs));
    } else {
      removeLdJson('ld-breadcrumb');
    }
  }, [fullTitle, description, ogImage, pageUrl, product, breadcrumbs]);

  return null;
}
