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
  const { items: cartItems, total, selectedShipping } = useCart();
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
    const orderItems = (cartItems as any[]).map(ci => {
      // Para tickets (produto virtual), product_id é uma string como 'ticket_uuid' — não é UUID válido.
      // Usamos null e preservamos o ID no metadata para rastreamento.
      const isVirtualProduct = ci.metadata?.type === 'ticket' || ci.metadata?.type === 'raffle' ||
        (typeof ci.product_id === 'string' && !ci.product_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
      
      return {
        order_id: order.id,
        product_id: isVirtualProduct ? null : ci.product_id,
        product_name: ci.product?.name || ci.metadata?.event_title || 'Produto',
        product_price: ci.product?.price || ci.metadata?.unit_price || 0,
        quantity: ci.quantity,
        metadata: {
          ...(ci.metadata || {}),
          _virtual_product_id: isVirtualProduct ? ci.product_id : undefined,
          brand: ci.product?.brand || ci.metadata?.type?.toUpperCase()
        }
      };
    });

    await supabase.from('order_items').insert(orderItems);

    // NOTA: clearCart() foi removido daqui.
    // O carrinho é limpo pelo CheckoutPage somente após confirmacao do pagamento,
    // evitando que o checkout fique com carrinho vazio no meio do fluxo PIX.
    setCreating(false);
    return order as Order;
  };

  return { createOrder, creating };
}
