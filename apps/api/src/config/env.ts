import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  EMAIL_VERIFY_SECRET: z.string().min(32).optional(),
  PASSWORD_RESET_SECRET: z.string().min(32).optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('fandreams-media'),
  R2_PUBLIC_URL: z.string().optional(),
  BUNNY_API_KEY: z.string().optional(),
  BUNNY_LIBRARY_ID: z.string().optional(),
  BUNNY_CDN_HOSTNAME: z.string().optional(),
  API_URL: z.string().optional(),
  // OpenPix / Woovi (PIX)
  OPENPIX_APP_ID: z.string().optional(),
  OPENPIX_WEBHOOK_SECRET: z.string().optional(),
  OPENPIX_SANDBOX: z.enum(['true', 'false']).default('true'),

  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
  MERCADOPAGO_SANDBOX: z.enum(['true', 'false']).default('true'),
  NOWPAYMENTS_API_KEY: z.string().optional(),
  NOWPAYMENTS_IPN_SECRET: z.string().optional(),
  NOWPAYMENTS_SANDBOX: z.enum(['true', 'false']).default('true'),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_SANDBOX: z.enum(['true', 'false']).default('true'),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('FanDreams <noreply@fandreams.app>'),
  ADMIN_NOTIFICATION_EMAILS: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional(),
  PLATFORM_FEE_PERCENT: z.coerce.number().default(12),
  STEGO_SECRET: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

// Enforce critical secrets in production
if (parsed.data.NODE_ENV === 'production') {
  const warnings: string[] = []
  const fatal: string[] = []

  // Webhook secrets are REQUIRED when their corresponding provider is configured
  if (parsed.data.MERCADOPAGO_ACCESS_TOKEN && !parsed.data.MERCADOPAGO_WEBHOOK_SECRET) {
    fatal.push('MERCADOPAGO_WEBHOOK_SECRET (required when MERCADOPAGO_ACCESS_TOKEN is set)')
  }
  if (parsed.data.OPENPIX_APP_ID && !parsed.data.OPENPIX_WEBHOOK_SECRET) {
    fatal.push('OPENPIX_WEBHOOK_SECRET (required when OPENPIX_APP_ID is set)')
  }

  // Auth secrets required in production
  if (!parsed.data.EMAIL_VERIFY_SECRET) fatal.push('EMAIL_VERIFY_SECRET')
  if (!parsed.data.PASSWORD_RESET_SECRET) fatal.push('PASSWORD_RESET_SECRET')

  // Critical: Redis needed for rate limiting in production
  if (!parsed.data.UPSTASH_REDIS_REST_URL) warnings.push('UPSTASH_REDIS_REST_URL')
  if (!parsed.data.UPSTASH_REDIS_REST_TOKEN) warnings.push('UPSTASH_REDIS_REST_TOKEN')

  if (warnings.length > 0) {
    console.warn(`[SECURITY] Missing recommended production env vars: ${warnings.join(', ')}`)
    console.warn('[SECURITY] Some features (webhooks, rate limiting) may not work correctly.')
  }
  if (fatal.length > 0) {
    console.error(`[SECURITY] Missing required production env vars: ${fatal.join(', ')}`)
    process.exit(1)
  }
}

export const env = parsed.data
