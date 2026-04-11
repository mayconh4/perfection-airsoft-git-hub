import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBrands } from '../hooks/useBrands';

function BrandLogo({ name, logo_url }: { name: string; logo_url: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);

  if (logo_url && !imgFailed) {
    return (
      <img
        src={logo_url}
        alt={name}
        onError={() => setImgFailed(true)}
        className="w-16 h-16 object-contain filter brightness-0 invert opacity-60 group-hover:opacity-100 group-hover:brightness-100 group-hover:invert-0 transition-all duration-300"
      />
    );
  }

  return (
    <span className="text-2xl font-black text-white/50 group-hover:text-primary transition-colors tracking-tighter">
      {initials}
    </span>
  );
}

export function BrandsPage() {
  const { brands, loading } = useBrands();

  return (
    <div className="py-12 lg:py-20 animate-fade-in relative px-4 lg:px-8">
      <div className="hidden lg:block absolute top-0 left-0 w-1/3 h-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="hidden lg:block absolute bottom-0 right-0 w-1/3 h-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="mb-12 border-b border-white/5 pb-8 relative">
        <div className="absolute left-0 top-0 w-1 h-full bg-primary" />
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter uppercase text-white ml-6">
          Marcas <span className="text-primary">Parceiras</span>
        </h1>
        <p className="text-white/40 mt-4 tracking-widest uppercase text-sm max-w-2xl ml-6">
          Equipamentos e acessórios das melhores fabricantes de airsoft do mundo. Escolha e monte o seu loadout perfeito.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface border border-white/5 p-8 flex flex-col items-center gap-6 animate-pulse">
              <div className="w-24 h-24 rounded-full bg-white/5" />
              <div className="h-3 w-24 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {brands.map(brand => (
            <Link
              key={brand.id}
              to={`/busca?q=${encodeURIComponent(brand.name)}`}
              className="group relative bg-surface border border-white/5 p-8 flex flex-col items-center justify-center gap-6 hover:border-primary/50 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="w-24 h-24 rounded-2xl bg-background-dark border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(0,0,0,0.5)] z-10 overflow-hidden p-3">
                <BrandLogo name={brand.name} logo_url={brand.logo_url} />
              </div>

              <div className="text-center z-10">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase group-hover:text-primary transition-colors">{brand.name}</h2>
                <p className="text-[10px] text-white/40 tracking-[0.2em] uppercase mt-2 group-hover:text-white/60 transition-colors">Explorar Catálogo</p>
              </div>

              <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                <span className="material-symbols-outlined text-primary text-2xl">arrow_forward</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
