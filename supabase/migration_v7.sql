-- ============================================================
-- MIGRAÇÃO v7 - Cantinho Glam
-- Execute no Supabase: SQL Editor > New Query > Run
-- ============================================================

-- Adicionar número e complemento na tabela de clientes
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS number     TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT;
