import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { serve } from '@hono/node-server'
import { env } from './config/env'
import { apiRateLimit } from './middleware/rateLimit'
import { auditLog } from './middleware/auditLog'

import auth from './routes/auth'
import usersRoute from './routes/users'
import creators from './routes/creators'
import postsRoute from './routes/posts'
import subscriptionsRoute from './routes/subscriptions'
import fancoins from './routes/fancoins'
import gamification from './routes/gamification'
import discovery from './routes/discovery'
import feed from './routes/feed'
import upload from './routes/upload'
import video from './routes/video'
import media from './routes/media'
import kyc from './routes/kyc'
import admin from './routes/admin'
import paymentsRoute from './routes/payments'
import withdrawals from './routes/withdrawals'
import notificationsRoute from './routes/notifications'
import messagesRoute from './routes/messages'

const app = new Hono().basePath('/api/v1')

function normalizeOrigin(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed) return trimmed
  if (/^https?:\/\//.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function buildAllowedOrigins(): string[] {
  const raw = [
    env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    ...(env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map((o) => o.trim()) : []),
  ]
    .map(normalizeOrigin)
    .filter(Boolean)

  // Auto-add www/non-www variants
  const withVariants = new Set(raw)
  for (const origin of raw) {
    try {
      const url = new URL(origin)
      if (url.hostname.startsWith('www.')) {
        withVariants.add(origin.replace('://www.', '://'))
      } else {
        withVariants.add(origin.replace('://', '://www.'))
      }
    } catch {}
  }

  return Array.from(withVariants)
}

const allowedOrigins = buildAllowedOrigins()
if (env.NODE_ENV !== 'production') {
  console.log('CORS allowed origins:', allowedOrigins)
}

app.use('*', logger())
app.use('*', secureHeaders())

// CORS must run before bodyLimit so error responses always include CORS headers
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (allowedOrigins.includes(origin)) return origin
      // Reject unknown origins — return undefined to deny CORS
      return undefined as unknown as string
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

// Body size limit: 500MB for upload routes, 1MB for everything else
const uploadLimit = bodyLimit({ maxSize: 500 * 1024 * 1024 })
const defaultLimit = bodyLimit({ maxSize: 1024 * 1024 })

app.use('*', async (c, next) => {
  const path = new URL(c.req.url).pathname.replace(/^\/api\/v1/, '')
  if (path.startsWith('/upload') || path.startsWith('/media') || path.startsWith('/video') || path.startsWith('/kyc')) {
    return uploadLimit(c, next)
  }
  return defaultLimit(c, next)
})

// Global rate limit (100 req/min per IP, with in-memory fallback)
app.use('*', apiRateLimit)

// Audit log for sensitive actions
app.use('/auth/*', auditLog)
app.use('/admin/*', auditLog)
app.use('/payments/*', auditLog)
app.use('/users/me/password', auditLog)

app.route('/auth', auth)
app.route('/users', usersRoute)
app.route('/creators', creators)
app.route('/posts', postsRoute)
app.route('/subscriptions', subscriptionsRoute)
app.route('/fancoins', fancoins)
app.route('/gamification', gamification)
app.route('/discover', discovery)
app.route('/feed', feed)
app.route('/upload', upload)
app.route('/video', video)
app.route('/media', media)
app.route('/kyc', kyc)
app.route('/admin', admin)
app.route('/payments', paymentsRoute)
app.route('/withdrawals', withdrawals)
app.route('/notifications', notificationsRoute)
app.route('/messages', messagesRoute)

// Health check — hide version in production
app.get('/health', (c) => {
  const data: Record<string, string> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  }
  if (env.NODE_ENV !== 'production') {
    data.version = '2.4.0'
  }
  return c.json(data)
})

// Security.txt (RFC 9116)
app.get('/.well-known/security.txt', (c) => {
  c.header('Content-Type', 'text/plain')
  return c.text(
    `Contact: security@fandreams.app\nExpires: 2027-01-01T00:00:00.000Z\nPreferred-Languages: pt, en\nPolicy: https://fandreams.app/security-policy\n`,
  )
})

app.onError((err, c) => {
  // Handle Hono HTTPException (e.g. bodyLimit 413) with correct status code
  if (err instanceof HTTPException) {
    return c.json(
      { success: false, error: { code: 'HTTP_ERROR', message: err.message } },
      err.status,
    )
  }
  console.error('Unhandled error:', err)
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: env.NODE_ENV === 'production' ? 'Erro interno' : err.message,
      },
    },
    500,
  )
})

app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Rota nao encontrada' } }, 404)
})

const port = Number(process.env.PORT) || env.PORT
console.log(`FanDreams API v2.4.0 running on 0.0.0.0:${port}`)
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' })

// Periodic task: expire overdue subscriptions every 15 minutes
import { expireOverdueSubscriptions } from './services/subscription.service'
setInterval(async () => {
  try {
    await expireOverdueSubscriptions()
  } catch (e) {
    console.error('Error expiring subscriptions:', e)
  }
}, 15 * 60 * 1000)

export default app
