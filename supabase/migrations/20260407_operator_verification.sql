-- ================================================
-- MIGRATION: Verificação Tática (Soldado Verificado)
-- Perfection Airsoft — Automação de Confiabilidade
-- Data: 2026-04-07
-- ================================================

-- 1. Adicionar coluna de status se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Soldado em observação';

-- 2. Atualizar usuários existentes para o novo status padrão
UPDATE public.profiles 
SET status = 'Soldado em observação' 
WHERE status IS NULL OR status = '';

-- 3. Função para verificar e promover o operador
CREATE OR REPLACE FUNCTION public.check_operator_promotion()
RETURNS TRIGGER AS $$
DECLARE
    v_mission_count INT;
BEGIN
    -- Conta quantos ingressos o comprador (buyer_id) já usou (check-in concluído)
    SELECT COUNT(*) INTO v_mission_count
    FROM public.tickets
    WHERE buyer_id = NEW.buyer_id
      AND status = 'used';

    -- Se atingiu o limite de 3 missões, promove o status
    IF v_mission_count >= 3 THEN
        UPDATE public.profiles
        SET status = 'Soldado verificado'
        WHERE id = NEW.buyer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para disparar a verificação após o check-in (Update do status para 'used')
DROP TRIGGER IF EXISTS on_ticket_used_promotion ON public.tickets;
CREATE TRIGGER on_ticket_used_promotion
    AFTER UPDATE OF status ON public.tickets
    FOR EACH ROW
    WHEN (NEW.status = 'used' AND OLD.status <> 'used')
    EXECUTE FUNCTION public.check_operator_promotion();

-- 5. Comentários para documentação
COMMENT ON COLUMN public.profiles.status IS 'Status de confiabilidade do operador: Soldado em observação ou Soldado verificado';

RAISE NOTICE '✅ Automação de Verificação Tática Concluída';
