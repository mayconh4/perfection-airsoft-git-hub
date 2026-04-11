-- ================================================
-- MIGRATION: Expand Orders Status Constraint
-- Data: 2026-04-11
-- Motivo: Adicionar 'pago' ao CHECK de status da tabela orders
--         para suportar confirmação de pagamento via Asaas webhook.
-- ================================================

-- Remover constraint antiga e adicionar nova com 'pago' incluído
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pendente', 'pago', 'processando', 'em_transito', 'entregue', 'cancelado'));
