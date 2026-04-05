-- Adicionar checkin_token para acesso de operadores
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS checkin_token UUID DEFAULT gen_random_uuid();

-- Garantir que eventos existentes tenham um token
UPDATE public.events SET checkin_token = gen_random_uuid() WHERE checkin_token IS NULL;

-- Atualizar RPC checkin_ticket para permitir validação via token
CREATE OR REPLACE FUNCTION public.checkin_ticket(
  p_ticket_id UUID,
  p_checker_id UUID,
  p_token UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_event RECORD;
  v_profile RECORD;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- 1. Buscar Ticket e Evento associado
  SELECT t.*, e.organizer_id, e.checkin_token, e.title as event_title
  INTO v_ticket
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  WHERE t.id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'TICKET_NOT_FOUND');
  END IF;

  -- 2. Verificar Autorização
  -- Autorizado se:
  -- a) O checker é o organizador
  -- b) O checker é um admin
  -- c) O p_token fornecido coincide com o checkin_token do evento
  
  IF p_checker_id IS NOT NULL THEN
    SELECT role INTO v_profile FROM profiles WHERE id = p_checker_id;
    IF v_ticket.organizer_id = p_checker_id OR v_profile.role = 'admin' THEN
      v_is_authorized := TRUE;
    END IF;
  END IF;

  IF p_token IS NOT NULL AND v_ticket.checkin_token = p_token THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'message', 'UNAUTHORIZED_CHECKIN');
  END IF;

  -- 3. Verificar Status do Ticket
  IF v_ticket.status = 'used' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'TICKET_ALREADY_USED',
      'checked_in_at', v_ticket.checked_in_at,
      'buyer_name', v_ticket.buyer_name
    );
  END IF;

  IF v_ticket.status <> 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'TICKET_NOT_PAID');
  END IF;

  -- 4. Executar Check-in
  UPDATE tickets
  SET status = 'used',
      checked_in_at = now(),
      checked_in_by = p_checker_id
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'CHECKIN_SUCCESS',
    'buyer_name', v_ticket.buyer_name,
    'buyer_email', v_ticket.buyer_email,
    'event_title', v_ticket.event_title
  );
END;
$$;
