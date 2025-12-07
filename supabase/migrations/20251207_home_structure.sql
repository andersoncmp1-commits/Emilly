-- Create home_sections table
CREATE TABLE IF NOT EXISTS public.home_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    position integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Create home_items table
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

-- Enable RLS
ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_items ENABLE ROW LEVEL SECURITY;

-- Policies for home_sections
DROP POLICY IF EXISTS "Public read home_sections" ON public.home_sections;
CREATE POLICY "Public read home_sections" ON public.home_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write home_sections" ON public.home_sections;
CREATE POLICY "Admin write home_sections" ON public.home_sections FOR ALL USING (
  (auth.jwt() ->> 'role' = 'service_role') OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Policies for home_items
DROP POLICY IF EXISTS "Public read home_items" ON public.home_items;
CREATE POLICY "Public read home_items" ON public.home_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write home_items" ON public.home_items;
CREATE POLICY "Admin write home_items" ON public.home_items FOR ALL USING (
  (auth.jwt() ->> 'role' = 'service_role') OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
