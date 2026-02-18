'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CreatorCard } from '@/components/creator/creator-card'
import { Search, Compass, TrendingUp, Star, Flame, Swords, Megaphone, ArrowRight, Users, Target } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

// Mock creators to show when API returns empty
const MOCK_CREATORS_DATA = [
  { id: 'mock-1', username: 'isabellamorais', displayName: 'Isabella M.', avatarUrl: 'https://picsum.photos/seed/isabella/200/200', coverUrl: 'https://picsum.photos/seed/isabella-cover/400/200', bio: 'Fotografia artistica e lifestyle', category: 'Fotografia', subscriptionPrice: '19.90', totalSubscribers: 1247 },
  { id: 'mock-2', username: 'rafasilva', displayName: 'Rafa Silva', avatarUrl: 'https://picsum.photos/seed/rafa/200/200', coverUrl: 'https://picsum.photos/seed/rafa-cover/400/200', bio: 'Produtor musical e DJ', category: 'Musica', subscriptionPrice: '14.90', totalSubscribers: 832 },
  { id: 'mock-3', username: 'brunacosta', displayName: 'Bruna C.', avatarUrl: 'https://picsum.photos/seed/bruna/200/200', coverUrl: 'https://picsum.photos/seed/bruna-cover/400/200', bio: 'Fitness e bem-estar', category: 'Fitness', subscriptionPrice: '24.90', totalSubscribers: 2103 },
  { id: 'mock-4', username: 'lucas.art', displayName: 'Lucas Art', avatarUrl: 'https://picsum.photos/seed/lucas-art/200/200', coverUrl: 'https://picsum.photos/seed/lucas-cover/400/200', bio: 'Ilustracao digital e NFTs', category: 'Arte', subscriptionPrice: '9.90', totalSubscribers: 456 },
  { id: 'mock-5', username: 'amandafr', displayName: 'Amanda F.', avatarUrl: 'https://picsum.photos/seed/amanda/200/200', coverUrl: 'https://picsum.photos/seed/amanda-cover/400/200', bio: 'Receitas e gastronomia criativa', category: 'Gastronomia', subscriptionPrice: '12.90', totalSubscribers: 1589 },
  { id: 'mock-6', username: 'thaisgomes', displayName: 'Thais G.', avatarUrl: 'https://picsum.photos/seed/thais/200/200', coverUrl: 'https://picsum.photos/seed/thais-cover/400/200', bio: 'Moda, tendencias e styling', category: 'Moda', subscriptionPrice: '17.90', totalSubscribers: 967 },
  { id: 'mock-7', username: 'carolprado', displayName: 'Carol P.', avatarUrl: 'https://picsum.photos/seed/carol/200/200', coverUrl: 'https://picsum.photos/seed/carol-cover/400/200', bio: 'Yoga e meditacao guiada', category: 'Bem-estar', subscriptionPrice: '29.90', totalSubscribers: 1834 },
  { id: 'mock-8', username: 'daniribeiro', displayName: 'Dani R.', avatarUrl: 'https://picsum.photos/seed/dani/200/200', coverUrl: 'https://picsum.photos/seed/dani-cover/400/200', bio: 'Tutoriais de maquiagem e beleza', category: 'Beleza', subscriptionPrice: '15.90', totalSubscribers: 2450 },
]

const MOCK_GUILDS = [
  { id: 'guild-1', name: 'Studio Criativo', slug: 'studio-criativo', description: 'Grupo de artistas e fotografos colaborando em projetos visuais', members: 12, avatarSeed: 'guild-studio', category: 'Arte' },
  { id: 'guild-2', name: 'Beats & Flows', slug: 'beats-flows', description: 'Produtores musicais e DJs independentes', members: 8, avatarSeed: 'guild-beats', category: 'Musica' },
  { id: 'guild-3', name: 'FitSquad BR', slug: 'fitsquad-br', description: 'Criadores de conteudo fitness e saude', members: 15, avatarSeed: 'guild-fit', category: 'Fitness' },
]

