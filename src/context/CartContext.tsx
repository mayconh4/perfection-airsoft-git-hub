import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { roundTacticalPrice } from '../types/database';
import type { CartItem, Product } from '../types/database';

interface CartContextType {
  items: (CartItem & { product: Product })[];
  loading: boolean;
  itemCount: number;
  total: number;
  selectedShipping: any | null;
  setSelectedShipping: (option: any) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addItem: (productId: string) => Promise<boolean>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
  showToast: boolean;
  setShowToast: (show: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<(CartItem & { product: Product })[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<any | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Auto-hide toast após 3s
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Carrega carrinho do LocalStorage (Guest)
  const getLocalCart = (): (CartItem & { product: Product })[] => {
    const saved = localStorage.getItem('guest_cart');
    return saved ? JSON.parse(saved) : [];
  };

  const saveLocalCart = (newItems: (CartItem & { product: Product })[]) => {
    localStorage.setItem('guest_cart', JSON.stringify(newItems));
    setItems(newItems);
  };

  const fetchCart = useCallback(async () => {
    if (!user) { 
      setItems(getLocalCart());
      return; 
    }
    
    setLoading(true);
    const { data } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('user_id', user.id);
    setItems((data as any) || []);
    setLoading(false);
  }, [user]);

  // Sincroniza Guest Cart com Supabase no Login
  useEffect(() => {
    const sync = async () => {
      if (user) {
        const local = getLocalCart();
        if (local.length > 0) {
          for (const item of local) {
            // Verifica se já existe no DB
            const { data: existing } = await supabase.from('cart_items')
              .select('id, quantity')
              .eq('user_id', user.id)
              .eq('product_id', item.product_id)
              .single();

            if (existing) {
              await supabase.from('cart_items').update({ quantity: existing.quantity + item.quantity }).eq('id', existing.id);
            } else {
              await supabase.from('cart_items').insert({ user_id: user.id, product_id: item.product_id, quantity: item.quantity });
            }
          }
          localStorage.removeItem('guest_cart');
        }
        await fetchCart();
      } else {
        setItems(getLocalCart());
      }
    };
    sync();
  }, [user, fetchCart]);

  const addItem = async (productId: string): Promise<boolean> => {
    // Busca informações do produto se for guest (necessário para o total/resumo)
    let productData: Product | null = null;
    if (!user) {
      const { data } = await supabase.from('products').select('*').eq('id', productId).single();
      productData = data;
    }

    if (!user) {
      const local = getLocalCart();
      const existing = local.find(i => i.product_id === productId);
      if (existing) {
        existing.quantity += 1;
        saveLocalCart([...local]);
      } else if (productData) {
        saveLocalCart([...local, { 
          id: Math.random().toString(), 
          user_id: 'guest', 
          product_id: productId, 
          quantity: 1, 
          created_at: new Date().toISOString(),
          product: productData 
        }]);
      }
      setShowToast(true);
      return true;
    }

    const existing = items.find(i => i.product_id === productId);
    let error: any = null;
    if (existing) {
      const result = await supabase.from('cart_items').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
      error = result.error;
    } else {
      const result = await supabase.from('cart_items').insert({ user_id: user.id, product_id: productId, quantity: 1 });
      error = result.error;
    }
    
    if (error) {
      console.error('[CartContext] Erro ao adicionar:', error);
      return false;
    }
    await fetchCart();
    setShowToast(true);
    return true;
  };

  const removeItem = async (productId: string) => {
    if (!user) {
      const local = getLocalCart().filter(i => i.product_id !== productId);
      saveLocalCart(local);
      return;
    }
    await supabase.from('cart_items').delete().eq('user_id', user.id).eq('product_id', productId);
    await fetchCart();
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) { await removeItem(productId); return; }
    if (!user) {
      const local = getLocalCart();
      const item = local.find(i => i.product_id === productId);
      if (item) {
        item.quantity = quantity;
        saveLocalCart(local);
      }
      return;
    }
    await supabase.from('cart_items').update({ quantity }).eq('user_id', user.id).eq('product_id', productId);
    await fetchCart();
  };

  const clearCart = async () => {
    if (!user) {
      localStorage.removeItem('guest_cart');
      setItems([]);
      return;
    }
    await supabase.from('cart_items').delete().eq('user_id', user.id);
    setItems([]);
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + roundTacticalPrice(i.product?.price || 0) * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, loading, itemCount, total, selectedShipping, setSelectedShipping,
      isCartOpen, setIsCartOpen, addItem, removeItem, updateQuantity, clearCart,
      refresh: fetchCart, showToast, setShowToast
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
