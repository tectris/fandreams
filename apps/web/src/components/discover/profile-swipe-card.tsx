'use client'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { MockProfile } from '@/lib/mock-profiles'
import {
  Crown,
  Users,
  Eye,
  Star,
  Flame,
  ChevronUp,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react'

interface ProfileSwipeCardProps {
  profile: MockProfile
  onViewPosts: () => void
}

export function ProfileSwipeCard({ profile, onViewPosts }: ProfileSwipeCardProps) {
  const initials = profile.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="relative w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Cover / Hero area - takes most of the screen */}
      <div className="relative flex-1 min-h-0">
        {/* Background gradient since we use placeholder avatars */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-secondary/20 to-background">
          {profile.coverUrl && (
            <img
              src={profile.coverUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Large avatar centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-32 h-32 rounded-full object-cover ring-4 ring-primary/50 shadow-2xl"
                />
              ) : (
                <div className="w-32 h-32 rounded-full flex items-center justify-center bg-primary/30 text-primary font-bold text-4xl ring-4 ring-primary/50 shadow-2xl">
                  {initials}
                </div>
              )}
              {profile.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 shadow-lg">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Category + Role badge */}
            <div className="flex items-center gap-2">
              <Badge variant="primary" className="text-sm px-4 py-1">
                {profile.category}
              </Badge>
              {profile.role === 'admin' && (
                <Badge variant="error" className="text-sm px-4 py-1">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* Profile info at the bottom */}
      <div className="relative z-10 px-6 pb-6 -mt-32">
        {/* Name and username */}
        <div className="text-center mb-3">
          <h2 className="text-2xl font-bold">{profile.displayName}</h2>
          <p className="text-muted text-sm">@{profile.username}</p>
        </div>

        {/* Bio */}
        <p className="text-sm text-center text-muted/90 mb-4 line-clamp-2 max-w-sm mx-auto">
          {profile.bio}
        </p>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 mb-4 text-sm">
          <div className="flex flex-col items-center">
            <span className="font-bold text-foreground">{formatNumber(profile.followerCount)}</span>
            <span className="text-xs text-muted flex items-center gap-1">
              <Users className="w-3 h-3" /> seguidores
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-foreground">{formatNumber(profile.totalSubscribers)}</span>
            <span className="text-xs text-muted flex items-center gap-1">
              <Crown className="w-3 h-3" /> assinantes
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-foreground">{profile.posts.length}</span>
            <span className="text-xs text-muted flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> posts
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-foreground">{profile.gamification.currentStreak}</span>
            <span className="text-xs text-muted flex items-center gap-1">
              <Flame className="w-3 h-3" /> streak
            </span>
          </div>
        </div>

        {/* Gamification tier + Score */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <Badge variant={profile.gamification.fanTier}>
            <Star className="w-3 h-3" />
            Nivel {profile.gamification.level}
          </Badge>
          <Badge variant="default">
            <Eye className="w-3 h-3" />
            Score {profile.creatorScore}
          </Badge>
          <Badge variant="secondary">
            {formatCurrency(profile.subscriptionPrice)}/mes
          </Badge>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-5">
          {profile.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full bg-surface-light text-muted border border-border"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* View posts button */}
        <Button
          className="w-full"
          size="lg"
          onClick={onViewPosts}
        >
          <ChevronUp className="w-5 h-5 mr-1" />
          Ver posts ({profile.posts.length})
        </Button>
      </div>
    </div>
  )
}
