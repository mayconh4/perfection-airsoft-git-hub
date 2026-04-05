-- ================================================
-- MIGRATION: Módulo de Ticketing de Eventos + Role Organizador
-- Perfection Airsoft — MVP de Eventos
-- Data: 2026-04-05
-- VERSÃO CORRIGIDA: cria tabelas do zero (não dependem de migrations anteriores)
-- ================================================

-- ------------------------------------------------
-- 1. TABELA events
-- ------------------------------------------------

CREATE TABLE IF NOT EXISTS public.events (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  description   TEXT,
  location      TEXT,
  map_id        UUID,       -- FK para maps (adicionada depois se maps existir)
  event_date    TIMESTAMPTZ NOT NULL,
  ticket_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_fee  NUMERIC(10,2) NOT NULL DEFAULT 6.00,
  capacity      INT         NOT NULL DEFAULT 50,
  sold_count    INT         NOT NULL DEFAULT 0,
  image_url     TEXT,
  banner_url    TEXT,
  tags          TEXT[]      DEFAULT '{}',
  status        TEXT        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published', 'closed')),
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------
-- 2. TABELA tickets (ingressos de eventos)
-- ------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tickets (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  order_id      UUID,       -- FK para orders (sem constraint para evitar erros se orders não existir ainda)
  buyer_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name    TEXT,
  buyer_email   TEXT,
  buyer_cpf     TEXT,
  buyer_phone   TEXT,
  quantity      INT         NOT NULL DEFAULT 1,
  price_paid    NUMERIC(10,2),
  payment_id    TEXT,
  qr_code       TEXT        UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  qr_uuid       UUID        DEFAULT gen_random_uuid() UNIQUE,
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'used', 'cancelled')),
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------
-- 3. ÍNDICES
-- ------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_events_status      ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date  ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_organizer   ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event      ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer      ON public.tickets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_uuid    ON public.tickets(qr_uuid);
CREATE INDEX IF NOT EXISTS idx_tickets_order      ON public.tickets(order_id);

-- ------------------------------------------------
-- 4. RLS — events
-- ------------------------------------------------

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Leitura pública de eventos publicados
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_public_read') THEN
    CREATE POLICY "events_public_read" ON public.events
      FOR SELECT USING (status = 'published');
  END IF;
END; $$;

-- Organizador acessa seus próprios eventos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_organizer_all') THEN
    CREATE POLICY "events_organizer_all" ON public.events
      FOR ALL USING (auth.uid() = organizer_id);
  END IF;
END; $$;

-- Admin acessa tudo
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_admin_all') THEN
    CREATE POLICY "events_admin_all" ON public.events
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END; $$;

-- Service role (Edge Functions)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_service_role') THEN
    CREATE POLICY "events_service_role" ON public.events
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END; $$;

-- ------------------------------------------------
-- 5. RLS — tickets
-- ------------------------------------------------

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Comprador vê seus próprios tickets
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'tickets_buyer_read') THEN
    CREATE POLICY "tickets_buyer_read" ON public.tickets
      FOR SELECT USING (auth.uid() = buyer_id);
  END IF;
END; $$;

-- Organizador vê tickets dos seus eventos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'tickets_organizer_read') THEN
    CREATE POLICY "tickets_organizer_read" ON public.tickets
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.events
          WHERE events.id = tickets.event_id
          AND events.organizer_id = auth.uid()
        )
      );
  END IF;
END; $$;

-- Organizador pode marcar check-in (update)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'tickets_organizer_checkin') THEN
    CREATE POLICY "tickets_organizer_checkin" ON public.tickets
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.events
          WHERE events.id = tickets.event_id
          AND events.organizer_id = auth.uid()
        )
      );
  END IF;
END; $$;

-- Admin acessa tudo
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'tickets_admin_all') THEN
    CREATE POLICY "tickets_admin_all" ON public.tickets
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END; $$;

-- Service role (Edge Functions / webhooks)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'tickets_service_role_all') THEN
    CREATE POLICY "tickets_service_role_all" ON public.tickets
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END; $$;

-- ------------------------------------------------
-- 6. EXPANDIR profiles: adicionar role 'organizer'
-- ------------------------------------------------

-- Remover constraint antiga (se existir)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END; $$;

-- Nova constraint com 'organizer'
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'organizer'));

-- Colunas para solicitação de upgrade de role
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_request TEXT
    CHECK (role_request IN ('organizer', NULL));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_request_reason TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_request_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ------------------------------------------------
