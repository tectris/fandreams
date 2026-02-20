/**
 * FanDreams Image Filters
 *
 * Filtros de imagem estilo Instagram + filtros exclusivos FanDreams
 * vinculados ao sistema de gamificação (tiers).
 *
 * Cada filtro é definido como um conjunto de ajustes CSS filter
 * que são aplicados via Canvas para exportação.
 */

export type FilterAdjustments = {
  brightness: number // 0-200, default 100
  contrast: number // 0-200, default 100
  saturate: number // 0-200, default 100
  hueRotate: number // 0-360, default 0
  sepia: number // 0-100, default 0
  grayscale: number // 0-100, default 0
  blur: number // 0-10, default 0
  opacity: number // 0-100, default 100
  // Overlay blend (cor semitransparente sobre a imagem)
  overlayColor?: string // rgba color
  overlayBlend?: GlobalCompositeOperation
  // Vignette
  vignette?: number // 0-100 intensidade
}

export type ImageFilter = {
  id: string
  name: string
  category: 'basic' | 'fandreams'
  adjustments: FilterAdjustments
  // Gamification: tier mínimo para desbloquear (null = todos)
  requiredTier: string | null
  // Ícone/cor de preview
  previewGradient?: string
}

export const DEFAULT_ADJUSTMENTS: FilterAdjustments = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  sepia: 0,
  grayscale: 0,
  blur: 0,
  opacity: 100,
}

// ─── Filtros Básicos (disponíveis para todos) ───

export const BASIC_FILTERS: ImageFilter[] = [
  {
    id: 'original',
    name: 'Original',
    category: 'basic',
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    requiredTier: null,
  },
  {
    id: 'clarendon',
    name: 'Clarendon',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 110,
      contrast: 125,
      saturate: 130,
    },
    requiredTier: null,
  },
  {
    id: 'gingham',
    name: 'Gingham',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 105,
      contrast: 90,
      saturate: 80,
      hueRotate: 350,
    },
    requiredTier: null,
  },
  {
    id: 'moon',
    name: 'Moon',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 110,
      contrast: 110,
      grayscale: 100,
    },
    requiredTier: null,
  },
  {
    id: 'lark',
    name: 'Lark',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 110,
      contrast: 90,
      saturate: 115,
    },
    requiredTier: null,
  },
  {
    id: 'reyes',
    name: 'Reyes',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 110,
      contrast: 85,
      saturate: 75,
      sepia: 22,
    },
    requiredTier: null,
  },
  {
    id: 'juno',
    name: 'Juno',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 105,
      contrast: 115,
      saturate: 140,
    },
    requiredTier: null,
  },
  {
    id: 'slumber',
    name: 'Slumber',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 105,
      contrast: 90,
      saturate: 85,
      sepia: 15,
      overlayColor: 'rgba(69, 62, 84, 0.12)',
      overlayBlend: 'multiply',
    },
    requiredTier: null,
  },
  {
    id: 'crema',
    name: 'Crema',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 105,
      contrast: 95,
      saturate: 90,
      sepia: 10,
    },
    requiredTier: null,
  },
  {
    id: 'ludwig',
    name: 'Ludwig',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 105,
      contrast: 105,
      saturate: 105,
      sepia: 5,
      overlayColor: 'rgba(125, 105, 24, 0.08)',
      overlayBlend: 'overlay',
    },
    requiredTier: null,
  },
  {
    id: 'aden',
    name: 'Aden',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 120,
      contrast: 90,
      saturate: 85,
      hueRotate: 20,
    },
    requiredTier: null,
  },
  {
    id: 'perpetua',
    name: 'Perpetua',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 105,
      contrast: 110,
      saturate: 110,
      overlayColor: 'rgba(0, 91, 154, 0.06)',
      overlayBlend: 'soft-light' as GlobalCompositeOperation,
    },
    requiredTier: null,
  },
  {
    id: 'valencia',
    name: 'Valencia',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 108,
      contrast: 108,
      saturate: 120,
      sepia: 8,
      overlayColor: 'rgba(230, 193, 61, 0.08)',
      overlayBlend: 'overlay',
    },
    requiredTier: null,
  },
  {
    id: 'xpro2',
    name: 'X-Pro II',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 105,
      contrast: 130,
      saturate: 140,
      sepia: 15,
      vignette: 50,
    },
    requiredTier: null,
  },
  {
    id: 'hudson',
    name: 'Hudson',
    category: 'basic',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 120,
      contrast: 90,
      saturate: 110,
      overlayColor: 'rgba(166, 177, 255, 0.10)',
      overlayBlend: 'multiply',
    },
    requiredTier: null,
  },
]

// ─── Filtros Exclusivos FanDreams (vinculados a tiers) ───

