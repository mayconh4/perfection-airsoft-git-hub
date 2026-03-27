import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types/database';

export function useProducts(categorySlug?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from('products').select('*, category:categories(*)');
      if (categorySlug) {
        const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
        if (cat) query = query.eq('category_id', cat.id);
      }
      const { data } = await query.order('created_at', { ascending: false });
      setProducts((data as Product[]) || []);
      setLoading(false);
    };
    fetch();
  }, [categorySlug]);

  return { products, loading };
}

export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('products').select('*, category:categories(*)').eq('id', id).single();
      setProduct(data as Product | null);
      setLoading(false);
    };
    if (id) fetch();
  }, [id]);

  return { product, loading };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('categories').select('*').order('label');
      setCategories((data as Category[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return { categories, loading };
}

export function useSearch(query: string) {
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!query || query.length < 2) { setResults([]); return; }
      setLoading(true);
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%`);
      setResults((data as Product[]) || []);
      setLoading(false);
    };
    fetch();
  }, [query]);

  return { results, loading };
}
