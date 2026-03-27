-- ============================================
-- 1. CLEANUP & RESET (Optional)
-- ============================================
DROP TABLE IF EXISTS public.raffle_tickets;
DROP TABLE IF EXISTS public.raffles CASCADE;

-- 2. RAFFLES
CREATE TABLE public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  ticket_price NUMERIC(10,2) NOT NULL,
  total_tickets INT NOT NULL,
  sold_tickets INT DEFAULT 0,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'finalizado', 'cancelado')),
  draw_date TIMESTAMPTZ,
  rules TEXT,
  images TEXT[] DEFAULT '{}',
  rules_title TEXT DEFAULT 'RULES & ENGAGEMENT',
  logistics_title TEXT DEFAULT 'LOGISTICS',
  logistics_description TEXT DEFAULT 'Envio segurado para todo o Brasil via transportadora tática especializada.',
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TICKETS
CREATE TABLE public.raffle_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ticket_number INT NOT NULL,
  purchased_at TIMESTAMPTZ,
  payment_status TEXT DEFAULT 'pendente' CHECK (payment_status IN ('pendente', 'pago', 'cancelado')),
  payment_id TEXT, -- ID do Mercado Pago
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(raffle_id, ticket_number)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Raffles are viewable by everyone" ON public.raffles FOR SELECT USING (true);
CREATE POLICY "Users can create raffles" ON public.raffles FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own raffles" ON public.raffles FOR UPDATE USING (auth.uid() = creator_id OR (auth.jwt() ->> 'email') = 'admin@perfectionairsoft.com.br');
CREATE POLICY "Admin can delete any raffle" ON public.raffles FOR DELETE USING ((auth.jwt() ->> 'email') = 'admin@perfectionairsoft.com.br');

ALTER TABLE public.raffle_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tickets are viewable by everyone" ON public.raffle_tickets FOR SELECT USING (true);
CREATE POLICY "Users can buy tickets" ON public.raffle_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own tickets" ON public.raffle_tickets FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_raffles_creator ON public.raffles(creator_id);
CREATE INDEX idx_raffle_tickets_raffle ON public.raffle_tickets(raffle_id);
CREATE INDEX idx_raffle_tickets_user ON public.raffle_tickets(user_id);

-- ============================================
-- STORAGE CONFIGURATION (RAFFLES BUCKET)
-- ============================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('raffles', 'raffles', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public access to images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'raffles' );

-- Policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'raffles'
);

-- Policy: Allow admins/owners to delete
CREATE POLICY "Admins can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'raffles'
);
