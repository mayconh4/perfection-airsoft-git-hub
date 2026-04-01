import { useState, useEffect } from 'react';
import { supabase, withRetry } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { Order } from '../types/database';

export function useOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) { setOrders([]); setLoading(false); return; }
      setLoading(true);
      
      const { data } = await withRetry<Order[]>(async () => {
        return await supabase
          .from('orders')
          .select('id, total, status, created_at, items:order_items(id, product_name, product_price, quantity)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
      });
      
      setOrders(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { orders, loading };
}

export function useCreateOrder() {
  const { user } = useAuth();
  const { items: cartItems, clearCart, total, selectedShipping } = useCart();
  const [creating, setCreating] = useState(false);

  const grandTotal = total + (selectedShipping?.price || 0);

  const createOrder = async (customerData: Record<string, string>, shippingAddress: Record<string, string>, userId?: string) => {
    const finalUserId = userId || user?.id;
    if (!finalUserId || cartItems.length === 0) return null;
    setCreating(true);

    // 1. Criar pedido
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: finalUserId,
        total: grandTotal,
        status: 'pendente',
        customer_data: customerData,
        shipping_address: shippingAddress,
      })
      .select()
      .single();

    if (error || !order) { setCreating(false); return null; }

    // 2. Criar itens do pedido
    const orderItems = (cartItems as any[]).map(ci => ({
      order_id: order.id,
      product_id: ci.product_id,
      product_name: ci.product?.name || 'Produto',
      product_price: ci.product?.price || 0,
      quantity: ci.quantity,
      metadata: ci.metadata || null // [FRONTEND SPECIALIST] Persistir tickets
    }));

    await supabase.from('order_items').insert(orderItems);

    // 3. Limpar carrinho
    await clearCart();
    setCreating(false);
    return order as Order;
  };

  return { createOrder, creating };
}
