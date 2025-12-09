-- Arquivo para reparação do conteúdo da Home
-- Rode este script no Editor SQL do Supabase para corrigir os itens faltantes

DO $$
DECLARE
    -- Sections
    s_acesso uuid;
    s_instrucoes uuid;
    s_cursos uuid;
    
    -- Modules
    m_portar uuid;
    m_silencio uuid;
    m_cursos_breve uuid;
    m_doar uuid;
BEGIN
    -- 1. IDENTIFICAR SEÇÕES
    -- Acesso Rápido
    SELECT id INTO s_acesso FROM home_sections WHERE title = 'Acesso Rápido';
    -- Se não encontrar, cria (mas deve existir baseado no seu print)
    IF s_acesso IS NULL THEN
        INSERT INTO home_sections (title, position) VALUES ('Acesso Rápido', 1) RETURNING id INTO s_acesso;
    END IF;

    -- Instruções
    SELECT id INTO s_instrucoes FROM home_sections WHERE title = 'Instruções';
    IF s_instrucoes IS NULL THEN
        INSERT INTO home_sections (title, position) VALUES ('Instruções', 2) RETURNING id INTO s_instrucoes;
    END IF;

    -- Cursos
    SELECT id INTO s_cursos FROM home_sections WHERE title = 'Cursos';
    IF s_cursos IS NULL THEN
        INSERT INTO home_sections (title, position) VALUES ('Cursos', 3) RETURNING id INTO s_cursos;
    END IF;

    -- 2. IDENTIFICAR OU CRIAR MÓDULOS
    -- Como se portar
    SELECT id INTO m_portar FROM modules WHERE title ILIKE 'Como se portar na igreja' LIMIT 1;
    IF m_portar IS NULL THEN
        INSERT INTO modules (title, description, icon, position) VALUES ('Como se portar na igreja', 'Guia básico de comportamento e piedade.', 'Church', 1) RETURNING id INTO m_portar;
    END IF;

    -- Silêncio
    SELECT id INTO m_silencio FROM modules WHERE title ILIKE 'Silêncio na Missa e na Igreja' LIMIT 1;
    IF m_silencio IS NULL THEN
        INSERT INTO modules (title, description, icon, position) VALUES ('Silêncio na Missa e na Igreja', 'A importância espiritual do silêncio.', 'VolumeX', 2) RETURNING id INTO m_silencio;
    END IF;

    -- Cursos (Em Breve)
    SELECT id INTO m_cursos_breve FROM modules WHERE title ILIKE 'Cursos (Em Breve)' LIMIT 1;
    IF m_cursos_breve IS NULL THEN
        INSERT INTO modules (title, description, icon, position, is_locked) VALUES ('Cursos (Em Breve)', 'Novidades em breve.', 'Clock', 99, true) RETURNING id INTO m_cursos_breve;
    END IF;

    -- Doar
    SELECT id INTO m_doar FROM modules WHERE title ILIKE 'Doar' LIMIT 1;
    IF m_doar IS NULL THEN
        INSERT INTO modules (title, description, icon, position, is_locked) VALUES ('Doar', 'Faça sua doação.', 'Heart', 100, false) RETURNING id INTO m_doar;
    END IF;

    -- 3. POPULAR HOME ITEMS
    -- Removemos itens antigos para evitar duplicação em execuções repetidas
    DELETE FROM home_items;

    -- Acesso Rápido -> Doar
    INSERT INTO home_items (section_id, title, type, target_id, position, description, image_url)
    VALUES (s_acesso, 'Doar', 'module', m_doar, 1, 'Ajude a manter o apostolado.', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=600&fit=crop');

    -- Instruções -> Como se portar
    INSERT INTO home_items (section_id, title, type, target_id, position, description, image_url)
    VALUES (s_instrucoes, 'Como se portar na igreja', 'module', m_portar, 1, 'Guia básico de comportamento.', 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400&h=600&fit=crop');

    -- Instruções -> Silêncio
    INSERT INTO home_items (section_id, title, type, target_id, position, description, image_url)
    VALUES (s_instrucoes, 'Silêncio na Missa e na Igreja', 'module', m_silencio, 2, 'A importância do silêncio.', 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=400&h=600&fit=crop');

    -- Cursos -> Em Breve
    INSERT INTO home_items (section_id, title, type, target_id, position, description, image_url)
    VALUES (s_cursos, 'Cursos (Em Breve)', 'module', m_cursos_breve, 1, 'Fique atento às novidades.', 'https://images.unsplash.com/photo-1506318137071-a8bcbf675b27?w=400&h=600&fit=crop');

END $$;
