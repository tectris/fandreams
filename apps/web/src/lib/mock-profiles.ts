export interface MockPost {
  id: string
  contentText: string
  media: {
    id: string
    mediaType: 'image' | 'video'
    mediaUrl: string
    thumbnailUrl?: string
  }[]
  likesCount: number
  commentsCount: number
  createdAt: string
  visibility: 'public' | 'subscribers'
  ppvPrice?: string
}

export interface MockProfile {
  id: string
  username: string
  displayName: string
  avatarUrl: string
  coverUrl: string
  bio: string
  role: 'creator' | 'admin'
  category: string
  tags: string[]
  isVerified: boolean
  subscriptionPrice: string
  totalSubscribers: number
  followerCount: number
  profileViews: number
  creatorScore: number
  gamification: {
    level: number
    xp: number
    currentStreak: number
    fanTier: 'bronze' | 'silver' | 'gold' | 'diamond'
  }
  posts: MockPost[]
  createdAt: string
}

export const mockProfiles: MockProfile[] = [
  {
    id: 'mock-1',
    username: 'luna.arte',
    displayName: 'Luna Martins',
    avatarUrl: 'https://picsum.photos/seed/luna-avatar/200/200',
    coverUrl: 'https://picsum.photos/seed/luna-cover/1200/400',
    bio: 'Artista digital e ilustradora. Criando mundos fantasticos com cores vibrantes. Compartilho tutoriais, processos criativos e arte exclusiva para meus fas.',
    role: 'creator',
    category: 'Arte Digital',
    tags: ['ilustracao', 'fantasia', 'tutorial', 'digital art'],
    isVerified: true,
    subscriptionPrice: '19.90',
    totalSubscribers: 1243,
    followerCount: 8750,
    profileViews: 45200,
    creatorScore: 87,
    gamification: {
      level: 15,
      xp: 7500,
      currentStreak: 23,
      fanTier: 'gold',
    },
    posts: [
      {
        id: 'post-1a',
        contentText: 'Novo processo criativo! Dessa vez criei uma guerreira elfica usando apenas 3 cores base. O segredo esta nas camadas de transparencia.',
        media: [
          {
            id: 'media-1a-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/luna1/800/1200',
          },
        ],
        likesCount: 342,
        commentsCount: 28,
        createdAt: '2026-02-15T14:30:00Z',
        visibility: 'public',
      },
      {
        id: 'post-1b',
        contentText: 'Speed painting de paisagem cyberpunk. 2 horas de trabalho condensadas em 60 segundos!',
        media: [
          {
            id: 'media-1b-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/luna2/800/1200',
          },
        ],
        likesCount: 521,
        commentsCount: 45,
        createdAt: '2026-02-13T10:15:00Z',
        visibility: 'public',
      },
      {
        id: 'post-1c',
        contentText: 'Tutorial: Como criar texturas realistas em ilustracao digital. Passo a passo completo!',
        media: [
          {
            id: 'media-1c-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/luna3/800/1200',
          },
        ],
        likesCount: 189,
        commentsCount: 67,
        createdAt: '2026-02-10T18:00:00Z',
        visibility: 'subscribers',
        ppvPrice: '9.90',
      },
      {
        id: 'post-1d',
        contentText: 'Colecao completa do projeto "Deusas Mitologicas" - 12 ilustracoes em alta resolucao.',
        media: [
          {
            id: 'media-1d-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/luna4/800/1200',
          },
        ],
        likesCount: 876,
        commentsCount: 92,
        createdAt: '2026-02-08T12:00:00Z',
        visibility: 'public',
      },
      {
        id: 'post-1e',
        contentText: 'Bastidores: meu setup de ilustracao, tablet, monitores e as ferramentas que uso todo dia.',
        media: [
          {
            id: 'media-1e-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/luna5/800/1200',
          },
        ],
        likesCount: 245,
        commentsCount: 38,
        createdAt: '2026-02-05T16:00:00Z',
        visibility: 'subscribers',
        ppvPrice: '4.90',
      },
    ],
    createdAt: '2024-06-15T00:00:00Z',
  },
  {
    id: 'mock-2',
    username: 'dj.thunder',
    displayName: 'DJ Thunder',
    avatarUrl: 'https://picsum.photos/seed/thunder-avatar/200/200',
    coverUrl: 'https://picsum.photos/seed/thunder-cover/1200/400',
    bio: 'Produtor musical e DJ. Sets exclusivos, remixes e bastidores da producao. De festivais a home studio, compartilho tudo com voces!',
    role: 'creator',
    category: 'Musica',
    tags: ['edm', 'producao musical', 'dj', 'remixes'],
    isVerified: true,
    subscriptionPrice: '14.90',
    totalSubscribers: 3567,
    followerCount: 22100,
    profileViews: 89300,
    creatorScore: 92,
    gamification: {
      level: 22,
      xp: 15200,
      currentStreak: 45,
      fanTier: 'diamond',
    },
    posts: [
      {
        id: 'post-2a',
        contentText: 'Set completo do festival de verao! 2 horas de pura energia. Quem estava la sabe como foi insano!',
        media: [
          {
            id: 'media-2a-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/thunder1/800/1200',
          },
        ],
        likesCount: 1203,
        commentsCount: 156,
        createdAt: '2026-02-16T22:00:00Z',
        visibility: 'public',
      },
      {
        id: 'post-2b',
        contentText: 'Remix exclusivo: peguei aquela track viral e transformei numa bomba de pista. Feedback?',
        media: [
          {
            id: 'media-2b-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/thunder2/800/1200',
          },
        ],
        likesCount: 678,
        commentsCount: 89,
        createdAt: '2026-02-14T16:30:00Z',
        visibility: 'subscribers',
        ppvPrice: '7.90',
      },
      {
        id: 'post-2c',
        contentText: 'Bastidores do studio: montando o setup novo. Esse controlador MIDI e uma nave espacial!',
        media: [
          {
            id: 'media-2c-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/thunder3/800/1200',
          },
        ],
        likesCount: 445,
        commentsCount: 34,
        createdAt: '2026-02-12T11:00:00Z',
        visibility: 'public',
      },
      {
        id: 'post-2d',
        contentText: 'Masterclass: como mixar tracks ao vivo sem perder o BPM. Tecnicas avancadas que uso nos festivais.',
        media: [
          {
            id: 'media-2d-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/thunder4/800/1200',
          },
        ],
        likesCount: 934,
        commentsCount: 112,
        createdAt: '2026-02-09T20:00:00Z',
        visibility: 'subscribers',
        ppvPrice: '14.90',
      },
    ],
    createdAt: '2024-03-20T00:00:00Z',
  },
  {
    id: 'mock-3',
    username: 'chef.maya',
    displayName: 'Maya Cozinha',
    avatarUrl: 'https://picsum.photos/seed/maya-avatar/200/200',
    coverUrl: 'https://picsum.photos/seed/maya-cover/1200/400',
    bio: 'Chef confeiteira e criadora de receitas. Transformo ingredientes simples em obras de arte comestiveis. Receitas exclusivas toda semana!',
    role: 'creator',
    category: 'Gastronomia',
    tags: ['confeitaria', 'receitas', 'gastronomia', 'doces'],
    isVerified: false,
    subscriptionPrice: '9.90',
    totalSubscribers: 876,
    followerCount: 5430,
    profileViews: 23100,
    creatorScore: 74,
    gamification: {
      level: 10,
      xp: 4200,
      currentStreak: 12,
      fanTier: 'silver',
    },
    posts: [
      {
        id: 'post-3a',
        contentText: 'Bolo de chocolate com recheio de frutas vermelhas! Receita completa nos comentarios.',
        media: [
          {
            id: 'media-3a-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/maya1/800/1200',
          },
        ],
        likesCount: 234,
        commentsCount: 45,
        createdAt: '2026-02-17T09:00:00Z',
        visibility: 'public',
      },
      {
        id: 'post-3b',
        contentText: 'Macarons perfeitos: o segredo esta no macaronnage. Tutorial passo a passo!',
        media: [
          {
            id: 'media-3b-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/maya2/800/1200',
          },
        ],
        likesCount: 567,
        commentsCount: 78,
        createdAt: '2026-02-14T14:00:00Z',
        visibility: 'public',
      },
      {
        id: 'post-3c',
        contentText: 'Decoracao de bolos: tecnicas avancadas com fondant e pasta americana.',
        media: [
          {
            id: 'media-3c-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/maya3/800/1200',
          },
        ],
        likesCount: 312,
        commentsCount: 23,
        createdAt: '2026-02-11T17:30:00Z',
        visibility: 'subscribers',
        ppvPrice: '5.90',
      },
      {
        id: 'post-3d',
        contentText: 'Petit gateau com calda de caramelo salgado. Essa combinacao e perfeita!',
        media: [
          {
            id: 'media-3d-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/maya4/800/1200',
          },
        ],
        likesCount: 421,
        commentsCount: 56,
        createdAt: '2026-02-09T20:00:00Z',
        visibility: 'public',
      },
      {
        id: 'post-3e',
        contentText: 'Brigadeiros gourmet: 5 sabores diferentes para surpreender no proximo evento!',
        media: [
          {
            id: 'media-3e-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/maya5/800/1200',
          },
        ],
        likesCount: 198,
        commentsCount: 31,
        createdAt: '2026-02-07T15:00:00Z',
        visibility: 'public',
      },
    ],
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'mock-4',
    username: 'admin.fandreams',
    displayName: 'FanDreams Admin',
    avatarUrl: 'https://picsum.photos/seed/admin-avatar/200/200',
    coverUrl: 'https://picsum.photos/seed/admin-cover/1200/400',
    bio: 'Conta oficial do FanDreams. Novidades da plataforma, dicas para criadores e atualizacoes sobre novas funcionalidades.',
    role: 'admin',
    category: 'Plataforma',
    tags: ['oficial', 'noticias', 'dicas', 'plataforma'],
    isVerified: true,
    subscriptionPrice: '0.00',
    totalSubscribers: 15420,
    followerCount: 48900,
    profileViews: 312000,
    creatorScore: 100,
    gamification: {
      level: 50,
      xp: 99999,
      currentStreak: 365,
      fanTier: 'diamond',
    },
    posts: [
      {
        id: 'post-4a',
        contentText: 'Nova funcionalidade: Descobrir Perfis com efeito Swipe! Deslize para cima e para baixo para conhecer novos criadores.',
        media: [
          {
            id: 'media-4a-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/admin1/800/1200',
          },
        ],
        likesCount: 2340,
        commentsCount: 456,
        createdAt: '2026-02-17T12:00:00Z',
        visibility: 'public',
      },
      {
        id: 'post-4b',
        contentText: 'Dica para criadores: Use tags relevantes no seu perfil para aparecer mais nas buscas. Criadores com tags completas recebem 3x mais visualizacoes!',
        media: [
          {
            id: 'media-4b-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/admin2/800/1200',
          },
        ],
        likesCount: 1567,
        commentsCount: 234,
        createdAt: '2026-02-15T10:00:00Z',
        visibility: 'public',
      },
      {
        id: 'post-4c',
        contentText: 'Atualizacao de seguranca: agora todos os saques via PIX passam por verificacao antifraude em 24-48h para proteger criadores e fas.',
        media: [
          {
            id: 'media-4c-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/admin3/800/1200',
          },
        ],
        likesCount: 892,
        commentsCount: 167,
        createdAt: '2026-02-12T15:00:00Z',
        visibility: 'public',
      },
      {
        id: 'post-4d',
        contentText: 'Conteudo exclusivo para assinantes: Roadmap completo do FanDreams para 2026. Veja o que vem por ai!',
        media: [
          {
            id: 'media-4d-1',
            mediaType: 'image',
            mediaUrl: 'https://picsum.photos/seed/admin4/800/1200',
          },
        ],
        likesCount: 3100,
        commentsCount: 589,
        createdAt: '2026-02-10T09:00:00Z',
        visibility: 'subscribers',
        ppvPrice: '0.00',
      },
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
]
