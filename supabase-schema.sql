-- =====================================================
-- Supabase Database Schema Setup (ACTUALIZADO con columnas legibles en user_company_access)
-- =====================================================
-- Instrucciones:
-- 1. Copia todo este script
-- 2. Supabase > SQL Editor
-- 3. Pégalo y ejecútalo
-- =====================================================

-- =====================================================
-- 1. CREATE USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users
    DROP COLUMN IF EXISTS stripe_customer_id,
    DROP COLUMN IF EXISTS stripe_subscription_id,
    DROP COLUMN IF EXISTS subscription_status,
    DROP COLUMN IF EXISTS price_id,
    DROP COLUMN IF EXISTS credits_available,
    DROP COLUMN IF EXISTS current_period_end;

-- =====================================================
-- 2. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- =====================================================
-- 3. UPDATED_AT TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. ENABLE RLS
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
CREATE POLICY "Service role can manage all users" ON public.users
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- =====================================================
-- 6. AUTO PROFILE CREATION
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 7. VERIFICATION SNIPPETS
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        RAISE NOTICE 'SUCCESS: users table created successfully';
    ELSE
        RAISE NOTICE 'ERROR: users table was not created';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' 
        AND c.relname = 'users' 
        AND c.relrowsecurity = true
    ) THEN
        RAISE NOTICE 'SUCCESS: RLS is enabled on users table';
    ELSE
        RAISE NOTICE 'ERROR: RLS is not enabled on users table';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') THEN
        RAISE NOTICE 'SUCCESS: RLS policies created successfully';
        RAISE NOTICE 'Number of policies: %', (SELECT count(*) FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public');
    ELSE
        RAISE NOTICE 'ERROR: No RLS policies found for users table';
    END IF;
END $$;

SELECT 'Schema setup complete!' as status, count(*) as user_count FROM public.users;

-- Estructura, políticas, índices y triggers
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users' 
ORDER BY ordinal_position;

SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' AND schemaname = 'public';

SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users';

-- =====================================================
-- 9. COMPANIES AND USER ACCESS (RLS)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 9.1a role enum (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_role') THEN
    CREATE TYPE public.company_role AS ENUM ('viewer','admin');
  END IF;
END $$;

-- 9.1 companies
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9.2 user_company_access (con columnas legibles)
CREATE TABLE IF NOT EXISTS public.user_company_access (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role public.company_role NOT NULL DEFAULT 'viewer', -- 'viewer' | 'admin'
    -- columnas legibles / denormalizadas:
    user_email TEXT,
    company_slug TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_company_access_pkey PRIMARY KEY (user_id, company_id)
);

-- Si la tabla ya existía, asegura columnas nuevas:
ALTER TABLE public.user_company_access
    ADD COLUMN IF NOT EXISTS user_email   TEXT,
    ADD COLUMN IF NOT EXISTS company_slug TEXT,
    ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Asegura que la columna role use el enum company_role (idempotente)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.user_company_access
      DROP CONSTRAINT IF EXISTS user_company_access_role_chk;
    ALTER TABLE public.user_company_access
      ALTER COLUMN role TYPE public.company_role USING (
        CASE
          WHEN role::text IN ('viewer','admin') THEN role::public.company_role
          WHEN role::text IN ('viewer_demo','viewer_coop','viewer_pinkcheladas') THEN 'viewer'::public.company_role
          ELSE 'viewer'::public.company_role
        END
      );
  EXCEPTION WHEN OTHERS THEN
    -- Si ya es enum o no aplica, ignorar
    PERFORM 1;
  END;
END $$;

-- 9.3 Indexes
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies(slug);
CREATE INDEX IF NOT EXISTS idx_uca_user_id ON public.user_company_access(user_id);
CREATE INDEX IF NOT EXISTS idx_uca_company_id ON public.user_company_access(company_id);
CREATE INDEX IF NOT EXISTS idx_uca_role ON public.user_company_access(role);

-- Índices para columnas legibles:
CREATE INDEX IF NOT EXISTS idx_uca_user_email   ON public.user_company_access(user_email);
CREATE INDEX IF NOT EXISTS idx_uca_company_slug ON public.user_company_access(company_slug);
CREATE INDEX IF NOT EXISTS idx_uca_company_name ON public.user_company_access(company_name);

-- 9.4 Updated-at triggers
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_company_access_updated_at ON public.user_company_access;
CREATE TRIGGER update_user_company_access_updated_at
    BEFORE UPDATE ON public.user_company_access
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9.4.1 Trigger local para sincronizar columnas legibles en INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.sync_uca_denorm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
    v_slug  TEXT;
    v_name  TEXT;
BEGIN
    -- Tomar email del usuario
    SELECT au.email INTO v_email
    FROM auth.users au
    WHERE au.id = NEW.user_id;

    -- Tomar slug y name de la company
    SELECT c.slug, c.name INTO v_slug, v_name
    FROM public.companies c
    WHERE c.id = NEW.company_id;

    NEW.user_email   := v_email;
    NEW.company_slug := v_slug;
    NEW.company_name := v_name;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS uca_sync_denorm_bi_bu ON public.user_company_access;
CREATE TRIGGER uca_sync_denorm_bi_bu
    BEFORE INSERT OR UPDATE OF user_id, company_id
    ON public.user_company_access
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_uca_denorm();

-- 9.4.2 Propagación: si cambia el email en auth.users, actualizar user_company_access
CREATE OR REPLACE FUNCTION public.propagate_user_email_to_uca()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        UPDATE public.user_company_access uca
        SET user_email = NEW.email,
            updated_at = NOW()
        WHERE uca.user_id = NEW.id
          AND uca.user_email IS DISTINCT FROM NEW.email;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.propagate_user_email_to_uca();

-- 9.4.3 Propagación: si cambian slug/name en companies, actualizar user_company_access
CREATE OR REPLACE FUNCTION public.propagate_company_names_to_uca()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (NEW.slug IS DISTINCT FROM OLD.slug) OR (NEW.name IS DISTINCT FROM OLD.name) THEN
        UPDATE public.user_company_access uca
        SET company_slug = NEW.slug,
            company_name = NEW.name,
            updated_at   = NOW()
        WHERE uca.company_id = NEW.id
          AND (uca.company_slug IS DISTINCT FROM NEW.slug
               OR uca.company_name IS DISTINCT FROM NEW.name);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_identity_updated ON public.companies;
CREATE TRIGGER on_company_identity_updated
    AFTER UPDATE OF slug, name ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.propagate_company_names_to_uca();

-- 9.5 Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_company_access ENABLE ROW LEVEL SECURITY;

-- 9.6 Policies
DROP POLICY IF EXISTS "companies_select_by_mapping_or_admin" ON public.companies;
CREATE POLICY "companies_select_by_mapping_or_admin" ON public.companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_company_access uca
            WHERE uca.user_id = auth.uid()
              AND (uca.company_id = companies.id OR uca.role = 'admin'::public.company_role)
        )
    );

