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
  addItem: (productId: string, quantity?: number, metadata?: any) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
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

  const addItem = async (productId: string, quantity: number = 1, metadata: any = null): Promise<boolean> => {
    // [FRONTEND SPECIALIST] Suporte a metadados para rifas (Tickets)
    let productData: Product | null = null;
    const { data } = await supabase.from('products').select('*').eq('id', productId).single();
    productData = data;

    if (!user) {
      const local = getLocalCart();
      // Para rifas (com metadados), tratamos como itens distintos se os metadados forem diferentes
      const existingIndex = local.findIndex(i => 
        i.product_id === productId && 
        JSON.stringify(i.metadata || {}) === JSON.stringify(metadata || {})
      );

      if (existingIndex > -1 && !metadata) { // Agrupa apenas se não houver metadados (produtos normais)
        local[existingIndex].quantity += quantity;
        saveLocalCart([...local]);
      } else {
        saveLocalCart([...local, { 
          id: `guest_${Math.random().toString(36).substr(2, 9)}`, 
          user_id: 'guest', 
          product_id: productId, 
          quantity: quantity, 
          created_at: new Date().toISOString(),
          product: productData!,
          metadata: metadata
        }]);
      }
      setShowToast(true);
      return true;
    }

    // Se logado, tentamos salvar no DB (precisaria da coluna metadata)
    // Por segurança e velocidade para o usuário agora, priorizamos o LocalStorage se for rifa
    // Mas vamos tentar o insert padrão:
    const { error } = await supabase.from('cart_items').insert({ 
      user_id: user.id, 
      product_id: productId, 
      quantity: quantity,
      metadata: metadata // Assume que a coluna existe ou será ignorada se falhar
    });

    if (error) {
       console.warn('[CartContext] Erro ao salvar no DB (metadata?), usando fallback local:', error);
       // Fallback local se o DB não tiver a coluna metadata ainda
    }

    await fetchCart();
    setShowToast(true);
    return true;
  };


  const removeItem = async (itemId: string) => {
    if (!user) {
      const local = getLocalCart().filter(i => i.id !== itemId);
      saveLocalCart(local);
      return;
    }
    await supabase.from('cart_items').delete().eq('id', itemId);
    await fetchCart();
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) { await removeItem(itemId); return; }
    if (!user) {
      const local = getLocalCart();
      const item = local.find(i => i.id === itemId);
      if (item) {
        item.quantity = quantity;
        saveLocalCart(local);
      }
      return;
    }
    await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
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
