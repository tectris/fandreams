'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatNumber, timeAgo } from '@/lib/utils'
import type { MockProfile, MockPost } from '@/lib/mock-profiles'
import {
  Heart,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
  ArrowLeft,
} from 'lucide-react'

interface PostViewerProps {
  profile: MockProfile
  onClose: () => void
}

const SWIPE_THRESHOLD = 50

export function PostViewer({ profile, onClose }: PostViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const posts = profile.posts

  const goToNext = useCallback(() => {
    if (currentIndex < posts.length - 1) {
      setDirection(1)
      setCurrentIndex((prev) => prev + 1)
    }
  }, [currentIndex, posts.length])

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex((prev) => prev - 1)
    }
  }, [currentIndex])

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -SWIPE_THRESHOLD && info.velocity.x < 0) {
        goToNext()
      } else if (info.offset.x > SWIPE_THRESHOLD && info.velocity.x > 0) {
        goToPrev()
      }
    },
    [goToNext, goToPrev],
  )

  const currentPost = posts[currentIndex]
  if (!currentPost) return null

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-sm shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-surface-light transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar
          src={profile.avatarUrl}
          alt={profile.displayName}
          size="sm"
          verified={profile.isVerified}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{profile.displayName}</p>
          <p className="text-xs text-muted">@{profile.username}</p>
        </div>
        <Badge variant="primary" className="shrink-0">
          {currentIndex + 1}/{posts.length}
        </Badge>
      </div>

      {/* Post content with swipe */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentPost.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 flex flex-col"
          >
            {/* Post image */}
            <div className="flex-1 relative bg-surface-dark flex items-center justify-center">
              {currentPost.visibility === 'subscribers' ? (
                <div className="relative w-full h-full">
                  {/* Blurred preview behind the lock */}
                  {currentPost.media[0] && (
                    <img
                      src={currentPost.media[0].mediaUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40"
                      draggable={false}
                    />
                  )}
                  {/* Lock overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 z-10">
                    <div className="w-20 h-20 rounded-full bg-surface/80 backdrop-blur-sm flex items-center justify-center border border-border">
                      <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Conteudo exclusivo</p>
                    {currentPost.ppvPrice && Number(currentPost.ppvPrice) > 0 ? (
                      <Button size="sm" variant="primary">
                        Desbloquear por {formatCurrency(currentPost.ppvPrice)}
                      </Button>
                    ) : (
                      <Button size="sm" variant="primary">
                        Assinar para desbloquear
                      </Button>
                    )}
                    <p className="text-xs text-muted">ou assine por {formatCurrency(profile.subscriptionPrice)}/mes</p>
                  </div>
                </div>
              ) : currentPost.media[0] ? (
                <img
                  src={currentPost.media[0].mediaUrl}
                  alt=""
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              ) : null}

              {/* Navigation arrows */}
              {currentIndex > 0 && (
                <button
                  onClick={goToPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {currentIndex < posts.length - 1 && (
                <button
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Post info */}
            <div className="px-4 py-3 bg-surface border-t border-border shrink-0">
              {/* Engagement stats */}
              <div className="flex items-center gap-4 mb-2">
                <button className="flex items-center gap-1.5 text-muted hover:text-secondary transition-colors">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm font-medium">{formatNumber(currentPost.likesCount)}</span>
                </button>
                <button className="flex items-center gap-1.5 text-muted hover:text-primary transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{formatNumber(currentPost.commentsCount)}</span>
                </button>
                <span className="text-xs text-muted ml-auto">
                  {timeAgo(currentPost.createdAt)}
                </span>
              </div>
              {/* Text */}
              <p className="text-sm line-clamp-2">{currentPost.contentText}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots indicator */}
        <div className="absolute bottom-[120px] left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
          {posts.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                i === currentIndex
                  ? 'bg-primary w-6'
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Swipe hint */}
      <div className="text-center py-2 bg-surface border-t border-border">
        <p className="text-xs text-muted">
          Deslize para os lados para navegar entre posts
        </p>
      </div>
    </motion.div>
  )
}
