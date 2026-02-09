import { env } from '../config/env'
import { AppError } from './auth.service'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// ── Config ──

function isEfiSandbox() {
  return env.EFI_SANDBOX === 'true'
}

function getEfiBaseUrl() {
  return isEfiSandbox()
    ? 'https://pix-h.api.efipay.com.br'
    : 'https://pix.api.efipay.com.br'
}

function getEfiPixKey() {
  if (!env.EFI_PIX_KEY) {
    throw new AppError('PAYMENT_UNAVAILABLE', 'EFI PIX key nao configurada', 503)
  }
  return env.EFI_PIX_KEY
}

// ── Certificate handling (mTLS) ──

let cachedAgent: https.Agent | null = null

function getHttpsAgent(): https.Agent {
  if (cachedAgent) return cachedAgent

  if (!env.EFI_CERTIFICATE_BASE64) {
    throw new AppError('PAYMENT_UNAVAILABLE', 'Certificado EFI nao configurado', 503)
  }

  // Decode base64 P12 certificate and write to temp file
  const certBuffer = Buffer.from(env.EFI_CERTIFICATE_BASE64, 'base64')
  const certPath = path.join(os.tmpdir(), 'efi-cert.p12')
  fs.writeFileSync(certPath, certBuffer)

  cachedAgent = new https.Agent({
    pfx: certBuffer,
    passphrase: '',
  })

  return cachedAgent
}

// ── OAuth2 Token ──

let tokenCache: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token
  }

  if (!env.EFI_CLIENT_ID || !env.EFI_CLIENT_SECRET) {
    throw new AppError('PAYMENT_UNAVAILABLE', 'EFI credentials nao configuradas', 503)
  }

  const auth = Buffer.from(`${env.EFI_CLIENT_ID}:${env.EFI_CLIENT_SECRET}`).toString('base64')
  const baseUrl = getEfiBaseUrl()

  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
    // @ts-expect-error Node.js fetch supports dispatcher for custom agents
    dispatcher: getHttpsAgent(),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('EFI OAuth error:', err)
    throw new AppError('PAYMENT_ERROR', 'Falha na autenticacao EFI', 502)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // refresh 60s before expiry
  }

  return tokenCache.token
}

// ── API Helper ──

async function efiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const baseUrl = getEfiBaseUrl()

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    },
    // @ts-expect-error Node.js fetch supports dispatcher for custom agents
    dispatcher: getHttpsAgent(),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('EFI API error:', JSON.stringify(data, null, 2))
    const msg = data.mensagem || data.message || 'Erro no processamento EFI PIX'
    throw new AppError('PAYMENT_ERROR', msg, 502)
  }

  return data as T
}

// ── Types ──

type EfiCharge = {
  txid: string
  status: string
  calendario: { criacao: string; expiracao: number }
  loc: { id: number; location: string }
  location: string
  valor: { original: string }
  chave: string
  pixCopiaECola: string
}

type EfiQrCode = {
  qrcode: string
  imagemQrcode: string
  linkVisualizacao?: string
}

type EfiPixWebhookPayload = {
  pix: Array<{
    endToEndId: string
    txid: string
    chave: string
    valor: string
    horario: string
    infoPagador?: string
    gnExtras?: {
      pagador?: { cpf?: string; nome?: string }
      tarifa?: string
    }
  }>
}

// ── PIX Charge (Cobranca Imediata) ──

export async function createPixCharge(params: {
  amount: number
  description: string
  externalReference: string
  expirationSeconds?: number
  payerName?: string
  payerCpf?: string
}): Promise<{
  txid: string
  pixCopiaECola: string
  qrCodeBase64: string
  locationId: number
  expiresAt: string
}> {
  const expiration = params.expirationSeconds || 1800 // 30 min default

  // Create the charge
  const chargeBody: any = {
    calendario: { expiracao: expiration },
    valor: { original: params.amount.toFixed(2) },
    chave: getEfiPixKey(),
    solicitacaoPagador: params.description.slice(0, 140),
    infoAdicionais: [
      { nome: 'Referencia', valor: params.externalReference },
    ],
  }

  if (params.payerName && params.payerCpf) {
    chargeBody.devedor = {
      cpf: params.payerCpf.replace(/\D/g, ''),
      nome: params.payerName,
    }
  }

  const charge = await efiFetch<EfiCharge>('/v2/cob', {
    method: 'POST',
    body: JSON.stringify(chargeBody),
  })

  // Get QR code image
  const qrCode = await efiFetch<EfiQrCode>(`/v2/loc/${charge.loc.id}/qrcode`)

  const expiresAt = new Date(Date.now() + expiration * 1000).toISOString()

  return {
    txid: charge.txid,
    pixCopiaECola: charge.pixCopiaECola || qrCode.qrcode,
    qrCodeBase64: qrCode.imagemQrcode,
    locationId: charge.loc.id,
    expiresAt,
  }
}

// ── Get charge status ──

export async function getChargeStatus(txid: string): Promise<{
  status: string
  valor: string
}> {
  const charge = await efiFetch<EfiCharge>(`/v2/cob/${txid}`)
  return {
    status: charge.status,
    valor: charge.valor.original,
  }
}

// ── Configure webhook ──

export async function configureWebhook(webhookUrl: string) {
  const pixKey = getEfiPixKey()

  // EFI appends /pix to webhook URL. Use ?ignorar= to prevent this.
  const url = webhookUrl.includes('?')
    ? webhookUrl
    : `${webhookUrl}?ignorar=`

  await efiFetch(`/v2/webhook/${pixKey}`, {
    method: 'PUT',
    headers: {
      'x-skip-mtls-checking': 'true', // Skip mTLS for webhook reception (Railway doesn't support mTLS inbound)
    } as any,
    body: JSON.stringify({ webhookUrl: url }),
  })
}

// ── Process webhook ──

export function parseWebhookPayload(body: any): Array<{
  txid: string
  endToEndId: string
  amount: string
  paidAt: string
  payerName?: string
  payerCpf?: string
}> {
  const payload = body as EfiPixWebhookPayload

  if (!payload.pix || !Array.isArray(payload.pix)) {
    return []
  }

  return payload.pix.map((p) => ({
    txid: p.txid,
    endToEndId: p.endToEndId,
    amount: p.valor,
    paidAt: p.horario,
    payerName: p.gnExtras?.pagador?.nome,
    payerCpf: p.gnExtras?.pagador?.cpf,
  }))
}

// ── Check if EFI is configured ──

export function isEfiConfigured(): boolean {
  return !!(env.EFI_CLIENT_ID && env.EFI_CLIENT_SECRET && env.EFI_PIX_KEY && env.EFI_CERTIFICATE_BASE64)
}

export { isEfiSandbox }
