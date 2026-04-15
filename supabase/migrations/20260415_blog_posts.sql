-- Blog Posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         TEXT        UNIQUE NOT NULL,
  title        TEXT        NOT NULL,
  subtitle     TEXT,
  category     TEXT        NOT NULL DEFAULT 'tecnico',
  cover_image  TEXT,
  author       TEXT        NOT NULL DEFAULT 'Equipe Perfection',
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_time    INTEGER     NOT NULL DEFAULT 10,
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  status       TEXT        NOT NULL DEFAULT 'published'
                           CHECK (status IN ('draft', 'published')),
  chapters     JSONB       NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_public_read"
  ON blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "blog_posts_admin_all"
  ON blog_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─── Seed: Engenharia de Performance ────────────────────────────────────────
INSERT INTO blog_posts (slug, title, subtitle, category, author, read_time, tags, chapters)
VALUES (
  'engenharia-de-performance-no-airsoft',
  'Engenharia de Performance no Airsoft',
  'O que realmente separa um setup mediano de uma plataforma de alta performance — e como chegar lá.',
  'tecnico',
  'Equipe Perfection',
  15,
  ARRAY['performance','gearbox','hop-up','técnico','upgrade'],
  '[
    {"n":"01","id":"intro","title":"A Realidade dos Campos de Airsoft","hl":"Realidade","blocks":[
      {"t":"p","v":"Você já esteve em uma partida onde, apesar de carregar um equipamento visualmente imponente, seus disparos simplesmente não entregavam resultado?"},
      {"t":"p","v":"A mira estava alinhada. O alvo estava dentro do alcance. Mas a BB desviava no último segundo — ou pior — morria no meio do caminho."},
      {"t":"p","v":"Isso não é azar. <b>É engenharia mal resolvida.</b>"},
      {"t":"p","v":"Como armeiro e consultor de performance, posso afirmar: a maioria dos jogadores opera equipamentos abaixo do potencial real — não por falta de investimento, mas por falta de entendimento técnico."},
      {"t":"bq","v":"Se eu gastar mais, meu desempenho melhora."},
      {"t":"p","v":"<b>Performance no airsoft não é sobre quanto você gasta — é sobre como seu sistema está equilibrado.</b>"},
      {"t":"p","v":"O que você vai aprender aqui é exatamente isso: o que realmente define precisão, onde a maioria erra, e como transformar qualquer AEG comum em uma plataforma de alta performance."}
    ]},
    {"n":"02","id":"mitos","title":"Desmistificando a Performance","hl":"Performance","blocks":[
      {"t":"p","v":"A obsessão por FPS criou uma geração inteira de jogadores tecnicamente limitados."},
      {"t":"p","v":"FPS alto pode impressionar no cronógrafo… mas no campo, ele não garante absolutamente nada."},
      {"t":"p","v":"O que realmente importa é:"},
      {"t":"list","v":["<b>Consistência de disparo</b> — shot-to-shot consistency","<b>Estabilidade da trajetória</b> — o caminho da BB até o alvo","<b>Vedação eficiente</b> — sem perda de ar no sistema","<b>Interação perfeita</b> — entre ar, cano e hop-up"]},
      {"t":"h3","v":"Desvio Padrão de Velocidade"},
      {"t":"p","v":"O desvio padrão mede a variação entre disparos consecutivos. É o indicador mais confiável de qualidade interna de um setup."},
      {"t":"specs","v":[{"label":"Setup Ruim","value":"±15~20","desc":"FPS de variação entre disparos"},{"label":"Setup Ajustado","value":"±2~5","desc":"FPS de variação entre disparos"}]},
      {"t":"p","v":"Isso muda tudo. No airsoft, não é só sobre atirar longe… é sobre <b>acertar repetidamente no mesmo ponto</b>."},
      {"t":"insight","v":"Um setup com 350 FPS e desvio de ±3 será sempre mais preciso do que um com 400 FPS e desvio de ±18. Consistência supera potência bruta."}
    ]},
    {"n":"03","id":"gearbox","title":"Gearbox: O Coração Mecânico","hl":"Coração","blocks":[
      {"t":"p","v":"A gearbox é o motor do sistema. Cada componente dentro dela afeta diretamente a consistência, a resposta e a durabilidade do seu equipamento."},
      {"t":"h3","v":"Engrenagens"},
      {"t":"p","v":"A relação das engrenagens impacta o tempo de ciclo, consumo de bateria, stress mecânico e eficiência energética."},
      {"t":"table","headers":["Ratio","Tipo","Aplicação"],"rows":[["18:1","Padrão equilibrado","Uso geral, maioria das AEGs"],["13:1","Alta cadência","Speedsoft / CQB (exige reforço interno)"],["32:1","Torque extremo","DMR / Sniper elétrico"]]},
      {"t":"insight","v":"Setup rápido sem controle é só barulho — não é eficiência. A cadência só vale se o sistema inteiro suporta a demanda."},
      {"t":"h3","v":"Shimming"},
      {"t":"p","v":"Shimming é o ajuste da folga axial das engrenagens. O shimming correto reduz atrito, diminui ruído e distribui a carga mecânica de forma uniforme."},
      {"t":"h3","v":"AoE — Angle of Engagement"},
      {"t":"p","v":"O AoE define o ponto exato onde o primeiro dente da sector gear encontra o pistão. A correção envolve sorbo pads e ajuste do curso do pistão."},
      {"t":"h3","v":"Vedação"},
      {"t":"p","v":"O sistema de vedação é composto pelo nozzle, o-rings do cilindro, cabeça de pistão e bucking. Qualquer ponto com vazamento resulta em inconsistência nos disparos."},
      {"t":"cta","text":"Kits de vedação completos fazem diferença imediata na consistência do sistema.","href":"/categoria/pecas","label":"Ver kits"}
    ]},
    {"n":"04","id":"hopup","title":"Hop-Up e Bucking: Onde Nasce a Precisão","hl":"Precisão","blocks":[
      {"t":"p","v":"Se existe um componente que define a qualidade do disparo mais do que qualquer outro, é o hop-up. Ele aplica o efeito backspin na BB, gerando sustentação durante o voo."},
      {"t":"h3","v":"Tipos de Bucking"},
      {"t":"table","headers":["Dureza","Aplicação","Cenário"],"rows":[["50°","Baixa potência","CQB, setups abaixo de 350 FPS"],["60°","Uso geral (recomendado)","AEGs padrão, mais versátil"],["70°+","Alta potência","DMR, sniper, setups acima de 450 FPS"]]},
      {"t":"h3","v":"Sistemas de Contato"},
      {"t":"list","v":["<b>Flat Hop</b> — contato plano, melhora alcance e consistência com custo baixo","<b>R-Hop</b> — patch customizado colado no cano, máximo alcance (requer habilidade)","<b>Maple Leaf</b> — deformação controlada, excelente custo-benefício"]},
      {"t":"insight","v":"O hop-up não aumenta alcance — ele permite que o alcance exista com controle. Sem hop, a BB voa. Com hop, ela planeja."},
      {"t":"cta","text":"Um bom bucking já muda completamente o jogo — e é um dos upgrades mais baratos que existem.","href":"/categoria/pecas","label":"Ver buckings"}
    ]},
    {"n":"05","id":"volume","title":"Volume de Ar: A Ciência Invisível","hl":"Invisível","blocks":[
      {"t":"p","v":"O casamento entre o cilindro e o comprimento do cano é um dos fatores mais críticos para consistência."},
      {"t":"h3","v":"Tipos de Cilindro"},
      {"t":"table","headers":["Tipo","Volume","Indicação"],"rows":[["Tipo 0","Full (sem porta)","Canos longos (+450mm)"],["Tipo 1","¾ volume","Canos médio-longos (400~450mm)"],["Tipo 2","½ volume","Canos médios (300~400mm)"],["Tipo 3","¼ volume","Canos curtos (CQB, -300mm)"]]},
      {"t":"p","v":"A regra é direta: cano longo precisa de mais volume; cano curto com excesso de volume gera turbulência na saída da BB."},
      {"t":"insight","v":"Muitos setups perdem precisão não por falta de potência, mas por excesso de ar mal aproveitado. Volume demais é tão ruim quanto volume de menos."}
    ]},
    {"n":"06","id":"joule","title":"Joule Creep: O Perigo Oculto","hl":"Oculto","blocks":[
      {"t":"p","v":"Joule Creep acontece quando o FPS medido com BBs leves não reflete a energia real que o sistema entrega com BBs pesadas."},
      {"t":"warn","v":"Isso não é só técnico — é segurança. Joule Creep pode causar lesões mais graves do que o esperado, pode te banir de campos permanentemente, e pode gerar problemas legais."},
      {"t":"p","v":"O Joule Creep é mais comum em sistemas com excesso de volume de ar em relação ao comprimento do cano. Quando a BB pesada permanece mais tempo dentro do cano, ela absorve mais energia do ar comprimido."},
      {"t":"insight","v":"Se você não mede em Joules, você não sabe a potência real do seu equipamento. FPS é métrica de vaidade. Joule é métrica de verdade."}
    ]},
    {"n":"07","id":"bbs","title":"BBs: O Componente Mais Subestimado","hl":"Subestimado","blocks":[
      {"t":"p","v":"Você pode ter o melhor cano, o melhor bucking, a vedação perfeita… e jogar tudo fora usando BB de baixa qualidade."},
      {"t":"h3","v":"O que define uma BB de qualidade"},
      {"t":"list","v":["<b>Polimento</b> — superfície lisa reduz atrito no cano e melhora a trajetória","<b>Balanceamento</b> — distribuição uniforme de massa elimina desvios laterais","<b>Tolerância dimensional</b> — diâmetro consistente garante vedação com o hop-up"]},
      {"t":"h3","v":"Bio vs Comum"},
      {"t":"p","v":"BBs biodegradáveis são obrigatórias na maioria dos campos outdoor. As melhores marcas bio já entregam qualidade equivalente às comuns."},
      {"t":"insight","v":"Se você investe em cano de precisão, usar BB comum é desperdiçar 50% do potencial do seu setup."},
      {"t":"cta","text":"BBs premium fazem diferença mensurável. Literalmente o upgrade de maior impacto por real investido.","href":"/categoria/bbs","label":"Ver BBs"}
    ]},
    {"n":"08","id":"manutencao","title":"Manutenção: O Segredo da Longevidade","hl":"Longevidade","blocks":[
      {"t":"p","v":"Um setup perfeito sem manutenção é um setup em decadência. Lubrificação, limpeza e inspeção regular mantêm a performance ao longo do tempo."},
      {"t":"h3","v":"Lubrificação Correta"},
      {"t":"table","headers":["Componente","Lubrificante","Observação"],"rows":[["Engrenagens","Graxa de lítio ou teflon","Baixa resistência, camada fina"],["O-rings","Óleo de silicone","Mantém a vedação, evita ressecamento"],["Cilindro","Camada mínima","Quase seco — excesso atrai sujeira"],["Cano interno","Limpo e seco","Sem óleo — use vareta com pano limpo"]]},
      {"t":"insight","v":"Excesso de lubrificação é tão prejudicial quanto a ausência. Graxa demais atrai sujeira, cria pasta abrasiva e acelera o desgaste."}
    ]},
    {"n":"09","id":"setup","title":"O Setup Inteligente","hl":"Inteligente","blocks":[
      {"t":"p","v":"Se você tivesse que montar um setup eficiente hoje, com o melhor equilíbrio entre custo, resultado e confiabilidade, este seria o caminho:"},
      {"t":"specs","v":[{"label":"Cano","value":"6.03mm","desc":"O upgrade mais equilibrado para 90% dos jogadores"},{"label":"Bucking","value":"60°","desc":"Versatilidade e consistência de contato"},{"label":"Motor","value":"Hi-Torque","desc":"Resposta rápida no gatilho, menor consumo"},{"label":"Vedação","value":"100%","desc":"O-rings, nozzle e pistão sem vazamento"}]},
      {"t":"p","v":"Some a isso um shimming bem feito, volume de ar compatível com o cano, e BBs de qualidade."},
      {"t":"cta","text":"Monte seu setup com componentes testados e recomendados por quem entende do assunto.","href":"/categoria/pecas","label":"Ver componentes"}
    ]},
    {"n":"10","id":"conduta","title":"Conduta em Campo: O Que Define um Jogador de Verdade","hl":"Verdade","blocks":[
      {"t":"p","v":"No airsoft, habilidade técnica impressiona… mas caráter é o que define respeito no campo. Nenhum setup compensa falta de postura."},
      {"t":"h3","v":"Sistema de Honra"},
      {"t":"p","v":"O airsoft é baseado em confiança mútua. Se você foi atingido, levante a mão imediatamente, grite HIT e saia do campo. Sem discussão. Sem ego."},
      {"t":"bq","v":"O airsoft só funciona porque existe confiança entre os jogadores."},
      {"t":"h3","v":"O que te constrói vs. o que te queima"},
      {"t":"rules","v":[{"kind":"do","text":"Acuse hit imediatamente, sempre"},{"kind":"do","text":"Use a regra do Bang em distâncias curtas"},{"kind":"do","text":"Respeite iniciantes e ajude quem está começando"},{"kind":"do","text":"Mantenha óculos de proteção o tempo todo"},{"kind":"dont","text":"Overshooting — atirar em excesso em alvo já eliminado"},{"kind":"dont","text":"Discutir durante a partida — resolva depois"},{"kind":"dont","text":"Não acusar hit — isso destrói sua reputação"},{"kind":"dont","text":"Apontar arma fora do campo de jogo"}]},
      {"t":"p","v":"O jogador avançado sabe quando avançar, sabe quando recuar, e não entrega posição por ego."},
      {"t":"insight","v":"Jogadores medianos focam no equipamento. Jogadores respeitados focam na conduta. A diferença não está na arma — está na postura."}
    ]}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;
