import { eq, and, sql } from 'drizzle-orm'
import { payments, posts, users } from '@fandreams/database'
import { db } from '../config/database'
import { env } from '../config/env'
import { AppError } from './auth.service'
import { FANCOIN_PACKAGES } from '@fandreams/shared'
import * as fancoinService from './fancoin.service'
import * as affiliateService from './affiliate.service'
import { getPlatformFeeRate, getGraduatedFeeRate } from './withdrawal.service'
import { sendPaymentConfirmedEmail, sendSubscriptionActivatedEmail } from './email.service'
import * as openpixService from './openpix.service'

// ── MercadoPago ──

function getMpApi() {
  return 'https://api.mercadopago.com'
}

function isMpSandbox() {
  return env.MERCADOPAGO_SANDBOX === 'true'
}

function getWebhookBaseUrl() {
  return env.API_URL || 'https://api.fandreams.app'
}

async function mpFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new AppError('PAYMENT_UNAVAILABLE', 'MercadoPago nao configurado', 503)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
    ...(options.headers as Record<string, string> || {}),
  }

  // MercadoPago requires X-Idempotency-Key for POST requests
  if (options.method === 'POST' && !headers['X-Idempotency-Key']) {
    headers['X-Idempotency-Key'] = crypto.randomUUID()
  }

  const res = await fetch(`${getMpApi()}${path}`, {
    ...options,
    headers,
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('MercadoPago API error:', JSON.stringify(data, null, 2))
    if (data.cause && Array.isArray(data.cause)) {
      for (const c of data.cause) {
        console.error('  cause:', JSON.stringify(c))
      }
    }
    const msg = data.message || (data.cause?.[0]?.description) || 'Erro no processamento do pagamento'
    throw new AppError('PAYMENT_ERROR', msg, 502)
  }

  return data as T
}

type MpPreference = { id: string; init_point: string; sandbox_init_point: string }
type MpPaymentInfo = {
  id: number
  status: string
  status_detail: string
  external_reference: string
  transaction_amount: number
  payment_method_id: string
}
type MpPreapproval = {
  id: string
  init_point: string
  sandbox_init_point: string
  status: string
  external_reference: string
  payer_id: number
}
type MpAuthorizedPayment = {
  id: number
  preapproval_id: string
  status: string
  transaction_amount: number
  date_created: string
  external_reference: string
}
type MpPixPaymentResponse = {
  id: number
  status: string
  status_detail: string
  transaction_amount: number
  date_of_expiration: string
  external_reference: string
  point_of_interaction: {
    transaction_data: {
      qr_code_base64: string
      qr_code: string
      ticket_url: string
    }
  }
}

// ── PIX payer helpers ──

/**
 * Build payer object for MercadoPago PIX Transparent Checkout.
 * MP requires first_name, last_name, email, and identification for PIX.
 */
function buildPixPayer(email: string, displayName: string, cpf?: string) {
  if (!cpf) {
    throw new AppError('CPF_REQUIRED', 'CPF do usuario necessario para pagamentos PIX. Complete seu perfil.', 400)
  }

  const parts = displayName.trim().split(/\s+/)
  const firstName = parts[0] || 'Usuario'
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'FanDreams'

  return {
    email,
    first_name: firstName,
    last_name: lastName,
    identification: {
      type: 'CPF',
      number: cpf,
    },
  }
}

/**
 * Format expiration date for MercadoPago.
 * MP expects ISO 8601 with timezone offset (e.g. 2024-01-01T12:00:00.000-03:00),
 * not the "Z" suffix that JS toISOString() produces.
 */
function formatMpExpiration(date: Date): string {
  // Use São Paulo timezone offset (-03:00)
  const offset = '-03:00'
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000${offset}`
  )
}

// ── NOWPayments ──

function getNowPaymentsApi() {
  return env.NOWPAYMENTS_SANDBOX === 'true'
    ? 'https://api-sandbox.nowpayments.io/v1'
    : 'https://api.nowpayments.io/v1'
}

async function npFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!env.NOWPAYMENTS_API_KEY) {
    throw new AppError('PAYMENT_UNAVAILABLE', 'NOWPayments nao configurado', 503)
  }

  const res = await fetch(`${getNowPaymentsApi()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.NOWPAYMENTS_API_KEY,
      ...(options.headers || {}),
    },
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('NOWPayments API error:', data)
    throw new AppError('PAYMENT_ERROR', data.message || 'Erro no processamento crypto', 502)
  }

  return data as T
}

// ── PayPal ──

function getPaypalApi() {
  return env.PAYPAL_SANDBOX === 'true'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'
}

async function getPaypalAccessToken(): Promise<string> {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new AppError('PAYMENT_UNAVAILABLE', 'PayPal nao configurado', 503)
  }

  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${getPaypalApi()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('PayPal auth error:', data)
    throw new AppError('PAYMENT_ERROR', 'Falha na autenticacao PayPal', 502)
  }

  return data.access_token
}

