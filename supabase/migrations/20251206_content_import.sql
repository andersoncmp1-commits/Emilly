-- 1. Create Tables (if they don't exist)
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "position" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    video_url TEXT,
    type TEXT DEFAULT 'text',
    "position" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Create Policies (Public Read, Admin Write)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'sections' AND policyname = 'Public Read Sections'
    ) THEN
        CREATE POLICY "Public Read Sections" ON public.sections FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'sections' AND policyname = 'Admin Write Sections'
    ) THEN
        CREATE POLICY "Admin Write Sections" ON public.sections FOR ALL USING (
             auth.jwt() ->> 'role' = 'service_role' OR
             (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'lessons' AND policyname = 'Public Read Lessons'
    ) THEN
        CREATE POLICY "Public Read Lessons" ON public.lessons FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'lessons' AND policyname = 'Admin Write Lessons'
    ) THEN
        CREATE POLICY "Admin Write Lessons" ON public.lessons FOR ALL USING (
             auth.jwt() ->> 'role' = 'service_role' OR
             (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
        );
    END IF;
END
$$;

-- 2. Insert Data
DO $$
DECLARE
    v_module_id UUID;
    v_section_id UUID;
BEGIN
    -- Get the module ID
    SELECT id INTO v_module_id FROM public.modules WHERE title = 'Como se portar na igreja' LIMIT 1;
    
    -- Terminate if module doesn't exist (safety check)
    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Módulo não encontrado';
    END IF;

    -- Clear existing content for this module to avoid duplicates if running multiple times
    -- (Cascading delete cleans up lessons)
    DELETE FROM public.sections WHERE module_id = v_module_id;

    -- SECTION 1: Postura ao entrar na Capela
    INSERT INTO public.sections (module_id, title, "position")
    VALUES (v_module_id, 'Postura ao entrar na Capela', 1)
    RETURNING id INTO v_section_id;

    INSERT INTO public.lessons (section_id, title, "position", type, content)
    VALUES (
        v_section_id, 
        'Introdução e Entrada', 
        1, 
        'text',
        '<p>Estas orientações se aplicam a qualquer igreja ou capela. Nós, do Instituto Bom Pastor, queremos que estas instruções formem verdadeiramente os nossos fiéis, em qualquer lugar que eles estejam.</p>

<blockquote class="bg-gray-100 p-4 border-l-4 border-gray-500 italic my-4">
Uma igreja ou capela é um lugar público, mas é também um lugar sagrado. Estes lugares não devem ser profanados com comportamento leviano ou que não corresponda à sacralidade do lugar.
</blockquote>

<p>Não é permitido rir ou conversar na igreja antes, durante ou depois das cerimônias sagradas. Os católicos indiferentes ou curiosos estão obrigados às mesmas regras ou costumes, pelo princípio universal e rigoroso da boa educação e do respeito. No caso de não quererem conformar-se com essas regras e costumes, convém que se retirem. Assim:</p>

<h3 class="text-lg font-bold mt-4 mb-2">Entrada</h3>
<ul class="list-disc pl-5 space-y-2">
<li>O fiel encontrará uma pia de água benta na entrada da Capela. Ao entrar, fazer o Sinal da Cruz com água benta.</li>
<li>Conforme o que pede São Paulo na Sagrada Escritura (1Cor 11, 5-6. 10. 13), e seguindo o costume de sempre da Igreja, as mulheres devem cobrir a cabeça. Cobri-la antes de entrar na Capela, de modo que, ao entrar, já estejam de cabeça coberta.</li>
</ul>'
    );

    -- SECTION 2: Modéstia e Respeito
    INSERT INTO public.sections (module_id, title, "position")
    VALUES (v_module_id, 'Modéstia e Respeito', 2)
    RETURNING id INTO v_section_id;

    INSERT INTO public.lessons (section_id, title, "position", type, content)
    VALUES (
        v_section_id,
        'Genuflexões',
        1,
        'text',
        '<ul class="list-disc pl-5 space-y-2">
<li>Fazer genuflexão devotamente sempre ao passar diante do altar principal, caso nele esteja guardado o Santíssimo Sacramento no sacrário.</li>
<li>Para fazer a genuflexão, dobrar o joelho <strong>direito</strong> até o chão para o Santíssimo Sacramento no <strong>sacrário</strong>.</li>
<li>Dobrar <strong>os dois joelhos</strong> e inclinar profundamente a <strong>cabeça</strong> se o Santíssimo Sacramento estiver exposto sobre o altar.</li>
<li>Não é necessário fazer várias genuflexões desde que se entra na igreja até ocupar o seu lugar. Basta fazer uma. Se for necessário passar pelo corredor central para chegar ao seu lugar, basta fazer uma só genuflexão no corredor central e ir para o seu lugar. Se não é necessário passar pelo corredor central, vai-se até o banco no qual você se sentará, e se faz a genuflexão ao lado do banco, antes de ocupar o seu lugar.</li>
<li>Para sair, caso não seja necessário passar pelo corredor central, levantar-se do seu lugar, fazer a genuflexão ao lado do banco uma só vez e sair. Se for necessário passar pelo corredor central, levantar-se, fazer a genuflexão no corredor central e sair.</li>
<li>Fazer inclinação profunda sem genuflexão para o altar-mor, no caso em que o Santíssimo não esteja no sacrário.</li>
<li>Não se faz nenhuma reverência, nem inclinação, nem genuflexão, ao passar diante de um altar lateral.</li>
</ul>'
    );

    INSERT INTO public.lessons (section_id, title, "position", type, content)
    VALUES (
        v_section_id,
        'Vestimentas',
        2,
        'text',
        '<ul class="list-disc pl-5 space-y-2">
<li>Em qualquer lugar sagrado, capela ou igreja, devemos sempre ter trajes decentes e correspondentes à santidade do lugar. Evitem-se roupas relaxadas (camisetas e calças informais, ou que são usadas para fazer esportes, roupas com desenho, personagens, coisas escritas, imagens, sobretudo de bandas ou artistas, etc.).</li>
</ul>'
    );

    -- SECTION 3: Comportamento durante a oração
    INSERT INTO public.sections (module_id, title, "position")
    VALUES (v_module_id, 'Comportamento durante a oração', 3)
    RETURNING id INTO v_section_id;

    INSERT INTO public.lessons (section_id, title, "position", type, content)
    VALUES (
        v_section_id,
        'Postura e Comportamento',
        1,
        'text',
        '<h3 class="text-lg font-bold mt-4 mb-2">Postura e Comportamento</h3>
<ul class="list-disc pl-5 space-y-2">
<li>Nos bancos da Capela, ao nos sentarmos, a postura deve ser correspondente ao ambiente sagrado e não ao relaxamento mais próprio de um salão ou sala-de-estar. É preciso sentar com toda a compostura e decência.</li>
<li>Ajoelhar-se por alguns instantes antes de sentar (tempo de duas ou três Ave-Marias).</li>
<li>Não se deve cruzar as pernas, nem apoiar ou estender os braços no encosto de trás do próprio banco, ou ficar apoiando a cabeça no ombro do outro.</li>
<li>Ao ficar ajoelhado, o correto é manter-se assim com os dois joelhos. Evite conservar-se ajoelhado com um só joelho.</li>
<li>Ao sair, deixar organizado o material que fica sobre as mesas ao fundo da Capela e se atentar para não esquecer nenhum pertence pessoal.</li>
</ul>

<h3 class="text-lg font-bold mt-4 mb-2">Disposição dos assentos</h3>
<ul class="list-disc pl-5 space-y-2">
<li>Desde o começo da Igreja, o costume foi de que homens e mulheres ocupassem lados distintos nas igrejas. Aqui na Capela, homens solteiros ocupam os bancos do lado <em>epístola</em> (à direita de quem olha para o altar) e as mulheres ocupam o lado <em>evangelho</em> (à esquerda de quem olha para o altar). Famílias podem ocupar os lugares em qualquer lado da Capela.</li>
<li>Namorados e noivos não pertencem à mesma família. Não devem sentar juntos, mas cada um deve ocupar um lugar no lado que lhe corresponde.</li>
</ul>

<h3 class="text-lg font-bold mt-4 mb-2">Alimentação</h3>
<ul class="list-disc pl-5 space-y-2">
<li>Não devemos comer ou beber (nem mesmo água) dentro da igreja.</li>
<li>Se for necessário alimentar alguma criança, sair com ela para fazê-lo (exceto mamadeira). Não dar biscoitos às crianças dentro da igreja.</li>
</ul>'
    );

    INSERT INTO public.lessons (section_id, title, "position", type, content)
    VALUES (
        v_section_id,
        'Discrição e Eletrônicos',
        2,
        'text',
        '<h3 class="text-lg font-bold mt-4 mb-2">Discrição</h3>
<ul class="list-disc pl-5 space-y-2">
<li>Deve-se evitar toda singularidade, excentricidade, ou o que pode chamar a atenção na maneira de rezar e de se portar, de modo que ninguém, ao olhar para você, possa pensar: «Que esquisito, que diferente, que singular...».</li>
<li>Evitar levantar os braços, bater no peito com força, fazendo barulho, ficar ajoelhado no corredor, agitar o terço ou outros objetos de piedade, fazendo barulho.</li>
<li>Nos atos públicos, ao rezar, devemos procurar falar todos na mesma velocidade, evitando falar mais rápido ou mais devagar do que o conjunto dos fiéis, ou falar mais forte do que todo mundo.</li>
<li>Se rezamos sozinhos, evitar incomodar os outros rezando em voz alta ou mesmo sussurrando quando tudo está em silêncio.</li>
<li>Ser discreto nas genuflexões, inclinações e demais reverências e gestos, para não chamar atenção. Fazê-las com piedade, mas evitando movimentos teatrais.</li>
<li>Durante as cerimônias, devemos acompanhar as atitudes coletivas na Capela: ajoelhando com todos, levantando com todos, etc.</li>
<li>Evitar distrações e olhares vagueantes. Isso inclui interações com crianças pequenas, como sorrisos, brincadeiras ou gestos.</li>
<li>Nunca interromper alguém que esteja rezando, a não ser em caso de real necessidade. Portanto, refletir antes para ver se realmente é o caso, ou se é possível esperar para falar com a pessoa.</li>
</ul>

<h3 class="text-lg font-bold mt-4 mb-2">Uso de dispositivos eletrônicos</h3>
<ul class="list-disc pl-5 space-y-2">
<li>Na igreja, não se usem aparelhos celulares e outros semelhantes, nem mesmo para mensagens.</li>
<li>Sejam evitados também nas confissões.</li>
</ul>'
    );

    -- SECTION 4: Crianças na Igreja
    INSERT INTO public.sections (module_id, title, "position")
    VALUES (v_module_id, 'Crianças na Igreja', 4)
    RETURNING id INTO v_section_id;

    INSERT INTO public.lessons (section_id, title, "position", type, content)
    VALUES (
        v_section_id,
        'Comportamento das Crianças',
        1,
        'text',
        '<h3 class="text-lg font-bold mt-4 mb-2 text-center italic">«Deixai vir a Mim as criancinhas, porque delas é o Reino dos Céus»</h3>
<p class="mb-4">Incentivamos e favorecemos sempre a presença de crianças na Missa. Com isso, elas recebem muitas graças de Nosso Senhor. Entretanto, educar com toda a paciência estes <em>mais pequeninos de nossos irmãos</em> (Mt 25, 40) desde cedo para se portarem em um recinto sagrado é um ato de caridade que fazemos. Assim:</p>

<ul class="list-disc pl-5 space-y-2">
<li>Não deixar crianças soltas nos corredores, se arrastando ou correndo pela igreja, brincando ou subindo nos bancos, no púlpito, nos altares laterais, etc.</li>
<li>Desde a mais tenra idade, é conveniente habituá-las às solenidades religiosas, tendo, porém, todo o cuidado de as conservar quietas, sempre sentadas e em silêncio, e de as levar logo para fora quando começarem a chorar.</li>
<li>Um único barulho pode não ser motivo para sair, mas os pais devem ser ágeis e atentos. Não demorar para sair, acreditando que a criança irá parar rapidamente.</li>
<li>Ao sair com a criança, ficar fora da Capela somente o tempo necessário para acalmá-la. O fiel não deve esquecer que, estando fora do recinto sagrado, se não for mais capaz de acompanhar a Missa, comprometerá de modo menor ou maior o preceito da Igreja.</li>
<li>Evitem-se os brinquedos e objetos que fazem barulho, bonecos(as), carrinhos, etc., sobretudo para crianças um pouco maiores, com 3 ou 4 anos. Não ajudará em nada a criança e provocará distrações em outras crianças e mesmo em adultos.</li>
<li>É louvável o uso dos chamados Missais de Crianças, com gravuras, ou livros com imagens da Missa.</li>
<li>A Capela dispõe de uma Sala das Mães. Ao ser usada, manter o silêncio e a discrição.</li>
<li>Os pais e responsáveis vigiem para que as crianças não estraguem livretos e folhetos.</li>
</ul>'
    );

END
$$;
