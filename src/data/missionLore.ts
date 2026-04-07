export const MISSION_LORE: Record<string, { fullDescription: string, tacticalTips: string[] }> = {
  'milsim-real-action': {
    fullDescription: 'O Milsim (Military Simulation) é o ápice do realismo no airsoft. Diferente de partidas casuais, o Milsim exige que os operadores sigam uma cadeia de comando rígida, utilizem limitações reais de munição (low-cap/mid-cap) e apliquem táticas de unidades militares autênticas. O foco não é apenas o combate, mas a logística, a navegação terrestre e a resistência física e mental.',
    tacticalTips: [
      'Estude o mapa e as coordenadas antes da inserção.',
      'Mantenha a rádio-disciplina e use códigos de comunicação.',
      'Economize munição; cada disparo deve ser consciente.'
    ]
  },
  'for-fun-diversao': {
    fullDescription: 'A modalidade ForFun é focada na dinâmica e na diversidade de combates rápidos. As regras são simplificadas para permitir que jogadores de todos os níveis experimentem diferentes situações táticas. É o ambiente ideal para testar equipamentos, treinar mira e se integrar à comunidade sem a pressão de uma simulação rigorosa.',
    tacticalTips: [
      'Mantenha-se em movimento constante.',
      'Comunique-se de forma rápida e direta com sua equipe.',
      'Priorize a diversão e o fair-play.'
    ]
  },
  'team-deathmatch': {
    fullDescription: 'O clássico confronto de atrito. Duas equipes se enfrentam com o objetivo único de eliminar o maior número possível de adversários dentro de um tempo limite ou até que um limite de baixas seja atingido. É o teste definitivo de habilidade individual e coordenação de esquadrão.',
    tacticalTips: [
      'Use o terreno a seu favor e evite campos abertos.',
      'Cubra os ângulos de seus companheiros durante o avanço.',
      'Fique atento aos pontos de respawn inimigos.'
    ]
  },
  'defend-the-zone': {
    fullDescription: 'Neste modo, uma equipe é designada para fortificar e proteger um perímetro específico ou sala (Kill Zone), enquanto a outra tenta uma incursão bem-sucedida. A defesa tem a vantagem da posição, mas o ataque tem a iniciativa e muitas vezes mais pontos de entrada.',
    tacticalTips: [
      'Estabeleça perímetros de visão cruzada (crossfire).',
      'No ataque, use granadas e fumaça para ocultar o avanço.',
      'Mantenha um operador de reserva para cobrir brechas.'
    ]
  },
  'skirmish-free-for-all': {
    fullDescription: 'Cada operador atua de forma independente. Sem aliados, sem comunicações. O objetivo é a sobrevivência e a eliminação de qualquer ameaça que cruzar seu caminho. Exige alto nível de consciência situacional e furtividade.',
    tacticalTips: [
      'Evite disparos desnecessários que revelem sua posição.',
      'Mova-se pelas bordas do mapa.',
      'Ouça atentamente; o som é seu melhor aliado.'
    ]
  },
  'capture-the-flag': {
    fullDescription: 'Um teste de estratégia e velocidade. Cada equipe deve infiltrar-se na base inimiga, capturar sua bandeira e trazê-la de volta à sua própria base. Requer uma divisão clara entre defensores da base e unidades de incursão rápida.',
    tacticalTips: [
      'Designar "Runners" leves para a captura rápida.',
      'Mantenha uma defesa sólida e nunca deixe a bandeira desprotegida.',
      'Crie rotas alternadas para o retorno com a bandeira.'
    ]
  },
  'bomb-defusal': {
    fullDescription: 'Modo baseado em objetivos assimétricos. O ataque deve plantar um dispositivo em um dos locais designados, enquanto a defesa deve impedir ou desarmar o dispositivo se ele for ativado. O tempo é o maior inimigo aqui.',
    tacticalTips: [
      'O ataque deve fingir investidas em um ponto para distrair a defesa.',
      'Defesa deve rotacionar rapidamente assim que a bomba for avistada.',
      'Utilize comunicações claras sobre o status do cronômetro.'
    ]
  },
  'domination': {
    fullDescription: 'As equipes lutam pelo controle de múltiplos pontos estratégicos (A, B, C). Quanto mais pontos você controla, mais rápido sua equipe acumula pontuação. É um modo que exige mobilidade constante e a capacidade de retomar áreas perdidas.',
    tacticalTips: [
      'Controle o ponto central para facilitar a rotação entre os outros.',
      'Não se aglomere em um único ponto; espalhe a força.',
      'Comunique-se quando um ponto estiver sofrendo ataque.'
    ]
  },
  'king-of-the-hill': {
    fullDescription: 'Um único ponto de controle no centro do mapa é o foco de toda a ação. As equipes devem capturar e manter a zona. O cronômetro só corre para a equipe que estiver dentro da área designada e tiver eliminado os ocupantes anteriores.',
    tacticalTips: [
      'Use granadas de efeito para limpar o "King" antes de entrar.',
      'Uma vez dentro, use barreiras portáteis ou cobertura pesada.',
      'Mantenha suporte de longa distância fora da zona para cobertura.'
    ]
  },
  'protect-the-vip': {
    fullDescription: 'Um jogador é designado como o VIP (geralmente desarmado ou com armamento limitado). Sua equipe deve protegê-lo até um ponto de extração seguro, enquanto a equipe opositora tenta eliminá-lo. É um jogo de escolta de alto risco.',
    tacticalTips: [
      'Forme um diamante de proteção ao redor do VIP.',
      'O VIP deve manter um perfil baixo e usar a cobertura máxima.',
      'Utilize batedores para limpar o caminho antes da escolta avançar.'
    ]
  },
  'search-and-destroy': {
    fullDescription: 'Modo de alta tensão com renascimentos limitados ou inexistentes. O objetivo é a eliminação total da equipe inimiga ou a destruição de um alvo estratégico. Cada movimento conta e a cautela é imperativa.',
    tacticalTips: [
      'Valorize sua vida acima de tudo; não se exponha sem cobertura.',
      'Use drones ou espelhos táticos para checar cantos.',
      'O silêncio é fundamental para o sucesso da infiltração.'
    ]
  },
  'last-man-standing': {
    fullDescription: 'Uma variação do Free For All onde não há limite de tempo, apenas a contagem regressiva de vidas. O último operador vivo em campo é coroado o vencedor. Ideal para testar a resiliência sob pressão extrema.',
    tacticalTips: [
      'Deixe os outros competidores se eliminarem entre si.',
      'Prepare emboscadas em pontos de estrangulamento.',
      'Mantenha sua bateria e gás em níveis ótimos.'
    ]
  },
  'zombie-infection': {
    fullDescription: 'Um modo assimétrico e divertido. Começa com um "Zumbi Alfa". Cada humano eliminado torna-se um zumbi. O objetivo dos humanos é sobreviver até o tempo acabar. O objetivo dos zumbis é converter toda a população.',
    tacticalTips: [
      'Humanos: Procurem terrenos elevados e fáceis de defender.',
      'Zumbis: Ataquem em hordas coordenadas para sobrecarregar a defesa.',
      'Mantenha a lanterna tática pronta para ambientes escuros.'
    ]
  },
  'recon-reconhecimento': {
    fullDescription: 'Missão focada em furtividade e inteligência. O objetivo não é o confronto direto, mas a localização de objetivos, fotografia de instalações inimigas ou rastreamento de alvos sem ser detectado.',
    tacticalTips: [
      'Use camuflagem adequada ao terreno.',
      'A arma é o último recurso; o binóculo é o primeiro.',
      'Mova-se lentamente e utilize as sombras e a vegetação.'
    ]
  }
};
