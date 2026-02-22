import crypto from 'crypto'
import { send2faOtpEmail } from './email.service'

interface PendingOtp {
  code: string
  userId: string
  email: string
  role: string
  expiresAt: number
  attempts: number
}

// In-memory OTP store keyed by a challenge token
const pendingOtps = new Map<string, PendingOtp>()

// Cleanup expired OTPs every 5 minutes
const otpCleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, otp] of pendingOtps) {
    if (now > otp.expiresAt) {
      pendingOtps.delete(key)
    }
  }
}, 5 * 60 * 1000)
if (otpCleanupInterval.unref) otpCleanupInterval.unref()

const OTP_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999))
}

function generateChallengeToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function initiate2fa(userId: string, email: string, role: string): Promise<string> {
  const code = generateOtp()
  const challengeToken = generateChallengeToken()

  pendingOtps.set(challengeToken, {
    code,
    userId,
    email,
    role,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
  })

  // Send OTP email (non-blocking but we await to ensure delivery)
  await send2faOtpEmail(email, code)

  return challengeToken
}

export function verify2fa(challengeToken: string, code: string): { userId: string; role: string } | null {
  const otp = pendingOtps.get(challengeToken)

  if (!otp) return null

  if (Date.now() > otp.expiresAt) {
    pendingOtps.delete(challengeToken)
    return null
  }

  otp.attempts++

  if (otp.attempts > MAX_ATTEMPTS) {
    pendingOtps.delete(challengeToken)
    return null
  }

  // Use timing-safe comparison to prevent timing attacks
  const codeBuffer = Buffer.from(otp.code)
  const inputBuffer = Buffer.from(code.padEnd(otp.code.length).slice(0, otp.code.length))
  if (codeBuffer.length !== inputBuffer.length || !crypto.timingSafeEqual(codeBuffer, inputBuffer)) return null

  // Success - clean up and return user info
  pendingOtps.delete(challengeToken)
  return { userId: otp.userId, role: otp.role }
}
