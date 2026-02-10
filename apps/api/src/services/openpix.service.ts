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
}

type OpenPixChargeResponse = {
  charge: OpenPixCharge
  brCode: string
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

// ── Get charge status ──

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

// ── Webhook verification ──

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!env.OPENPIX_WEBHOOK_SECRET || !signatureHeader) {
    return !env.OPENPIX_WEBHOOK_SECRET // Skip validation if no secret configured
  }

  const computed = crypto
    .createHmac('sha1', env.OPENPIX_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('base64')

  return computed === signatureHeader
}

// ── Parse webhook ──

export function parseWebhookPayload(body: any): {
  event: string
  correlationID: string
  transactionID: string
  value: number
  paidAt?: string
  payerName?: string
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
