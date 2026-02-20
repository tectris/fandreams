import sharp from 'sharp'
import crypto from 'crypto'

/**
 * Steganography service — embeds invisible fingerprints into images using LSB (Least Significant Bit).
 *
 * How it works:
 * - Builds a fingerprint string: userId|postId|timestamp|hash
 * - Converts to binary
 * - Modifies the least significant bit of pixel channel values
 * - Changes are imperceptible to the human eye
 *
 * This allows tracing leaked images back to the specific user who downloaded them.
 */

const MAGIC_HEADER = 'FD01' // Magic bytes to identify steganographic data
const MAX_FINGERPRINT_BYTES = 256 // Max fingerprint payload

interface FingerprintData {
  userId: string
  postId?: string
  timestamp?: number
}

/**
 * Build the fingerprint payload string and compute its HMAC for integrity.
 */
function buildFingerprint(data: FingerprintData, secret: string): string {
  const ts = data.timestamp || Date.now()
  const payload = `${data.userId}|${data.postId || ''}|${ts}`

  // HMAC to verify integrity when extracting
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .slice(0, 16) // 16-char truncated HMAC is sufficient

  return `${MAGIC_HEADER}:${payload}:${hmac}`
}

/**
 * Convert string to binary bit array.
 */
function stringToBits(str: string): number[] {
  const bits: number[] = []
  const buf = Buffer.from(str, 'utf8')

  // First 16 bits = payload length
  const len = buf.length
  for (let i = 15; i >= 0; i--) {
    bits.push((len >> i) & 1)
  }

  // Payload bits
  for (const byte of buf) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1)
    }
  }

  return bits
}

/**
 * Convert bits back to string.
 */
function bitsToString(bits: number[]): string {
  if (bits.length < 16) return ''

  // Read length from first 16 bits
  let len = 0
  for (let i = 0; i < 16; i++) {
    len = (len << 1) | (bits[i] ?? 0)
  }

  if (len <= 0 || len > MAX_FINGERPRINT_BYTES) return ''

  const bytes: number[] = []
  for (let i = 0; i < len; i++) {
    let byte = 0
    for (let j = 0; j < 8; j++) {
      const bitIdx = 16 + i * 8 + j
      if (bitIdx >= bits.length) return ''
      byte = (byte << 1) | (bits[bitIdx] ?? 0)
    }
    bytes.push(byte)
  }

  return Buffer.from(bytes).toString('utf8')
}

/**
 * Embed fingerprint into image using LSB steganography.
 *
 * Modifies the least significant bit of the blue channel (least noticeable to human eye).
 * Uses raw pixel data via Sharp.
 *
 * @returns The fingerprinted image buffer
 */
export async function embedFingerprint(
  imageBuffer: Buffer,
  data: FingerprintData,
  secret: string,
): Promise<Buffer> {
  const fingerprint = buildFingerprint(data, secret)
  const bits = stringToBits(fingerprint)

  // Get raw pixel data (RGBA)
  const metadata = await sharp(imageBuffer).metadata()
  const { width = 0, height = 0 } = metadata

  // Ensure enough pixels to embed data (1 bit per pixel, using blue channel)
  const totalPixels = width * height
  if (totalPixels < bits.length) {
    // Image too small for fingerprint — return original
    console.warn(`Steganography: image too small (${totalPixels} pixels, need ${bits.length} bits)`)
    return imageBuffer
  }

  // Extract raw pixel data
  const { data: rawPixels, info } = await sharp(imageBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true })

  const pixels = Buffer.from(rawPixels)

  // Embed bits into the LSB of the blue channel (index 2 in RGBA)
  for (let i = 0; i < bits.length; i++) {
    const pixelOffset = i * 4 // Each pixel = 4 bytes (RGBA)
    const blueIdx = pixelOffset + 2 // Blue channel

    if (blueIdx < pixels.length) {
      // Clear LSB and set to our bit
      const currentVal = pixels[blueIdx] ?? 0
      pixels[blueIdx] = (currentVal & 0xFE) | (bits[i] ?? 0)
    }
  }

  // Reconstruct image from modified pixels
  const result = await sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .removeAlpha()
    .png() // Use PNG to preserve LSB (lossy formats destroy it)
    .toBuffer()

  return result
}

/**
 * Extract fingerprint from a steganographic image.
 * Returns the fingerprint data if found and valid, null otherwise.
 */
export async function extractFingerprint(
  imageBuffer: Buffer,
  secret: string,
): Promise<FingerprintData | null> {
  try {
    const { data: rawPixels, info } = await sharp(imageBuffer)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true })

    const totalPixels = info.width * info.height
    const maxBits = Math.min(totalPixels, (MAX_FINGERPRINT_BYTES + 2) * 8 + 16)

    // Extract LSB bits from blue channel
    const bits: number[] = []
    for (let i = 0; i < maxBits; i++) {
      const blueIdx = i * 4 + 2
      if (blueIdx >= rawPixels.length) break
      bits.push((rawPixels[blueIdx] ?? 0) & 1)
    }

    const decoded = bitsToString(bits)
    if (!decoded || !decoded.startsWith(MAGIC_HEADER + ':')) {
      return null
    }

    const parts = decoded.split(':')
    if (parts.length < 3) return null

    const payload = parts[1]!
    const storedHmac = parts[2]

    // Verify HMAC
    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
      .slice(0, 16)

    if (storedHmac !== expectedHmac) {
      return null
    }

    const payloadParts = payload.split('|')
    return {
      userId: payloadParts[0] || '',
      postId: payloadParts[1] || undefined,
      timestamp: payloadParts[2] ? Number(payloadParts[2]) : undefined,
    }
  } catch {
    return null
  }
}
