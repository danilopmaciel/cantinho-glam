-- ============================================================
-- MIGRAÇÃO v6 - Cantinho Glam
-- Execute no Supabase: SQL Editor > New Query > Run
-- ============================================================

-- Adicionar email do vendedor direto na linha de venda
-- (evita dependência de join com tabela profiles que não tem FK direto)
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS seller_email TEXT;
