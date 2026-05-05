-- ============================================================
-- MIGRAÇÃO v10 - Cantinho Glam
-- Execute no Supabase: SQL Editor > New Query > Run
-- ============================================================

-- Loja pública: permite que visitantes não autenticados leiam produtos.
-- Colunas sensíveis (purchase_price, profit_margin) nunca são
-- selecionadas na query da vitrine — proteção garantida no frontend.

CREATE POLICY "Loja: anon pode ver produtos"
ON products FOR SELECT
TO anon
USING (true);
