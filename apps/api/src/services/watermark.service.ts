import sharp from 'sharp'

/**
 * Watermark service — adds visible watermark overlay to images.
 * Pattern: diagonal tiled text "fandreams.app/{username}" (OnlyFans-style).
 * Semi-transparent white text with dark shadow for visibility on all backgrounds.
 */

interface WatermarkOptions {
  /** The username of the content creator (e.g. "admin") */
  username: string
  /** Opacity 0-1, default 0.3 */
  opacity?: number
  /** Font size in px, auto-calculated from image width if not provided */
  fontSize?: number
}

/**
 * Generate an SVG tile with diagonal watermark text.
 * The tile is designed to be repeated across the full image.
 */
function createWatermarkTile(text: string, tileWidth: number, tileHeight: number, fontSize: number, opacity: number): string {
  // Calculate diagonal angle and text positioning
  const angle = -30 // degrees

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${tileHeight}">
    <defs>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.8)" flood-opacity="0.8"/>
      </filter>
    </defs>
    <g transform="rotate(${angle}, ${tileWidth / 2}, ${tileHeight / 2})">
      <text
        x="${tileWidth / 2}"
        y="${tileHeight / 2}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="rgba(255,255,255,${opacity})"
        text-anchor="middle"
        dominant-baseline="middle"
        filter="url(#shadow)"
        letter-spacing="1"
      >${text}</text>
    </g>
  </svg>`
}

/**
 * Apply a tiled diagonal watermark to an image buffer.
 * Returns the watermarked image as a buffer.
 */
export async function applyWatermark(
  imageBuffer: Buffer,
  options: WatermarkOptions,
): Promise<Buffer> {
  const { username, opacity = 0.3 } = options
  const text = `fandreams.app/${username}`

  // Get original image dimensions
  const metadata = await sharp(imageBuffer).metadata()
  const imgWidth = metadata.width || 1920
  const imgHeight = metadata.height || 1080

  // Auto-size font based on image width
  const fontSize = options.fontSize || Math.max(14, Math.floor(imgWidth / 40))

  // Tile dimensions — large enough so text doesn't overlap itself
  const tileWidth = Math.max(400, fontSize * text.length * 0.7)
  const tileHeight = Math.max(200, fontSize * 4)

  // Generate a single watermark tile
  const tileSvg = createWatermarkTile(text, tileWidth, tileHeight, fontSize, opacity)
  const tileBuffer = Buffer.from(tileSvg)

  // Calculate how many tiles we need to cover the image
  const cols = Math.ceil(imgWidth / tileWidth) + 1
  const rows = Math.ceil(imgHeight / tileHeight) + 1

  // Create a full-size SVG with tiled watermarks
  const tiles: string[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * tileWidth
      const y = row * tileHeight
      tiles.push(
        `<image href="" x="${x}" y="${y}" width="${tileWidth}" height="${tileHeight}"/>`,
      )
    }
  }

  // Simpler approach: create the tile as a PNG, then tile it using Sharp's composite
  const tilePng = await sharp(tileBuffer)
    .resize(Math.round(tileWidth), Math.round(tileHeight))
    .png()
    .toBuffer()

  // Build composite operations for tiling
  const composites: sharp.OverlayOptions[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      composites.push({
        input: tilePng,
        top: row * Math.round(tileHeight),
        left: col * Math.round(tileWidth),
      })
    }
  }

  // Apply watermark tiles on original image
  const result = await sharp(imageBuffer)
    .composite(composites)
    .toBuffer()

  return result
}

/**
 * Quick check: does this image need watermarking?
 * Only watermark post content, not avatars/covers/thumbnails.
 */
export function shouldWatermark(folder: string): boolean {
  return folder === 'posts/images'
}
