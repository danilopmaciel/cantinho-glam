-- ============================================================
-- MIGRAÇÃO v5 - Cantinho Glam
-- Execute no Supabase: SQL Editor > New Query > Run
-- ============================================================

-- 1. Criar tabela de clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  cpf_cnpj   TEXT,
  address    TEXT,
  cep        TEXT,
  maps_link  TEXT,
  notes      TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver clientes"
  ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados podem criar clientes"
  ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Autenticados podem editar clientes"
  ON public.customers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Autenticados podem deletar clientes"
  ON public.customers FOR DELETE TO authenticated USING (true);

-- 2. Adicionar colunas de pedido e cliente na tabela sales
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS order_id      UUID,
  ADD COLUMN IF NOT EXISTS customer_name  TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_id    UUID REFERENCES public.customers(id) ON DELETE SET NULL;
