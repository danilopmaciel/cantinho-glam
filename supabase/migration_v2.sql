-- ============================================================
-- MIGRAÇÃO v2 - Cantinho Glam
-- Execute no Supabase: SQL Editor > New Query > Run
-- ============================================================

-- 1. Adicionar coluna quantidade nos produtos
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0 NOT NULL;

-- 2. Criar tabela de vendas
CREATE TABLE IF NOT EXISTS public.sales (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id       UUID REFERENCES public.products(id) ON DELETE SET NULL,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quantity_sold    INTEGER NOT NULL CHECK (quantity_sold > 0),
  unit_price       DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount  DECIMAL(10,2) DEFAULT 0,
  total_price      DECIMAL(10,2) NOT NULL,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS na tabela de vendas
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem VER todas as vendas
CREATE POLICY "Autenticados podem ver vendas"
  ON public.sales FOR SELECT
  TO authenticated
  USING (true);

-- Todos os usuários autenticados podem INSERIR vendas (com seu user_id)
CREATE POLICY "Autenticados podem registrar vendas"
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Somente o usuário que fez a venda pode EDITAR
CREATE POLICY "Usuarios podem editar suas vendas"
  ON public.sales FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Somente o usuário que fez a venda pode DELETAR
CREATE POLICY "Usuarios podem deletar suas vendas"
  ON public.sales FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
