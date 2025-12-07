DO $$
DECLARE
    sect_instrucoes_id uuid;
    sect_cursos_id uuid;
    sect_doacoes_id uuid;
    
    mod_comece_id uuid;
    mod_portar_id uuid;
    mod_silencio_id uuid;
    mod_cursos_brev_id uuid;
    mod_doar_id uuid;
BEGIN
    -- 1. Ensure Sections Exist
    -- Note: We identify by title. If dupes exist, this might pick one randomly.
    -- Better to verify unique constraint or just pick one.
    
    -- Insert if not exists
    IF NOT EXISTS (SELECT 1 FROM home_sections WHERE title = 'Instruções') THEN
        INSERT INTO home_sections (title, position) VALUES ('Instruções', 0) RETURNING id INTO sect_instrucoes_id;
    ELSE
        SELECT id INTO sect_instrucoes_id FROM home_sections WHERE title = 'Instruções' LIMIT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM home_sections WHERE title = 'Cursos') THEN
        INSERT INTO home_sections (title, position) VALUES ('Cursos', 1) RETURNING id INTO sect_cursos_id;
    ELSE
         SELECT id INTO sect_cursos_id FROM home_sections WHERE title = 'Cursos' LIMIT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM home_sections WHERE title = 'Doações') THEN
        INSERT INTO home_sections (title, position) VALUES ('Doações', 2) RETURNING id INTO sect_doacoes_id;
    ELSE
         SELECT id INTO sect_doacoes_id FROM home_sections WHERE title = 'Doações' LIMIT 1;
    END IF;


    -- 2. Find Modules
    SELECT id INTO mod_comece_id FROM modules WHERE title ILIKE '%Comece Aqui%' LIMIT 1;
    SELECT id INTO mod_portar_id FROM modules WHERE title ILIKE '%Como se portar%' LIMIT 1;
    SELECT id INTO mod_silencio_id FROM modules WHERE title ILIKE '%Silêncio%' LIMIT 1;
    
    -- Cursos (Em Breve)
    SELECT id INTO mod_cursos_brev_id FROM modules WHERE title ILIKE '%Cursos (Em Breve)%' LIMIT 1;
    IF mod_cursos_brev_id IS NULL THEN
        INSERT INTO modules (title, description, icon, position, is_locked) 
        VALUES ('Cursos (Em Breve)', 'Novidades em breve.', 'Clock', 99, true) 
        RETURNING id INTO mod_cursos_brev_id;
    END IF;

    -- Doar
    SELECT id INTO mod_doar_id FROM modules WHERE title ILIKE '%Doar%' LIMIT 1;
    IF mod_doar_id IS NULL THEN
        INSERT INTO modules (title, description, icon, position, is_locked) 
        VALUES ('Doar', 'Faça sua doação.', 'Heart', 100, false) 
        RETURNING id INTO mod_doar_id;
    END IF;

    -- 3. Insert Home Items
    -- Clean up old items in these sections to ensure clean slate
    DELETE FROM home_items WHERE section_id IN (sect_instrucoes_id, sect_cursos_id, sect_doacoes_id);

    -- Instruções
    IF mod_comece_id IS NOT NULL THEN
        INSERT INTO home_items (section_id, title, type, target_id, position) VALUES (sect_instrucoes_id, 'Comece Aqui', 'module', mod_comece_id, 0);
    END IF;
    IF mod_portar_id IS NOT NULL THEN
        INSERT INTO home_items (section_id, title, type, target_id, position) VALUES (sect_instrucoes_id, 'Como se portar na igreja', 'module', mod_portar_id, 1);
    END IF;
    IF mod_silencio_id IS NOT NULL THEN
        INSERT INTO home_items (section_id, title, type, target_id, position) VALUES (sect_instrucoes_id, 'Silêncio na missa e na igreja', 'module', mod_silencio_id, 2);
    END IF;

    -- Cursos
    IF mod_cursos_brev_id IS NOT NULL THEN
        INSERT INTO home_items (section_id, title, type, target_id, position) VALUES (sect_cursos_id, 'Cursos (Em Breve)', 'module', mod_cursos_brev_id, 0);
    END IF;

    -- Doações
    IF mod_doar_id IS NOT NULL THEN
        INSERT INTO home_items (section_id, title, type, target_id, position) VALUES (sect_doacoes_id, 'Doar', 'module', mod_doar_id, 0);
    END IF;

END $$;
