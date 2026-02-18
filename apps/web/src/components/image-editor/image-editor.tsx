'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  Undo2,
  Redo2,
  SlidersHorizontal,
  Sparkles,
  Crop,
  Type,
  Check,
  Lock,
  Sun,
  Contrast,
  Droplets,
  Palette,
  CircleDot,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useImageEditor } from './use-image-editor'
import {
  type ImageFilter,
  type FilterAdjustments,
  BASIC_FILTERS,
  FANDREAMS_FILTERS,
  canAccessFilter,
  filterToCSSString,
  DEFAULT_ADJUSTMENTS,
} from './filters'

type EditorTab = 'filters' | 'adjust' | 'transform' | 'watermark'

type AdjustmentConfig = {
  key: keyof FilterAdjustments
  label: string
  icon: React.ReactNode
  min: number
  max: number
  step: number
  defaultValue: number
}

const ADJUSTMENTS: AdjustmentConfig[] = [
  { key: 'brightness', label: 'Brilho', icon: <Sun className="w-4 h-4" />, min: 0, max: 200, step: 1, defaultValue: 100 },
  { key: 'contrast', label: 'Contraste', icon: <Contrast className="w-4 h-4" />, min: 0, max: 200, step: 1, defaultValue: 100 },
  { key: 'saturate', label: 'Saturacao', icon: <Droplets className="w-4 h-4" />, min: 0, max: 200, step: 1, defaultValue: 100 },
  { key: 'hueRotate', label: 'Matiz', icon: <Palette className="w-4 h-4" />, min: 0, max: 360, step: 1, defaultValue: 0 },
  { key: 'sepia', label: 'Sepia', icon: <CircleDot className="w-4 h-4" />, min: 0, max: 100, step: 1, defaultValue: 0 },
  { key: 'grayscale', label: 'P&B', icon: <CircleDot className="w-4 h-4" />, min: 0, max: 100, step: 1, defaultValue: 0 },
]

interface ImageEditorProps {
  file: File
  userTier?: string
  creatorUsername?: string
  onSave: (editedFile: File) => void
  onCancel: () => void
}

