'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Heart,
  MessageCircle,
  Bookmark,
  Lock,
  Coins,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Check,
  Send,
  SendHorizontal,
  Pin,
  Eye,
  EyeOff,
  Flag,
  ShieldAlert,
  Link2,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { VideoPlayer } from '@/components/ui/video-player'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatNumber, timeAgo, formatCurrency } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'

interface PostCardProps {
  post: {
    id: string
    shortCode?: string | null
    contentText: string | null
    postType: string
    visibility: string
    ppvPrice?: string | null
    isPinned?: boolean
    isVisible?: boolean
    categoryName?: string | null
    categorySlug?: string | null
    categoryIsAdult?: boolean | null
    subcategory?: string | null
    tags?: string[] | null
    likeCount: number
    commentCount: number
    shareCount?: number
    viewCount: number
    publishedAt: string
    creatorId?: string
    creatorUsername: string
    creatorDisplayName: string | null
    creatorAvatarUrl: string | null
    media?: Array<{
      id: string
      mediaType: string
      storageKey: string | null
      thumbnailUrl: string | null
      isPreview: boolean
    }>
    hasAccess?: boolean
    isLiked?: boolean
    isBookmarked?: boolean
    tipSent?: { amount: number; createdAt: string } | null
  }
  currentUserId?: string | null
  isAuthenticated?: boolean
  onLike?: (postId: string) => void
  onBookmark?: (postId: string) => void
  onEdit?: (postId: string, data: { contentText?: string; isPinned?: boolean }) => void
  onToggleVisibility?: (postId: string) => void
  onDelete?: (postId: string) => void
  onComment?: (postId: string, content: string) => void
  onTip?: (postId: string, creatorId: string, amount: number) => void
  onPpvUnlock?: (post: PostCardProps['post']) => void
  onSubscribe?: (post: PostCardProps['post']) => void
  comments?: Array<{
    id: string
    content: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    createdAt: string
  }>
}

