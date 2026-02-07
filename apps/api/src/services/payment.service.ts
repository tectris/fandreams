import { eq } from 'drizzle-orm'
import { payments } from '@myfans/database'
import { db } from '../config/database'
import { env } from '../config/env'
import { AppError } from './auth.service'
import { FANCOIN_PACKAGES, PLATFORM_FEES } from '@myfans/shared'
import * as fancoinService from './fancoin.service'

const MP_API = 'https://api.mercadopago.com'

async function mpFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new AppError('PAYMENT_UNAVAILABLE', 'Sistema de pagamento nao configurado', 503)
  }

  const res = await fetch(`${MP_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
      ...(options.headers || {}),
    },
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('MercadoPago API error:', data)
    throw new AppError('PAYMENT_ERROR', data.message || 'Erro no processamento do pagamento', 502)
  }

  return data as T
}

type MpPreference = {
  id: string
  init_point: string
  sandbox_init_point: string
}

type MpPaymentInfo = {
  id: number
  status: string
  status_detail: string
  external_reference: string
  transaction_amount: number
  payment_method_id: string
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string
      qr_code_base64?: string
      ticket_url?: string
    }
  }
}

/**
 * Create a MercadoPago preference for FanCoin purchase.
 * Returns the payment link and our internal payment ID.
 */
export async function createFancoinPayment(
  userId: string,
  packageId: string,
  paymentMethod: 'pix' | 'credit_card',
) {
  const pkg = FANCOIN_PACKAGES.find((p) => p.id === packageId)
  if (!pkg) throw new AppError('NOT_FOUND', 'Pacote nao encontrado', 404)

  // Create our internal payment record
  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      type: 'fancoin_purchase',
      amount: String(pkg.price),
      currency: 'BRL',
      platformFee: String(pkg.price * PLATFORM_FEES.fancoin_purchase),
      paymentProvider: 'mercadopago',
      status: 'pending',
      metadata: { packageId, coins: pkg.coins, bonus: pkg.bonus, paymentMethod },
    })
    .returning()

  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const apiUrl = `https://api.myfans.my`

  // Create MercadoPago preference
  const preference = await mpFetch<MpPreference>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        {
          title: `${pkg.coins.toLocaleString()} FanCoins${pkg.bonus > 0 ? ` (+${pkg.bonus} bonus)` : ''}`,
          description: `Pacote ${pkg.label} - MyFans`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: pkg.price,
        },
      ],
      external_reference: payment.id,
      payment_methods: {
        excluded_payment_types: paymentMethod === 'pix' ? [{ id: 'credit_card' }] : [],
        installments: paymentMethod === 'credit_card' ? 12 : 1,
      },
      back_urls: {
        success: `${appUrl}/wallet?payment=success`,
        failure: `${appUrl}/wallet?payment=failure`,
        pending: `${appUrl}/wallet?payment=pending`,
      },
      auto_return: 'approved',
      notification_url: `${apiUrl}/api/v1/payments/webhook`,
      statement_descriptor: 'MYFANS',
    }),
  })

  // Update payment with provider reference
  await db
    .update(payments)
    .set({ providerTxId: preference.id })
    .where(eq(payments.id, payment.id))

  const isProduction = env.NODE_ENV === 'production'

  return {
    paymentId: payment.id,
    checkoutUrl: isProduction ? preference.init_point : preference.sandbox_init_point,
    preferenceId: preference.id,
    package: pkg,
  }
}

/**
 * Handle MercadoPago webhook notification.
 * Verifies the payment and credits FanCoins.
 */
export async function handleWebhook(type: string, dataId: string) {
  if (type !== 'payment') return { processed: false }

  // Get payment details from MercadoPago
  const mpPayment = await mpFetch<MpPaymentInfo>(`/v1/payments/${dataId}`)

  if (!mpPayment.external_reference) {
    console.warn('Webhook: no external_reference in payment', dataId)
    return { processed: false }
  }

  // Find our internal payment
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, mpPayment.external_reference))
    .limit(1)

  if (!payment) {
    console.warn('Webhook: payment not found', mpPayment.external_reference)
    return { processed: false }
  }

  // Already processed
  if (payment.status === 'completed') {
    return { processed: true, status: 'already_completed' }
  }

  const newStatus = mpPayment.status === 'approved' ? 'completed' : mpPayment.status

  // Update payment status
  await db
    .update(payments)
    .set({
      status: newStatus,
      providerTxId: String(mpPayment.id),
      metadata: {
        ...(payment.metadata as any),
        mpStatus: mpPayment.status,
        mpStatusDetail: mpPayment.status_detail,
        mpPaymentMethod: mpPayment.payment_method_id,
      },
    })
    .where(eq(payments.id, payment.id))

  // Credit FanCoins only if payment approved
  if (mpPayment.status === 'approved') {
    const meta = payment.metadata as any
    const packageId = meta?.packageId

    if (packageId) {
      const pkg = FANCOIN_PACKAGES.find((p) => p.id === packageId)
      if (pkg) {
        await fancoinService.creditPurchase(payment.userId, pkg.coins + (pkg.bonus || 0), pkg.label, payment.id)
      }
    }
  }

  return { processed: true, status: newStatus }
}

/**
 * Get payment status for polling from frontend
 */
export async function getPaymentStatus(paymentId: string, userId: string) {
  const [payment] = await db
    .select({
      id: payments.id,
      status: payments.status,
      amount: payments.amount,
      metadata: payments.metadata,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1)

  if (!payment) throw new AppError('NOT_FOUND', 'Pagamento nao encontrado', 404)
  return payment
}
