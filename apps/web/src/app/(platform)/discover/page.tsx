'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { ProfileSwipeCard } from '@/components/discover/profile-swipe-card'
import { PostViewer } from '@/components/discover/post-viewer'
import { mockProfiles } from '@/lib/mock-profiles'
import { ChevronUp, ChevronDown } from 'lucide-react'

const SWIPE_THRESHOLD = 60

export default function DiscoverSwipePage() {
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [viewingPosts, setViewingPosts] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const profiles = mockProfiles

  const goToNextProfile = useCallback(() => {
    if (currentProfileIndex < profiles.length - 1) {
      setDirection(1)
      setCurrentProfileIndex((prev) => prev + 1)
    }
  }, [currentProfileIndex, profiles.length])

  const goToPrevProfile = useCallback(() => {
    if (currentProfileIndex > 0) {
      setDirection(-1)
      setCurrentProfileIndex((prev) => prev - 1)
    }
  }, [currentProfileIndex])

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // Vertical swipe: negative Y = swipe up (next), positive Y = swipe down (prev)
      if (info.offset.y < -SWIPE_THRESHOLD && info.velocity.y < 0) {
        goToNextProfile()
      } else if (info.offset.y > SWIPE_THRESHOLD && info.velocity.y > 0) {
        goToPrevProfile()
      }
    },
    [goToNextProfile, goToPrevProfile],
  )

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (viewingPosts) return
      if (e.key === 'ArrowDown' || e.key === 'j') {
        goToNextProfile()
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToPrevProfile()
      } else if (e.key === 'Enter') {
        setViewingPosts(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToNextProfile, goToPrevProfile, viewingPosts])

  // Mouse wheel navigation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let wheelTimeout: ReturnType<typeof setTimeout> | null = null
    let isThrottled = false

    function handleWheel(e: WheelEvent) {
      if (viewingPosts) return
      e.preventDefault()

      if (isThrottled) return
      isThrottled = true

      if (e.deltaY > 30) {
        goToNextProfile()
      } else if (e.deltaY < -30) {
        goToPrevProfile()
      }

      wheelTimeout = setTimeout(() => {
        isThrottled = false
      }, 400)
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      if (wheelTimeout) clearTimeout(wheelTimeout)
    }
  }, [goToNextProfile, goToPrevProfile, viewingPosts])

  const currentProfile = profiles[currentProfileIndex]

  const variants = {
    enter: (dir: number) => ({
      y: dir > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      y: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      y: dir > 0 ? '-100%' : '100%',
      opacity: 0,
      scale: 0.95,
    }),
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-30 bg-background overflow-hidden"
    >
      {/* Main profile swipe area */}
      <div className="relative w-full h-full">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentProfile.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            drag={viewingPosts ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className="absolute inset-0"
          >
            <ProfileSwipeCard
              profile={currentProfile}
              onViewPosts={() => setViewingPosts(true)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation indicators */}
      {!viewingPosts && (
        <>
          {/* Profile position dots (right side vertical) */}
          <div className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
            {profiles.map((p, i) => (
              <button
                key={p.id}
                onClick={() => {
                  setDirection(i > currentProfileIndex ? 1 : -1)
                  setCurrentProfileIndex(i)
                }}
                className={`w-2.5 rounded-full transition-all duration-300 ${
                  i === currentProfileIndex
                    ? 'h-8 bg-primary'
                    : 'h-2.5 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Up/Down arrows */}
          <div className="fixed left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
            <button
              onClick={goToPrevProfile}
              disabled={currentProfileIndex === 0}
              className="p-2 rounded-full bg-surface/60 backdrop-blur-sm border border-border text-foreground disabled:opacity-20 hover:bg-surface transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={goToNextProfile}
              disabled={currentProfileIndex === profiles.length - 1}
              className="p-2 rounded-full bg-surface/60 backdrop-blur-sm border border-border text-foreground disabled:opacity-20 hover:bg-surface transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Swipe hint at bottom */}
          <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="px-4 py-1.5 rounded-full bg-surface/60 backdrop-blur-sm border border-border"
            >
              <p className="text-xs text-muted">
                Deslize para cima/baixo para navegar entre perfis
              </p>
            </motion.div>
          </div>
        </>
      )}

      {/* Post viewer overlay */}
      <AnimatePresence>
        {viewingPosts && (
          <PostViewer
            profile={currentProfile}
            onClose={() => setViewingPosts(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
