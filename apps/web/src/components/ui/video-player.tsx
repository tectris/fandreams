'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import Hls from 'hls.js'
import { api } from '@/lib/api'

interface VideoPlayerProps {
  src: string
  className?: string
  poster?: string
  onPlay?: () => void
  onPause?: () => void
}

/** Extract Bunny video GUID from an HLS URL or raw GUID */
function extractGuid(src: string): string | null {
  try {
    if (src.startsWith('http')) {
      const parts = new URL(src).pathname.split('/').filter(Boolean)
      if (parts.length > 0) return parts[0]
    }
  } catch {}
  return null
}

export function VideoPlayer({ src, className = '', poster, onPlay, onPause }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isEncoding, setIsEncoding] = useState(false)
  const [encodeProgress, setEncodeProgress] = useState(0)
  const loadHlsRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setIsEncoding(false)
    setEncodeProgress(0)

    const isHls = src.includes('.m3u8') || src.includes('playlist')
    const videoGuid = extractGuid(src)

    const startPolling = () => {
      if (!videoGuid || pollTimerRef.current) return
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await api.get<{ status: string; encodeProgress: number; isReady: boolean }>(
            `/video/encoding-status/${videoGuid}`,
          )
          setEncodeProgress(res.data.encodeProgress)
          if (res.data.isReady) {
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current)
              pollTimerRef.current = null
            }
            setIsEncoding(false)
            setEncodeProgress(100)
            loadHlsRef.current?.()
          }
        } catch {
          // API unreachable, keep polling
        }
      }, 5000)
    }

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
          setEncodeProgress(100)
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
          }
        })

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setIsEncoding(true)
            hls.destroy()
            hlsRef.current = null
            startPolling()
          }
        })

        hls.loadSource(src)
        hls.attachMedia(video)
        hlsRef.current = hls
      }

      loadHlsRef.current = loadHls
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
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-4">
          <div className="w-16 h-16 relative">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none" stroke="white" strokeWidth="3"
                strokeDasharray={`${encodeProgress}, 100`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {encodeProgress}%
            </span>
          </div>
          <p className="text-sm font-medium">Processando video...</p>
          <p className="text-xs text-white/60">O video estara disponivel em breve</p>
        </div>
      )}
    </div>
  )
}
