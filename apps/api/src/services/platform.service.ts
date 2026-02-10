import { eq, desc, count, and, gte, lt } from 'drizzle-orm'
import { cookieConsents, contactMessages, otpCodes, platformSettings } from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import { getSetting, setSetting } from './withdrawal.service'

// ── Cookie Consent ──

export async function recordCookieConsent(data: {
  userId?: string
  ipAddress: string
  userAgent?: string
  accepted: boolean
}) {
  const [consent] = await db
    .insert(cookieConsents)
    .values({
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      accepted: data.accepted,
    })
    .returning()

  return consent
}

export async function getCookieConsentStats() {
  const [totalResult] = await db.select({ count: count() }).from(cookieConsents)
  const [acceptedResult] = await db
    .select({ count: count() })
    .from(cookieConsents)
    .where(eq(cookieConsents.accepted, true))

  const now = new Date()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const [recentResult] = await db
    .select({ count: count() })
    .from(cookieConsents)
    .where(gte(cookieConsents.createdAt, last30Days))

  return {
    total: totalResult.count,
    accepted: acceptedResult.count,
    rejected: totalResult.count - acceptedResult.count,
    last30Days: recentResult.count,
  }
}

export async function getCookieConsents(page: number, limit: number) {
  const offset = (page - 1) * limit
  const items = await db
    .select()
    .from(cookieConsents)
    .orderBy(desc(cookieConsents.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db.select({ count: count() }).from(cookieConsents)

  return { items, total: totalResult.count }
}

// ── Contact Messages ──

export async function createContactMessage(data: {
  name: string
  email: string
  whatsapp?: string
  message: string
}) {
  // Basic validation
  if (!data.name || data.name.length < 2 || data.name.length > 100) {
    throw new AppError('INVALID_NAME', 'Nome deve ter entre 2 e 100 caracteres', 400)
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new AppError('INVALID_EMAIL', 'Email invalido', 400)
  }
  if (!data.message || data.message.length < 10 || data.message.length > 2000) {
    throw new AppError('INVALID_MESSAGE', 'Mensagem deve ter entre 10 e 2000 caracteres', 400)
  }

  const [msg] = await db
    .insert(contactMessages)
    .values({
      name: data.name,
      email: data.email,
      whatsapp: data.whatsapp || null,
      message: data.message,
    })
    .returning()

  return msg
}

export async function getContactMessages(page: number, limit: number, unreadOnly: boolean) {
  const offset = (page - 1) * limit
  const whereClause = unreadOnly ? eq(contactMessages.isRead, false) : undefined

  const items = await db
    .select()
    .from(contactMessages)
    .where(whereClause)
    .orderBy(desc(contactMessages.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db.select({ count: count() }).from(contactMessages).where(whereClause)
  const [unreadResult] = await db
    .select({ count: count() })
    .from(contactMessages)
    .where(eq(contactMessages.isRead, false))

  return { items, total: totalResult.count, unread: unreadResult.count }
}

export async function markContactMessageRead(messageId: string) {
  const [updated] = await db
    .update(contactMessages)
    .set({ isRead: true })
    .where(eq(contactMessages.id, messageId))
    .returning()

  if (!updated) throw new AppError('NOT_FOUND', 'Mensagem nao encontrada', 404)
  return updated
}

// ── OTP Codes ──

function generateOtp(): string {
  const digits = '0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += digits[Math.floor(Math.random() * digits.length)]
  }
  return code
}

export async function createOtpCode(userId: string, purpose: string): Promise<string> {
  // Invalidate previous unused OTPs for the same purpose
  const now = new Date()

  // Rate limit: max 5 OTPs per hour
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const [recentCount] = await db
    .select({ count: count() })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.userId, userId),
        eq(otpCodes.purpose, purpose),
        gte(otpCodes.createdAt, oneHourAgo),
      ),
    )

  if ((recentCount?.count || 0) >= 5) {
    throw new AppError('OTP_RATE_LIMIT', 'Muitas solicitacoes de codigo. Aguarde 1 hora.', 429)
  }

  const code = generateOtp()
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000) // 10 minutes

  await db.insert(otpCodes).values({
    userId,
    code,
    purpose,
    expiresAt,
  })

  return code
}

export async function verifyOtpCode(userId: string, code: string, purpose: string): Promise<boolean> {
  const now = new Date()

  // Find the most recent valid OTP
  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.userId, userId),
        eq(otpCodes.purpose, purpose),
        gte(otpCodes.expiresAt, now),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1)

  if (!otp) {
    throw new AppError('OTP_EXPIRED', 'Codigo expirado ou invalido. Solicite um novo.', 400)
  }

  // Check attempts (max 5)
  if (otp.attempts >= 5) {
    throw new AppError('OTP_MAX_ATTEMPTS', 'Maximo de tentativas atingido. Solicite um novo codigo.', 400)
  }

  // Increment attempts
  await db
    .update(otpCodes)
    .set({ attempts: otp.attempts + 1 })
    .where(eq(otpCodes.id, otp.id))

  if (otp.code !== code) {
    throw new AppError('OTP_INVALID', 'Codigo incorreto', 400)
  }

  // Mark as used
  await db
    .update(otpCodes)
    .set({ usedAt: now })
    .where(eq(otpCodes.id, otp.id))

  return true
}

// ── Terms & Privacy Content ──

export async function getPageContent(key: string): Promise<{ title: string; content: string; updatedAt: string } | null> {
  const data = await getSetting<{ title: string; content: string; updatedAt: string } | null>(key, null)
  return data
}

export async function setPageContent(key: string, title: string, content: string, adminId: string) {
  const allowedKeys = ['terms_and_conditions', 'privacy_policy']
  if (!allowedKeys.includes(key)) {
    throw new AppError('INVALID_KEY', 'Chave invalida', 400)
  }

  await setSetting(key, { title, content, updatedAt: new Date().toISOString() }, adminId)
  return { title, content, updatedAt: new Date().toISOString() }
}

// ── SEO & Branding ──

export async function getSeoSettings() {
  const logoUrl = await getSetting<string | null>('platform_logo_url', null)
  const keywords = await getSetting<string>('seo_keywords', '')
  const pixelCode = await getSetting<string>('seo_pixel_code', '')
  const googleAdsCode = await getSetting<string>('seo_google_ads_code', '')
  const headScripts = await getSetting<string>('seo_head_scripts', '')

  return { logoUrl, keywords, pixelCode, googleAdsCode, headScripts }
}

export async function updateSeoSettings(
  updates: {
    logoUrl?: string
    keywords?: string
    pixelCode?: string
    googleAdsCode?: string
    headScripts?: string
  },
  adminId: string,
) {
  if (updates.logoUrl !== undefined) await setSetting('platform_logo_url', updates.logoUrl, adminId)
  if (updates.keywords !== undefined) await setSetting('seo_keywords', updates.keywords, adminId)
  if (updates.pixelCode !== undefined) await setSetting('seo_pixel_code', updates.pixelCode, adminId)
  if (updates.googleAdsCode !== undefined) await setSetting('seo_google_ads_code', updates.googleAdsCode, adminId)
  if (updates.headScripts !== undefined) await setSetting('seo_head_scripts', updates.headScripts, adminId)

  return getSeoSettings()
}
