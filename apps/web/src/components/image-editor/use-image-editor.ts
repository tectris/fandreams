'use client'

import { useCallback, useRef, useState } from 'react'
import {
  type FilterAdjustments,
  type ImageFilter,
  DEFAULT_ADJUSTMENTS,
  ALL_FILTERS,
  filterToCSSString,
} from './filters'

export type CropArea = {
  x: number
  y: number
  width: number
  height: number
}

export type EditorState = {
  filter: ImageFilter
  adjustments: FilterAdjustments
  rotation: number // 0, 90, 180, 270
  flipH: boolean
  flipV: boolean
  crop: CropArea | null
  watermark: string | null
}

const INITIAL_STATE: EditorState = {
  filter: ALL_FILTERS[0],
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  rotation: 0,
  flipH: false,
  flipV: false,
  crop: null,
  watermark: null,
}

export function useImageEditor() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [state, setState] = useState<EditorState>(INITIAL_STATE)
  const [history, setHistory] = useState<EditorState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const pushHistory = useCallback(
    (newState: EditorState) => {
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1)
        return [...truncated, newState]
      })
      setHistoryIndex((prev) => prev + 1)
    },
    [historyIndex],
  )

  const loadImage = useCallback((file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        setOriginalImage(img)
        setOriginalFile(file)
        setState(INITIAL_STATE)
        setHistory([INITIAL_STATE])
        setHistoryIndex(0)
        resolve(img)
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const setFilter = useCallback(
    (filter: ImageFilter) => {
      const newState: EditorState = {
        ...state,
        filter,
        adjustments: { ...filter.adjustments },
      }
      setState(newState)
      pushHistory(newState)
    },
    [state, pushHistory],
  )

  const setAdjustment = useCallback(
    (key: keyof FilterAdjustments, value: number) => {
      const newState: EditorState = {
        ...state,
        adjustments: { ...state.adjustments, [key]: value },
      }
      setState(newState)
    },
    [state],
  )

  const commitAdjustments = useCallback(() => {
    pushHistory(state)
  }, [state, pushHistory])

  const rotate = useCallback(() => {
    const newState: EditorState = {
      ...state,
      rotation: ((state.rotation + 90) % 360) as 0 | 90 | 180 | 270,
    }
    setState(newState)
    pushHistory(newState)
  }, [state, pushHistory])

  const flipHorizontal = useCallback(() => {
    const newState: EditorState = { ...state, flipH: !state.flipH }
    setState(newState)
    pushHistory(newState)
  }, [state, pushHistory])

  const flipVertical = useCallback(() => {
    const newState: EditorState = { ...state, flipV: !state.flipV }
    setState(newState)
    pushHistory(newState)
  }, [state, pushHistory])

  const setCrop = useCallback(
    (crop: CropArea | null) => {
      const newState: EditorState = { ...state, crop }
      setState(newState)
      pushHistory(newState)
    },
    [state, pushHistory],
  )

  const setWatermark = useCallback(
    (text: string | null) => {
      const newState: EditorState = { ...state, watermark: text }
      setState(newState)
      pushHistory(newState)
    },
    [state, pushHistory],
  )

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setState(history[newIndex])
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setState(history[newIndex])
    }
  }, [history, historyIndex])

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
    setHistory([INITIAL_STATE])
    setHistoryIndex(0)
  }, [])

  const renderToCanvas = useCallback(
    (canvas: HTMLCanvasElement, img: HTMLImageElement, editorState: EditorState) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      let sw = img.naturalWidth
      let sh = img.naturalHeight

      // Handle crop
      let sx = 0,
        sy = 0,
        cw = sw,
        ch = sh
      if (editorState.crop) {
        sx = Math.round((editorState.crop.x / 100) * sw)
        sy = Math.round((editorState.crop.y / 100) * sh)
        cw = Math.round((editorState.crop.width / 100) * sw)
        ch = Math.round((editorState.crop.height / 100) * sh)
      }

      // Swap dimensions for 90/270 rotation
      const isRotated = editorState.rotation === 90 || editorState.rotation === 270
      canvas.width = isRotated ? ch : cw
      canvas.height = isRotated ? cw : ch

      ctx.save()

      // Move to center for transformations
      ctx.translate(canvas.width / 2, canvas.height / 2)

      // Apply rotation
      if (editorState.rotation !== 0) {
        ctx.rotate((editorState.rotation * Math.PI) / 180)
      }

      // Apply flip
      const scaleX = editorState.flipH ? -1 : 1
      const scaleY = editorState.flipV ? -1 : 1
      ctx.scale(scaleX, scaleY)

      // Apply CSS filter
      ctx.filter = filterToCSSString(editorState.adjustments)

      // Draw image centered
      ctx.drawImage(img, sx, sy, cw, ch, -cw / 2, -ch / 2, cw, ch)

      ctx.restore()

      // Apply overlay color
      if (editorState.adjustments.overlayColor && editorState.adjustments.overlayBlend) {
        ctx.save()
        ctx.globalCompositeOperation = editorState.adjustments.overlayBlend
        ctx.fillStyle = editorState.adjustments.overlayColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.restore()
      }

      // Apply vignette
      if (editorState.adjustments.vignette && editorState.adjustments.vignette > 0) {
        const intensity = editorState.adjustments.vignette / 100
        const gradient = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.3,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.7,
        )
        gradient.addColorStop(0, 'rgba(0,0,0,0)')
        gradient.addColorStop(1, `rgba(0,0,0,${intensity * 0.6})`)
        ctx.save()
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.restore()
      }

      // Apply watermark
      if (editorState.watermark) {
        ctx.save()
        const fontSize = Math.max(14, canvas.width * 0.025)
        ctx.font = `${fontSize}px sans-serif`
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'bottom'

        // Text shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 1
        ctx.shadowOffsetY = 1

        const padding = fontSize * 0.8
        ctx.fillText(`@${editorState.watermark}`, canvas.width - padding, canvas.height - padding)
        ctx.restore()
      }
    },
    [],
  )

  const exportImage = useCallback(
    async (quality = 0.9, format: 'image/webp' | 'image/jpeg' | 'image/png' = 'image/webp'): Promise<File | null> => {
      if (!originalImage || !originalFile) return null

      const canvas = document.createElement('canvas')
      renderToCanvas(canvas, originalImage, state)

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null)
              return
            }
            const ext = format === 'image/webp' ? '.webp' : format === 'image/jpeg' ? '.jpg' : '.png'
            const name = originalFile.name.replace(/\.[^.]+$/, '') + '_edited' + ext
            resolve(new File([blob], name, { type: format }))
          },
          format,
          quality,
        )
      })
    },
    [originalImage, originalFile, state, renderToCanvas],
  )

  return {
    // State
    originalImage,
    originalFile,
    state,
    canvasRef,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    hasChanges: historyIndex > 0,

    // Actions
    loadImage,
    setFilter,
    setAdjustment,
    commitAdjustments,
    rotate,
    flipHorizontal,
    flipVertical,
    setCrop,
    setWatermark,
    undo,
    redo,
    reset,
    renderToCanvas,
    exportImage,
  }
}