export function ImageEditor({
  file,
  userTier = 'bronze',
  creatorUsername,
  onSave,
  onCancel,
}: ImageEditorProps) {
  const editor = useImageEditor()
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [activeTab, setActiveTab] = useState<EditorTab>('filters')
  const [exporting, setExporting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load image on mount
  useEffect(() => {
    editor.loadImage(file).then(() => setLoaded(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  // Re-render preview whenever state changes
  useEffect(() => {
    if (!editor.originalImage || !previewCanvasRef.current) return
    editor.renderToCanvas(previewCanvasRef.current, editor.originalImage, editor.state)
  }, [editor, editor.state, editor.originalImage])

  const handleSave = useCallback(async () => {
    setExporting(true)
    try {
      const edited = await editor.exportImage(0.9, 'image/webp')
      if (edited) {
        onSave(edited)
      }
    } finally {
      setExporting(false)
    }
  }, [editor, onSave])

  const handleFilterClick = useCallback(
    (filter: ImageFilter) => {
      if (!canAccessFilter(filter, userTier)) return
      editor.setFilter(filter)
    },
    [editor, userTier],
  )

  if (!loaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={onCancel} className="p-2 hover:bg-surface-light rounded-sm transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold">Editar imagem</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={editor.undo}
            disabled={!editor.canUndo}
            className="p-2 hover:bg-surface-light rounded-sm transition-colors disabled:opacity-30"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={editor.redo}
            disabled={!editor.canRedo}
            className="p-2 hover:bg-surface-light rounded-sm transition-colors disabled:opacity-30"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <Button size="sm" onClick={handleSave} loading={exporting} disabled={exporting}>
            <Check className="w-4 h-4" />
            Aplicar
          </Button>
        </div>
      </div>

      {/* Canvas Preview */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-black/20 p-4">
        <canvas
          ref={previewCanvasRef}
          className="max-w-full max-h-full object-contain rounded-sm"
          style={{ imageRendering: 'auto' }}
        />
      </div>

      {/* Tabs */}
      <div className="border-t border-border">
        <div className="flex border-b border-border">
          {(
            [
              { id: 'filters', label: 'Filtros', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'adjust', label: 'Ajustes', icon: <SlidersHorizontal className="w-4 h-4" /> },
              { id: 'transform', label: 'Transformar', icon: <Crop className="w-4 h-4" /> },
              { id: 'watermark', label: 'Marca', icon: <Type className="w-4 h-4" /> },
            ] as { id: EditorTab; label: string; icon: React.ReactNode }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="h-48 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'filters' && (
              <FiltersPanel
                key="filters"
                selectedFilter={editor.state.filter}
                userTier={userTier}
                originalImage={editor.originalImage}
                onSelect={handleFilterClick}
              />
            )}
            {activeTab === 'adjust' && (
              <AdjustPanel
                key="adjust"
                adjustments={editor.state.adjustments}
                onAdjust={editor.setAdjustment}
                onCommit={editor.commitAdjustments}
                onReset={editor.reset}
              />
            )}
            {activeTab === 'transform' && (
              <TransformPanel
                key="transform"
                rotation={editor.state.rotation}
                flipH={editor.state.flipH}
                flipV={editor.state.flipV}
                onRotate={editor.rotate}
                onFlipH={editor.flipHorizontal}
                onFlipV={editor.flipVertical}
              />
            )}
            {activeTab === 'watermark' && (
              <WatermarkPanel
                key="watermark"
                watermark={editor.state.watermark}
                creatorUsername={creatorUsername}
                onSetWatermark={editor.setWatermark}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─── Filters Panel ───

function FiltersPanel({
  selectedFilter,
  userTier,
  originalImage,
  onSelect,
}: {
  selectedFilter: ImageFilter
  userTier: string
  originalImage: HTMLImageElement | null
  onSelect: (filter: ImageFilter) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-3"
    >
      {/* Basic filters */}
      <p className="text-xs text-muted mb-2 font-medium">Filtros</p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {BASIC_FILTERS.map((filter) => (
          <FilterThumbnail
            key={filter.id}
            filter={filter}
            selected={selectedFilter.id === filter.id}
            locked={false}
            image={originalImage}
            onClick={() => onSelect(filter)}
          />
        ))}
      </div>

      {/* FanDreams exclusive filters */}
      <p className="text-xs text-muted mb-2 mt-3 font-medium flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-primary" />
        FanDreams Exclusivos
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {FANDREAMS_FILTERS.map((filter) => {
          const locked = !canAccessFilter(filter, userTier)
          return (
            <FilterThumbnail
              key={filter.id}
              filter={filter}
              selected={selectedFilter.id === filter.id}
              locked={locked}
              image={originalImage}
              onClick={() => onSelect(filter)}
            />
          )
        })}
      </div>
    </motion.div>
  )
}

function FilterThumbnail({
  filter,
  selected,
  locked,
  image,
  onClick,
}: {
  filter: ImageFilter
  selected: boolean
  locked: boolean
  image: HTMLImageElement | null
  onClick: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!image || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 64
    canvas.width = size
    canvas.height = size

    // Draw cropped square preview
    const minDim = Math.min(image.naturalWidth, image.naturalHeight)
    const sx = (image.naturalWidth - minDim) / 2
    const sy = (image.naturalHeight - minDim) / 2

    ctx.filter = filterToCSSString(filter.adjustments)
    ctx.drawImage(image, sx, sy, minDim, minDim, 0, 0, size, size)

    // Apply overlay
    if (filter.adjustments.overlayColor && filter.adjustments.overlayBlend) {
      ctx.save()
      ctx.globalCompositeOperation = filter.adjustments.overlayBlend
      ctx.fillStyle = filter.adjustments.overlayColor
      ctx.fillRect(0, 0, size, size)
      ctx.restore()
    }

    // Apply vignette
    if (filter.adjustments.vignette && filter.adjustments.vignette > 0) {
      const intensity = filter.adjustments.vignette / 100
      const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.5)
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, `rgba(0,0,0,${intensity * 0.6})`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
    }

    // Locked overlay
    if (locked) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, size, size)
    }
  }, [image, filter, locked])

  return (
    <button
      onClick={locked ? undefined : onClick}
      className={cn(
        'flex-shrink-0 flex flex-col items-center gap-1 transition-all',
        locked && 'cursor-not-allowed opacity-70',
      )}
      disabled={locked}
    >
      <div
        className={cn(
          'relative w-16 h-16 rounded-md overflow-hidden border-2 transition-colors',
          selected ? 'border-primary' : 'border-border',
        )}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" />
          </div>
        )}
        {filter.category === 'fandreams' && filter.previewGradient && !locked && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: filter.previewGradient }}
          />
        )}
      </div>
      <span
        className={cn(
          'text-[10px] max-w-16 truncate',
          selected ? 'text-primary font-semibold' : 'text-muted',
        )}
      >
        {filter.name}
      </span>
    </button>
  )
}

// ─── Adjust Panel ───

function AdjustPanel({
  adjustments,
  onAdjust,
  onCommit,
  onReset,
}: {
  adjustments: FilterAdjustments
  onAdjust: (key: keyof FilterAdjustments, value: number) => void
  onCommit: () => void
  onReset: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 space-y-4"
    >
      {ADJUSTMENTS.map((adj) => {
        const value = adjustments[adj.key] as number
        const isDefault = value === adj.defaultValue
        return (
          <div key={adj.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                {adj.icon}
                <span className="font-medium">{adj.label}</span>
              </div>
              <span className={cn('text-xs tabular-nums', isDefault ? 'text-muted' : 'text-primary font-semibold')}>
                {adj.key === 'hueRotate' ? `${value}°` : value}
              </span>
            </div>
            <input
              type="range"
              min={adj.min}
              max={adj.max}
              step={adj.step}
              value={value}
              onChange={(e) => onAdjust(adj.key, Number(e.target.value))}
              onMouseUp={onCommit}
              onTouchEnd={onCommit}
              className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-125"
            />
          </div>
        )
      })}
      <button
        onClick={onReset}
        className="w-full py-2 text-xs text-muted hover:text-foreground transition-colors"
      >
        Resetar ajustes
      </button>
    </motion.div>
  )
}

// ─── Transform Panel ───

function TransformPanel({
  rotation,
  flipH,
  flipV,
  onRotate,
  onFlipH,
  onFlipV,
}: {
  rotation: number
  flipH: boolean
  flipV: boolean
  onRotate: () => void
  onFlipH: () => void
  onFlipV: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4"
    >
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={onRotate}
          className="flex flex-col items-center gap-2 p-4 rounded-md border border-border hover:border-primary/50 hover:bg-surface-light transition-colors"
        >
          <RotateCw className="w-6 h-6" />
          <span className="text-xs font-medium">Girar 90°</span>
          <span className="text-[10px] text-muted">{rotation}°</span>
        </button>

        <button
          onClick={onFlipH}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-md border transition-colors',
            flipH
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border hover:border-primary/50 hover:bg-surface-light',
          )}
        >
          <FlipHorizontal2 className="w-6 h-6" />
          <span className="text-xs font-medium">Espelhar H</span>
        </button>

        <button
          onClick={onFlipV}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-md border transition-colors',
            flipV
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border hover:border-primary/50 hover:bg-surface-light',
          )}
        >
          <FlipVertical2 className="w-6 h-6" />
          <span className="text-xs font-medium">Espelhar V</span>
        </button>
      </div>
    </motion.div>
  )
}

