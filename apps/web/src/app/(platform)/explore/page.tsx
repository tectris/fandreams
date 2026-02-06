'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CreatorCard } from '@/components/creator/creator-card'
import { Search, Compass, TrendingUp, Star } from 'lucide-react'
import { useState } from 'react'

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
      const path = searchQuery ? `/discover/search?q=${encodeURIComponent(searchQuery)}` : '/discover'
      const res = await api.get<any[]>(path)
      return res.data
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<any[]>('/discover/categories')
      return res.data
    },
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Compass className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Explorar</h1>
      </div>

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
      {trending && trending.length > 0 && !searchQuery && (
        <div className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
            <TrendingUp className="w-5 h-5 text-secondary" />
            Em alta
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {trending.map((creator: any) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </div>
      )}

      {/* All creators */}
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
          <Star className="w-5 h-5 text-primary" />
          {searchQuery ? 'Resultados' : 'Todos os criadores'}
        </h2>
        {creators && creators.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {creators.map((creator: any) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <Compass className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum criador encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
