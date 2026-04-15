-- ============================================================
-- SCHEMA - BELEZA STORE
-- Execute este SQL no Supabase: SQL Editor > New Query > Run
-- ============================================================

-- ─── TABELA DE PERFIS DE USUÁRIOS ──────────────────────────
-- Criada automaticamente ao cadastrar um novo usuário

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      TEXT,
  role       TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver todos os perfis"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem editar seu próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Trigger: cria perfil automático ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── TABELA DE PRODUTOS ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.products (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand          VARCHAR(100) NOT NULL,
  type           VARCHAR(100) NOT NULL,
  color          VARCHAR(100),
  size           VARCHAR(50),
  purchase_price DECIMAL(10,2) NOT NULL CHECK (purchase_price >= 0),
  profit_margin  DECIMAL(10,4) NOT NULL DEFAULT 0,
  sale_price     DECIMAL(10,2) NOT NULL CHECK (sale_price >= 0),
  image_url      TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem VER todos os produtos
CREATE POLICY "Autenticados podem ver produtos"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

-- Todos os usuários autenticados podem INSERIR produtos
CREATE POLICY "Autenticados podem inserir produtos"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Todos os usuários autenticados podem EDITAR qualquer produto
CREATE POLICY "Autenticados podem editar produtos"
  ON public.products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Todos os usuários autenticados podem DELETAR qualquer produto
CREATE POLICY "Autenticados podem deletar produtos"
  ON public.products FOR DELETE
  TO authenticated
  USING (true);

-- Trigger: atualiza updated_at automaticamente ao editar
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── STORAGE: BUCKET DE IMAGENS ─────────────────────────────
-- Execute SEPARADAMENTE se o bucket ainda não existir:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5MB por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política: usuários autenticados podem fazer upload
CREATE POLICY "Autenticados podem enviar imagens"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Política: qualquer pessoa pode ver imagens (para exibição pública)
CREATE POLICY "Público pode ver imagens"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Política: usuários autenticados podem atualizar imagens
CREATE POLICY "Autenticados podem atualizar imagens"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images');

-- Política: usuários autenticados podem excluir imagens
CREATE POLICY "Autenticados podem excluir imagens"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');
