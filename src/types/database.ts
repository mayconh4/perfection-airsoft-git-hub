// Database Types matching Supabase schema

export interface Category {
  id: string;
  slug: string;
  label: string;
  icon: string;
  description: string | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  old_price: number | null;
  image_url: string | null;
  images?: string[] | null;
  badge: string | null;
  category_id: string | null;
  system: string | null;
  condition: 'novo' | 'usado';
  description: string | null;
  specs: Record<string, string>;
  stock: number;
  category?: Category;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  metadata?: any;
  created_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pendente' | 'pago' | 'processando' | 'em_transito' | 'entregue' | 'cancelado';
  payment_status?: string;
  mercadopago_id?: string;
  payment_type?: string;
  payment_qr_code?: string;
  payment_qr_code_base64?: string;
  total: number;
  shipping_address: Record<string, string>;
  customer_data: Record<string, string>;
  tracking_code?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  metadata?: any;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
}

export const roundTacticalPrice = (price: number, isStrict: boolean = false): number => {
  if (!price) return 0;
  if (isStrict) return price; // [FRONTEND SPECIALIST] Preço exato para rifas
  
  const base = Math.floor(price / 100) * 100; // Centena completa (ex: 1400)
  const remainder = price - base; // Resto (ex: 11)

  if (remainder <= 30) return base + 30;
  if (remainder <= 40) return base + 40;
  if (remainder <= 70) return base + 70;
  if (remainder <= 90) return base + 90;
  return base + 130; // ex: 95 vira 130
};

export const formatPrice = (price: number, isStrict: boolean = false) => {
  const rounded = roundTacticalPrice(price, isStrict);
  return `R$ ${rounded.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

export const statusLabels: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'text-yellow-500' },
  processando: { label: 'Processando', color: 'text-blue-400' },
  em_transito: { label: 'Em Trânsito', color: 'text-primary' },
  entregue: { label: 'Entregue', color: 'text-green-500' },
  pago: { label: 'Pago', color: 'text-green-400' },
  cancelado: { label: 'Cancelado', color: 'text-red-500' },
};
