-- ============================================================
-- MIGRAÇÃO v11 - Cantinho Glam
-- Execute no Supabase: SQL Editor > New Query > Run
-- ============================================================

-- Perfis de clientes da loja (vinculados ao auth.users)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT,
  phone        TEXT,
  email        TEXT,
  cep          TEXT,
  address      TEXT,
  neighborhood TEXT,
  city         TEXT DEFAULT 'Bauru',
  state        TEXT DEFAULT 'SP',
  customer_id  UUID REFERENCES customers(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Pedidos realizados via loja (enviados pelo WhatsApp)
CREATE TABLE store_orders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  items      JSONB NOT NULL DEFAULT '[]',
  total      DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_own_select" ON store_orders FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "orders_own_insert" ON store_orders FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Função SECURITY DEFINER para admin ver conflitos de telefone entre perfis e clientes
CREATE OR REPLACE FUNCTION get_phone_conflicts()
RETURNS TABLE (
  profile_id    UUID,
  profile_name  TEXT,
  profile_phone TEXT,
  profile_email TEXT,
  customer_id   UUID,
  customer_name TEXT,
  customer_phone TEXT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id,
    p.name,
    p.phone,
    p.email,
    c.id,
    c.name,
    c.phone
  FROM profiles p
  JOIN customers c ON p.phone = c.phone
  WHERE p.phone IS NOT NULL
    AND p.customer_id IS NULL;
$$;

GRANT EXECUTE ON FUNCTION get_phone_conflicts() TO authenticated;

-- Função para mesclar perfil com cliente existente
CREATE OR REPLACE FUNCTION merge_profile_customer(p_profile_id UUID, p_customer_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_profile_id;

  -- Atualiza cliente com dados do perfil (apenas campos vazios)
  UPDATE customers SET
    name  = COALESCE(NULLIF(name, ''),  v_profile.name),
    phone = COALESCE(NULLIF(phone, ''), v_profile.phone)
  WHERE id = p_customer_id;

  -- Vincula perfil ao cliente
  UPDATE profiles SET customer_id = p_customer_id WHERE id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION merge_profile_customer(UUID, UUID) TO authenticated;
