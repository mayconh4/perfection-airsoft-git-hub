-- Função para incrementar vendidos de forma atômica
CREATE OR REPLACE FUNCTION public.increment_raffle_sold_tickets(rid UUID, count_add INT)
RETURNS void AS $$
BEGIN
  UPDATE public.raffles
  SET sold_tickets = COALESCE(sold_tickets, 0) + count_add
  WHERE id = rid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
