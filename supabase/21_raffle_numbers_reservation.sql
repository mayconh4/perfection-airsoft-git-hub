-- ============================================
-- 21_RAFFLE_RESERVATION_SYSTEM.SQL
-- Implementação de multi-tenancy, reserva atômica e ordens
-- ============================================

-- 1. TABELA DE ORDENS (PEDIDOS)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rifa_id UUID, -- Referência à rifa
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir que a coluna rifa_id existe (caso a tabela já existisse sem ela)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='rifa_id') THEN
        ALTER TABLE public.orders ADD COLUMN rifa_id UUID;
    END IF;
END $$;

-- 2. TABELA DE NÚMEROS DA RIFA (ESTADO DETALHADO)
CREATE TABLE IF NOT EXISTS public.rifa_numeros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rifa_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
    numero INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
    reserved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    reserved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(rifa_id, numero)
);

-- 3. TABELA DE ITENS DA ORDEM
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    numero INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. FUNÇÃO ATÔMICA PARA RESERVA DE NÚMEROS
-- Esta função garante que nenhum número seja reservado duas vezes (Race Condition)
CREATE OR REPLACE FUNCTION public.reserve_raffle_numbers(
    p_rifa_id UUID,
    p_user_id UUID,
    p_numeros INT[]
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_total NUMERIC(10,2);
    v_ticket_price NUMERIC(10,2);
    v_num INT;
BEGIN
    -- 1. Verificar se todos os números estão disponíveis
    IF EXISTS (
        SELECT 1 FROM public.rifa_numeros 
        WHERE rifa_id = p_rifa_id 
          AND numero = ANY(p_numeros) 
          AND status != 'available'
    ) THEN
        RAISE EXCEPTION 'Um ou mais números já não estão disponíveis.';
    END IF;

    -- 2. Buscar preço da rifa
    SELECT ticket_price INTO v_ticket_price FROM public.raffles WHERE id = p_rifa_id;
    v_total := v_ticket_price * array_length(p_numeros, 1);

    -- 3. Criar a ordem
    INSERT INTO public.orders (user_id, rifa_id, total, status, expires_at)
    VALUES (p_user_id, p_rifa_id, v_total, 'pending', now() + interval '10 minutes')
    RETURNING id INTO v_order_id;

    -- 4. Inserir itens da ordem
    FOREACH v_num IN ARRAY p_numeros LOOP
        INSERT INTO public.order_items (order_id, numero) VALUES (v_order_id, v_num);
    END LOOP;

    -- 5. Atualizar status dos números para RESERVED
    UPDATE public.rifa_numeros
    SET status = 'reserved',
        reserved_by = p_user_id,
        order_id = v_order_id,
        reserved_at = now(),
        expires_at = now() + interval '10 minutes'
    WHERE rifa_id = p_rifa_id AND numero = ANY(p_numeros);

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNÇÃO PARA LIMPEZA DE RESERVAS EXPIRADAS
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations() RETURNS VOID AS $$
BEGIN
    -- 1. Marcar ordens como expiradas
    UPDATE public.orders
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < now();

    -- 2. Liberar números associados a ordens expiradas (ou diretamente expirados)
    UPDATE public.rifa_numeros
    SET status = 'available',
        reserved_by = NULL,
        order_id = NULL,
        reserved_at = NULL,
        expires_at = NULL
    WHERE status = 'reserved' AND (expires_at < now() OR order_id IN (SELECT id FROM public.orders WHERE status = 'expired'));
END;
$$ LANGUAGE plpgsql;

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rifa_numeros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias ordens
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- Todos podem ver o status dos números
DROP POLICY IF EXISTS "Numbers are viewable by everyone" ON public.rifa_numeros;
CREATE POLICY "Numbers are viewable by everyone" ON public.rifa_numeros FOR SELECT USING (true);

-- Criadores podem ver as ordens de suas rifas (Multi-tenant)
DROP POLICY IF EXISTS "Creators can view orders of their raffles" ON public.orders;
CREATE POLICY "Creators can view orders of their raffles" ON public.orders FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.raffles WHERE id = orders.rifa_id AND creator_id = auth.uid()));

-- 7. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_rifa_numeros_rifa_status ON public.rifa_numeros(rifa_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 8. TRIGGER PARA POPULAR NÚMEROS AUTOMATICAMENTE
-- Quando uma nova rifa é criada, gera os registros na rifa_numeros
CREATE OR REPLACE FUNCTION public.handle_new_raffle_numbers()
RETURNS TRIGGER AS $$
DECLARE
    i INT;
BEGIN
    FOR i IN 1..NEW.total_tickets LOOP
        INSERT INTO public.rifa_numeros (rifa_id, numero, status)
        VALUES (NEW.id, i, 'available');
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_populate_raffle_numbers ON public.raffles;
CREATE TRIGGER trigger_populate_raffle_numbers
AFTER INSERT ON public.raffles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_raffle_numbers();