export const FANDREAMS_FILTERS: ImageFilter[] = [
  {
    id: 'fd_bronze_glow',
    name: 'Bronze Glow',
    category: 'fandreams',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 112,
      contrast: 105,
      saturate: 115,
      sepia: 18,
      overlayColor: 'rgba(205, 127, 50, 0.10)',
      overlayBlend: 'overlay',
      vignette: 20,
    },
    requiredTier: null, // Bronze = todos
    previewGradient: 'linear-gradient(135deg, #CD7F32, #E8A850)',
  },
  {
    id: 'fd_silver_mist',
    name: 'Silver Mist',
    category: 'fandreams',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 108,
      contrast: 95,
      saturate: 70,
      overlayColor: 'rgba(192, 192, 192, 0.12)',
      overlayBlend: 'screen' as GlobalCompositeOperation,
      vignette: 15,
    },
    requiredTier: 'silver',
    previewGradient: 'linear-gradient(135deg, #C0C0C0, #E8E8E8)',
  },
  {
    id: 'fd_silver_frost',
    name: 'Silver Frost',
    category: 'fandreams',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 115,
      contrast: 90,
      saturate: 60,
      hueRotate: 190,
      overlayColor: 'rgba(200, 220, 240, 0.10)',
      overlayBlend: 'overlay',
    },
    requiredTier: 'silver',
    previewGradient: 'linear-gradient(135deg, #B0C4DE, #F0F8FF)',
  },
  {
    id: 'fd_gold_rush',
    name: 'Gold Rush',
    category: 'fandreams',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 110,
      contrast: 120,
      saturate: 130,
      sepia: 12,
      overlayColor: 'rgba(255, 215, 0, 0.08)',
      overlayBlend: 'overlay',
      vignette: 25,
    },
    requiredTier: 'gold',
    previewGradient: 'linear-gradient(135deg, #FFD700, #FFA500)',
  },
  {
    id: 'fd_gold_sunset',
    name: 'Gold Sunset',
    category: 'fandreams',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 108,
      contrast: 115,
      saturate: 140,
      hueRotate: 345,
      overlayColor: 'rgba(255, 165, 0, 0.10)',
      overlayBlend: 'overlay',
      vignette: 30,
    },
    requiredTier: 'gold',
    previewGradient: 'linear-gradient(135deg, #FF8C00, #FF4500)',
  },
  {
    id: 'fd_diamond_ice',
    name: 'Diamond Ice',
    category: 'fandreams',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 112,
      contrast: 110,
      saturate: 120,
      hueRotate: 200,
      overlayColor: 'rgba(185, 242, 255, 0.08)',
      overlayBlend: 'screen' as GlobalCompositeOperation,
      vignette: 15,
    },
    requiredTier: 'diamond',
    previewGradient: 'linear-gradient(135deg, #B9F2FF, #87CEEB)',
  },
  {
    id: 'fd_diamond_aurora',
    name: 'Diamond Aurora',
    category: 'fandreams',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 108,
      contrast: 105,
      saturate: 135,
      hueRotate: 280,
      overlayColor: 'rgba(147, 112, 219, 0.10)',
      overlayBlend: 'overlay',
      vignette: 20,
    },
    requiredTier: 'diamond',
    previewGradient: 'linear-gradient(135deg, #9370DB, #00CED1)',
  },
  {
    id: 'fd_obsidian_dark',
    name: 'Obsidian Dark',
    category: 'fandreams',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 95,
      contrast: 135,
      saturate: 110,
      overlayColor: 'rgba(26, 26, 46, 0.15)',
      overlayBlend: 'multiply',
      vignette: 45,
    },
    requiredTier: 'obsidian',
    previewGradient: 'linear-gradient(135deg, #1A1A2E, #16213E)',
  },
  {
    id: 'fd_obsidian_neon',
    name: 'Obsidian Neon',
    category: 'fandreams',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 100,
      contrast: 140,
      saturate: 160,
      overlayColor: 'rgba(26, 26, 46, 0.12)',
      overlayBlend: 'multiply',
      vignette: 35,
    },
    requiredTier: 'obsidian',
    previewGradient: 'linear-gradient(135deg, #0F3460, #E94560)',
  },
  {
    id: 'fd_obsidian_void',
    name: 'Obsidian Void',
    category: 'fandreams',
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 90,
      contrast: 130,
      saturate: 80,
      grayscale: 20,
      overlayColor: 'rgba(10, 10, 30, 0.18)',
      overlayBlend: 'multiply',
      vignette: 55,
    },
    requiredTier: 'obsidian',
    previewGradient: 'linear-gradient(135deg, #0A0A1E, #2D1B69)',
  },
]

export const ALL_FILTERS: ImageFilter[] = [...BASIC_FILTERS, ...FANDREAMS_FILTERS]

// ─── Tier hierarchy para verificação de acesso ───

const TIER_ORDER = ['bronze', 'silver', 'gold', 'diamond', 'obsidian']

export function canAccessFilter(filter: ImageFilter, userTier: string): boolean {
  if (!filter.requiredTier) return true
  const userIndex = TIER_ORDER.indexOf(userTier)
  const requiredIndex = TIER_ORDER.indexOf(filter.requiredTier)
  if (userIndex === -1 || requiredIndex === -1) return false
  return userIndex >= requiredIndex
}

export function getAvailableFilters(userTier: string): ImageFilter[] {
  return ALL_FILTERS.filter((f) => canAccessFilter(f, userTier))
}

export function getLockedFilters(userTier: string): ImageFilter[] {
  return ALL_FILTERS.filter((f) => !canAccessFilter(f, userTier))
}

// ─── Helpers para aplicar filtros via CSS/Canvas ───

export function filterToCSSString(adjustments: FilterAdjustments): string {
  const parts: string[] = []
  if (adjustments.brightness !== 100) parts.push(`brightness(${adjustments.brightness}%)`)
  if (adjustments.contrast !== 100) parts.push(`contrast(${adjustments.contrast}%)`)
  if (adjustments.saturate !== 100) parts.push(`saturate(${adjustments.saturate}%)`)
  if (adjustments.hueRotate !== 0) parts.push(`hue-rotate(${adjustments.hueRotate}deg)`)
  if (adjustments.sepia !== 0) parts.push(`sepia(${adjustments.sepia}%)`)
  if (adjustments.grayscale !== 0) parts.push(`grayscale(${adjustments.grayscale}%)`)
  if (adjustments.blur !== 0) parts.push(`blur(${adjustments.blur}px)`)
  if (adjustments.opacity !== 100) parts.push(`opacity(${adjustments.opacity}%)`)
  return parts.length > 0 ? parts.join(' ') : 'none'
}
