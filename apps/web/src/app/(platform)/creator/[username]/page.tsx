'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PostCard } from '@/components/feed/post-card'
import { SubscribeDrawer } from '@/components/subscription/subscribe-drawer'
import { PpvUnlockDrawer } from '@/components/feed/ppv-unlock-drawer'
import { LevelBadge } from '@/components/gamification/level-badge'
import { StreakCounter } from '@/components/gamification/streak-counter'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Users, Calendar, Crown, Star, Camera, ImagePlus, UserPlus, UserCheck, SendHorizontal, FileText, Eye, Image, Video, AlertTriangle, Tag, MessageCircle, X, Link2, Share2, Copy, Check, Coins } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

export default function CreatorProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user, isAuthenticated, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeDrawerOpen, setSubscribeDrawerOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<any>(null)
  const [ppvDrawerOpen, setPpvDrawerOpen] = useState(false)
  const [ppvPost, setPpvPost] = useState<any>(null)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [affiliateDrawerOpen, setAffiliateDrawerOpen] = useState(false)
  const [affiliateCopied, setAffiliateCopied] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()
  const subscriptionStatus = searchParams.get('subscription')
  const refCode = searchParams.get('ref')

  useEffect(() => {
    if (subscriptionStatus === 'pending') {
      toast.info('Assinatura em processamento. Voce sera notificado quando for confirmada.')
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] })
    }
  }, [subscriptionStatus, queryClient])

  // Track affiliate click
  useEffect(() => {
    if (refCode) {
      api.post(`/affiliates/track/${refCode}`).catch(() => {})
    }
  }, [refCode])

  const { data: profile } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const res = await api.get<any>(`/users/${username}`)
      return res.data
    },
  })

  const { data: subscription } = useQuery({
    queryKey: ['subscription-status', profile?.id],
    queryFn: async () => {
      const res = await api.get<{
        isSubscribed: boolean
        subscription: {
          id: string
          status: string
          pricePaid: string
          currentPeriodEnd: string | null
          cancelledAt: string | null
          autoRenew: boolean
          isCancelled: boolean
          createdAt: string
        } | null
      }>(`/subscriptions/status/${profile.id}`)
      return res.data
    },
    enabled: !!profile?.id && isAuthenticated && profile.id !== user?.id,
  })

  const { data: followData } = useQuery({
    queryKey: ['follow-check', profile?.id],
    queryFn: async () => {
      const res = await api.get<{ isFollowing: boolean }>(`/users/${profile.id}/follow`)
      return res.data
    },
    enabled: !!profile?.id && isAuthenticated && profile.id !== user?.id,
  })

  const { data: postsData, error: postsError } = useQuery({
    queryKey: ['creator-posts', profile?.id],
    queryFn: async () => {
      const res = await api.get<{ posts: any[]; total: number }>(`/posts/creator/${profile.id}`)
      console.log('[creator-posts] API response:', { total: res.data?.total, postCount: res.data?.posts?.length, visibilities: res.data?.posts?.map((p: any) => p.visibility) })
      return res.data
    },
    enabled: !!profile?.id,
  })

  // Affiliate program query (for non-owners)
  const { data: affiliateProgram } = useQuery({
    queryKey: ['affiliate-program', username],
    queryFn: async () => {
      const res = await api.get<any>(`/affiliates/program/by-username/${username}`)
      return res.data
    },
    enabled: !!profile?.id && isAuthenticated && !!(profile.id !== user?.id),
    retry: false,
  })

  // Check if user already has an affiliate link for this creator
  const { data: myAffiliateLink } = useQuery({
    queryKey: ['my-affiliate-link', profile?.id],
    queryFn: async () => {
      const res = await api.get<any[]>('/affiliates/links')
      const links = res.data || []
      return links.find((l: any) => l.creatorId === profile.id) || null
    },
    enabled: !!profile?.id && isAuthenticated && !!affiliateProgram && profile.id !== user?.id,
  })

  const createAffiliateLinkMutation = useMutation({
    mutationFn: (creatorId: string) => api.post<any>('/affiliates/links', { creatorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-affiliate-link', profile?.id] })
      toast.success('Link de afiliado criado!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar link'),
  })

  const handleCopyAffiliateLink = useCallback((code: string) => {
    const url = `${window.location.origin}/creator/${username}?ref=${code}`
    navigator.clipboard.writeText(url)
    setAffiliateCopied(true)
    toast.success('Link de afiliado copiado!')
    setTimeout(() => setAffiliateCopied(false), 2000)
  }, [username])

  const editMutation = useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: Record<string, unknown> }) =>
      api.patch(`/posts/${postId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-posts'] })
      toast.success('Post atualizado!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao editar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => api.delete(`/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-posts'] })
      toast.success('Post excluido!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao excluir'),
  })

  const likeMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/like`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator-posts'] }),
    onError: (e: any) => toast.error(e.message || 'Erro ao curtir'),
  })

  const bookmarkMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/posts/${postId}/bookmark`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator-posts'] }),
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  })

  const commentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      api.post(`/posts/${postId}/comments`, { content }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creator-posts'] })
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] })
      toast.success('Comentario adicionado!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao comentar'),
  })

  const toggleVisibilityMutation = useMutation({
    mutationFn: (postId: string) => api.patch(`/posts/${postId}/toggle-visibility`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-posts'] })
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
      queryClient.invalidateQueries({ queryKey: ['creator-posts'] })
      toast.success('Tip enviado com sucesso!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar tip'),
  })

  const followMutation = useMutation({
    mutationFn: () => api.post(`/users/${profile.id}/follow`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-check', profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      toast.success(`Voce agora segue ${profile.displayName || profile.username}!`)
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao seguir'),
  })

  const unfollowMutation = useMutation({
    mutationFn: () => api.delete(`/users/${profile.id}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-check', profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      toast.success('Voce deixou de seguir')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao deixar de seguir'),
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>('/upload/avatar', file),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      if (user && res.data?.url) {
        setUser({ ...user, avatarUrl: res.data.url })
      }
      toast.success('Foto de perfil atualizada!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar imagem'),
  })

  const coverMutation = useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>('/upload/cover', file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      toast.success('Imagem de capa atualizada!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar imagem'),
  })

  const cancelMutation = useMutation({
    mutationFn: (subscriptionId: string) => api.delete(`/subscriptions/${subscriptionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status', profile?.id] })
      setCancelModalOpen(false)
      toast.success('Assinatura cancelada. Acesso mantido ate o fim do periodo.')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao cancelar assinatura'),
  })

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens sao aceitas')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no maximo 5MB')
      return
    }
    avatarMutation.mutate(file)
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens sao aceitas')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem deve ter no maximo 10MB')
      return
    }
    coverMutation.mutate(file)
  }

  function handleFollow() {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    if (followData?.isFollowing) {
      unfollowMutation.mutate()
    } else {
      followMutation.mutate()
    }
  }

  function handleSubscribe(tier?: any) {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    setSelectedTier(tier || null)
    setSubscribeDrawerOpen(true)
  }

  function handlePpvUnlock(post: any) {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    setPpvPost(post)
    setPpvDrawerOpen(true)
  }

  function getProfileShareUrl() {
    return `${window.location.origin}/creator/${username}`
  }

  function getProfileShareText() {
    return `Confira o perfil de ${profile?.displayName || username} no FanDreams!`
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.displayName || username} no FanDreams`,
          text: getProfileShareText(),
          url: getProfileShareUrl(),
        })
      } catch {
        // User cancelled
      }
    } else {
      setShowShareModal(true)
    }
  }

  function handleProfileCopyLink() {
    navigator.clipboard.writeText(getProfileShareUrl())
    toast.success('Link copiado!')
    setShowShareModal(false)
  }

  function handleProfileShareExternal(platform: string) {
    const url = encodeURIComponent(getProfileShareUrl())
    const text = encodeURIComponent(getProfileShareText())
    let shareUrl = ''

    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}%20${url}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`
        break
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${url}&text=${text}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`
        break
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500')
      setShowShareModal(false)
    }
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 animate-pulse">
        <div className="h-48 bg-surface rounded-md mb-6" />
        <div className="h-6 w-48 bg-surface rounded mb-2" />
        <div className="h-4 w-32 bg-surface rounded" />
      </div>
    )
  }

  const isOwner = user?.id === profile.id
  const isSubscribed = subscription?.isSubscribed
  const isFollowing = followData?.isFollowing

  // Count media from posts
  const mediaStats = (postsData?.posts || []).reduce(
    (acc: { photos: number; videos: number }, post: any) => {
      if (post.media) {
        for (const m of post.media) {
          if (m.mediaType === 'image') acc.photos++
          if (m.mediaType === 'video') acc.videos++
        }
      }
      return acc
    },
    { photos: 0, videos: 0 },
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Cover */}
      <div
        className={`h-48 md:h-56 rounded-md overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/30 relative ${isOwner ? 'group cursor-pointer' : ''}`}
        onClick={() => isOwner && coverInputRef.current?.click()}
      >
        {profile.coverUrl && (
          <img src={profile.coverUrl} alt="" className="w-full h-full object-cover" />
        )}
        {isOwner && (
          <>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-sm flex items-center gap-2">
                <ImagePlus className="w-5 h-5" />
                {coverMutation.isPending ? 'Enviando...' : 'Alterar capa'}
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Profile info */}
      <div className="relative px-4 -mt-12 mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div
            className={`relative shrink-0 ${isOwner ? 'group cursor-pointer' : ''}`}
            onClick={() => isOwner && avatarInputRef.current?.click()}
          >
            <Avatar
              src={profile.avatarUrl}
              alt={profile.displayName || profile.username}
              size="xl"
              verified={profile.creator?.isVerified}
            />
            {isOwner && (
              <>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.displayName || profile.username}</h1>
            <p className="text-muted">@{profile.username}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isOwner ? (
              <Link href="/settings">
                <Button variant="outline" size="sm">Editar perfil</Button>
              </Link>
            ) : (
              <>
                {isFollowing ? (
                  <Button variant="outline" size="sm" onClick={handleFollow} loading={unfollowMutation.isPending}>
                    <UserCheck className="w-4 h-4 mr-1" /> Seguindo
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleFollow} loading={followMutation.isPending}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Seguir
                  </Button>
                )}
                {profile.creator && !isSubscribed && (
                  <Button size="sm" onClick={() => handleSubscribe()}>
                    <Crown className="w-4 h-4 mr-1" />
                    {Number(profile.creator.subscriptionPrice || 0) > 0
                      ? `Assinar ${formatCurrency(profile.creator.subscriptionPrice)}/mes`
                      : 'Assinar'}
                  </Button>
                )}
                {isSubscribed && !subscription?.subscription?.isCancelled && (
                  <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(true)}>
                    <Crown className="w-4 h-4 mr-1" /> Assinante
                  </Button>
                )}
                {isSubscribed && subscription?.subscription?.isCancelled && (
                  <Button variant="outline" size="sm" disabled className="text-muted">
                    <Crown className="w-4 h-4 mr-1" />
                    Ativo ate {new Date(subscription.subscription.currentPeriodEnd!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </Button>
                )}
                {/* Send Message */}
                {profile.creator?.messagesEnabled !== false && (
                  <Link href={`/messages?to=${profile.id}`}>
                    <Button variant="outline" size="sm" title="Enviar mensagem">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </>
            )}
            {/* Affiliate */}
            {affiliateProgram && !isOwner && isAuthenticated && (
              <Button variant="ghost" size="sm" onClick={() => setAffiliateDrawerOpen(true)} title="Programa de Afiliados">
                <Share2 className="w-4 h-4" />
              </Button>
            )}
            {/* Share */}
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <SendHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {profile.bio && <p className="mt-4 text-sm">{profile.bio}</p>}

        {/* Stats */}
        <div className="flex items-center gap-5 mt-4 text-sm text-muted flex-wrap">
          {profile.creator?.category && <Badge variant="primary">{profile.creator.category}</Badge>}
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            {formatNumber(profile.postCount || 0)} posts
          </span>
          {mediaStats.photos > 0 && (
            <span className="flex items-center gap-1">
              <Image className="w-4 h-4" />
              {formatNumber(mediaStats.photos)} fotos
            </span>
          )}
          {mediaStats.videos > 0 && (
            <span className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              {formatNumber(mediaStats.videos)} videos
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {formatNumber(profile.followerCount || 0)} seguidores
          </span>
          {profile.creator && (
            <span className="flex items-center gap-1">
              <Crown className="w-4 h-4" />
              {formatNumber(profile.creator.totalSubscribers || 0)} assinantes
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {formatNumber(profile.profileViews || 0)} visualizacoes
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Desde {new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        {profile.gamification && (
          <div className="mt-4 flex items-center gap-6">
            <LevelBadge
              level={profile.gamification.level}
              tier={profile.gamification.fanTier}
              xp={profile.gamification.xp}
            />
            <StreakCounter streak={profile.gamification.currentStreak} />
          </div>
        )}
      </div>

      {/* Subscription tiers */}
      {profile.creator?.tiers && profile.creator.tiers.length > 0 && !isOwner && !isSubscribed && (
        <div className="mb-10">
          <h2 className="font-bold text-lg mb-4">Planos de assinatura</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.creator.tiers.map((tier: any, tierIndex: number) => {
              const tierGradients = [
                'from-primary/20 to-purple-600/5',
                'from-amber-500/20 to-orange-600/5',
                'from-emerald-500/20 to-teal-600/5',
                'from-rose-500/20 to-pink-600/5',
              ]
              const tierAccents = [
                'text-primary',
                'text-amber-400',
                'text-emerald-400',
                'text-rose-400',
              ]
              const gradient = tierGradients[tierIndex % tierGradients.length]
              const accent = tierAccents[tierIndex % tierAccents.length]
              return (
                <Card key={tier.id} hover>
                  <div className={`bg-gradient-to-br ${gradient}`}>
                    <CardContent>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg">{tier.name}</h3>
                        <span className={`${accent} font-bold`}>{formatCurrency(tier.price)}/mes</span>
                      </div>
                      {tier.description && <p className="text-sm text-muted mb-4">{tier.description}</p>}
                      {tier.benefits && (
                        <ul className="text-sm space-y-2 mb-4">
                          {(tier.benefits as string[]).map((b, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Star className={`w-3.5 h-3.5 ${accent} shrink-0`} />
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        className="w-full mt-2"
                        onClick={() => handleSubscribe(tier)}
                      >
                        <Crown className="w-4 h-4 mr-1" />
                        Assinar {formatCurrency(tier.price)}/mes
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Promotional offers */}
      {profile.creator?.promos && profile.creator.promos.length > 0 && !isOwner && !isSubscribed && (
        <div className="mb-10">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-success" />
            Ofertas promocionais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profile.creator.promos.map((promo: any) => {
              const monthlyPrice = Number(profile.creator.subscriptionPrice || 0)
              const durationLabel = promo.durationDays === 90 ? '3 meses' : promo.durationDays === 180 ? '6 meses' : '12 meses'
              const normalTotal = monthlyPrice * (promo.durationDays / 30)
              const discount = normalTotal > 0 ? Math.round(((normalTotal - Number(promo.price)) / normalTotal) * 100) : 0
              const monthlyEq = (Number(promo.price) / (promo.durationDays / 30)).toFixed(2)
              return (
                <Card key={promo.id} hover>
                  <div className="bg-gradient-to-br from-success/10 to-emerald-600/5">
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold">{durationLabel}</h3>
                        {discount > 0 && <Badge variant="success">-{discount}%</Badge>}
                      </div>
                      <p className="text-success font-bold text-xl mb-1">{formatCurrency(promo.price)}</p>
                      <p className="text-xs text-muted mb-4">
                        {formatCurrency(monthlyEq)}/mes - pagamento unico
                      </p>
                      <Button
                        className="w-full"
                        onClick={() => handleSubscribe()}
                      >
                        <Crown className="w-4 h-4 mr-1" />
                        Assinar {durationLabel}
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Posts */}
      <div>
        <h2 className="font-bold text-lg mb-4">Posts</h2>
        {postsData?.posts && postsData.posts.length > 0 ? (
          <div>
            {postsData.posts.map((post: any) => (
              <CreatorPostCard
                key={post.id}
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
                onSubscribe={() => handleSubscribe()}
              />
            ))}
          </div>
        ) : postsError ? (
          <div className="text-center py-12 text-error">
            <p>Erro ao carregar posts: {(postsError as any)?.message || 'Erro desconhecido'}</p>
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <p>{isOwner ? 'Voce ainda nao publicou nenhum post' : 'Nenhum post disponivel'}</p>
          </div>
        )}
      </div>

      {/* Cancel Subscription Modal */}
      {cancelModalOpen && subscription?.subscription && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setCancelModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-md shadow-xl max-w-sm w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <h3 className="font-bold text-lg">Cancelar assinatura</h3>
              </div>
              <p className="text-sm text-muted mb-2">
                Tem certeza que deseja cancelar sua assinatura de{' '}
                <span className="font-semibold text-foreground">{profile.displayName || profile.username}</span>?
              </p>
              <div className="bg-surface-light rounded-sm p-3 mb-4">
                <p className="text-sm">
                  Seu acesso continua ativo ate{' '}
                  <span className="font-semibold">
                    {new Date(subscription.subscription.currentPeriodEnd!).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </p>
                <p className="text-xs text-muted mt-1">
                  Nenhuma cobranca futura sera realizada. Voce pode reassinar a qualquer momento.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCancelModalOpen(false)}
                >
                  Manter assinatura
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-error hover:bg-error/10"
                  onClick={() => cancelMutation.mutate(subscription.subscription!.id)}
                  loading={cancelMutation.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Share modal (desktop) */}
      {showShareModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setShowShareModal(false)}>
            <div
              className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-sm">Compartilhar perfil</h3>
                <button onClick={() => setShowShareModal(false)} className="p-1 rounded-sm hover:bg-surface-light text-muted hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 grid grid-cols-4 gap-4">
                <button onClick={() => handleProfileShareExternal('whatsapp')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <span className="text-[11px] text-muted">WhatsApp</span>
                </button>
                <button onClick={() => handleProfileShareExternal('twitter')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </div>
                  <span className="text-[11px] text-muted">X</span>
                </button>
                <button onClick={() => handleProfileShareExternal('telegram')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-full bg-[#26A5E4]/10 flex items-center justify-center group-hover:bg-[#26A5E4]/20 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#26A5E4]"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  </div>
                  <span className="text-[11px] text-muted">Telegram</span>
                </button>
                <button onClick={() => handleProfileShareExternal('facebook')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-full bg-[#1877F2]/10 flex items-center justify-center group-hover:bg-[#1877F2]/20 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#1877F2]"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </div>
                  <span className="text-[11px] text-muted">Facebook</span>
                </button>
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={handleProfileCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-light hover:bg-surface-light/80 border border-border transition-colors"
                >
                  <Link2 className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-sm text-muted truncate flex-1 text-left">{typeof window !== 'undefined' ? getProfileShareUrl() : ''}</span>
                  <span className="text-xs font-medium text-primary shrink-0">Copiar</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Subscribe Drawer */}
      {profile && (
        <SubscribeDrawer
          open={subscribeDrawerOpen}
          onClose={() => setSubscribeDrawerOpen(false)}
          creator={{
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            subscriptionPrice: profile.creator?.subscriptionPrice,
          }}
          tier={selectedTier}
        />
      )}

      {/* PPV Unlock Drawer */}
      {ppvPost && (
        <PpvUnlockDrawer
          open={ppvDrawerOpen}
          onClose={() => { setPpvDrawerOpen(false); setPpvPost(null) }}
          onUnlocked={() => {
            queryClient.invalidateQueries({ queryKey: ['creator-posts'] })
          }}
          post={{
            id: ppvPost.id,
            ppvPrice: ppvPost.ppvPrice,
            creatorUsername: ppvPost.creatorUsername,
            creatorDisplayName: ppvPost.creatorDisplayName,
            contentText: ppvPost.contentText,
          }}
        />
      )}

      {/* Affiliate Drawer */}
      {affiliateDrawerOpen && affiliateProgram && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setAffiliateDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border z-50 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-bold flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Programa de Afiliados
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setAffiliateDrawerOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
              {/* Creator info */}
              <div className="flex items-center gap-3">
                <Avatar
                  src={profile.avatarUrl}
                  alt={profile.displayName || profile.username}
                  size="md"
                />
                <div>
                  <p className="font-bold text-sm">{profile.displayName || profile.username}</p>
                  <p className="text-xs text-muted">@{profile.username}</p>
                </div>
              </div>

              {/* Commission info */}
              <div className="p-4 bg-surface-light rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium">Comissao</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {Number(affiliateProgram.levels?.[0]?.commissionPercent || 0)}%
                </p>
                <p className="text-xs text-muted mt-1">por cada novo assinante que voce trouxer</p>
              </div>

              {/* How it works */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted uppercase">Como funciona</p>
                <div className="space-y-2 text-sm text-muted">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">1</span>
                    <p>Copie seu link exclusivo abaixo</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">2</span>
                    <p>Compartilhe com amigos e seguidores</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">3</span>
                    <p>Ganhe {Number(affiliateProgram.levels?.[0]?.commissionPercent || 0)}% em FanCoins por cada assinatura</p>
                  </div>
                </div>
              </div>

              {/* Link section */}
              {myAffiliateLink ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted uppercase">Seu link de afiliado</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-surface-light rounded-md px-3 py-2.5 text-xs font-mono truncate border border-border">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/creator/{username}?ref={myAffiliateLink.code}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCopyAffiliateLink(myAffiliateLink.code)}
                    >
                      {affiliateCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="text-center p-2 bg-surface-light rounded-md">
                      <p className="text-lg font-bold">{myAffiliateLink.clicks}</p>
                      <p className="text-xs text-muted">Cliques</p>
                    </div>
                    <div className="text-center p-2 bg-surface-light rounded-md">
                      <p className="text-lg font-bold">{myAffiliateLink.conversions}</p>
                      <p className="text-xs text-muted">Conversoes</p>
                    </div>
                    <div className="text-center p-2 bg-surface-light rounded-md">
                      <p className="text-lg font-bold text-success">{formatCurrency(Number(myAffiliateLink.totalEarned || 0))}</p>
                      <p className="text-xs text-muted">Ganhos</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted uppercase">Comece agora</p>
                  <Button
                    className="w-full"
                    onClick={() => createAffiliateLinkMutation.mutate(profile.id)}
                    loading={createAffiliateLinkMutation.isPending}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Gerar meu link de afiliado
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CreatorPostCard({
  post,
  currentUserId,
  isAuthenticated,
  onEdit,
  onToggleVisibility,
  onDelete,
  onLike,
  onBookmark,
  onComment,
  onTip,
  onPpvUnlock,
  onSubscribe,
}: {
  post: any
  currentUserId?: string | null
  isAuthenticated: boolean
  onEdit: (postId: string, data: Record<string, unknown>) => void
  onToggleVisibility: (postId: string) => void
  onDelete: (postId: string) => void
  onLike: (postId: string) => void
  onBookmark: (postId: string) => void
  onComment: (postId: string, content: string) => void
  onTip: (postId: string, creatorId: string, amount: number) => void
  onPpvUnlock: (post: any) => void
  onSubscribe: () => void
}) {
  const { data: commentsData } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: async () => {
      const res = await api.get<any>(`/posts/${post.id}/comments`)
      return res.data
    },
  })

  const comments = commentsData?.comments || commentsData || []

  return (
    <PostCard
      post={post}
      currentUserId={currentUserId}
      isAuthenticated={isAuthenticated}
      onEdit={onEdit}
      onToggleVisibility={onToggleVisibility}
      onDelete={onDelete}
      onLike={onLike}
      onBookmark={onBookmark}
      onComment={onComment}
      onTip={onTip}
      onPpvUnlock={onPpvUnlock}
      onSubscribe={onSubscribe}
      comments={Array.isArray(comments) ? comments : []}
    />
  )
}
