import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
}

// Domínios conhecidos para marcas de airsoft
const KNOWN_DOMAINS: Record<string, string> = {
  'g&g armament': 'guay2.com',
  'g&g': 'guay2.com',
  'tokyo marui': 'tokyo-marui.co.jp',
  'marui': 'tokyo-marui.co.jp',
  'vfc': 'vfc-vr16.com',
  'krytac': 'krytac.com',
  'ares': 'aresairsoft.com',
  'cyma': 'cyma-airsoft.com',
  'rossi': 'rossiairsoft.com.br',
  'cybergun': 'cybergun.com',
  'kwa': 'kwausa.com',
  'lancer tactical': 'lancertactical.com',
  'lancer': 'lancertactical.com',
  'classic army': 'classicarmyusa.com',
  'we': 'we-airsoft.com',
  'we airsoft': 'we-airsoft.com',
  'aga': 'aga-airsoft.com',
  'umarex': 'umarex.com',
  'beretta': 'beretta.com',
  'colt': 'colt.com',
  'glock': 'glock.com',
  'fn herstal': 'fnherstal.com',
  'fn': 'fnherstal.com',
  'heckler & koch': 'heckler-koch.com',
  'h&k': 'heckler-koch.com',
  'asg': 'asgairsoft.com',
  'ics': 'icsairsoft.com',
  'lonex': 'lonexbbs.com',
  'marushin': 'marushin-guns.com',
};

/** Retorna a URL do logo via Clearbit */
export function getBrandLogoUrl(brandName: string): string {
  const key = brandName.toLowerCase().trim();
  const domain = KNOWN_DOMAINS[key]
    ?? `${key.replace(/[^a-z0-9]/g, '')}.com`;
  return `https://logo.clearbit.com/${domain}`;
}

/** Garante que a marca existe no banco. Se não existir, cria com logo do Clearbit. */
export async function ensureBrandExists(brandName: string): Promise<Brand | null> {
  if (!brandName?.trim()) return null;
  const name = brandName.trim();

  // Verifica se já existe (case-insensitive)
  const { data: existing } = await supabase
    .from('brands')
    .select('*')
    .ilike('name', name)
    .maybeSingle();

  if (existing) return existing as Brand;

  // Cria nova marca
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const logo_url = getBrandLogoUrl(name);

  const { data: created } = await supabase
    .from('brands')
    .insert([{ name, slug, logo_url }])
    .select('*')
    .single();

  return (created as Brand) ?? null;
}

/** Garante que a categoria existe. Se não existir, cria. Retorna o ID. */
export async function ensureCategoryExists(categoryName: string): Promise<string | null> {
  if (!categoryName?.trim()) return null;
  const label = categoryName.trim();

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .ilike('label', label)
    .maybeSingle();

  if (existing) return existing.id;

  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const { data: created } = await supabase
    .from('categories')
    .insert([{ label, slug }])
    .select('id')
    .single();

  return created?.id ?? null;
}

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('brands')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setBrands((data as Brand[]) || []);
        setLoading(false);
      });
  }, []);

  return { brands, loading };
}
