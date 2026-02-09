'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PostCard } from '@/components/feed/post-card'
import { PpvUnlockDrawer } from '@/components/feed/ppv-unlock-drawer'
import { useAuthStore } from '@/lib/store'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const res = await api.get<any>(`/posts/${id}`)
      return res.data
    },
    enabled: !!id,
  })

  const { data: commentsData } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const res = await api.get<any>(`/posts/${id}/comments`)
      return res.data
    },
    enabled: !!id,
  })

  const comments = commentsData?.comments || commentsData || []

  const editMutation = useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: Record<string, unknown> }) =>
      api.patch(`/posts/${postId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      toast.success('Post atualizado!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao editar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => api.delete(`/posts/${postId}`),
    onSuccess: () => {
      toast.success('Post excluido!')
      router.push('/feed')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao excluir'),
  })

  const likeMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/like`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', id] }),
    onError: (e: any) => toast.error(e.message || 'Erro ao curtir'),
  })

  const bookmarkMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/bookmark`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', id] }),
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  })

  const commentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      api.post(`/posts/${postId}/comments`, { content }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] })
      toast.success('Comentario adicionado!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao comentar'),
  })

  const toggleVisibilityMutation = useMutation({
    mutationFn: (postId: string) => api.patch(`/posts/${postId}/toggle-visibility`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      toast.success('Visibilidade atualizada!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao alterar visibilidade'),
  })

  const tipMutation = useMutation({
    mutationFn: ({ postId, creatorId, amount }: { postId: string; creatorId: string; amount: number }) =>
      api.post('/fancoins/tip', { creatorId, amount, referenceId: postId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fancoin-wallet'] })
      queryClient.invalidateQueries({ queryKey: ['fancoin-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      toast.success('Tip enviado com sucesso!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar tip'),
  })

  const [ppvDrawerOpen, setPpvDrawerOpen] = useState(false)

  function handlePpvUnlock(post: any) {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    setPpvDrawerOpen(true)
  }

  function handleSubscribe(post: any) {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    window.location.href = `/creator/${post.creatorUsername}`
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-surface border border-border rounded-md p-4 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-surface-light rounded-full" />
            <div className="space-y-2">
              <div className="w-32 h-3 bg-surface-light rounded" />
              <div className="w-24 h-2 bg-surface-light rounded" />
            </div>
          </div>
          <div className="w-full h-64 bg-surface-light rounded" />
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-center py-20">
          <p className="text-lg font-semibold mb-2">Post nao encontrado</p>
          <p className="text-muted text-sm mb-6">Este post pode ter sido removido ou nao existe.</p>
          <Link href="/feed" className="text-primary hover:underline text-sm">
            Voltar ao feed
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full hover:bg-surface-light transition-colors text-muted hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Post</h1>
      </div>

      <PostCard
        post={post}
        currentUserId={user?.id}
        isAuthenticated={isAuthenticated}
        onEdit={(postId, data) => editMutation.mutate({ postId, data })}
        onToggleVisibility={(postId) => toggleVisibilityMutation.mutate(postId)}
        onDelete={(postId) => deleteMutation.mutate(postId)}
        onLike={(postId) => likeMutation.mutate(postId)}
        onBookmark={(postId) => bookmarkMutation.mutate(postId)}
        onComment={(postId, content) => commentMutation.mutate({ postId, content })}
        onTip={(postId, creatorId, amount) => tipMutation.mutate({ postId, creatorId, amount })}
        onPpvUnlock={handlePpvUnlock}
        onSubscribe={handleSubscribe}
        comments={Array.isArray(comments) ? comments : []}
      />

      {post && (
        <PpvUnlockDrawer
          open={ppvDrawerOpen}
          onClose={() => setPpvDrawerOpen(false)}
          onUnlocked={() => queryClient.invalidateQueries({ queryKey: ['post', id] })}
          post={{
            id: post.id,
            ppvPrice: post.ppvPrice,
            creatorUsername: post.creatorUsername,
            creatorDisplayName: post.creatorDisplayName,
            contentText: post.contentText,
          }}
        />
      )}
    </div>
  )
}
