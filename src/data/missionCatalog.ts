export interface MissionContent {
  id: string;
  label: string;
  subtitle?: string;
  slug: string;
  shortDescription: string;
  category: 'type' | 'mode';
}

export const MISSION_TYPES: MissionContent[] = [
  {
    id: 'milsim',
    label: 'Milsim',
    subtitle: 'Real Action',
    slug: 'milsim-real-action',
    shortDescription: 'Simulação Militar focada em realismo extremo, hierarquia e táticas autênticas.',
    category: 'type'
  },
  {
    id: 'forfun',
    label: 'ForFun',
    subtitle: 'Diversão',
    slug: 'for-fun-diversao',
    shortDescription: 'Partidas focadas em diversão e dinamismo, com regras mais flexíveis e ritmo acelerado.',
    category: 'type'
  }
];

export const GAME_MODES: MissionContent[] = [
  {
    id: 'tdm',
    label: 'Team Deathmatch',
    slug: 'team-deathmatch',
    shortDescription: 'Confronto direto entre duas equipes. Vence quem eliminar mais oponentes.',
    category: 'mode'
  },
  {
    id: 'defend_zone',
    label: 'Defend the Zone',
    slug: 'defend-the-zone',
    shortDescription: 'Uma equipe deve proteger uma área vital enquanto a outra tenta capturá-la.',
    category: 'mode'
  },
  {
    id: 'skirmish',
    label: 'Skirmish (Free For All)',
    slug: 'skirmish-free-for-all',
    shortDescription: 'Cada operador por si. O último sobrevivente ou o que somar mais pontos vence.',
    category: 'mode'
  },
  {
    id: 'ctf',
    label: 'Capture the Flag',
    slug: 'capture-the-flag',
    shortDescription: 'Capturar a bandeira inimiga e levá-la à sua base enquanto protege a sua.',
    category: 'mode'
  },
  {
    id: 'bomb',
    label: 'Bomb / Bomb Defusal',
    slug: 'bomb-defusal',
    shortDescription: 'Uma equipe tenta armar um dispositivo em locais específicos e a outra deve impedir.',
    category: 'mode'
  },
  {
    id: 'domination',
    label: 'Domination',
    slug: 'domination',
    shortDescription: 'Controlar múltiplos pontos estratégicos no mapa para acumular pontos ao longo do tempo.',
    category: 'mode'
  },
  {
    id: 'koth',
    label: 'King of the Hill',
    slug: 'king-of-the-hill',
    shortDescription: 'Manter o controle de um único ponto central pelo maior tempo possível.',
    category: 'mode'
  },
  {
    id: 'vip',
    label: 'VIP / Protect the VIP',
    slug: 'protect-the-vip',
    shortDescription: 'Escortar um operador desarmado até um ponto de extração enquanto o inimigo tenta abatê-lo.',
    category: 'mode'
  },
  {
    id: 'search_destroy',
    label: 'Search and Destroy',
    slug: 'search-and-destroy',
    shortDescription: 'Eliminar o inimigo ou destruir objetivos específicos sem renascimentos.',
    category: 'mode'
  },
  {
    id: 'last_man',
    label: 'Last Man Standing',
    slug: 'last-man-standing',
    shortDescription: 'Sobrevivência pura. O jogo termina quando apenas um operador resta em campo.',
    category: 'mode'
  },
  {
    id: 'zombie',
    label: 'Zombie / Infection',
    slug: 'zombie-infection',
    shortDescription: 'Um "infectado" começa a caçada. Operadores eliminados tornam-se zumbis.',
    category: 'mode'
  },
  {
    id: 'recon',
    label: 'Recon / Reconhecimento',
    slug: 'recon-reconhecimento',
    shortDescription: 'Foco em infiltração e coleta de informações sem ser detectado pelo inimigo.',
    category: 'mode'
  }
];
