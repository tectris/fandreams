'use client'

import { useEffect, useRef, useCallback } from 'react'
import Hls from 'hls.js'

interface VideoPlayerProps {
  src: string
  className?: string
  poster?: string
  onPlay?: () => void
  onPause?: () => void
}

export function VideoPlayer({ src, className = '', poster, onPlay, onPause }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const isHls = src.includes('.m3u8') || src.includes('playlist')

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      })
      hls.loadSource(src)
      hls.attachMedia(video)
      hlsRef.current = hls
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src
    } else {
      // Direct MP4/WebM
      video.src = src
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src])

  // Intercept fullscreen to use the container
  const handleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen().catch(() => {
        // Fallback: let the video go fullscreen natively
        videoRef.current?.requestFullscreen?.()
      })
    }
  }, [])

  // Listen for double-click on video to trigger our custom fullscreen
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleDblClick = (e: Event) => {
      e.preventDefault()
      handleFullscreen()
    }

    video.addEventListener('dblclick', handleDblClick)
    return () => video.removeEventListener('dblclick', handleDblClick)
  }, [handleFullscreen])

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ backgroundColor: '#000' }}>
      <video
        ref={videoRef}
        controls
        playsInline
        poster={poster}
        className="w-full h-full object-cover"
        onPlay={onPlay}
        onPause={onPause}
        style={{ display: 'block' }}
      />
    </div>
  )
}
