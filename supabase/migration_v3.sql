-- ============================================================
-- MIGRAÇÃO v3 - Histórico de ajustes de estoque
-- Execute no Supabase: SQL Editor > New Query > Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id   UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  adjustment   INTEGER NOT NULL,  -- positivo = entrada, negativo = saída/correção
  reason       TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver ajustes"
  ON public.stock_adjustments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Autenticados podem registrar ajustes"
  ON public.stock_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
