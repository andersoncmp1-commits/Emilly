-- SCRIPT DEFINITIVO DE CORREÇÃO DE PERMISSÕES
-- Rode este script no Editor SQL do Supabase e depois RECARREGUE a página do site (F5)

BEGIN;

-- 1. Garantir que as políticas de segurança (RLS) permitem a leitura do perfil
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Permite que qualquer um leia os perfis (necessário para o site saber quem é admin)
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);

-- Permite atualização do próprio perfil
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Permite admins editarem tudo
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Forçar a função de ADMIN para o seu email (case insensitive)
UPDATE public.profiles
SET role = 'admin'
WHERE lower(email) = lower('andersoncmp1@gmail.com');

-- 3. Atualizar também os metadados do usuário (para garantir)
UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE lower(email) = lower('andersoncmp1@gmail.com');

COMMIT;
