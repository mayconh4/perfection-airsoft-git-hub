import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export function SEO({ 
  title = 'Perfection Airsoft | Conectando quem domina o jogo', 
  description = 'O ponto de encontro da elite tática. Onde a irmandade do Airsoft se une por equipamentos de alta performance e drops exclusivos.', 
  image = 'https://www.perfectionairsoft.com.br/og-image.png',
  url = window.location.href
}: SEOProps) {
  useEffect(() => {
    // Standard Tags
    const fullTitle = title.includes('Perfection') ? title : `${title} | Perfection Airsoft`;
    document.title = fullTitle;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = description;
      document.head.appendChild(newMeta);
    }

    // OpenGraph
    const updateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (meta) {
        meta.setAttribute('content', content);
      } else {
        const newMeta = document.createElement('meta');
        newMeta.setAttribute('property', property);
        newMeta.content = content;
        document.head.appendChild(newMeta);
      }
    };

    updateMeta('og:title', fullTitle);
    updateMeta('og:description', description);
    updateMeta('og:image', image);
    updateMeta('og:url', url);
    updateMeta('og:type', 'website');

    // Twitter
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', fullTitle);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', image);

  }, [title, description, image, url]);

  return null;
}
