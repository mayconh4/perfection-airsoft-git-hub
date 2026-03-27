import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearch } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../types/database';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const { results, loading } = useSearch(query);
  const { addItem } = useCart();

  return (
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
        <p className="text-slate-500 text-xs uppercase tracking-widest mb-8">
          {loading ? 'Buscando...' : `${results.length} alvo(s) localizado(s) para "${query}"`}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {results.map(p => (
          <div key={p.id} className="bg-surface/50 border border-border-tactical group hover:border-primary transition-all duration-300">
            <Link to={`/produto/${p.id}`}>
              <div className="relative aspect-square overflow-hidden bg-surface">
                <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" src={p.image_url || ''} alt={p.name}/>
              </div>
            </Link>
            <div className="p-4 space-y-2">
              <span className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">{p.brand}</span>
              <Link to={`/produto/${p.id}`}><h4 className="text-sm font-bold tracking-tight text-slate-100 uppercase leading-tight hover:text-primary transition-colors">{p.name}</h4></Link>
              <div className="text-lg font-bold text-primary tracking-tighter">{formatPrice(p.price)}</div>
              <button onClick={() => addItem(p.id)}
                      className="w-full mt-2 flex items-center justify-center gap-2 bg-primary text-background-dark font-bold text-xs tracking-widest uppercase py-3 hover:bg-white transition-colors">
                <span className="material-symbols-outlined text-sm">add</span> Adicionar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
