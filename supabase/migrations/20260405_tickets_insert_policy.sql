-- ================================================
-- MIGRATION: Permissão de Emissão de Tickets (UAT)
-- Perfection Airsoft — MVP de Eventos
-- Data: 2026-04-05
-- ================================================

-- 1. Política de INSERT para o Organizador (necessária para a ferramenta UAT)
-- Permite que o dono do evento crie tickets (simule vendas e testes)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'tickets_organizer_insert') THEN
    CREATE POLICY "tickets_organizer_insert" ON public.tickets
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.events
          WHERE events.id = tickets.event_id
          AND events.organizer_id = auth.uid()
        )
      );
  END IF;
END; $$;

-- 2. Política de UPDATE para o Organizador (ajustar status se necessário)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'tickets_organizer_all_update') THEN
    CREATE POLICY "tickets_organizer_all_update" ON public.tickets
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.events
          WHERE events.id = tickets.event_id
          AND events.organizer_id = auth.uid()
        )
      );
  END IF;
END; $$;

-- 3. Garantir que as estatísticas sejam atualizadas ao inserir tickets manuais
-- (O trigger on_ticket_sold_count já deve lidar com isso se o status for 'confirmed')
