-- Migration to consolidate content for "Silêncio na Missa e na Igreja" into a single lesson

DO $$
DECLARE
  v_module_id UUID;
  v_section_id UUID;
  v_full_content TEXT;
BEGIN
  -- Get the module ID
  SELECT id INTO v_module_id FROM modules WHERE title ILIKE '%Silêncio%' LIMIT 1;

  -- Verify module exists
  IF v_module_id IS NOT NULL THEN
    
    -- DELETE EXISTING CONTENT for this module to start fresh
    DELETE FROM sections WHERE module_id = v_module_id;

    -- Create Single Section
    INSERT INTO sections (module_id, title, position)
    VALUES (v_module_id, 'Conteúdo', 0)
    RETURNING id INTO v_section_id;

    -- Construct the full content
    v_full_content := 
    '<h2 class="text-2xl font-serif text-sacred-gold mb-6">Uma Característica da Missa Tridentina</h2>' ||
    '<p>O silêncio na Missa Tradicional traz um grande benefício para a nossa vida espiritual. Falamos aqui do <strong>silêncio</strong> que vem do fato de muitas orações serem rezadas em voz baixa pelo sacerdote, principalmente no <strong>ofertório</strong> e no <strong>Cânon</strong>. <strong>Esse silêncio é muito importante.</strong></p>

    <p>Antes de tudo, o silêncio faz com que <strong>deixemos de ser o centro da Missa</strong>. Ora, aquele que fala é o centro das atenções. Se as pessoas falam constantemente durante a Missa, elas terão grande tendência a achar que a Missa diz respeito, em primeiro lugar, a elas e não a Deus.</p>

    <blockquote class="border-l-4 border-sacred-gold pl-4 italic my-4">
      O silêncio nos mostra que a Missa é um mistério, algo sobrenatural, que não podemos entender completamente com a nossa razão.
    </blockquote>

    <p>As orações do padre em voz baixa deixam claro também para o padre que a sua pessoa particular não é o centro da Missa. Não é ele que precisa aparecer. Essas orações em voz baixa e o consequente silêncio da Missa Tradicional deixam claro que <strong>o centro da Missa é Deus</strong>, que o <strong>centro da Missa é Cristo</strong> que renova o seu Sacrifício, oferecendo-o à Santíssima Trindade.</p>

    <p>O padre que fala em voz baixa é o centro da liturgia, mas não enquanto padre tal ou padre fulano, e, sim, enquanto instrumento de Cristo Sacerdote, de forma que <strong>o centro é claramente Cristo</strong>. Assim, colocando <strong>Deus como o centro</strong>, o silêncio nos <strong>ensina a caridade</strong>, que nos <strong>inclina a fazer tudo a partir de Deus, por amor a Deus</strong>.</p>
    
    <hr class="border-sacred-gold/20 my-8">' ||

    '<h2 class="text-2xl font-serif text-sacred-gold mb-6">Um Meio de Mortificação</h2>' ||
    '<p>O <strong>silêncio</strong> nos ensina também a <strong>mortificação</strong>. Pelo nosso <strong>orgulho</strong>, temos muitas vezes tendência a falar, a querer ser o centro das atenções. Pelo <strong>silêncio</strong>, negamo-nos a nós mesmos, às nossas inclinações, <strong>mortificamos os nossos sentidos</strong> e deixamos que Deus aja.</p>

    <blockquote class="border-l-4 border-sacred-gold pl-4 italic my-4">
      O silêncio mostra que não precisamos ser o centro das atenções para que a Missa tenha sentido, mas que a Missa tem sentido quando Deus é o centro.
    </blockquote>

    <p>Muitas pessoas que assistem à Missa Tradicional pela primeira vez <strong>queixam-se do silêncio</strong> ou acham que <strong>não participaram da Missa</strong> porque ficaram <strong>grande parte dela em silêncio</strong>.</p>

    <p>Na verdade, essas queixas se devem muitas vezes à simples <strong>repulsa por essa mortificação imposta pelo silêncio</strong> e pelo fato de a pessoa não ser o centro da liturgia. O homem moderno tem grande dificuldade em deixar de ser o centro das atenções.</p>

    <p>Além disso, sabemos que a mortificação é indispensável para uma <strong>vida espiritual ordenada</strong>. O silêncio ajuda bastante nesse ponto: negação de si, a mortificação de si.</p>
    
    <hr class="border-sacred-gold/20 my-8">' ||

    '<h2 class="text-2xl font-serif text-sacred-gold mb-6">Incentivo à Meditação</h2>' ||
    '<p>O <strong>silêncio nos ensina a rezar. Durante o silêncio, não há alternativa: ou a pessoa reza ou ela se distrai.</strong></p>

    <p>Aceitar a distração seria um pecado, ainda que leve muitas vezes. A pessoa precisa, então, aprender a <strong>rezar</strong>, e <strong>rezar sozinha</strong>. O silêncio nos ensina o <strong>valor da oração individual</strong>, e nos faz buscar o melhor meio para nos unirmos ao Sacrifício de Cristo, renovado diante de nós.</p>

    <p>O silêncio, mortificando os sentidos, nos ajuda muito a considerar com a inteligência o que realmente importa durante a Santa Missa. O silêncio favorece o progresso <strong>na oração</strong>, conduzindo-nos além da oração simplesmente vocal. O silêncio nos permite <strong>considerar as verdades eternas</strong> e tomar a resolução, com o auxílio divino, de <strong>ajustar nossa vida a essas verdades</strong>. Em resumo, o silêncio favorece a meditação católica.</p>

    <blockquote class="border-l-4 border-sacred-gold pl-4 italic my-4">
      O silêncio é cada vez mais raro no mundo.
    </blockquote>

    <p>Aonde vamos há, com frequência, alguma espécie de barulho de música, de televisão, de rádio, de internet, <strong>ocupando nossa imaginação e inteligência com coisas sem importância</strong>. Todo mundo anda com seu fone de ouvido. Ora, sem silêncio não pensamos devidamente e, se não pensamos, não podemos aderir com firmeza a Deus. Esse barulho, infelizmente, entrou também na Igreja, no centro da vida da Igreja, que é a liturgia. O <strong>silêncio é necessário</strong> para a nossa vida espiritual e a <strong>Missa Tridentina o favorece</strong>.</p>
    
    <hr class="border-sacred-gold/20 my-8">' ||

    '<h2 class="text-2xl font-serif text-sacred-gold mb-6">Favorece a Oração</h2>' ||
    '<p>Pelo fato de a pessoa ter de rezar sozinha durante a Missa, isto favorece a oração fora do contexto litúrgico e favorece, em particular, a <strong>oração individual</strong>, tão em desuso atualmente, pois há <strong>uma tendência errônea</strong> de muitos a considerar que a única oração que tem importância é a oração comunitária.</p>

    <p>O silêncio favorece uma <strong>oração mais elevada</strong> e nos faz considerar o que realmente importa na Missa: o sacrifício de Cristo renovado para a glória de Deus, para o perdão dos nossos pecados.</p>

    <blockquote class="border-l-4 border-sacred-gold pl-4 italic my-4">
      O silêncio litúrgico favorece, então, a oração e, consequentemente, a devoção, isto é, a prontidão no serviço de Deus.
    </blockquote>

    <p>Finalmente, o silêncio na Missa explicita o fato de que é o sacerdote que age na pessoa de Cristo e que é o sacerdote que renova o sacrifício do Calvário ao dizer <strong>as palavras da consagração</strong>. Não é o povo que consagra, não é o povo que celebra a Missa. <strong>É o sacerdote</strong>.</p>

    <p>Para deixar clara a diferença entre o sacerdote e os fiéis, o <strong>padre reza as orações mais profundamente sacerdotais em silêncio: o ofertório, o Cânon, as palavras da consagração</strong>.</p>

    <p>O <strong>silêncio</strong>, a orientação do padre, voltado para <strong>Deus</strong>, e o latim nos ajudam bastante a <strong>servir a um só Senhor – a Santíssima Trindade – e a buscar em primeiro lugar o reino de Deus</strong>.</p>
    
    <hr class="border-sacred-gold/20 my-8">' ||

    '<h2 class="text-2xl font-serif text-sacred-gold mb-6">Normas Práticas: A Guarda do Silêncio</h2>' ||
    '<p>A igreja, como diz Nosso Senhor, é a casa de Deus. Dentro da Capela, <strong>mesmo antes ou após a Missa</strong> e outras cerimônias, devemos guardar o silêncio.</p>

    <h3 class="text-sacred-gold text-lg font-bold mt-4 mb-2">Conversas e cumprimentos:</h3>
    <ul class="list-disc pl-5 space-y-2">
      <li>Dentro da igreja não devemos conversar com outras pessoas. Na igreja falamos com Deus e com os intermediários entre Deus e nós: Nossa Senhora e os santos.</li>
      <li>Não cumprimentamos os outros ao chegar ou sair, ainda que seja um grande amigo ou parente.</li>
      <li>A igreja não é lugar oportuno para cumprimentos de amizade ou manifestações de simpatia. Se for necessário cumprimentar alguém, fazer apenas com a cabeça e em absoluto silêncio.</li>
    </ul>

    <h3 class="text-sacred-gold text-lg font-bold mt-4 mb-2">Explicações e instruções:</h3>
    <ul class="list-disc pl-5 space-y-2">
      <li>Caso seja necessário explicar algo sobre a Missa ou as Cerimônias, por exemplo, aos filhos ou outras pessoas, faça-o discretamente e em voz baixa.</li>
    </ul>

    <h3 class="text-sacred-gold text-lg font-bold mt-4 mb-2">Uso de dispositivos eletrônicos:</h3>
    <ul class="list-disc pl-5 space-y-2">
      <li>Procure não utilizar o celular para quaisquer finalidades. Não enviar mensagens de texto, muito menos realizar ou atender chamadas de voz. Antes de entrar na igreja, procure colocar o celular no modo silencioso.</li>
    </ul>

    <h3 class="text-sacred-gold text-lg font-bold mt-4 mb-2">Cuidados com crianças:</h3>
    <ul class="list-disc pl-5 space-y-2">
      <li>Se a criança estiver um pouco mais agitada ou fizer um pouco mais de barulho, e após uma ou no máximo duas tentativas a criança não se acalmar, então você deve sair com ela, para que o silêncio na igreja seja mantido. Mas não deixá-la solta, brincando ou correndo lá fora, pois fora não pode ser mais agradável do que dentro da igreja, e a criança pode, depois, se habituar a encontrar meios para sair.</li>
    </ul>

    <blockquote class="border-l-4 border-sacred-gold pl-4 italic my-6 text-xl">
      &laquo;Nossa Senhora não quer que a gente fale na igreja.&raquo;<br>
      <span class="text-sm not-italic opacity-70">- Santa Jacinta Marto, à Madre Godinho</span>
    </blockquote>';

    -- Insert Single Lesson
    INSERT INTO lessons (section_id, title, content, type, position)
    VALUES (v_section_id, 'O Silêncio na Missa e na Igreja (Completo)', v_full_content, 'text', 0);

  END IF;
END $$;
