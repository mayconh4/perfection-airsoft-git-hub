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
    const { data: cartData, error } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('[CartContext] Error fetching cart:', error);
      setLoading(false);
      return;
    }

    // Pós-processamento: preencher dados de rifas e tickets de eventos
    const processedItems = await Promise.all((cartData || []).map(async (item: any) => {
      // Rifa (DROP)
      if (!item.product && item.metadata?.type === 'raffle') {
        const { data: raffleData } = await supabase
          .from('raffles')
          .select('*')
          .eq('id', item.product_id)
          .single();

        if (raffleData) {
          return {
            ...item,
            product: {
              id: raffleData.id,
              name: raffleData.title,
              brand: 'DROP',
              price: raffleData.ticket_price,
              image_url: raffleData.image_url,
              stock: 1
            }
          };
        }
      }

      // Ingresso de evento (TICKET) - product_id pode ser null (produto virtual)
      if (item.metadata?.type === 'ticket') {
        const virtualId = item.metadata._virtual_id || item.product_id || item.metadata.event_id;
        // Busca imagem do evento se não veio no metadata
        let eventImageUrl: string | null = item.metadata.image_url || null;
        if (!eventImageUrl && item.metadata.event_id) {
          const { data: eventData } = await supabase
            .from('events')
            .select('image_url, images')
            .eq('id', item.metadata.event_id)
            .single();
          eventImageUrl = eventData?.image_url || eventData?.images?.[0] || null;
        }
        return {
          ...item,
          product_id: virtualId || item.product_id,
          product: {
            id: virtualId,
            name: item.metadata.event_title || 'Ingresso de Evento',
            brand: 'TICKET',
            price: item.metadata.unit_price || 0,
            image_url: eventImageUrl,
            stock: 1,
            event_id: item.metadata.event_id,
            event_date: item.metadata.event_date,
            event_location: item.metadata.event_location,
          }
        };
      }

      return item;
    }));

    setItems(processedItems);
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
    let productData: any = null;

    // Ingresso de evento (TICKET) — produto virtual, não existe na tabela products
    if (metadata?.type === 'ticket') {
      // Busca imagem do evento no banco
      let eventImageUrl: string | null = metadata.image_url || null;
      if (!eventImageUrl && (metadata.event_id || productId)) {
        const { data: eventData } = await supabase
          .from('events')
          .select('image_url, images')
          .eq('id', metadata.event_id || productId)
          .single();
        eventImageUrl = eventData?.image_url || eventData?.images?.[0] || null;
      }
      productData = {
        id: productId,
        name: metadata.event_title || 'Ingresso de Evento',
        brand: 'TICKET',
        price: metadata.unit_price || 0,
        image_url: eventImageUrl,
        stock: 1,
        event_id: metadata.event_id,
        event_date: metadata.event_date,
        event_location: metadata.event_location,
      };
    // Rifa (DROP) — busca na tabela raffles
    } else if (metadata?.type === 'raffle') {
      const { data: raffleData } = await supabase.from('raffles').select('*').eq('id', productId).single();
      if (raffleData) {
        productData = {
          id: raffleData.id,
          name: raffleData.title,
          brand: 'DROP',
          price: raffleData.ticket_price,
          image_url: raffleData.image_url,
          stock: 1
        };
      }
    // Produto físico — busca na tabela products
    } else {
      const { data } = await supabase.from('products').select('*').eq('id', productId).single();
      productData = data;
    }

    if (!user) {
      const local = getLocalCart();
      // Para tickets: deduplica pelo event_id; para outros: pelo productId exato
      const existingIndex = metadata?.type === 'ticket'
        ? local.findIndex(i => i.metadata?.type === 'ticket' && i.metadata?.event_id === metadata.event_id)
        : local.findIndex(i => i.product_id === productId && !i.metadata);

      if (existingIndex > -1) {
        local[existingIndex].quantity += quantity;
        saveLocalCart([...local]);
      } else {
        saveLocalCart([...local, {
          id: 'guest_' + Math.random().toString(36).substr(2, 9),
          user_id: 'guest',
          product_id: productId,
          quantity: quantity,
          created_at: new Date().toISOString(),
          product: productData,
          metadata: metadata
        }]);
      }
      setShowToast(true);
      return true;
    }

    // Para tickets: product_id = null (produto virtual sem FK)
    // Para rifas e físicos: product_id = o ID real
    const dbProductId = metadata?.type === 'ticket' ? null : productId;

    // Deduplicação para tickets: se já existe um ingresso do mesmo evento, incrementa quantidade
    if (metadata?.type === 'ticket' && metadata.event_id) {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .filter('metadata->>type', 'eq', 'ticket')
        .filter('metadata->>event_id', 'eq', metadata.event_id)
        .maybeSingle();

      if (existing) {
        await supabase.from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id);
        await fetchCart();
        setShowToast(true);
        return true;
      }
    }

    const { error } = await supabase.from('cart_items').insert({
      user_id: user.id,
      product_id: dbProductId,
      quantity: quantity,
      metadata: { ...metadata, _virtual_id: productId }
    });

    if (error) {
      console.warn('[CartContext] Erro ao salvar no DB:', error.message);
      // Fallback: usa carrinho local mesmo estando logado
      const local = getLocalCart();
      saveLocalCart([...local, {
        id: 'fallback_' + Math.random().toString(36).substr(2, 9),
        user_id: user.id,
        product_id: productId,
        quantity: quantity,
        created_at: new Date().toISOString(),
        product: productData,
        metadata: metadata
      }]);
      setItems(prev => [...prev, {
        id: 'fallback_' + Math.random().toString(36).substr(2, 9),
        user_id: user.id,
        product_id: productId,
        quantity: quantity,
        created_at: new Date().toISOString(),
        product: productData,
        metadata: metadata
      } as any]);
      setShowToast(true);
      return true;
    }

    await fetchCart();
    setShowToast(true);
    return true;
  };


  const removeItem = async (itemId: string) => {
    // Atualização otimista: remove do estado local imediatamente
    setItems(prev => prev.filter(i => i.id !== itemId));

    if (!user) {
      const local = getLocalCart().filter(i => i.id !== itemId);
      saveLocalCart(local);
      return;
    }
    
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
    
    if (error) {
       console.error('[CartContext] Erro ao remover do banco:', error.message);
       // Reverte em caso de erro (opcional, mas seguro)
       await fetchCart();
    }
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
  const total = items.reduce((sum, i) => {
    // Rifas e tickets usam preço exato (sem arredondamento tático)
    const isStrict = i.product?.brand === 'DROP' || i.product?.brand === 'TICKET';
    const unitPrice = roundTacticalPrice(i.product?.price || 0, isStrict);
    return sum + (unitPrice * i.quantity);
  }, 0);

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
