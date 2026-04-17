-- ============================================================
-- MIGRAÇÃO v8 - Cantinho Glam
-- Execute no Supabase: SQL Editor > New Query > Run
-- ============================================================

-- 1. Função para decrementar estoque atomicamente (evita corrida)
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_amount INTEGER)
RETURNS void AS $$
  UPDATE public.products
  SET quantity = GREATEST(0, quantity - p_amount)
  WHERE id = p_product_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Função para incrementar estoque atomicamente (usado ao cancelar venda)
CREATE OR REPLACE FUNCTION increment_stock(p_product_id UUID, p_amount INTEGER)
RETURNS void AS $$
  UPDATE public.products
  SET quantity = quantity + p_amount
  WHERE id = p_product_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Coluna cancelled nas vendas
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT FALSE NOT NULL;
