import { Hono } from 'hono'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { sensitiveRateLimit } from '../middleware/rateLimit'
import * as platformService from '../services/platform.service'
import * as docAcceptanceService from '../services/document-acceptance.service'
import { success, error } from '../utils/response'
import { AppError } from '../services/auth.service'

const platform = new Hono()

// ── Public Routes ──

// Record cookie consent (public, no auth needed)
platform.post('/cookie-consent', async (c) => {
  try {
    const { accepted } = await c.req.json()
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const userAgent = c.req.header('user-agent') || ''

    const consent = await platformService.recordCookieConsent({
      ipAddress: ip,
      userAgent,
      accepted: accepted !== false,
    })
    return success(c, { id: consent.id })
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Get public page content (terms, privacy)
platform.get('/page/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const content = await platformService.getPageContent(key)
    return success(c, content)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Submit contact message (public with rate limit)
platform.post('/contact', sensitiveRateLimit, async (c) => {
  try {
    const { name, email, whatsapp, message, honeypot, timestamp: ts } = await c.req.json()

    // Anti-bot: honeypot field must be empty
    if (honeypot) {
      // Silently accept but don't store (bot detected)
      return success(c, { sent: true })
    }

    // Anti-bot: timestamp check (form must take at least 3 seconds to fill)
    if (ts && Date.now() - Number(ts) < 3000) {
      return success(c, { sent: true })
    }

    const msg = await platformService.createContactMessage({ name, email, whatsapp, message })

    // Send notification email to contato@fandream.app (fire and forget)
    const { sendContactNotificationEmail } = await import('../services/email.service')
    sendContactNotificationEmail({ name, email, whatsapp, message }).catch((err) =>
      console.error('Failed to send contact notification email:', err),
    )

    return success(c, { sent: true, id: msg.id })
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Get SEO/branding settings (public for head injection)
platform.get('/seo', async (c) => {
  try {
    const settings = await platformService.getSeoSettings()
    return success(c, settings)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── OTP Routes (authenticated) ──

// Request OTP for withdrawal
platform.post('/otp/request', authMiddleware, sensitiveRateLimit, async (c) => {
  try {
    const { userId } = c.get('user')
    const { purpose } = await c.req.json()

    if (!purpose || !['withdrawal'].includes(purpose)) {
      return error(c, 400, 'INVALID_PURPOSE', 'Proposito invalido')
    }

    // Get user email for sending OTP
    const { db } = await import('../config/database')
    const { users } = await import('@fandreams/database')
    const { eq } = await import('drizzle-orm')
    const [user] = await db
      .select({ email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) return error(c, 404, 'USER_NOT_FOUND', 'Usuario nao encontrado')

    const code = await platformService.createOtpCode(userId, purpose)

    // Send OTP email
    const { sendWithdrawalOtpEmail } = await import('../services/email.service')
    await sendWithdrawalOtpEmail(user.email, code)

    return success(c, { sent: true, expiresInMinutes: 10 })
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Verify OTP
platform.post('/otp/verify', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const { code, purpose } = await c.req.json()

    if (!code || !purpose) {
      return error(c, 400, 'MISSING_FIELDS', 'Codigo e proposito obrigatorios')
    }

    await platformService.verifyOtpCode(userId, code, purpose)
    return success(c, { verified: true })
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Document Acceptance Routes (authenticated) ──

// Get list of all legal documents with user's acceptance status
platform.get('/documents', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const documents = await docAcceptanceService.getUserAcceptances(userId)
    return success(c, { documents })
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Get list of all legal documents metadata (no auth needed - for KYC pre-acceptance)
platform.get('/documents/list', async (c) => {
  try {
    return success(c, { documents: docAcceptanceService.LEGAL_DOCUMENTS })
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Accept documents (batch)
platform.post('/documents/accept', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const { documentKeys } = await c.req.json()

    if (!documentKeys || !Array.isArray(documentKeys) || documentKeys.length === 0) {
      return error(c, 400, 'MISSING_FIELDS', 'documentKeys e obrigatorio')
    }

    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const userAgent = c.req.header('user-agent') || ''

    const results = await docAcceptanceService.acceptDocuments(userId, documentKeys, ip, userAgent)
    return success(c, { accepted: results.length, documents: results })
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Check if user has accepted all required documents
platform.get('/documents/check-required', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const allAccepted = await docAcceptanceService.hasAcceptedAllRequired(userId)
    const requiredKeys = docAcceptanceService.getRequiredDocumentKeys()
    return success(c, { allAccepted, requiredCount: requiredKeys.length })
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Get document content with acceptance metadata for PDF generation
platform.get('/documents/:key/pdf-data', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const key = c.req.param('key')

    // Get document content
    const content = await platformService.getPageContent(key)
    if (!content) {
      return error(c, 404, 'NOT_FOUND', 'Documento nao encontrado')
    }

    // Get user's acceptance for this document
    const acceptances = await docAcceptanceService.getUserAcceptances(userId)
    const acceptance = acceptances.find((a) => a.key === key)

    // Get user email for PDF
    const { db } = await import('../config/database')
    const { users } = await import('@fandreams/database')
    const { eq } = await import('drizzle-orm')
    const [user] = await db
      .select({ email: users.email, displayName: users.displayName, username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    const verificationHash = acceptance?.acceptedAt
      ? docAcceptanceService.generateVerificationHash(
          userId,
          key,
          acceptance.acceptedAt,
          'audit',
        )
      : null

    return success(c, {
      title: content.title,
      content: content.content,
      updatedAt: content.updatedAt,
      acceptance: acceptance?.accepted
        ? {
            acceptedAt: acceptance.acceptedAt,
            documentVersion: acceptance.documentVersion,
            verificationHash,
          }
        : null,
      user: {
        email: user?.email,
        displayName: user?.displayName,
        username: user?.username,
      },
    })
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Admin Routes ──

// Cookie consent stats
platform.get('/admin/cookie-consents/stats', authMiddleware, adminMiddleware, async (c) => {
  try {
    const stats = await platformService.getCookieConsentStats()
    return success(c, stats)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Cookie consent list
platform.get('/admin/cookie-consents', authMiddleware, adminMiddleware, async (c) => {
  try {
    const page = Number(c.req.query('page') || 1)
    const limit = Number(c.req.query('limit') || 20)
    const result = await platformService.getCookieConsents(page, limit)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Update page content (terms, privacy)
platform.post('/admin/page/:key', authMiddleware, adminMiddleware, async (c) => {
  try {
    const key = c.req.param('key')
    const { userId } = c.get('user')
    const { title, content } = await c.req.json()

    if (!title || !content) {
      return error(c, 400, 'MISSING_FIELDS', 'Titulo e conteudo obrigatorios')
    }

    const result = await platformService.setPageContent(key, title, content, userId)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Contact messages
platform.get('/admin/contact-messages', authMiddleware, adminMiddleware, async (c) => {
  try {
    const page = Number(c.req.query('page') || 1)
    const limit = Number(c.req.query('limit') || 20)
    const unreadOnly = c.req.query('unread') === 'true'
    const result = await platformService.getContactMessages(page, limit, unreadOnly)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Mark message as read
platform.patch('/admin/contact-messages/:id/read', authMiddleware, adminMiddleware, async (c) => {
  try {
    const messageId = c.req.param('id')
    const result = await platformService.markContactMessageRead(messageId)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// SEO settings (admin update)
platform.patch('/admin/seo', authMiddleware, adminMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const updates = await c.req.json()
    const result = await platformService.updateSeoSettings(updates, userId)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

export default platform
