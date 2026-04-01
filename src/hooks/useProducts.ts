import { useState, useEffect } from 'react';
import { supabase, withRetry } from '../lib/supabase';
import type { Product, Category } from '../types/database';

const PRODUCT_FIELDS = 'id, name, slug, image_url, price, old_price, brand, category_id, images, badge, system, condition, status, color, created_at';

export function useProducts(categorySlug?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      
      const executeQuery = async () => {
        let query = supabase.from('products').select(`${PRODUCT_FIELDS}, category:categories(id, name, slug)`);
        
        if (categorySlug) {
          const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
          if (cat) query = query.eq('category_id', cat.id);
        }
        
        return query.order('created_at', { ascending: false });
      };

      const { data } = await withRetry<Product[]>(executeQuery);
      setProducts(data || []);
      setLoading(false);
    };
    fetch();
  }, [categorySlug]);

  return { products, loading };
}

export function useProduct(idOrSlug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      
      const executeQuery = async () => {
        let query = supabase.from('products').select(`*, category:categories(*)`); // No detalhe mantemos o '*' para specs completas
        if (isUUID) {
          query = query.eq('id', idOrSlug);
        } else {
          query = query.eq('slug', idOrSlug);
        }
        return query.single();
      };

      const { data } = await withRetry<Product>(executeQuery);
      setProduct(data);
      setLoading(false);
    };
    if (idOrSlug) fetch();
  }, [idOrSlug]);

  return { product, loading };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await withRetry<Category[]>(async () => {
        return await supabase.from('categories').select('id, name, slug, label, image_url').order('label');
      });
      setCategories(data || []);
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
      
      const { data } = await withRetry<Product[]>(async () => {
        return await supabase
          .from('products')
          .select(PRODUCT_FIELDS)
          .or(`name.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%`);
      });
      
      setResults(data || []);
      setLoading(false);
    };
    fetch();
  }, [query]);

  return { results, loading };
}