async function ppFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getPaypalAccessToken()
  const res = await fetch(`${getPaypalApi()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('PayPal API error:', data)
    throw new AppError('PAYMENT_ERROR', data.message || 'Erro PayPal', 502)
  }

  return data as T
}

// ── Unified Payment Creation ──

export type PaymentProvider = 'mercadopago' | 'nowpayments' | 'paypal' | 'openpix'
export type PaymentMethod = 'pix' | 'credit_card' | 'crypto' | 'paypal'

export async function createFancoinPayment(
  userId: string,
  packageId: string,
  paymentMethod: PaymentMethod,
  provider: PaymentProvider,
) {
  const pkg = FANCOIN_PACKAGES.find((p) => p.id === packageId)
  if (!pkg) throw new AppError('NOT_FOUND', 'Pacote nao encontrado', 404)

  // Auto-route PIX to OpenPix when configured, regardless of requested provider
  const effectiveProvider = (paymentMethod === 'pix' && openpixService.isOpenPixConfigured())
    ? 'openpix' as PaymentProvider
    : provider

  const feeRate = await getPlatformFeeRate()

  // Create internal payment record
  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      type: 'fancoin_purchase',
      amount: String(pkg.price),
      currency: effectiveProvider === 'nowpayments' ? 'USD' : 'BRL',
      platformFee: String(pkg.price * feeRate),
      paymentProvider: effectiveProvider,
      status: 'pending',
      metadata: { packageId, coins: pkg.coins, bonus: pkg.bonus, paymentMethod, provider: effectiveProvider },
    })
    .returning()

  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  switch (effectiveProvider) {
    case 'openpix':
      return createOpenPixPayment(payment, pkg)
    case 'mercadopago':
      // PIX → Transparent Checkout (QR code in-app), Card → Checkout Pro (redirect)
      if (paymentMethod === 'pix') {
        return createMpPixPayment(payment, pkg, userId, appUrl)
      }
      return createMpPayment(payment, pkg, paymentMethod, appUrl)
    case 'nowpayments':
      return createNpPayment(payment, pkg, appUrl)
    case 'paypal':
      return createPpPayment(payment, pkg, appUrl)
    default:
      throw new AppError('INVALID_PROVIDER', 'Provedor de pagamento invalido', 400)
  }
}

/**
 * Create a custom-amount FanCoin purchase payment (no preset package).
 * Uses base rate: 100 FanCoins per R$1.00, no bonus.
 */
export async function createCustomFancoinPayment(
  userId: string,
  amountBrl: number,
  paymentMethod: PaymentMethod,
  provider: PaymentProvider,
) {
  const { CUSTOM_PURCHASE_LIMITS } = await import('@fandreams/shared')

  if (amountBrl < CUSTOM_PURCHASE_LIMITS.minBrl || amountBrl > CUSTOM_PURCHASE_LIMITS.maxBrl) {
    throw new AppError('INVALID', `Valor deve ser entre R$${CUSTOM_PURCHASE_LIMITS.minBrl} e R$${CUSTOM_PURCHASE_LIMITS.maxBrl}`, 400)
  }

  const coins = Math.floor(amountBrl / CUSTOM_PURCHASE_LIMITS.brlPerCoin)
  const label = `${coins.toLocaleString()} FanCoins`

  // Auto-route PIX to OpenPix when configured
  const effectiveProvider = (paymentMethod === 'pix' && openpixService.isOpenPixConfigured())
    ? 'openpix' as PaymentProvider
    : provider

  const feeRate = await getPlatformFeeRate()

  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      type: 'fancoin_purchase',
      amount: String(amountBrl),
      currency: effectiveProvider === 'nowpayments' ? 'USD' : 'BRL',
      platformFee: String(amountBrl * feeRate),
      paymentProvider: effectiveProvider,
      status: 'pending',
      metadata: { customPurchase: true, coins, amountBrl, paymentMethod, provider: effectiveProvider },
    })
    .returning()

  // Build a "virtual" package object to reuse existing payment flow functions
  const pkg = { id: 'custom', coins, price: amountBrl, bonus: 0, label }
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  switch (effectiveProvider) {
    case 'openpix':
      return createOpenPixPayment(payment, pkg)
    case 'mercadopago':
      if (paymentMethod === 'pix') {
        return createMpPixPayment(payment, pkg, userId, appUrl)
      }
      return createMpPayment(payment, pkg, paymentMethod, appUrl)
    case 'nowpayments':
      return createNpPayment(payment, pkg, appUrl)
    case 'paypal':
      return createPpPayment(payment, pkg, appUrl)
    default:
      throw new AppError('INVALID_PROVIDER', 'Provedor de pagamento invalido', 400)
  }
}

// ── MercadoPago Payment ──

async function createMpPayment(payment: any, pkg: any, paymentMethod: string, appUrl: string) {
  const webhookUrl = getWebhookBaseUrl()

  const preference = await mpFetch<MpPreference>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        {
          title: `${pkg.coins.toLocaleString()} FanCoins${pkg.bonus > 0 ? ` (+${pkg.bonus} bonus)` : ''}`,
          description: `Pacote ${pkg.label} - FanDreams`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: pkg.price,
        },
      ],
      external_reference: payment.id,
      payment_methods: paymentMethod === 'pix'
        ? {
            excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }],
            installments: 1,
          }
        : {
            excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'ticket' }],
            installments: 12,
          },
      back_urls: {
        success: `${appUrl}/wallet?payment=success&provider=mercadopago`,
        failure: `${appUrl}/wallet?payment=failure&provider=mercadopago`,
        pending: `${appUrl}/wallet?payment=pending&provider=mercadopago`,
      },
      auto_return: 'approved',
      notification_url: `${webhookUrl}/api/v1/payments/webhook/mercadopago`,
      statement_descriptor: 'FANDREAMS',
    }),
  })

  await db
    .update(payments)
    .set({ providerTxId: preference.id })
    .where(eq(payments.id, payment.id))

  return {
    paymentId: payment.id,
    provider: 'mercadopago' as const,
    checkoutUrl: isMpSandbox() ? preference.sandbox_init_point : preference.init_point,
    preferenceId: preference.id,
    package: pkg,
    sandbox: isMpSandbox(),
  }
}

// ── MercadoPago PIX (Transparent Checkout with Checkout Pro fallback) ──

async function createMpPixPayment(payment: any, pkg: any, userId: string, appUrl: string) {
  const webhookUrl = getWebhookBaseUrl()

  // Fetch payer info (MP requires email + first_name + last_name + identification for PIX)
  const [user] = await db
    .select({ email: users.email, displayName: users.displayName, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user?.email) throw new AppError('MISSING_EMAIL', 'Email do usuario nao encontrado', 400)

  // PIX payments expire in 30 minutes
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  // TODO: Pass real CPF from user profile/KYC data once available
  const payer = buildPixPayer(user.email, user.displayName || user.username || 'Usuario', '' /* CPF from KYC */)
  const description = `${pkg.coins.toLocaleString()} FanCoins${pkg.bonus > 0 ? ` (+${pkg.bonus} bonus)` : ''} - FanDreams`

  // Try Transparent Checkout first (inline QR code — best UX)
  try {
    const pixBody = {
      transaction_amount: Number(pkg.price.toFixed(2)),
      description,
      payment_method_id: 'pix',
      payer,
      external_reference: payment.id,
      notification_url: `${webhookUrl}/api/v1/payments/webhook/mercadopago`,
      date_of_expiration: formatMpExpiration(expiresAt),
      statement_descriptor: 'FANDREAMS',
    }
    console.log('PIX Transparent Checkout request:', JSON.stringify(pixBody, null, 2))

    const mpPayment = await mpFetch<MpPixPaymentResponse>('/v1/payments', {
      method: 'POST',
      body: JSON.stringify(pixBody),
    })

    await db
      .update(payments)
      .set({ providerTxId: String(mpPayment.id) })
      .where(eq(payments.id, payment.id))

    return {
      paymentId: payment.id,
      provider: 'mercadopago' as const,
      pixData: {
        qrCodeBase64: mpPayment.point_of_interaction.transaction_data.qr_code_base64,
        qrCode: mpPayment.point_of_interaction.transaction_data.qr_code,
        ticketUrl: mpPayment.point_of_interaction.transaction_data.ticket_url,
        expiresAt: expiresAt.toISOString(),
      },
      package: pkg,
      sandbox: isMpSandbox(),
    }
  } catch (err) {
    console.warn('PIX Transparent Checkout failed, falling back to Checkout Pro PIX:', (err as Error).message)
  }

  // Fallback: Checkout Pro with PIX-only preference (redirect instead of inline QR)
  const preference = await mpFetch<MpPreference>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        {
          title: description,
          description: `Pacote ${pkg.label} - FanDreams`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: pkg.price,
        },
      ],
      external_reference: payment.id,
      payment_methods: {
        excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }],
        installments: 1,
      },
      back_urls: {
        success: `${appUrl}/wallet?payment=success&provider=mercadopago`,
        failure: `${appUrl}/wallet?payment=failure&provider=mercadopago`,
        pending: `${appUrl}/wallet?payment=pending&provider=mercadopago`,
      },
      auto_return: 'approved',
      notification_url: `${webhookUrl}/api/v1/payments/webhook/mercadopago`,
      statement_descriptor: 'FANDREAMS',
    }),
  })

  await db
    .update(payments)
    .set({ providerTxId: preference.id })
    .where(eq(payments.id, payment.id))

  return {
    paymentId: payment.id,
    provider: 'mercadopago' as const,
    checkoutUrl: isMpSandbox() ? preference.sandbox_init_point : preference.init_point,
    preferenceId: preference.id,
    package: pkg,
    sandbox: isMpSandbox(),
  }
}

// ── NOWPayments Payment ──

async function createNpPayment(payment: any, pkg: any, appUrl: string) {
  // Convert BRL to USD using NOWPayments estimate or fallback rate
  let priceUsd = pkg.price / 5.5
  try {
    const estimate = await npFetch<{ estimated_amount: number }>(
      `/estimate?amount=${pkg.price}&currency_from=brl&currency_to=usd`,
    )
    if (estimate.estimated_amount > 0) priceUsd = estimate.estimated_amount
  } catch {
    // Fallback to approximate rate
  }

  const invoice = await npFetch<{
    id: string
    invoice_url: string
    token_id: string
  }>('/invoice', {
    method: 'POST',
    body: JSON.stringify({
      price_amount: priceUsd,
      price_currency: 'usd',
      order_id: payment.id,
      order_description: `${pkg.coins.toLocaleString()} FanCoins - FanDreams`,
      ipn_callback_url: `${getWebhookBaseUrl()}/api/v1/payments/webhook/nowpayments`,
      success_url: `${appUrl}/wallet?payment=success&provider=nowpayments`,
      cancel_url: `${appUrl}/wallet?payment=failure&provider=nowpayments`,
    }),
  })

  await db
    .update(payments)
    .set({ providerTxId: invoice.id, metadata: { ...(payment.metadata as any), invoiceId: invoice.id } })
    .where(eq(payments.id, payment.id))

  return {
    paymentId: payment.id,
    provider: 'nowpayments' as const,
    checkoutUrl: invoice.invoice_url,
    invoiceId: invoice.id,
    package: pkg,
    sandbox: env.NOWPAYMENTS_SANDBOX === 'true',
  }
}

// ── PayPal Payment ──

async function createPpPayment(payment: any, pkg: any, appUrl: string) {
  const order = await ppFetch<{
    id: string
    links: Array<{ href: string; rel: string }>
  }>('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: payment.id,
          description: `${pkg.coins.toLocaleString()} FanCoins - FanDreams`,
          amount: {
            currency_code: 'BRL',
            value: pkg.price.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'FanDreams',
        return_url: `${appUrl}/wallet?payment=success&provider=paypal&orderId=${payment.id}`,
        cancel_url: `${appUrl}/wallet?payment=failure&provider=paypal`,
        user_action: 'PAY_NOW',
      },
    }),
  })

  const approvalLink = order.links.find((l) => l.rel === 'approve')

  await db
    .update(payments)
    .set({ providerTxId: order.id })
    .where(eq(payments.id, payment.id))

  return {
    paymentId: payment.id,
    provider: 'paypal' as const,
    checkoutUrl: approvalLink?.href || '',
    orderId: order.id,
    package: pkg,
    sandbox: env.PAYPAL_SANDBOX === 'true',
  }
}

// ── OpenPix PIX Payment ──

async function createOpenPixPayment(payment: any, pkg: any) {
  const description = `${pkg.coins.toLocaleString()} FanCoins${pkg.bonus > 0 ? ` (+${pkg.bonus} bonus)` : ''} - FanDreams`

  const result = await openpixService.createPixCharge({
    amount: pkg.price,
    description,
    externalReference: payment.id,
  })

  await db
    .update(payments)
    .set({
      providerTxId: result.correlationID,
      metadata: { ...(payment.metadata as any), openpixCorrelationID: result.correlationID },
    })
    .where(eq(payments.id, payment.id))

  return {
    paymentId: payment.id,
    provider: 'openpix' as const,
    pixData: {
      qrCodeBase64: result.qrCodeImageUrl, // URL to QR code image
      qrCode: result.brCode,
      expiresAt: result.expiresAt,
    },
    paymentLinkUrl: result.paymentLinkUrl,
    package: pkg,
    sandbox: openpixService.isOpenPixSandbox(),
  }
}

// ── Webhooks ──

export async function handleMercadoPagoWebhook(type: string, dataId: string) {
  if (type === 'payment') {
    return handleMpPaymentWebhook(dataId)
  }
  if (type === 'subscription_preapproval') {
    return handleMpPreapprovalWebhook(dataId)
  }
  if (type === 'subscription_authorized_payment') {
    return handleMpAuthorizedPaymentWebhook(dataId)
  }
  return { processed: false }
}

async function handleMpPaymentWebhook(dataId: string) {
  const mpPayment = await mpFetch<MpPaymentInfo>(`/v1/payments/${dataId}`)

  if (!mpPayment.external_reference) {
    console.warn('MP Webhook: no external_reference', dataId)
    return { processed: false }
  }

  return processPaymentConfirmation(
    mpPayment.external_reference,
    mpPayment.status === 'approved' ? 'completed' : mpPayment.status,
    String(mpPayment.id),
    {
      mpStatus: mpPayment.status,
      mpStatusDetail: mpPayment.status_detail,
      mpPaymentMethod: mpPayment.payment_method_id,
    },
  )
}

async function handleMpPreapprovalWebhook(preapprovalId: string) {
  const preapproval = await mpFetch<MpPreapproval>(`/preapproval/${preapprovalId}`)
  return { processed: true, type: 'preapproval', preapprovalId, status: preapproval.status, externalReference: preapproval.external_reference }
}

async function handleMpAuthorizedPaymentWebhook(authorizedPaymentId: string) {
  const authPayment = await mpFetch<MpAuthorizedPayment>(`/authorized_payments/${authorizedPaymentId}`)
  return { processed: true, type: 'authorized_payment', authorizedPaymentId, preapprovalId: authPayment.preapproval_id, status: authPayment.status, amount: authPayment.transaction_amount }
}

export async function handleNowPaymentsWebhook(body: any) {
  const orderId = body.order_id
  if (!orderId) return { processed: false }

  const statusMap: Record<string, string> = {
    finished: 'completed',
    confirmed: 'completed',
    sending: 'pending',
    waiting: 'pending',
    partially_paid: 'pending',
    failed: 'failed',
    refunded: 'refunded',
    expired: 'expired',
  }

  const status = statusMap[body.payment_status] || body.payment_status

  return processPaymentConfirmation(orderId, status, String(body.payment_id), {
    npStatus: body.payment_status,
    payCurrency: body.pay_currency,
    payAmount: body.pay_amount,
    actuallyPaid: body.actually_paid,
  })
}

export async function handleOpenPixWebhook(body: any) {
  const parsed = openpixService.parseWebhookPayload(body)

  if (!parsed) {
    return { processed: false }
  }

  // Only process completed charges
  if (parsed.event !== 'OPENPIX:CHARGE_COMPLETED') {
    return { processed: true, event: parsed.event, status: 'ignored' }
  }

  // correlationID is the payment ID for charges we created
  const paymentId = parsed.correlationID

  // Check if this is a known payment (one we created)
  const [existingPayment] = await db.select({ id: payments.id }).from(payments).where(eq(payments.id, paymentId)).limit(1)

  if (existingPayment) {
    // Known charge (first subscription payment, fancoin purchase, PPV, promo, etc.)
    return processPaymentConfirmation(
      paymentId,
      'completed',
      parsed.transactionID,
      {
        openpixEvent: parsed.event,
        openpixAmount: parsed.value,
        openpixPaidAt: parsed.paidAt,
        openpixPayerName: parsed.payerName,
      },
    )
  }

  // Unknown correlationID — this is likely a recurring subscription charge created by OpenPix
  return handleOpenPixSubscriptionCharge(parsed)
}

// ── Handle recurring subscription charges created by OpenPix ──

async function handleOpenPixSubscriptionCharge(parsed: {
  correlationID: string
  transactionID: string
  value: number
  paidAt?: string
  payerName?: string
  customerCorrelationID?: string
}) {
  const { subscriptions } = await import('@fandreams/database')
  const { handleOpenPixSubscriptionRenewal } = await import('./subscription.service')

  let subscriptionId: string | null = null

  // Strategy 1: Match by customer correlationID (set as sub_${subscriptionId} during creation)
  if (parsed.customerCorrelationID?.startsWith('sub_')) {
    subscriptionId = parsed.customerCorrelationID.replace('sub_', '')
  }

  // Strategy 2: Query OpenPix for the charge details to get the customer correlationID
  if (!subscriptionId) {
    try {
      const chargeDetails = await openpixService.getChargeDetails(parsed.correlationID)
      if (chargeDetails.customerCorrelationID?.startsWith('sub_')) {
        subscriptionId = chargeDetails.customerCorrelationID.replace('sub_', '')
      }
    } catch (e) {
      console.warn('Failed to get OpenPix charge details for subscription matching:', e)
    }
  }

  // Strategy 3: Match by value against active OpenPix subscriptions
  if (!subscriptionId) {
    const { eq, and } = await import('drizzle-orm')
    const amountBrl = parsed.value / 100 // Convert centavos to BRL
    const activeSubs = await db
      .select({ id: subscriptions.id, pricePaid: subscriptions.pricePaid })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.paymentProvider, 'openpix'),
          eq(subscriptions.status, 'active'),
          eq(subscriptions.autoRenew, true),
        ),
      )

    // Find subscriptions matching the charge amount
    const matches = activeSubs.filter((s) => {
      const subPrice = Number(s.pricePaid || 0)
      return Math.abs(subPrice - amountBrl) < 0.01
    })

    if (matches.length === 1) {
      subscriptionId = matches[0]!.id
    } else if (matches.length > 1) {
      console.warn(`OpenPix subscription charge: ${matches.length} subscriptions match value ${amountBrl}. Cannot determine which one.`)
    }
  }

  if (!subscriptionId) {
    console.warn('OpenPix subscription charge: could not match to any subscription. correlationID:', parsed.correlationID)
    return { processed: false, reason: 'subscription_not_matched' }
  }

  const amountBrl = parsed.value / 100
  const result = await handleOpenPixSubscriptionRenewal(subscriptionId, amountBrl, parsed.transactionID)
  return result
}

export async function handlePaypalWebhook(body: any) {
  const resource = body.resource
  if (!resource) return { processed: false }

  const orderId = resource.supplementary_data?.related_ids?.order_id || resource.id
  const referenceId = resource.purchase_units?.[0]?.reference_id

  if (!referenceId) return { processed: false }

  const statusMap: Record<string, string> = {
    COMPLETED: 'completed',
    APPROVED: 'completed',
    VOIDED: 'failed',
    DECLINED: 'failed',
  }

  const status = statusMap[resource.status] || 'pending'

  return processPaymentConfirmation(referenceId, status, orderId, {
    ppStatus: resource.status,
    ppOrderId: orderId,
  })
}

export async function capturePaypalOrder(orderId: string, paymentId: string) {
  const capture = await ppFetch<{ id: string; status: string }>(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
  })

  return processPaymentConfirmation(paymentId, capture.status === 'COMPLETED' ? 'completed' : 'pending', orderId, {
    ppStatus: capture.status,
    ppCaptureId: capture.id,
  })
}

// ── Shared confirmation logic ──

async function processPaymentConfirmation(
  paymentId: string,
  status: string,
  providerTxId: string,
  extraMeta: Record<string, any>,
) {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1)

  if (!payment) {
    console.warn('Webhook: payment not found', paymentId)
    return { processed: false }
  }

  // Atomic check-and-set: only process if status is NOT already completed
  const [updated] = await db
    .update(payments)
    .set({
      status,
      providerTxId,
      metadata: { ...(payment.metadata as any), ...extraMeta },
    })
    .where(and(eq(payments.id, payment.id), sql`${payments.status} != 'completed'`))
    .returning()

  if (!updated) {
    return { processed: true, status: 'already_completed' }
  }

  if (status === 'completed') {
    const meta = payment.metadata as any

    if (payment.type === 'fancoin_purchase') {
      if (meta?.customPurchase) {
        // Custom amount purchase — credit coins at base rate
        const coins = meta.coins as number
        const amountBrl = meta.amountBrl as number
        if (coins > 0) {
          await fancoinService.creditCustomPurchase(payment.userId, coins, amountBrl, payment.id)
        }
      } else {
        const packageId = meta?.packageId
        if (packageId) {
          const pkg = FANCOIN_PACKAGES.find((p) => p.id === packageId)
          if (pkg) {
            await fancoinService.creditPurchase(payment.userId, pkg.coins + (pkg.bonus || 0), pkg.label, payment.id)
          }
        }
      }
    }

    if (payment.type === 'ppv' && payment.recipientId) {
      // Credit creator earnings as FanCoins (Option A: all earnings → FanCoins)
      // Affiliate commissions are deducted from creator's gross share
      const creatorAmount = Number(payment.creatorAmount || 0)
      if (creatorAmount > 0) {
        const { totalCommissionBrl } = await affiliateService.distributeCommissions(
          payment.id,
          payment.userId,
          payment.recipientId,
          creatorAmount,
        )
        const creatorNet = creatorAmount - totalCommissionBrl
        if (creatorNet > 0) {
          await fancoinService.creditEarnings(
            payment.recipientId,
            creatorNet,
            'ppv_received',
            `PPV recebido - pagamento via ${meta?.paymentMethod || 'MP'}`,
            meta?.postId,
          )
        }
      }
      console.log(`PPV unlocked for user ${payment.userId}, post ${meta?.postId}, creator credited as FanCoins`)
    }

    // Promo subscription: activate subscription for the promo duration
    if (payment.type === 'subscription' && meta?.isPromo && meta?.subscriptionId) {
      const { subscriptions, creatorProfiles } = await import('@fandreams/database')
      const durationDays = meta.durationDays || 30
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setDate(periodEnd.getDate() + durationDays)

      await db
        .update(subscriptions)
        .set({
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: false,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, meta.subscriptionId))

      const creatorAmount = Number(payment.creatorAmount || 0)
      if (payment.recipientId) {
        await db
          .update(creatorProfiles)
          .set({ totalSubscribers: sql`${creatorProfiles.totalSubscribers} + 1` })
          .where(eq(creatorProfiles.userId, payment.recipientId))

        // Credit earnings as FanCoins with affiliate distribution
        if (creatorAmount > 0) {
          const { totalCommissionBrl } = await affiliateService.distributeCommissions(
            payment.id,
            payment.userId,
            payment.recipientId,
            creatorAmount,
          )
          const creatorNet = creatorAmount - totalCommissionBrl
          if (creatorNet > 0) {
            await fancoinService.creditEarnings(
              payment.recipientId,
              creatorNet,
              'subscription_earned',
              `Assinatura promo recebida`,
              payment.id,
            )
          }
        }

        // Check bonus eligibility
        const bonusService = await import('./bonus.service')
        bonusService.checkBonusEligibility(payment.recipientId).catch(() => {})
      }

      console.log(`Promo subscription ${meta.subscriptionId} activated for ${durationDays} days`)

      // Send subscription activated email (non-blocking)
      const { users } = await import('@fandreams/database')
      const [fan] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, payment.userId))
        .limit(1)
      if (fan && payment.recipientId) {
        const [creator] = await db
          .select({ displayName: users.displayName, username: users.username })
          .from(users)
          .where(eq(users.id, payment.recipientId))
          .limit(1)
        if (creator) {
          const dLabel = durationDays === 90 ? '3 meses' : durationDays === 180 ? '6 meses' : durationDays === 360 ? '12 meses' : `${durationDays} dias`
          sendSubscriptionActivatedEmail(fan.email, {
            creatorName: creator.displayName || creator.username,
            price: Number(payment.amount).toFixed(2),
            periodEnd: periodEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
            isPromo: true,
            durationLabel: dLabel,
          }).catch((e) => console.error('Failed to send subscription activated email:', e))
        }
      }
    }

    // Monthly subscription via OpenPix: activate on first payment
    if (payment.type === 'subscription' && !meta?.isPromo && meta?.subscriptionId && payment.paymentProvider === 'openpix') {
      const { subscriptions, creatorProfiles } = await import('@fandreams/database')
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await db
        .update(subscriptions)
        .set({
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, meta.subscriptionId))

      const creatorAmount = Number(payment.creatorAmount || 0)
      if (payment.recipientId) {
        await db
          .update(creatorProfiles)
          .set({ totalSubscribers: sql`${creatorProfiles.totalSubscribers} + 1` })
          .where(eq(creatorProfiles.userId, payment.recipientId))

        if (creatorAmount > 0) {
          const { totalCommissionBrl } = await affiliateService.distributeCommissions(
            payment.id,
            payment.userId,
            payment.recipientId,
            creatorAmount,
          )
          const creatorNet = creatorAmount - totalCommissionBrl
          if (creatorNet > 0) {
            await fancoinService.creditEarnings(
              payment.recipientId,
              creatorNet,
              'subscription_earned',
              'Assinatura mensal recebida via PIX',
              payment.id,
            )
          }
        }

        const bonusService = await import('./bonus.service')
        bonusService.checkBonusEligibility(payment.recipientId).catch(() => {})
      }

      console.log(`Monthly OpenPix subscription ${meta.subscriptionId} activated`)

      // Send subscription activated email (non-blocking)
      const { users } = await import('@fandreams/database')
      const [fan] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, payment.userId))
        .limit(1)
      if (fan && payment.recipientId) {
        const [creator] = await db
          .select({ displayName: users.displayName, username: users.username })
          .from(users)
          .where(eq(users.id, payment.recipientId))
          .limit(1)
        if (creator) {
          sendSubscriptionActivatedEmail(fan.email, {
            creatorName: creator.displayName || creator.username,
            price: Number(payment.amount).toFixed(2),
            periodEnd: periodEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
            isPromo: false,
            durationLabel: 'mensal',
          }).catch((e) => console.error('Failed to send subscription activated email:', e))
        }
      }
    }

    // Send payment confirmation email for all completed payments (non-blocking)
    const { users: usersTable } = await import('@fandreams/database')
    const [payer] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, payment.userId))
      .limit(1)
    if (payer) {
      const descriptions: Record<string, string> = {
        ppv: `Conteudo exclusivo`,
        fancoin_purchase: meta?.packageId ? `Pacote ${meta.packageId}` : 'FanCoins',
        subscription: 'Assinatura de criador',
        tip: 'Gorjeta para criador',
      }
      sendPaymentConfirmedEmail(payer.email, {
        type: payment.type,
        amount: Number(payment.amount).toFixed(2),
        description: descriptions[payment.type] || 'Pagamento',
      }).catch((e) => console.error('Failed to send payment confirmed email:', e))
    }
  }

  return { processed: true, status }
}

// ── Status ──

export function getAvailableProviders() {
  const providers: Array<{ id: PaymentProvider; label: string; methods: string[]; sandbox: boolean }> = []

  // OpenPix handles PIX when configured; MP handles credit card only
  if (openpixService.isOpenPixConfigured()) {
    providers.push({
      id: 'openpix',
      label: 'PIX',
      methods: ['pix'],
      sandbox: openpixService.isOpenPixSandbox(),
    })
  }

  if (env.MERCADOPAGO_ACCESS_TOKEN) {
    const methods = openpixService.isOpenPixConfigured() ? ['credit_card'] : ['pix', 'credit_card']
    providers.push({
      id: 'mercadopago',
      label: openpixService.isOpenPixConfigured() ? 'Cartao de Credito' : 'MercadoPago',
      methods,
      sandbox: isMpSandbox(),
    })
  }

  if (env.NOWPAYMENTS_API_KEY) {
    providers.push({
      id: 'nowpayments',
      label: 'Crypto (Bitcoin, USDT, ETH...)',
      methods: ['crypto'],
      sandbox: env.NOWPAYMENTS_SANDBOX === 'true',
    })
  }

  if (env.PAYPAL_CLIENT_ID) {
    providers.push({
      id: 'paypal',
      label: 'PayPal',
      methods: ['paypal'],
      sandbox: env.PAYPAL_SANDBOX === 'true',
    })
  }

  return providers
}

export async function getPaymentStatus(paymentId: string, userId: string) {
  const [payment] = await db
    .select({
      id: payments.id,
      status: payments.status,
      amount: payments.amount,
      paymentProvider: payments.paymentProvider,
      providerTxId: payments.providerTxId,
      metadata: payments.metadata,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.userId, userId)))
    .limit(1)

  if (!payment) throw new AppError('NOT_FOUND', 'Pagamento nao encontrado', 404)

  // Proactive verification: if payment is still pending, check provider directly
  if (payment.status === 'pending' && payment.paymentProvider === 'openpix') {
    try {
      const opResult = await proactivelyVerifyOpenPixPayment(paymentId, payment.providerTxId)
      if (opResult && opResult.status === 'completed') {
        return { ...payment, status: 'completed' }
      }
    } catch (e) {
      console.warn('Proactive OpenPix verification failed (non-critical):', e)
    }
  }

  if (payment.status === 'pending' && payment.paymentProvider === 'mercadopago') {
    try {
      const mpResult = await proactivelyVerifyMpPayment(paymentId)
      if (mpResult && mpResult.status === 'completed') {
        return { ...payment, status: 'completed' }
      }
    } catch (e) {
      console.warn('Proactive MP verification failed (non-critical):', e)
    }
  }

  return payment
}

// Proactively check MercadoPago for payment status
// This is a fallback for when webhooks are delayed or don't arrive (common in sandbox)
async function proactivelyVerifyMpPayment(paymentId: string) {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) return null

  try {
    // Search for payments with our external_reference
    const searchResult = await mpFetch<{
      results: MpPaymentInfo[]
      paging: { total: number }
    }>(`/v1/payments/search?external_reference=${paymentId}&sort=date_created&criteria=desc`)

    if (searchResult.results && searchResult.results.length > 0) {
      const mpPayment = searchResult.results[0]
      if (mpPayment.status === 'approved') {
        // Process the payment confirmation as if webhook arrived
        const result = await processPaymentConfirmation(
          paymentId,
          'completed',
          String(mpPayment.id),
          {
            mpStatus: mpPayment.status,
            mpStatusDetail: mpPayment.status_detail,
            mpPaymentMethod: mpPayment.payment_method_id,
            verifiedViaPolling: true,
          },
        )
        return result
      }
    }
  } catch (e) {
    console.warn('MP payment search failed:', e)
  }

  return null
}

// ── OpenPix Proactive Verification ──

async function proactivelyVerifyOpenPixPayment(paymentId: string, correlationID: string | null) {
  if (!correlationID || !openpixService.isOpenPixConfigured()) return null

  try {
    const chargeStatus = await openpixService.getChargeStatus(correlationID)
    if (chargeStatus.status === 'COMPLETED') {
      const result = await processPaymentConfirmation(
        paymentId,
        'completed',
        correlationID,
        { openpixStatus: chargeStatus.status, verifiedViaPolling: true },
      )
      return result
    }
  } catch (e) {
    console.warn('OpenPix charge status check failed:', e)
  }

  return null
}

// ── PPV Payment via MercadoPago ──

export async function createPpvPayment(userId: string, postId: string, paymentMethod: string) {
  // Get post info
  const [post] = await db
    .select({ id: posts.id, creatorId: posts.creatorId, ppvPrice: posts.ppvPrice, visibility: posts.visibility, contentText: posts.contentText })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  if (!post) throw new AppError('NOT_FOUND', 'Post nao encontrado', 404)
  if (post.visibility !== 'ppv' || !post.ppvPrice) throw new AppError('INVALID', 'Este post nao e PPV', 400)

  // Check already unlocked
  const [existing] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.type, 'ppv'),
        eq(payments.status, 'completed'),
        sql`${payments.metadata}->>'postId' = ${postId}`,
      ),
    )
    .limit(1)
  if (existing) throw new AppError('ALREADY_UNLOCKED', 'Voce ja desbloqueou este post', 409)

  const feeRate = await getGraduatedFeeRate(post.creatorId)
  const amount = Number(post.ppvPrice)
  const platformFee = amount * feeRate
  const creatorAmount = amount - platformFee
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const webhookUrl = getWebhookBaseUrl()

  // Route PIX to OpenPix when configured
  const effectiveProvider = (paymentMethod === 'pix' && openpixService.isOpenPixConfigured()) ? 'openpix' : 'mercadopago'

  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      recipientId: post.creatorId,
      type: 'ppv',
      amount: post.ppvPrice,
      platformFee: String(platformFee),
      creatorAmount: String(creatorAmount),
      paymentProvider: effectiveProvider,
      status: 'pending',
      metadata: { postId, paymentMethod },
    })
    .returning()

  const description = post.contentText
    ? `PPV: ${post.contentText.slice(0, 60)}${post.contentText.length > 60 ? '...' : ''}`
    : 'Conteudo PPV - FanDreams'

  // PIX via OpenPix (preferred when configured)
  if (paymentMethod === 'pix' && openpixService.isOpenPixConfigured()) {
    const opResult = await openpixService.createPixCharge({
      amount,
      description,
      externalReference: payment.id,
    })

    await db
      .update(payments)
      .set({
        providerTxId: opResult.correlationID,
        metadata: { ...(payment.metadata as any), openpixCorrelationID: opResult.correlationID },
      })
      .where(eq(payments.id, payment.id))

    return {
      paymentId: payment.id,
      pixData: {
        qrCodeBase64: opResult.qrCodeImageUrl,
        qrCode: opResult.brCode,
        expiresAt: opResult.expiresAt,
      },
      sandbox: openpixService.isOpenPixSandbox(),
    }
  }

  // PIX via MercadoPago (fallback)
  if (paymentMethod === 'pix') {
    const [user] = await db
      .select({ email: users.email, displayName: users.displayName, username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user?.email) throw new AppError('MISSING_EMAIL', 'Email do usuario nao encontrado', 400)

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    // TODO: Pass real CPF from user profile/KYC data once available
    const payer = buildPixPayer(user.email, user.displayName || user.username || 'Usuario', '' /* CPF from KYC */)

    // Try Transparent Checkout first (inline QR code)
    try {
      const pixBody = {
        transaction_amount: Number(amount.toFixed(2)),
        description,
        payment_method_id: 'pix',
        payer,
        external_reference: payment.id,
        notification_url: `${webhookUrl}/api/v1/payments/webhook/mercadopago`,
        date_of_expiration: formatMpExpiration(expiresAt),
        statement_descriptor: 'FANDREAMS',
      }
      console.log('PPV PIX Transparent Checkout request:', JSON.stringify(pixBody, null, 2))

      const mpPayment = await mpFetch<MpPixPaymentResponse>('/v1/payments', {
        method: 'POST',
        body: JSON.stringify(pixBody),
      })

      await db
        .update(payments)
        .set({ providerTxId: String(mpPayment.id) })
        .where(eq(payments.id, payment.id))

      return {
        paymentId: payment.id,
        pixData: {
          qrCodeBase64: mpPayment.point_of_interaction.transaction_data.qr_code_base64,
          qrCode: mpPayment.point_of_interaction.transaction_data.qr_code,
          ticketUrl: mpPayment.point_of_interaction.transaction_data.ticket_url,
          expiresAt: expiresAt.toISOString(),
        },
        sandbox: isMpSandbox(),
      }
    } catch (err) {
      console.warn('PPV PIX Transparent Checkout failed, falling back to Checkout Pro PIX:', (err as Error).message)
    }

    // Fallback: Checkout Pro with PIX-only preference
    const pixPreference = await mpFetch<MpPreference>('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            title: description,
            description: 'Desbloqueio de conteudo exclusivo - FanDreams',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: amount,
          },
        ],
        external_reference: payment.id,
        payment_methods: {
          excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }],
          installments: 1,
        },
        back_urls: {
          success: `${appUrl}/feed?ppv=success&postId=${postId}`,
          failure: `${appUrl}/feed?ppv=failure&postId=${postId}`,
          pending: `${appUrl}/feed?ppv=pending&postId=${postId}`,
        },
        auto_return: 'approved',
        notification_url: `${webhookUrl}/api/v1/payments/webhook/mercadopago`,
        statement_descriptor: 'FANDREAMS',
      }),
    })

    await db
      .update(payments)
      .set({ providerTxId: pixPreference.id })
      .where(eq(payments.id, payment.id))

    return {
      paymentId: payment.id,
      checkoutUrl: isMpSandbox() ? pixPreference.sandbox_init_point : pixPreference.init_point,
      sandbox: isMpSandbox(),
    }
  }

  // Credit Card → Checkout Pro (redirect)
  const preference = await mpFetch<MpPreference>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        {
          title: description,
          description: 'Desbloqueio de conteudo exclusivo - FanDreams',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amount,
        },
      ],
      external_reference: payment.id,
      payment_methods: {
        excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'ticket' }],
        installments: 12,
      },
      back_urls: {
        success: `${appUrl}/feed?ppv=success&postId=${postId}`,
        failure: `${appUrl}/feed?ppv=failure&postId=${postId}`,
        pending: `${appUrl}/feed?ppv=pending&postId=${postId}`,
      },
      auto_return: 'approved',
      notification_url: `${webhookUrl}/api/v1/payments/webhook/mercadopago`,
      statement_descriptor: 'FANDREAMS',
    }),
  })

  await db
    .update(payments)
    .set({ providerTxId: preference.id })
    .where(eq(payments.id, payment.id))

  return {
    paymentId: payment.id,
    checkoutUrl: isMpSandbox() ? preference.sandbox_init_point : preference.init_point,
    sandbox: isMpSandbox(),
  }
}

// ── MercadoPago Subscription (Preapproval) ──

export async function createMpSubscription(params: {
  subscriptionId: string
  payerEmail: string
  creatorName: string
  tierName?: string
  amount: number
  backUrl: string
}) {
  const webhookUrl = getWebhookBaseUrl()
  const reason = params.tierName
    ? `Assinatura ${params.tierName} - ${params.creatorName} - FanDreams`
    : `Assinatura - ${params.creatorName} - FanDreams`

  const preapproval = await mpFetch<MpPreapproval>('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      reason,
      external_reference: params.subscriptionId,
      payer_email: params.payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: params.amount,
        currency_id: 'BRL',
      },
      back_url: params.backUrl,
      notification_url: `${webhookUrl}/api/v1/payments/webhook/mercadopago`,
      status: 'pending',
    }),
  })

  return {
    preapprovalId: preapproval.id,
    checkoutUrl: isMpSandbox() ? preapproval.sandbox_init_point : preapproval.init_point,
    sandbox: isMpSandbox(),
  }
}

// ── MercadoPago Promo Subscription (One-time payment for extended period) ──

export async function createPromoSubscriptionPayment(params: {
  paymentId: string
  creatorName: string
  durationLabel: string
  amount: number
  paymentMethod: string
  backUrl: string
}) {
  const webhookUrl = getWebhookBaseUrl()
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const preference = await mpFetch<MpPreference>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        {
          title: `Assinatura ${params.durationLabel} - ${params.creatorName} - FanDreams`,
          description: `Acesso por ${params.durationLabel} ao conteudo exclusivo`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: params.amount,
        },
      ],
      external_reference: params.paymentId,
      payment_methods: {
        excluded_payment_types: params.paymentMethod === 'pix' ? [{ id: 'credit_card' }] : [],
        installments: params.paymentMethod === 'credit_card' ? 12 : 1,
      },
      back_urls: {
        success: params.backUrl.replace('subscription=pending', 'subscription=success'),
        failure: params.backUrl.replace('subscription=pending', 'subscription=failure'),
        pending: params.backUrl,
      },
      auto_return: 'approved',
      notification_url: `${webhookUrl}/api/v1/payments/webhook/mercadopago`,
      statement_descriptor: 'FANDREAMS',
    }),
  })

  return {
    preferenceId: preference.id,
    checkoutUrl: isMpSandbox() ? preference.sandbox_init_point : preference.init_point,
    sandbox: isMpSandbox(),
  }
}

// ── MercadoPago Payment Verification ──

export async function verifyMpPaymentStatus(providerTxId: string) {
  try {
    const mpPayment = await mpFetch<MpPaymentInfo>(`/v1/payments/${providerTxId}`)
    return {
      status: mpPayment.status,
      statusDetail: mpPayment.status_detail,
      externalReference: mpPayment.external_reference,
    }
  } catch {
    return null
  }
}

export async function cancelMpSubscription(preapprovalId: string) {
  await mpFetch(`/preapproval/${preapprovalId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'cancelled' }),
  })
}

export async function getMpPreapproval(preapprovalId: string) {
  return mpFetch<MpPreapproval>(`/preapproval/${preapprovalId}`)
}
