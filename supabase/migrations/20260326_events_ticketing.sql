-- ================================================
-- MIGRATION: Módulo de Ticketing Tático
-- Perfection Airsoft — Eventos & Missões
-- ================================================

-- Tabela de Eventos
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  ticket_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 6.00,
  capacity INTEGER NOT NULL DEFAULT 50,
  sold_count INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de Tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name TEXT,
  buyer_email TEXT,
  qr_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'used', 'cancelled')),
  payment_id TEXT,
  price_paid NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer ON public.tickets(buyer_id);

-- RLS: Habilitar
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Events
-- Leitura pública de eventos publicados
CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (status = 'published');

-- Organizador lê/edita seus próprios eventos
CREATE POLICY "events_organizer_all" ON public.events
  FOR ALL USING (auth.uid() = organizer_id);

-- Admin acesso total
CREATE POLICY "events_admin_all" ON public.events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies: Tickets
-- Comprador vê seus próprios tickets
CREATE POLICY "tickets_buyer_read" ON public.tickets
  FOR SELECT USING (auth.uid() = buyer_id);

-- Comprador pode criar ticket
CREATE POLICY "tickets_buyer_insert" ON public.tickets
  FOR INSERT WITH CHECK (true);

-- Organizador vê tickets dos seus eventos
CREATE POLICY "tickets_organizer_read" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tickets.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Admin acesso total
CREATE POLICY "tickets_admin_all" ON public.tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger: Atualizar sold_count automático
CREATE OR REPLACE FUNCTION increment_sold_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE public.events
    SET sold_count = sold_count + 1
    WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_ticket_confirmed ON public.tickets;
CREATE TRIGGER on_ticket_confirmed
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION increment_sold_count();
