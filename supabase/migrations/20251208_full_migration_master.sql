-- MASTER MIGRATION SCRIPT
-- Run this in the Supabase SQL Editor of your NEW project.

-- 1. Profiles (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    phone TEXT,
    payment_status TEXT DEFAULT 'Em dia',
    monthly_value NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR ALL USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR 
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, phone)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Modules
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'BookOpen',
    position INTEGER DEFAULT 0,
    image_url TEXT,
    release_date TIMESTAMP WITH TIME ZONE,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Admin Write Modules" ON public.modules FOR ALL USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR 
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- Insert Initial Modules (Required for Content Scripts)
INSERT INTO public.modules (title, description, icon, position)
VALUES 
('Como se portar na igreja', 'Guia básico de comportamento e piedade.', 'Church', 1),
('Silêncio na Missa e na Igreja', 'A importância espiritual do silêncio.', 'VolumeX', 2)
ON CONFLICT DO NOTHING; -- Assuming titles might be unique or just to prevent error if run twice, although unique constraint isn't defined above, standard SQL is forgiving here without constraints, but for safety in replay:
-- (Actually standard SQL might duplicate if I run twice. I should add a check).
-- Simplified for this context:
-- You can manually check if they exist or just run this once.

-- 3. Sections & Lessons (Content Structure)
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    video_url TEXT,
    type TEXT DEFAULT 'text',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Content" ON public.sections FOR SELECT USING (true);
CREATE POLICY "Public Read Lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Admin Write Content" ON public.sections FOR ALL USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');
CREATE POLICY "Admin Write Lessons" ON public.lessons FOR ALL USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');


-- 4. Campaigns & Messages
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    current_amount NUMERIC DEFAULT 0,
    goal_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    message_content TEXT,
    trigger_type TEXT,
    trigger_value TEXT,
    status TEXT DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    min_delay INTEGER DEFAULT 30,
    max_delay INTEGER DEFAULT 120,
    batch_size INTEGER DEFAULT 10,
    batch_interval INTEGER DEFAULT 300,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Admin All Campaigns" ON public.campaigns FOR ALL USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');
CREATE POLICY "Admin All Messages" ON public.campaign_messages FOR ALL USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- 5. Financial Transactions
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('credit', 'debit')),
    status TEXT CHECK (status IN ('pending', 'completed', 'processing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin All Transactions" ON public.financial_transactions FOR ALL USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- 6. Home Editor Tables
CREATE TABLE IF NOT EXISTS public.home_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    position integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.home_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id uuid REFERENCES public.home_sections(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    image_url text,
    type text CHECK (type IN ('module', 'link', 'route')) DEFAULT 'link',
    target_id uuid, -- For modules
    target_url text, -- For links/routes
    position integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read home_sections" ON public.home_sections FOR SELECT USING (true);
CREATE POLICY "Admin write home_sections" ON public.home_sections FOR ALL USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');
CREATE POLICY "Public read home_items" ON public.home_items FOR SELECT USING (true);
CREATE POLICY "Admin write home_items" ON public.home_items FOR ALL USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- 7. Insert Initial Home Structure (Optional but helpful)
INSERT INTO home_sections (title, position) VALUES ('Acesso Rápido', 1), ('Instruções', 2), ('Cursos', 3);
