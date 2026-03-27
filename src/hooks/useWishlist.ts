import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { WishlistItem, Product } from '../types/database';

export function useWishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<(WishlistItem & { product: Product })[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('wishlist')
      .select('*, product:products(*)')
      .eq('user_id', user.id);
    setItems((data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const toggleWishlist = async (productId: string) => {
    if (!user) return;
    const existing = items.find(i => i.product_id === productId);
    if (existing) {
      await supabase.from('wishlist').delete().eq('id', existing.id);
    } else {
      await supabase.from('wishlist').insert({ user_id: user.id, product_id: productId });
    }
    await fetchWishlist();
  };

  const isInWishlist = (productId: string) => items.some(i => i.product_id === productId);

  return { items, loading, toggleWishlist, isInWishlist, refresh: fetchWishlist };
}