DROP POLICY IF EXISTS "companies_service_role_all" ON public.companies;
CREATE POLICY "companies_service_role_all" ON public.companies
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    ) WITH CHECK (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

DROP POLICY IF EXISTS "uca_select_own" ON public.user_company_access;
CREATE POLICY "uca_select_own" ON public.user_company_access
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "uca_service_role_all" ON public.user_company_access;
CREATE POLICY "uca_service_role_all" ON public.user_company_access
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    ) WITH CHECK (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- =====================================================
-- 9.6.1 AUTO-PROVISION RULES (company_auto_rules)
-- =====================================================

-- Tabla de reglas para auto-asignar acceso por email o dominio
CREATE TABLE IF NOT EXISTS public.company_auto_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  matcher_type text NOT NULL CHECK (matcher_type IN ('email','domain')),
  matcher_value text NOT NULL,
  role public.company_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unicidad por matcher (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS company_auto_rules_matcher_unique
ON public.company_auto_rules (matcher_type, (lower(matcher_value)));

-- Trigger de updated_at
DROP TRIGGER IF EXISTS update_company_auto_rules_updated_at ON public.company_auto_rules;
CREATE TRIGGER update_company_auto_rules_updated_at
BEFORE UPDATE ON public.company_auto_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función robusta para auto-asignación al crear auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_created_auto_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
BEGIN
  -- Si la tabla de reglas no existe, no hacemos nada
  IF to_regclass('public.company_auto_rules') IS NULL THEN
    RETURN NEW;
  END IF;

  -- Proteger si no hay email
  IF NEW.email IS NULL OR length(NEW.email) = 0 THEN
    RETURN NEW;
  END IF;

  v_domain := lower(split_part(NEW.email, '@', 2));

  -- Reglas por email exacto
  INSERT INTO public.user_company_access (user_id, company_id, role)
  SELECT NEW.id, car.company_id, car.role
  FROM public.company_auto_rules car
  WHERE car.matcher_type = 'email'
    AND lower(car.matcher_value) = lower(NEW.email)
  ON CONFLICT (user_id, company_id) DO UPDATE
    SET role = EXCLUDED.role,
        updated_at = now();

  -- Reglas por dominio
  IF v_domain IS NOT NULL AND length(v_domain) > 0 THEN
    INSERT INTO public.user_company_access (user_id, company_id, role)
    SELECT NEW.id, car.company_id, car.role
    FROM public.company_auto_rules car
    WHERE car.matcher_type = 'domain'
      AND lower(car.matcher_value) = v_domain
    ON CONFLICT (user_id, company_id) DO UPDATE
      SET role = EXCLUDED.role,
          updated_at = now();
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_auth_user_created_auto_rules error: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_rules ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_rules
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created_auto_rules();

-- 9.7 Seed data: companies
INSERT INTO public.companies (slug, name, logo_url)
VALUES 
    ('demo', 'DEMO', 'https://i.postimg.cc/W32PBvfT/Monte-Carlo-13.png'),
    ('coop', 'COOP', 'https://coopspirits.com/public/assets/og_coop_logo.jpg'),
    ('pinkcheladas', 'PINKCHELADAS', 'https://scontent.fqro3-1.fna.fbcdn.net/v/t39.30808-6/398453450_738447401719127_8797079877979096996_n.png')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    logo_url = EXCLUDED.logo_url,
    updated_at = NOW();

-- 9.8 Seed data: user access (los triggers rellenarán columnas legibles)
INSERT INTO public.user_company_access (user_id, company_id, role)
SELECT au.id, c.id, 'admin'::public.company_role
FROM auth.users au
JOIN public.companies c ON TRUE
WHERE au.email = 'eduardo@aboutblanc.ai'
ON CONFLICT (user_id, company_id) DO UPDATE
SET role = EXCLUDED.role, updated_at = NOW();

INSERT INTO public.user_company_access (user_id, company_id, role)
SELECT au.id, c.id, 'viewer'::public.company_role
FROM auth.users au
JOIN public.companies c ON c.slug = 'demo'
WHERE au.email = 'l.eduardo.mal@gmail.com'
ON CONFLICT (user_id, company_id) DO UPDATE
SET role = EXCLUDED.role, updated_at = NOW();

INSERT INTO public.user_company_access (user_id, company_id, role)
SELECT au.id, c.id, 'viewer'::public.company_role
FROM auth.users au
JOIN public.companies c ON c.slug = 'coop'
WHERE au.email = 'l.eduardo.mal@gmail.com'
ON CONFLICT (user_id, company_id) DO UPDATE
SET role = EXCLUDED.role, updated_at = NOW();

INSERT INTO public.user_company_access (user_id, company_id, role)
SELECT au.id, c.id, 'viewer'::public.company_role
FROM auth.users au
JOIN public.companies c ON c.slug = 'pinkcheladas'
WHERE au.email = 'l.eduardo.mal@gmail.com'
ON CONFLICT (user_id, company_id) DO UPDATE
SET role = EXCLUDED.role, updated_at = NOW();

UPDATE public.user_company_access
SET role = 'viewer'::public.company_role
WHERE role::text IN ('viewer_demo','viewer_coop','viewer_pinkcheladas');

-- 9.8.1 Backfill columnas legibles (por si ya había datos)
UPDATE public.user_company_access uca
SET user_email   = au.email,
    company_slug = c.slug,
    company_name = c.name,
    updated_at   = NOW()
FROM auth.users au, public.companies c
WHERE au.id = uca.user_id
  AND c.id  = uca.company_id
  AND (
        uca.user_email   IS DISTINCT FROM au.email OR
        uca.company_slug IS DISTINCT FROM c.slug  OR
        uca.company_name IS DISTINCT FROM c.name
      );

-- 9.8.2 Intentar fijar NOT NULL (si falla, verás el NOTICE y puedes reintentar)
DO $$
BEGIN
    ALTER TABLE public.user_company_access
        ALTER COLUMN user_email   SET NOT NULL,
        ALTER COLUMN company_slug SET NOT NULL,
        ALTER COLUMN company_name SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo fijar NOT NULL en columnas legibles (algunas filas siguen nulas). Repite el backfill y reintenta.';
END $$;

-- 9.9 Verificación rápida
-- SELECT slug FROM public.companies ORDER BY slug;
-- SELECT user_id, user_email, company_id, company_slug, company_name, role FROM public.user_company_access WHERE user_id = auth.uid();