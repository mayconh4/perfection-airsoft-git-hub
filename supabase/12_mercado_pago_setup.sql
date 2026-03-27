-- Adicionar colunas para integração com Mercado Pago na tabela 'orders'
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS mercadopago_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS payment_type TEXT,
ADD COLUMN IF NOT EXISTS payment_qr_code TEXT,
ADD COLUMN IF NOT EXISTS payment_qr_code_base64 TEXT;

-- Criar índice para busca rápida por ID do Mercado Pago
CREATE INDEX IF NOT EXISTS idx_orders_mercadopago_id ON orders(mercadopago_id);

-- Comentário para o usuário: Execute este SQL no editor de SQL do Supabase Dashboard.
