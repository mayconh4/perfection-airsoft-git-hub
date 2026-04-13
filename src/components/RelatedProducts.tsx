import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/database';
import { formatPrice } from '../types/database';

interface RelatedProductsProps {
  product: Product;
}

const PRODUCT_FIELDS = 'id, name, slug, image_url, price, brand, category_id, system, badge';

/**
 * Detecta o "tipo" do produto pelo nome para sugerir compatíveis.
 */
function detectWeaponFamily(p: Product): {
  isWeapon: boolean;
  isPistol: boolean;
  isRifle: boolean;
  isSniper: boolean;
  isShotgun: boolean;
  needsGas: boolean;
  needsBattery: boolean;
  systemUpper: string;
} {
  const name = (p.name || '').toLowerCase();
  const sys = (p.system || '').toUpperCase();

  const isPistol = /pistol|hi-?capa|glock|m1911|p226|usp|p99|deagle|hicapa/i.test(name);
  const isRifle = /rifle|m4|m16|ak|hk416|scar|aug|g36|sr25|mk\s?\d|carbine|smg|mp5|kriss/i.test(name);
  const isSniper = /sniper|vsr|m24|m40|awp|awm|bolt action|barrett/i.test(name);
  const isShotgun = /shotgun|escopeta|m870|m4 shotgun|spas/i.test(name);

  const isWeapon = isPistol || isRifle || isSniper || isShotgun;

  const needsGas = /gbb|gas|gás|co2|hpa/i.test(sys + ' ' + name);
  const needsBattery = /aeg|elétrica|eletrica|aep/i.test(sys + ' ' + name) && !needsGas;

  return { isWeapon, isPistol, isRifle, isSniper, isShotgun, needsGas, needsBattery, systemUpper: sys };
}

export function RelatedProducts({ product }: RelatedProductsProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const family = useMemo(() => detectWeaponFamily(product), [product]);

  useEffect(() => {
    let cancelled = false;
    const fetchRelated = async () => {
      setLoading(true);
      const collected = new Map<string, Product>();

      // Pega os IDs das categorias por slug
      const accessorySlugs = ['bbs', 'acessorios', 'pecas', 'equipamentos'];
      const { data: cats } = await supabase
        .from('categories')
        .select('id, slug')
        .in('slug', accessorySlugs);
      const catBySlug: Record<string, string> = {};
      (cats || []).forEach((c: any) => { catBySlug[c.slug] = c.id; });

      // Função utilitária para buscar e adicionar
      const addQuery = async (
        builder: any,
        max: number = 4
      ) => {
        const { data } = await builder
          .neq('id', product.id)
          .limit(max);
        (data || []).forEach((it: Product) => {
          if (!collected.has(it.id)) collected.set(it.id, it);
        });
      };

      // 1) Se for arma e a categoria 'bbs' (BBs & Gás) existir → busca BBs/gás
      if (family.isWeapon && catBySlug['bbs']) {
        // BBs sempre úteis
        await addQuery(
          supabase.from('products')
            .select(PRODUCT_FIELDS)
            .eq('category_id', catBySlug['bbs'])
            .ilike('name', '%bb%'),
          3
        );
        // Gás se for GBB/CO2
        if (family.needsGas) {
          await addQuery(
            supabase.from('products')
              .select(PRODUCT_FIELDS)
              .eq('category_id', catBySlug['bbs'])
              .or('name.ilike.%gás%,name.ilike.%gas%,name.ilike.%co2%,name.ilike.%green%'),
            3
          );
        }
      }

      // 2) Magazines / baterias (categoria 'pecas' ou 'acessorios')
      if (family.isWeapon) {
        const accCats = [catBySlug['pecas'], catBySlug['acessorios']].filter(Boolean);
        if (accCats.length) {
          await addQuery(
            supabase.from('products')
              .select(PRODUCT_FIELDS)
              .in('category_id', accCats)
              .or('name.ilike.%magazine%,name.ilike.%mag %,name.ilike.%carregador%'),
            3
          );
          if (family.needsBattery) {
            await addQuery(
              supabase.from('products')
                .select(PRODUCT_FIELDS)
                .in('category_id', accCats)
                .or('name.ilike.%bateria%,name.ilike.%battery%,name.ilike.%lipo%'),
              2
            );
          }
        }
      }

      // 3) Mesma marca (variedade)
      if (product.brand) {
        await addQuery(
          supabase.from('products')
            .select(PRODUCT_FIELDS)
            .eq('brand', product.brand),
          4
        );
      }

      // 4) Mesma categoria (último recurso para preencher)
      if (product.category_id && collected.size < 6) {
        await addQuery(
          supabase.from('products')
            .select(PRODUCT_FIELDS)
            .eq('category_id', product.category_id),
          6 - collected.size
        );
      }

      if (!cancelled) {
        setItems(Array.from(collected.values()).slice(0, 12));
        setLoading(false);
      }
    };

    fetchRelated().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [product.id, product.brand, product.category_id, family]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="mt-8 mb-16">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1 bg-primary/10"></div>
        <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">link</span>
          Itens Compatíveis
        </span>
        <div className="h-px flex-1 bg-primary/10"></div>
      </div>
      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mb-6 italic">
        Quem viu este, levou também <span className="text-primary">↓</span>
      </h2>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44 sm:w-52 animate-pulse">
              <div className="aspect-square bg-white/5 border border-white/5 mb-3"></div>
              <div className="h-3 bg-white/5 w-3/4 mb-2"></div>
              <div className="h-4 bg-primary/10 w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent snap-x">
          {items.map(item => (
            <Link
              key={item.id}
              to={`/produto/${item.slug || item.id}`}
              className="group flex-shrink-0 w-40 sm:w-48 snap-start bg-surface/30 border border-white/5 hover:border-primary/40 transition-all p-3 flex flex-col"
            >
              <div className="aspect-square bg-white p-2 mb-3 border border-primary/10 overflow-hidden flex items-center justify-center">
                <img
                  src={item.image_url || ''}
                  alt={item.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <span className="text-[8px] text-primary uppercase tracking-[0.2em] font-black truncate">
                {item.brand}
              </span>
              <h3 className="text-[11px] font-black uppercase leading-snug text-slate-100 line-clamp-2 mt-0.5 min-h-[2.4em] group-hover:text-primary transition-colors">
                {item.name}
              </h3>
              <p className="text-primary font-black text-sm mt-2 font-mono">
                {formatPrice(item.price)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