export function PostCard({
  post,
  currentUserId,
  isAuthenticated = true,
  onLike,
  onBookmark,
  onEdit,
  onToggleVisibility,
  onDelete,
  onComment,
  onTip,
  onPpvUnlock,
  onSubscribe,
  comments,
}: PostCardProps) {
  const hasMedia = post.media && post.media.length > 0
  const isLocked = post.visibility !== 'public' && !post.hasAccess
  const [ageVerified, setAgeVerified] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('age_verified') === 'true'
  })
  const isOwner = currentUserId && post.creatorId === currentUserId
  const isHidden = post.isVisible === false
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.contentText || '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showTip, setShowTip] = useState(false)
  const [tipAmount, setTipAmount] = useState('')
  const [liked, setLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [bookmarked, setBookmarked] = useState(post.isBookmarked || false)
  const [shareCount, setShareCount] = useState(post.shareCount || 0)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [viewCount, setViewCount] = useState(post.viewCount)
  const [viewTracked, setViewTracked] = useState(false)
  const videoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (videoTimerRef.current) clearTimeout(videoTimerRef.current)
    }
  }, [])

  function handleLike() {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    setLiked(!liked)
    setLikeCount((c) => (liked ? c - 1 : c + 1))
    onLike?.(post.id)
  }

  function handleBookmark() {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    setBookmarked(!bookmarked)
    onBookmark?.(post.id)
  }

  function handleEdit() {
    onEdit?.(post.id, { contentText: editText })
    setEditing(false)
    setMenuOpen(false)
  }

  function handleDelete() {
    onDelete?.(post.id)
    setConfirmDelete(false)
    setMenuOpen(false)
  }

  function handlePin() {
    onEdit?.(post.id, { isPinned: !post.isPinned })
    setMenuOpen(false)
  }

  function handleComment() {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    if (!commentText.trim()) return
    onComment?.(post.id, commentText.trim())
    setCommentText('')
  }

  function handleTip() {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    const amount = Number(tipAmount)
    if (!amount || amount <= 0) return
    onTip?.(post.id, post.creatorId || '', amount)
    setTipAmount('')
    setShowTip(false)
  }

  function toggleComments() {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    setShowComments(!showComments)
    if (!showComments) setShowTip(false)
  }

  function toggleTip() {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    setShowTip(!showTip)
    if (!showTip) setShowComments(false)
  }

  function sendViewTrack() {
    if (viewTracked) return
    setViewTracked(true)
    api.post<{ counted: boolean }>(`/posts/${post.id}/view`, {})
      .then((res) => {
        if (res.data?.counted) setViewCount((c) => c + 1)
      })
      .catch(() => {})
  }

  // Video: start 10s timer on play, cancel on pause
  function handleVideoPlay() {
    if (viewTracked) return
    videoTimerRef.current = setTimeout(() => {
      sendViewTrack()
    }, 10000)
  }

  function handleVideoPause() {
    if (videoTimerRef.current) {
      clearTimeout(videoTimerRef.current)
      videoTimerRef.current = null
    }
  }

  function openLightbox(index: number) {
    setLightboxIndex(index)
    setLightboxOpen(true)
    sendViewTrack()
  }

  function getShareUrl() {
    return `${window.location.origin}/post/${post.shortCode || post.id}`
  }

  function getShareText() {
    return post.contentText || `Confira este post no FanDreams!`
  }

  async function handleShare() {
    // On mobile/tablet: use native share sheet
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Post de ${post.creatorDisplayName || post.creatorUsername}`,
          text: getShareText(),
          url: getShareUrl(),
        })
        setShareCount((c) => c + 1)
        api.post(`/posts/${post.id}/share`, {}).catch(() => {})
      } catch {
        // User cancelled
      }
    } else {
      // On desktop: show share modal
      setShowShareModal(true)
    }
  }

  function trackShare() {
    setShareCount((c) => c + 1)
    api.post(`/posts/${post.id}/share`, {}).catch(() => {})
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(getShareUrl())
    toast.success('Link copiado!')
    trackShare()
    setShowShareModal(false)
  }

  function handleShareExternal(platform: string) {
    const url = encodeURIComponent(getShareUrl())
    const text = encodeURIComponent(getShareText())
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
      trackShare()
      setShowShareModal(false)
    }
  }

  async function handleReport() {
    if (!reportReason.trim()) {
      toast.error('Selecione um motivo')
      return
    }
    try {
      await api.post(`/posts/${post.id}/report`, { reason: reportReason })
      toast.success('Denuncia enviada. Obrigado!')
      setShowReportModal(false)
      setReportReason('')
      setMenuOpen(false)
    } catch (e: any) {
      if (e.code === 'ALREADY_REPORTED') {
        toast.info('Voce ja denunciou este post')
      } else {
        toast.error(e.message || 'Erro ao denunciar')
      }
      setShowReportModal(false)
    }
  }

  return (
    <Card className={`mb-6 ${isHidden ? 'opacity-50 grayscale' : ''}`}>
      {/* Hidden indicator */}
      {isHidden && isOwner && (
        <div className="px-4 pt-3 flex items-center gap-2 text-muted">
          <EyeOff className="w-4 h-4" />
          <span className="text-xs">Post oculto — somente voce pode ver</span>
        </div>
      )}
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3">
        <Link href={`/creator/${post.creatorUsername}`}>
          <Avatar src={post.creatorAvatarUrl} alt={post.creatorDisplayName || post.creatorUsername} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/creator/${post.creatorUsername}`}
            className="font-semibold text-sm hover:text-primary transition-colors"
          >
            {post.creatorDisplayName || post.creatorUsername}
          </Link>
          <p className="text-xs text-muted">
            @{post.creatorUsername} · {timeAgo(post.publishedAt)}
            {post.isPinned && <Pin className="w-3 h-3 inline ml-1 text-primary" />}
          </p>
        </div>
        {post.visibility === 'ppv' && post.ppvPrice && (
          <Badge variant="warning">{formatCurrency(post.ppvPrice)}</Badge>
        )}
        {post.visibility === 'subscribers' && isLocked && (
          <Badge variant="primary">
            <Lock className="w-3 h-3 mr-1 inline" />
            Assinantes
          </Badge>
        )}

        {/* More menu - only show if owner or can report */}
        {(isOwner || (!isOwner && isAuthenticated)) && (
        <div className="relative">
          <button
            onClick={() => {
              setMenuOpen(!menuOpen)
              setConfirmDelete(false)
            }}
            className="p-1.5 rounded-sm text-muted hover:text-foreground hover:bg-surface-light transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-sm shadow-lg py-1 min-w-[160px]">
                {isOwner && (
                  <>
                    <button
                      onClick={() => {
                        setEditing(true)
                        setMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-light transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={handlePin}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-light transition-colors"
                    >
                      <Pin className="w-4 h-4" />
                      {post.isPinned ? 'Desafixar' : 'Fixar'}
                    </button>
                    <button
                      onClick={() => {
                        onToggleVisibility?.(post.id)
                        setMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-light transition-colors"
                    >
                      {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      {isHidden ? 'Tornar visivel' : 'Ocultar post'}
                    </button>
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-surface-light transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </button>
                    ) : (
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error font-semibold hover:bg-error/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Confirmar exclusao
                      </button>
                    )}
                  </>
                )}
                {!isOwner && isAuthenticated && (
                  <button
                    onClick={() => {
                      setShowReportModal(true)
                      setMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-surface-light transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    Denunciar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        )}
      </div>

      {/* Locked content banner for text-only locked posts */}
      {isLocked && !hasMedia && (
        <div className="mx-5 mb-3 py-4 rounded-md bg-surface-dark flex flex-col items-center justify-center gap-2">
          <Lock className="w-6 h-6 text-primary" />
          {post.visibility === 'ppv' && post.ppvPrice ? (
            <>
              <p className="text-sm font-medium">Conteudo pago (PPV)</p>
              <Button size="sm" onClick={() => onPpvUnlock?.(post)}>
                <Coins className="w-4 h-4 mr-1" />
                Desbloquear por {formatCurrency(post.ppvPrice)}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Conteudo exclusivo para assinantes</p>
              <Button size="sm" onClick={() => onSubscribe?.(post)}>Assinar para desbloquear</Button>
            </>
          )}
        </div>
      )}

      {/* Content */}
      {editing ? (
        <div className="px-4 pb-3">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-sm bg-surface-light border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleEdit}>
              <Check className="w-4 h-4 mr-1" />
              Salvar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false)
                setEditText(post.contentText || '')
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        post.contentText && (
          <div className="px-4 pb-3">
            {isLocked ? (
              <p className="text-sm text-muted italic">
                {post.contentText.slice(0, 60)}{post.contentText.length > 60 ? '...' : ''}
              </p>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{post.contentText}</p>
            )}
          </div>
        )
      )}

      {/* Category & Tags */}
      {(post.categoryName || (post.tags && post.tags.length > 0)) && (
        <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
          {post.categoryName && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium ${post.categoryIsAdult ? 'bg-error/10 text-error' : 'bg-surface-light text-muted'}`}>
              {post.categoryName}
              {post.subcategory && <span className="ml-1 opacity-70">/ {post.subcategory}</span>}
            </span>
          )}
          {post.tags && post.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-primary/5 text-primary/70 text-[11px]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Media */}
      {hasMedia && (
        <div className="relative">
          {/* Age verification gate for non-verified users */}
          {!ageVerified && !isOwner ? (
            <div className="aspect-video bg-surface-dark flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-error" />
              </div>
              <div className="text-center px-4">
                <p className="font-semibold text-sm mb-1">Conteudo para maiores de 18 anos</p>
                <p className="text-xs text-muted">Voce confirma que tem 18 anos ou mais?</p>
              </div>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  onClick={() => {
                    localStorage.setItem('age_verified', 'true')
                    setAgeVerified(true)
                  }}
                >
                  Sim, tenho 18+
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.location.href = 'https://www.google.com'
                  }}
                >
                  Nao
                </Button>
              </div>
            </div>
          ) : isLocked ? (
            <div className="aspect-video bg-surface-dark relative overflow-hidden flex flex-col items-center justify-center gap-3">
              {post.media![0]?.thumbnailUrl && (
                <img
                  src={post.media![0].thumbnailUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-30"
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-surface/80 backdrop-blur-sm flex items-center justify-center">
                  <Lock className="w-7 h-7 text-primary" />
                </div>
                {post.visibility === 'ppv' && post.ppvPrice ? (
                  <>
                    <p className="text-sm font-medium">Conteudo pago (PPV)</p>
                    <Button size="sm" onClick={() => onPpvUnlock?.(post)}>
                      <Coins className="w-4 h-4 mr-1" />
                      Desbloquear por {formatCurrency(post.ppvPrice)}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">Conteudo exclusivo para assinantes</p>
                    <Button size="sm" onClick={() => onSubscribe?.(post)}>Assinar para desbloquear</Button>
                  </>
                )}
              </div>
            </div>
          ) : post.media!.length === 1 ? (
            // Single media
            <div className="aspect-video bg-surface-dark relative">
              {post.media![0].mediaType === 'image' && post.media![0].storageKey && (
                <img
                  src={post.media![0].storageKey}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => openLightbox(0)}
                />
              )}
              {post.media![0].mediaType === 'video' && post.media![0].storageKey && (
                <VideoPlayer
                  src={post.media![0].storageKey}
                  poster={post.media![0].thumbnailUrl || undefined}
                  className="w-full h-full object-cover"
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                />
              )}
              {/* Watermark */}
              <div className="absolute bottom-3 right-3 pointer-events-none select-none">
                <span className="text-white/20 text-sm font-bold tracking-wider">FanDreams</span>
              </div>
            </div>
          ) : (
            // Multi-image gallery grid
            <div className={`grid gap-0.5 ${post.media!.length === 2 ? 'grid-cols-2' : post.media!.length >= 3 ? 'grid-cols-2' : ''}`}>
              {post.media!.slice(0, 4).map((m, i) => (
                <div
                  key={m.id || i}
                  className={`relative bg-surface-dark ${i === 0 && post.media!.length === 3 ? 'row-span-2' : ''} ${post.media!.length === 1 ? 'aspect-video' : 'aspect-square'}`}
                >
                  {m.mediaType === 'image' && m.storageKey && (
                    <img
                      src={m.storageKey}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => openLightbox(i)}
                    />
                  )}
                  {m.mediaType === 'video' && m.storageKey && (
                    <VideoPlayer
                      src={m.storageKey}
                      poster={m.thumbnailUrl || undefined}
                      className="w-full h-full object-cover"
                      onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                    />
                  )}
                  {i === 3 && post.media!.length > 4 && (
                    <div
                      className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer"
                      onClick={() => openLightbox(3)}
                    >
                      <span className="text-white text-2xl font-bold">+{post.media!.length - 4}</span>
                    </div>
                  )}
                  {/* Watermark */}
                  <div className="absolute bottom-2 right-2 pointer-events-none select-none">
                    <span className="text-white/20 text-xs font-bold tracking-wider">FanDreams</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Image lightbox */}
      {lightboxOpen && post.media && post.media.filter((m) => m.mediaType === 'image').length > 0 && (
        <>
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white z-60"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-8 h-8" />
            </button>
            {post.media.filter((m) => m.mediaType === 'image').length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl font-light z-60"
                  onClick={(e) => {
                    e.stopPropagation()
                    const images = post.media!.filter((m) => m.mediaType === 'image')
                    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length)
                  }}
                >
                  &#8249;
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl font-light z-60"
                  onClick={(e) => {
                    e.stopPropagation()
                    const images = post.media!.filter((m) => m.mediaType === 'image')
                    setLightboxIndex((prev) => (prev + 1) % images.length)
                  }}
                >
                  &#8250;
                </button>
              </>
            )}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <img
                src={post.media.filter((m) => m.mediaType === 'image')[lightboxIndex]?.storageKey || ''}
                alt=""
                className="max-w-[90vw] max-h-[90vh] object-contain"
              />
              {/* Watermark */}
              <div className="absolute bottom-4 right-4 pointer-events-none select-none">
                <span className="text-white/25 text-lg font-bold tracking-wider">FanDreams</span>
              </div>
            </div>
            {post.media.filter((m) => m.mediaType === 'image').length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {post.media.filter((m) => m.mediaType === 'image').map((_, i) => (
                  <button
                    key={i}
                    className={`w-2 h-2 rounded-full ${i === lightboxIndex ? 'bg-white' : 'bg-white/40'}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setLightboxIndex(i)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Stats bar (views) */}
      <div className="px-5 pt-3 flex items-center gap-1 text-xs text-muted">
        <Eye className="w-3.5 h-3.5" />
        <span>{formatNumber(viewCount)} visualizacoes</span>
      </div>

      {/* Actions */}
      <div className="px-5 py-3.5 flex items-center">
        <div className="flex items-center gap-5">
          <button onClick={handleLike} className="flex items-center gap-1.5 text-sm text-muted hover:text-error transition-colors group">
            <Heart
              className={`w-5 h-5 group-hover:scale-110 transition-transform ${liked ? 'fill-error text-error' : ''}`}
            />
            <span>{formatNumber(likeCount)}</span>
          </button>

          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
          >
            <MessageCircle className={`w-5 h-5 ${showComments ? 'text-primary' : ''}`} />
            <span>{formatNumber(post.commentCount)}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <SendHorizontal className="w-5 h-5" />
            {shareCount > 0 && <span>{formatNumber(shareCount)}</span>}
          </button>

          {!isOwner && (
            <button
              onClick={toggleTip}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-secondary transition-colors"
            >
              <Coins className={`w-5 h-5 ${showTip ? 'text-secondary' : ''}`} />
              <span>Tip</span>
            </button>
          )}
        </div>

        <div className="ml-auto">
          <button
            onClick={handleBookmark}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
          >
            <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-primary text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tip sent log */}
      {post.tipSent && !isOwner && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-secondary/10 border border-secondary/20 text-xs">
            <Coins className="w-3.5 h-3.5 text-secondary shrink-0" />
            <span className="text-secondary">
              Voce enviou {post.tipSent.amount} FanCoins em{' '}
              {new Date(post.tipSent.createdAt).toLocaleDateString('pt-BR')} -{' '}
              {new Date(post.tipSent.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {/* Tip input */}
      {showTip && !isOwner && (
        <div className="px-4 pb-3 flex gap-2">
          <input
            type="number"
            min="1"
            placeholder="Quantidade de FanCoins"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            className="flex-1 px-3 py-2 rounded-sm bg-surface-light border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <Button size="sm" variant="secondary" onClick={handleTip}>
            <Coins className="w-4 h-4 mr-1" />
            Enviar
          </Button>
        </div>
      )}

      {/* Report modal */}
      {showReportModal && (
        <div className="px-4 pb-3">
          <div className="p-3 rounded-sm border border-border bg-surface-light">
            <p className="text-sm font-medium mb-2">Denunciar post</p>
            <div className="space-y-1.5 mb-3">
              {[
                { value: 'spam', label: 'Spam' },
                { value: 'inappropriate', label: 'Conteudo inapropriado' },
                { value: 'harassment', label: 'Assedio ou bullying' },
                { value: 'violence', label: 'Violencia' },
                { value: 'copyright', label: 'Violacao de direitos autorais' },
                { value: 'other', label: 'Outro' },
              ].map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reportReason === r.value}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="accent-primary"
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReport}>
                Enviar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowReportModal(false); setReportReason('') }}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
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
                <h3 className="font-semibold text-sm">Compartilhar</h3>
                <button onClick={() => setShowShareModal(false)} className="p-1 rounded-sm hover:bg-surface-light text-muted hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 grid grid-cols-4 gap-4">
                <button
                  onClick={() => handleShareExternal('whatsapp')}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <span className="text-[11px] text-muted">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShareExternal('twitter')}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </div>
                  <span className="text-[11px] text-muted">X</span>
                </button>
                <button
                  onClick={() => handleShareExternal('telegram')}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#26A5E4]/10 flex items-center justify-center group-hover:bg-[#26A5E4]/20 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#26A5E4]"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  </div>
                  <span className="text-[11px] text-muted">Telegram</span>
                </button>
                <button
                  onClick={() => handleShareExternal('facebook')}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#1877F2]/10 flex items-center justify-center group-hover:bg-[#1877F2]/20 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#1877F2]"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </div>
                  <span className="text-[11px] text-muted">Facebook</span>
                </button>
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-light hover:bg-surface-light/80 border border-border transition-colors"
                >
                  <Link2 className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-sm text-muted truncate flex-1 text-left">{typeof window !== 'undefined' ? `${window.location.origin}/creator/${post.creatorUsername}` : ''}</span>
                  <span className="text-xs font-medium text-primary shrink-0">Copiar</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}


      {/* Comments section */}
      {showComments && (
        <div className="border-t border-border">
          {comments && comments.length > 0 && (
            <div className="px-4 py-2 space-y-3 max-h-60 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar src={c.avatarUrl} alt={c.displayName || c.username} size="xs" />
                  <div>
                    <p className="text-xs">
                      <span className="font-semibold">{c.displayName || c.username}</span>{' '}
                      <span className="text-muted">· {timeAgo(c.createdAt)}</span>
                    </p>
                    <p className="text-sm">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-3 flex gap-2">
            <input
              type="text"
              placeholder="Escreva um comentario..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              className="flex-1 px-3 py-2 rounded-sm bg-surface-light border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button size="sm" onClick={handleComment} disabled={!commentText.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
