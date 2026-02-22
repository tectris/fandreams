import { env } from '../config/env'
import { AppError } from './auth.service'
import crypto from 'node:crypto'

// ── Config ──

function isSandbox() {
  return env.OPENPIX_SANDBOX === 'true'
}

function getBaseUrl() {
  return isSandbox()
    ? 'https://api.woovi-sandbox.com'
    : 'https://api.woovi.com'
}

// ── API Helper ──

async function openpixFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!env.OPENPIX_APP_ID) {
    throw new AppError('PAYMENT_UNAVAILABLE', 'OpenPix nao configurado', 503)
  }

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: env.OPENPIX_APP_ID,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    },
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('OpenPix API error:', JSON.stringify(data, null, 2))
    const msg = data.error?.message || data.message || 'Erro no processamento OpenPix PIX'
    throw new AppError('PAYMENT_ERROR', msg, 502)
  }

  return data as T
}

// ── Types ──

type OpenPixCharge = {
  status: string
  value: number
  identifier: string
  correlationID: string
  transactionID: string
  brCode: string
  qrCodeImage: string
  paymentLinkUrl: string
  expiresDate: string
  expiresIn: number
  createdAt: string
  customer?: {
    name?: string
    email?: string
    correlationID?: string
    taxID?: { taxID?: string }
  }
}

type OpenPixChargeResponse = {
  charge: OpenPixCharge
  brCode: string
}

type OpenPixSubscription = {
  globalID: string
  value: number
  dayGenerateCharge: number
  customer: {
    name: string
    email: string
    correlationID: string
    taxID: { taxID: string }
  }
}

type OpenPixSubscriptionResponse = {
  subscription: OpenPixSubscription
}

type OpenPixWebhookPayload = {
  event: string
  charge: {
    status: string
    value: number
    correlationID: string
    transactionID: string
    createdAt: string
    updatedAt: string
    customer?: {
      name?: string
      email?: string
      correlationID?: string
      taxID?: { taxID?: string }
    }
  }
  pix?: {
    customer?: {
      name?: string
      taxID?: { taxID?: string }
    }
    payer?: {
      name?: string
      taxID?: { taxID?: string }
    }
    time: string
    value: number
    transactionID: string
  }
}

// ── PIX Charge ──

export async function createPixCharge(params: {
  amount: number
  description: string
  externalReference: string
  expirationSeconds?: number
}): Promise<{
  correlationID: string
  brCode: string
  qrCodeImageUrl: string
  paymentLinkUrl: string
  expiresAt: string
}> {
  const correlationID = params.externalReference // Use payment ID as correlation
  const expiration = params.expirationSeconds || 1800 // 30 min default

  const response = await openpixFetch<OpenPixChargeResponse>('/api/v1/charge', {
    method: 'POST',
    body: JSON.stringify({
      correlationID,
      value: Math.round(params.amount * 100), // Convert to centavos
      comment: params.description.slice(0, 140),
      expiresIn: expiration,
    }),
  })

  return {
    correlationID: response.charge.correlationID,
    brCode: response.brCode || response.charge.brCode,
    qrCodeImageUrl: response.charge.qrCodeImage,
    paymentLinkUrl: response.charge.paymentLinkUrl,
    expiresAt: response.charge.expiresDate,
  }
}

// ── Get charge details ──

export async function getChargeStatus(correlationID: string): Promise<{
  status: string
  value: number
}> {
  const response = await openpixFetch<{ charge: OpenPixCharge }>(`/api/v1/charge/${correlationID}`)
  return {
    status: response.charge.status,
    value: response.charge.value,
  }
}

export async function getChargeDetails(correlationID: string): Promise<{
  status: string
  value: number
  customerCorrelationID?: string
}> {
  const response = await openpixFetch<{ charge: OpenPixCharge }>(`/api/v1/charge/${correlationID}`)
  return {
    status: response.charge.status,
    value: response.charge.value,
    customerCorrelationID: response.charge.customer?.correlationID,
  }
}

// ── Subscription (Recurring PIX) ──

export async function createSubscription(params: {
  value: number
  customer: {
    name: string
    email: string
    taxID: string
    phone?: string
    correlationID: string
  }
  dayGenerateCharge?: number
}): Promise<{
  globalID: string
  value: number
  dayGenerateCharge: number
}> {
  const response = await openpixFetch<OpenPixSubscriptionResponse>('/api/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      value: Math.round(params.value * 100), // Convert to centavos
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        taxID: params.customer.taxID,
        phone: params.customer.phone,
        correlationID: params.customer.correlationID,
      },
      dayGenerateCharge: params.dayGenerateCharge ?? new Date().getDate(),
    }),
  })

  return {
    globalID: response.subscription.globalID,
    value: response.subscription.value,
    dayGenerateCharge: response.subscription.dayGenerateCharge,
  }
}

export async function getSubscription(globalID: string): Promise<OpenPixSubscription | null> {
  try {
    const response = await openpixFetch<OpenPixSubscriptionResponse>(
      `/api/v1/subscriptions/${globalID}`,
    )
    return response.subscription
  } catch {
    return null
  }
}

export async function cancelSubscription(globalID: string): Promise<void> {
  try {
    await openpixFetch(`/api/v1/subscriptions/${globalID}`, {
      method: 'DELETE',
    })
  } catch (e) {
    console.error('Failed to cancel OpenPix subscription:', e)
  }
}

// ── Webhook verification ──

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!env.OPENPIX_WEBHOOK_SECRET) {
    throw new AppError('WEBHOOK_NOT_CONFIGURED', 'OPENPIX_WEBHOOK_SECRET is not configured', 500)
  }

  if (!signatureHeader) {
    return false
  }

  const computed = crypto
    .createHmac('sha256', env.OPENPIX_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('base64')

  const computedBuf = Buffer.from(computed, 'utf8')
  const signatureBuf = Buffer.from(signatureHeader, 'utf8')

  if (computedBuf.length !== signatureBuf.length) {
    return false
  }

  return crypto.timingSafeEqual(computedBuf, signatureBuf)
}

// ── Parse webhook ──

export function parseWebhookPayload(body: any): {
  event: string
  correlationID: string
  transactionID: string
  value: number
  paidAt?: string
  payerName?: string
  customerCorrelationID?: string
} | null {
  const payload = body as OpenPixWebhookPayload

  if (!payload.event || !payload.charge) {
    return null
  }

  return {
    event: payload.event,
    correlationID: payload.charge.correlationID,
    transactionID: payload.charge.transactionID,
    value: payload.charge.value,
    paidAt: payload.pix?.time,
    payerName: payload.pix?.payer?.name || payload.pix?.customer?.name,
    customerCorrelationID: payload.charge.customer?.correlationID,
  }
}

// ── Simulate test payment (sandbox only) ──

export async function simulatePayment(identifier: string): Promise<void> {
  if (!isSandbox()) {
    throw new AppError('INVALID', 'Simulacao de pagamento so funciona em sandbox', 400)
  }

  await openpixFetch(`/woovi/testing?transactionID=${identifier}`, {
    method: 'GET',
  })
}

// ── Check if configured ──

export function isOpenPixConfigured(): boolean {
  return !!env.OPENPIX_APP_ID
}

export { isSandbox as isOpenPixSandbox }