-- 7. TRIGGER: incrementar sold_count automaticamente
-- ------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_ticket_sold_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando ticket vai para 'confirmed': incrementa
  IF (NEW.status = 'confirmed') AND (OLD IS NULL OR OLD.status <> 'confirmed') THEN
    UPDATE public.events
      SET sold_count = sold_count + COALESCE(NEW.quantity, 1)
      WHERE id = NEW.event_id;
  END IF;

  -- Quando ticket vai de 'confirmed' para 'cancelled': decrementa
  IF (OLD IS NOT NULL) AND (OLD.status = 'confirmed') AND (NEW.status = 'cancelled') THEN
    UPDATE public.events
      SET sold_count = GREATEST(0, sold_count - COALESCE(OLD.quantity, 1))
      WHERE id = OLD.event_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ticket_sold_count ON public.tickets;
CREATE TRIGGER on_ticket_sold_count
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_sold_count();

-- ------------------------------------------------
-- 8. FUNÇÃO: criar tickets após pagamento confirmado
--    Usada pelo webhook Asaas
-- ------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_event_ticket(
  p_event_id    UUID,
  p_order_id    UUID,
  p_buyer_id    UUID,
  p_buyer_name  TEXT,
  p_buyer_email TEXT,
  p_buyer_cpf   TEXT,
  p_buyer_phone TEXT,
  p_quantity    INT,
  p_price_paid  NUMERIC,
  p_payment_id  TEXT
)
RETURNS SETOF public.tickets AS $$
DECLARE
  v_ticket public.tickets;
  i INT;
BEGIN
  FOR i IN 1..p_quantity LOOP
    INSERT INTO public.tickets (
      event_id, order_id, buyer_id,
      buyer_name, buyer_email, buyer_cpf, buyer_phone,
      quantity, price_paid, payment_id,
      status, qr_uuid
    ) VALUES (
      p_event_id, p_order_id, p_buyer_id,
      p_buyer_name, p_buyer_email, p_buyer_cpf, p_buyer_phone,
      1, p_price_paid, p_payment_id,
      'confirmed', gen_random_uuid()
    )
    RETURNING * INTO v_ticket;
    RETURN NEXT v_ticket;
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------
-- 9. FUNÇÃO: validar QR Code no check-in
-- ------------------------------------------------

CREATE OR REPLACE FUNCTION public.checkin_ticket(
  p_qr_uuid    UUID,
  p_checker_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_event  public.events%ROWTYPE;
BEGIN
  SELECT * INTO v_ticket FROM public.tickets WHERE qr_uuid = p_qr_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'TICKET_NOT_FOUND');
  END IF;

  IF v_ticket.status = 'used' THEN
    RETURN json_build_object('success', false, 'reason', 'ALREADY_USED', 'checked_in_at', v_ticket.checked_in_at);
  END IF;

  IF v_ticket.status <> 'confirmed' THEN
    RETURN json_build_object('success', false, 'reason', 'NOT_PAID', 'status', v_ticket.status);
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = v_ticket.event_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'EVENT_NOT_FOUND');
  END IF;

  IF v_event.organizer_id <> p_checker_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = p_checker_id AND role = 'admin'
    ) THEN
      RETURN json_build_object('success', false, 'reason', 'NOT_AUTHORIZED');
    END IF;
  END IF;

  UPDATE public.tickets
    SET status = 'used', checked_in_at = NOW(), checked_in_by = p_checker_id
    WHERE id = v_ticket.id;

  RETURN json_build_object(
    'success',     true,
    'ticket_id',   v_ticket.id,
    'buyer_name',  v_ticket.buyer_name,
    'buyer_email', v_ticket.buyer_email,
    'event_title', v_event.title,
    'event_date',  v_event.event_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------
-- VERIFICAÇÃO FINAL
-- ------------------------------------------------

DO $$
BEGIN
  ASSERT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events'),
    'FALHA: tabela events não foi criada';

  ASSERT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets'),
    'FALHA: tabela tickets não foi criada';

  RAISE NOTICE '✅ Migration 20260405 OK';
  RAISE NOTICE '   → events: criada com sold_count, capacity, status';
  RAISE NOTICE '   → tickets: criada com qr_uuid, checkin, order_id';
  RAISE NOTICE '   → profiles.role: organizer habilitado';
  RAISE NOTICE '   → trigger sold_count: ativo';
  RAISE NOTICE '   → funções create_event_ticket + checkin_ticket: OK';
END;
$$;
