'use client'

import { Heart, MessageCircle, Bookmark, Share2, Lock, Coins } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatNumber, timeAgo, formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface PostCardProps {
  post: {
    id: string
    contentText: string | null
    postType: string
    visibility: string
    ppvPrice?: string | null
    likeCount: number
    commentCount: number
    viewCount: number
    publishedAt: string
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
  }
  onLike?: (postId: string) => void
  onBookmark?: (postId: string) => void
}

export function PostCard({ post, onLike, onBookmark }: PostCardProps) {
  const hasMedia = post.media && post.media.length > 0
  const isLocked = post.visibility !== 'public' && !post.hasAccess

  return (
    <Card className="mb-4">
      <div className="px-4 py-3 flex items-center gap-3">
        <Link href={`/creator/${post.creatorUsername}`}>
          <Avatar src={post.creatorAvatarUrl} alt={post.creatorDisplayName || post.creatorUsername} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/creator/${post.creatorUsername}`} className="font-semibold text-sm hover:text-primary transition-colors">
            {post.creatorDisplayName || post.creatorUsername}
          </Link>
          <p className="text-xs text-muted">
            @{post.creatorUsername} · {timeAgo(post.publishedAt)}
          </p>
        </div>
        {post.visibility === 'ppv' && post.ppvPrice && (
          <Badge variant="warning">{formatCurrency(post.ppvPrice)}</Badge>
        )}
      </div>

      {post.contentText && (
        <div className="px-4 pb-3">
          <p className="text-sm whitespace-pre-wrap">{post.contentText}</p>
        </div>
      )}

      {hasMedia && (
        <div className="relative">
          {isLocked ? (
            <div className="aspect-video bg-surface-dark flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center">
                <Lock className="w-8 h-8 text-muted" />
              </div>
              <p className="text-sm text-muted">Conteudo exclusivo para assinantes</p>
              <Link href={`/creator/${post.creatorUsername}`}>
                <Button size="sm">Assinar para desbloquear</Button>
              </Link>
            </div>
          ) : (
            <div className="aspect-video bg-surface-dark">
              {post.media?.[0]?.mediaType === 'image' && post.media[0].storageKey && (
                <img
                  src={post.media[0].storageKey}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              {post.media?.[0]?.mediaType === 'video' && post.media[0].thumbnailUrl && (
                <div className="relative w-full h-full">
                  <img src={post.media[0].thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {hasMedia && post.media!.length > 1 && (
            <div className="absolute top-2 right-2">
              <Badge>{post.media!.length} itens</Badge>
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-3 flex items-center gap-6">
        <button
          onClick={() => onLike?.(post.id)}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-error transition-colors group"
        >
          <Heart className={`w-5 h-5 group-hover:scale-110 transition-transform ${post.isLiked ? 'fill-error text-error' : ''}`} />
          <span>{formatNumber(post.likeCount)}</span>
        </button>

        <Link
          href={`#comments-${post.id}`}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{formatNumber(post.commentCount)}</span>
        </Link>

        <button className="flex items-center gap-1.5 text-sm text-muted hover:text-secondary transition-colors">
          <Coins className="w-5 h-5" />
          <span>Tip</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={() => onBookmark?.(post.id)}
          className="text-muted hover:text-primary transition-colors"
        >
          <Bookmark className={`w-5 h-5 ${post.isBookmarked ? 'fill-primary text-primary' : ''}`} />
        </button>
      </div>
    </Card>
  )
}