// ─── Watermark Panel ───

function WatermarkPanel({
  watermark,
  creatorUsername,
  onSetWatermark,
}: {
  watermark: string | null
  creatorUsername?: string
  onSetWatermark: (text: string | null) => void
}) {
  const [customText, setCustomText] = useState(watermark || creatorUsername || '')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 space-y-4"
    >
      <p className="text-xs text-muted">
        Adicione uma marca d&apos;agua com seu username para proteger seu conteudo.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => onSetWatermark(null)}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-md border transition-colors text-left',
            watermark === null
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50',
          )}
        >
          <X className="w-4 h-4 shrink-0" />
          <div>
            <p className="text-sm font-medium">Sem marca d&apos;agua</p>
          </div>
        </button>

        {creatorUsername && (
          <button
            onClick={() => onSetWatermark(creatorUsername)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-md border transition-colors text-left',
              watermark === creatorUsername
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50',
            )}
          >
            <Type className="w-4 h-4 shrink-0" />
            <div>
              <p className="text-sm font-medium">@{creatorUsername}</p>
              <p className="text-[10px] text-muted">Seu username</p>
            </div>
          </button>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Texto personalizado..."
            maxLength={30}
            className="flex-1 px-3 py-2 rounded-sm bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => customText.trim() && onSetWatermark(customText.trim())}
            disabled={!customText.trim()}
          >
            Aplicar
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
