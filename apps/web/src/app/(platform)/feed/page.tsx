'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PostCard } from '@/components/feed/post-card'
import { useAuthStore } from '@/lib/store'
import { Flame, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function FeedPage() {
  const { isAuthenticated } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['feed', isAuthenticated ? 'personal' : 'public'],
    queryFn: async () => {
      const path = isAuthenticated ? '/feed' : '/feed/public'
      const res = await api.get<{ posts: any[]; total: number }>(path)
      return res.data
    },
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Flame className="w-6 h-6 text-primary" />
          {isAuthenticated ? 'Seu Feed' : 'Destaques'}
        </h1>
        {isAuthenticated && (
          <Link href="/explore">
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              Explorar
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-md p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-surface-light rounded-full" />
                <div className="space-y-2">
                  <div className="w-32 h-3 bg-surface-light rounded" />
                  <div className="w-24 h-2 bg-surface-light rounded" />
                </div>
              </div>
              <div className="w-full h-48 bg-surface-light rounded" />
            </div>
          ))}
        </div>
      ) : data?.posts && data.posts.length > 0 ? (
        <div>
          {data.posts.map((post: any) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Flame className="w-16 h-16 text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Seu feed esta vazio</h2>
          <p className="text-muted text-sm mb-6">
            Assine criadores para ver o conteudo deles aqui
          </p>
          <Link href="/explore">
            <Button>Explorar criadores</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
