-- DIAGNOSTICO E CORREÇÃO DE ADMIN

DO $$
DECLARE
    v_user_id uuid;
    v_profile_exists boolean;
BEGIN
    -- 1. Buscar o ID do usuário pelo email na tabela auth.users
    -- Nota: auth.users normalmente não é acessível diretamente para queries simples se não tiver permissão, 
    -- mas no editor SQL do Supabase (dashboard) geralmente é.
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'andersoncmp1@gmail.com';

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Usuário não encontrado na tabela auth.users. Verifique se o email está correto.';
    ELSE
        RAISE NOTICE 'Usuário encontrado: %', v_user_id;

        -- 2. Verificar se existe perfil
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_user_id) INTO v_profile_exists;

        IF v_profile_exists THEN
            RAISE NOTICE 'Perfil encontrado. Atualizando para admin...';
            UPDATE public.profiles 
            SET role = 'admin' 
            WHERE id = v_user_id;
        ELSE
            RAISE NOTICE 'Perfil NÃO encontrado. Criando perfil de admin...';
            INSERT INTO public.profiles (id, email, full_name, role)
            VALUES (v_user_id, 'andersoncmp1@gmail.com', 'Anderson', 'admin');
        END IF;

        -- 3. Atualizar metadados do usuário (opcional mas recomendado)
        UPDATE auth.users
        SET raw_user_meta_data = 
            COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
        WHERE id = v_user_id;
        
        RAISE NOTICE 'Permissões atualizadas com sucesso!';
    END IF;
END $$;
