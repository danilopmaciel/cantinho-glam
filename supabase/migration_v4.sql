-- ============================================================
-- MIGRAÇÃO v4 - Cantinho Glam
-- Execute no Supabase: SQL Editor > New Query > Run
-- ============================================================

-- Adicionar coluna nome do produto
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name TEXT;
