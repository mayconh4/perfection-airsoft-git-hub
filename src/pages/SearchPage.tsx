import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearch } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../types/database';
import { SEO } from '../components/SEO';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const { results, loading } = useSearch(query);
  const { addItem } = useCart();

  const seoTitle = query
    ? `Busca: "${query}" | Perfection Airsoft`
    : 'Buscar Produtos de Airsoft | Perfection Airsoft';
  const seoDescription = query
    ? `Resultados para "${query}" na Perfection Airsoft — rifles, pistolas, acessórios e equipamentos táticos de airsoft importados.`
    : 'Pesquise rifles, pistolas, snipers, acessórios e equipamentos táticos de airsoft na maior loja do Brasil.';

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        url={`https://www.perfectionairsoft.com.br/busca${query ? `?q=${encodeURIComponent(query)}` : ''}`}
        breadcrumbs={[
          { name: 'Início', url: '/' },
          { name: 'Busca', url: '/busca' },
        ]}
      />
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-1 w-12 bg-primary"></div>
        <span className="text-primary text-xs font-black tracking-widest uppercase">Intel de Campo</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase mb-6">Pesquisa</h1>

      <div className="relative max-w-2xl mb-8">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/50">search</span>
        <input value={query} onChange={e => setQuery(e.target.value)}
               className="w-full bg-surface border border-border-tactical text-white pl-12 pr-4 py-4 focus:ring-1 focus:ring-primary focus:border-primary text-sm uppercase tracking-widest"
               placeholder="BUSCAR EQUIPAMENTO..." autoFocus />
      </div>

      {query.length >= 2 && (
        <p className="text-slate-500 text-xs uppercase tracking-widest mb-8 flex items-center gap-3">
          {loading && <span className="size-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block"></span>}
          {loading ? 'Localizando alvos...' : `${results.length} alvo(s) localizado(s) para "${query}"`}
        </p>
      )}

      {loading && query.length >= 2 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface/50 border border-border-tactical animate-pulse">
              <div className="aspect-square bg-white/5"></div>
              <div className="p-4 space-y-3">
                <div className="h-2 bg-white/5 w-1/4"></div>
                <div className="h-3 bg-white/5 w-3/4"></div>
                <div className="h-5 bg-primary/10 w-1/3 mt-2"></div>
                <div className="h-9 bg-primary/10 w-full mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : !loading && query.length >= 2 && results.length === 0 ? (
        <div className="py-24 flex flex-col items-center gap-6 text-center border border-white/5 bg-surface/10">
          <span className="material-symbols-outlined text-6xl text-white/10">search_off</span>
          <div className="space-y-2">
            <p className="text-sm font-black text-white/30 uppercase tracking-[0.3em]">Nenhum alvo localizado</p>
            <p className="text-[10px] text-white/20 uppercase tracking-widest max-w-xs">Tente termos diferentes ou explore o arsenal completo</p>
          </div>
          <Link to="/produtos" className="bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest px-6 py-3 hover:bg-primary hover:text-black transition-all">
            Ver Arsenal Completo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {results.map(p => (
            <div key={p.id} className="bg-surface/50 border border-border-tactical group hover:border-primary hover:shadow-[0_0_25px_rgba(255,193,7,0.07)] transition-all duration-300">
              <Link to={`/produto/${p.slug || p.id}`} aria-label={`Ver ${p.name}`}>
                <div className="relative aspect-square overflow-hidden bg-surface">
                  <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" src={p.image_url || ''} alt={p.name}/>
                </div>
              </Link>
              <div className="p-4 space-y-2">
                <span className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">{p.brand}</span>
                <Link to={`/produto/${p.slug || p.id}`}><h4 className="text-sm font-bold tracking-tight text-slate-100 uppercase leading-tight hover:text-primary transition-colors">{p.name}</h4></Link>
                <div className="text-lg font-bold text-primary tracking-tighter">{formatPrice(p.price)}</div>
                <button
                  onClick={() => addItem(p.id)}
                  aria-label={`Adicionar ${p.name} ao carrinho`}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-primary text-background-dark font-bold text-xs tracking-widest uppercase py-3 hover:bg-amber-300 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background-dark"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Adicionar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