const MOCK_PITCHES = [
  { id: 'pitch-1', title: 'Documentario: Artistas de Rua SP', creator: 'Isabella M.', goal: 50000, raised: 32500, contributors: 87, daysLeft: 18, category: 'Documentario', coverSeed: 'pitch-doc' },
  { id: 'pitch-2', title: 'Album Colaborativo: Sons do Brasil', creator: 'Rafa Silva', goal: 30000, raised: 28900, contributors: 142, daysLeft: 5, category: 'Musica', coverSeed: 'pitch-album' },
  { id: 'pitch-3', title: 'E-book: Receitas Veganas Brasileiras', creator: 'Amanda F.', goal: 15000, raised: 7200, contributors: 53, daysLeft: 24, category: 'Gastronomia', coverSeed: 'pitch-ebook' },
]

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('')

  const { data: trending } = useQuery({
    queryKey: ['trending'],
    queryFn: async () => {
      const res = await api.get<any[]>('/discover/trending')
      return res.data
    },
  })

  const { data: creators } = useQuery({
    queryKey: ['discover', searchQuery],
    queryFn: async () => {
      const path = searchQuery
        ? `/discover/search?q=${encodeURIComponent(searchQuery)}`
        : '/discover'
      const res = await api.get<any[]>(path)
      return res.data
    },
  })

  // Search all users (not just creators) when there's a search query
  const { data: userResults } = useQuery({
    queryKey: ['discover-users', searchQuery],
    queryFn: async () => {
      const res = await api.get<any[]>(`/discover/search/users?q=${encodeURIComponent(searchQuery)}`)
      return res.data
    },
    enabled: searchQuery.length >= 2,
  })

  // Merge: show creator results first, then add any users not already in creator results
  const searchResults = searchQuery && creators && userResults
    ? [
        ...creators,
        ...userResults.filter((u: any) => !creators.some((c: any) => c.id === u.id)),
      ]
    : creators

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<any[]>('/discover/categories')
      return res.data
    },
  })

  // Use mock data when API returns empty
  const displayCreators = searchQuery ? searchResults : (creators && creators.length > 0 ? creators : MOCK_CREATORS_DATA)
  const displayTrending = trending && trending.length > 0 ? trending : MOCK_CREATORS_DATA.slice(0, 4)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Compass className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Explorar</h1>
      </div>

      {/* Discover swipe CTA */}
      <Link
        href="/discover"
        className="flex items-center gap-3 mb-6 p-4 rounded-md bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border border-primary/20 hover:border-primary/40 transition-colors group"
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
          <Flame className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Descobrir perfis</p>
          <p className="text-xs text-muted">Deslize entre perfis com efeito Swipe</p>
        </div>
        <span className="text-primary text-sm font-medium">Explorar →</span>
      </Link>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar criadores por nome, categoria..."
          className="w-full pl-12 pr-4 py-3 rounded-md bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wider">Categorias</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat: any) => (
              <button
                key={cat.category}
                onClick={() => setSearchQuery(cat.category)}
                className="px-4 py-1.5 bg-surface border border-border rounded-full text-sm hover:border-primary hover:text-primary transition-colors"
              >
                {cat.category} ({cat.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending */}
      {!searchQuery && (
        <div className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
            <TrendingUp className="w-5 h-5 text-secondary" />
            Em alta
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayTrending.map((creator: any) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </div>
      )}

      {/* Guildas Section */}
      {!searchQuery && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Swords className="w-5 h-5 text-diamond" />
              Guildas
            </h2>
            <Link href="/guilds" className="flex items-center gap-1 text-sm text-primary hover:text-primary-light transition-colors">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {MOCK_GUILDS.map((guild) => (
              <Link
                key={guild.id}
                href={`/guilds/${guild.id}`}
                className="block p-4 bg-surface rounded-md border border-border hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={`https://picsum.photos/seed/${guild.avatarSeed}/48/48`}
                    alt={guild.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-border group-hover:ring-primary/40 transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{guild.name}</h3>
                    <span className="text-xs text-muted">{guild.category}</span>
                  </div>
                </div>
                <p className="text-xs text-muted line-clamp-2 mb-3">{guild.description}</p>
                <div className="flex items-center gap-1 text-xs text-muted">
                  <Users className="w-3.5 h-3.5" />
                  <span>{guild.members} membros</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pitch Section */}
      {!searchQuery && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Megaphone className="w-5 h-5 text-accent" />
              Pitch — Campanhas ativas
            </h2>
            <Link href="/pitch" className="flex items-center gap-1 text-sm text-primary hover:text-primary-light transition-colors">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {MOCK_PITCHES.map((pitch) => {
              const progress = Math.round((pitch.raised / pitch.goal) * 100)
              return (
                <Link
                  key={pitch.id}
                  href={`/pitch/${pitch.id}`}
                  className="block bg-surface rounded-md border border-border hover:border-primary/40 transition-colors overflow-hidden group"
                >
                  <div className="h-28 bg-gradient-to-br from-primary/20 to-secondary/20 relative">
                    <img
                      src={`https://picsum.photos/seed/${pitch.coverSeed}/400/150`}
                      alt={pitch.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-background/80 backdrop-blur-sm rounded-full text-xs font-medium text-foreground">
                      {pitch.daysLeft}d restantes
                    </span>
                  </div>
                  <div className="p-4">
                    <span className="text-xs text-primary font-medium">{pitch.category}</span>
                    <h3 className="font-semibold text-sm mt-1 line-clamp-2 group-hover:text-primary transition-colors">{pitch.title}</h3>
                    <p className="text-xs text-muted mt-1">por {pitch.creator}</p>
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="w-full bg-surface-light rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs font-bold text-foreground">{progress}%</span>
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {(pitch.goal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted mt-2">
                      <Users className="w-3.5 h-3.5" />
                      <span>{pitch.contributors} apoiadores</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* All creators / search results */}
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
          <Star className="w-5 h-5 text-primary" />
          {searchQuery ? 'Resultados' : 'Todos os criadores'}
        </h2>
        {displayCreators && displayCreators.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayCreators.map((item: any) => (
              <CreatorCard key={item.id} creator={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <Compass className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum usuario encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
