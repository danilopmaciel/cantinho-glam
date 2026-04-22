-- ============================================================
-- MIGRAÇÃO v9 - Cantinho Glam
-- Execute no Supabase: SQL Editor > New Query > Run
-- ============================================================

-- Função para cancelar pedido por order_id (qualquer usuário autenticado)
-- SECURITY DEFINER garante que o RLS não bloqueie o cancelamento entre usuários
CREATE OR REPLACE FUNCTION cancel_order(p_order_id UUID)
RETURNS void AS $$
  UPDATE public.sales
  SET cancelled = true
  WHERE order_id = p_order_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Função para cancelar venda avulsa (sem order_id)
CREATE OR REPLACE FUNCTION cancel_sale(p_sale_id UUID)
RETURNS void AS $$
  UPDATE public.sales
  SET cancelled = true
  WHERE id = p_sale_id;
$$ LANGUAGE sql SECURITY DEFINER;
