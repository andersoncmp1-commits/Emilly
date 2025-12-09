-- Atualizar privilégios de admin para andersoncmp1@gmail.com
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'andersoncmp1@gmail.com';

-- Verificar se a atualização funcionou
SELECT * FROM public.profiles WHERE email = 'andersoncmp1@gmail.com';
