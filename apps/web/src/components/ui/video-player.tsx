'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
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
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isEncoding, setIsEncoding] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    setIsEncoding(false)

    const isHls = src.includes('.m3u8') || src.includes('playlist')

    if (isHls && Hls.isSupported()) {
      const loadHls = () => {
        if (hlsRef.current) {
          hlsRef.current.destroy()
          hlsRef.current = null
        }
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        })

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsEncoding(false)
        })

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setIsEncoding(true)
            hls.destroy()
            hlsRef.current = null
            retryTimerRef.current = setTimeout(loadHls, 10000)
          }
        })

        hls.loadSource(src)
        hls.attachMedia(video)
        hlsRef.current = hls
      }

      loadHls()
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
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
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
      {isEncoding && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-3">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-sm font-medium">Processando vídeo...</p>
          <p className="text-xs text-white/60">O vídeo está sendo processado e estará disponível em breve</p>
        </div>
      )}
    </div>
  )
}
