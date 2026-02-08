import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import * as paymentService from '../services/payment.service'
import { success, error } from '../utils/response'
import { AppError } from '../services/auth.service'
import { env } from '../config/env'
import crypto from 'crypto'

const paymentsRoute = new Hono()

// Create a FanCoin purchase checkout
paymentsRoute.post('/checkout/fancoins', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const { packageId, paymentMethod } = await c.req.json()

    if (!packageId) {
      return error(c, 400, 'MISSING_PACKAGE', 'Package ID obrigatorio')
    }

    const result = await paymentService.createFancoinPayment(
      userId,
      packageId,
      paymentMethod || 'pix',
    )
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Get payment status (for polling)
paymentsRoute.get('/status/:id', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const paymentId = c.req.param('id')
    const result = await paymentService.getPaymentStatus(paymentId, userId)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// MercadoPago webhook (no auth - called by MercadoPago)
paymentsRoute.post('/webhook', async (c) => {
  try {
    const isProduction = env.NODE_ENV === 'production'

    // In production, signature verification is MANDATORY
    if (env.MERCADOPAGO_WEBHOOK_SECRET) {
      const signature = c.req.header('x-signature')
      const requestId = c.req.header('x-request-id')

      if (!signature || !requestId) {
        if (isProduction) {
          console.warn('Webhook: missing signature headers in production — rejecting')
          return c.json({ received: true, error: 'missing_signature' }, 200)
        }
      } else {
        // MercadoPago signature validation
        const parts = signature.split(',')
        const tsRaw = parts.find((p) => p.trim().startsWith('ts='))
        const hashRaw = parts.find((p) => p.trim().startsWith('v1='))
        const ts = tsRaw?.split('=')[1]
        const hash = hashRaw?.split('=')[1]

        if (ts && hash) {
          const body = await c.req.text()
          const bodyJson = JSON.parse(body)
          const dataId = bodyJson?.data?.id

          const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
          const computed = crypto
            .createHmac('sha256', env.MERCADOPAGO_WEBHOOK_SECRET)
            .update(manifest)
            .digest('hex')

          if (computed !== hash) {
            console.warn('Webhook: invalid signature — rejecting')
            return c.json({ received: true, error: 'invalid_signature' }, 200)
          }

          const result = await paymentService.handleWebhook(bodyJson.type, String(dataId))
          return c.json({ received: true, ...result }, 200)
        } else if (isProduction) {
          console.warn('Webhook: malformed signature in production — rejecting')
          return c.json({ received: true, error: 'malformed_signature' }, 200)
        }
      }
    } else if (isProduction) {
      console.error('Webhook: MERCADOPAGO_WEBHOOK_SECRET not set in production!')
      return c.json({ received: true, error: 'not_configured' }, 200)
    }

    // Without signature verification (dev/testing only)
    const body = await c.req.json()
    const dataId = body?.data?.id
    const type = body?.type || body?.action

    if (dataId) {
      const result = await paymentService.handleWebhook(type, String(dataId))
      return c.json({ received: true, ...result }, 200)
    }

    return c.json({ received: true }, 200)
  } catch (err) {
    console.error('Webhook error:', err)
    return c.json({ received: true, error: 'processing_error' }, 200)
  }
})

export default paymentsRoute
