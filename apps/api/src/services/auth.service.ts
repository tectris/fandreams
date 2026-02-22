import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { users, userSettings, fancoinWallets, userGamification } from '@fandreams/database'
import { db } from '../config/database'
import { env } from '../config/env'
import { hashPassword, verifyPassword } from '../utils/password'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, blacklistRefreshToken, isRefreshTokenBlacklisted } from '../utils/tokens'
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendNewSignupAlert } from './email.service'
import { initiate2fa } from './twofa.service'
import { recordFailedLogin, isAccountLocked, clearLoginAttempts } from '../middleware/rateLimit'
import type { RegisterInput, LoginInput } from '@fandreams/shared'

// Separate secrets for different token types (falls back to JWT_SECRET if not set)
function getEmailVerifySecret(): string {
  return env.EMAIL_VERIFY_SECRET || `${env.JWT_SECRET}:email_verify`
}

function getPasswordResetSecret(): string {
  return env.PASSWORD_RESET_SECRET || `${env.JWT_SECRET}:password_reset`
}

export async function register(input: RegisterInput) {
  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1)

  const [existingUsername] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, input.username))
    .limit(1)

  if (existingEmail || existingUsername) {
    throw new AppError('USER_EXISTS', 'Email ou username ja esta em uso', 409)
  }

  const passwordHash = await hashPassword(input.password)

  let user: {
    id: string
    email: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    role: string
    kycStatus: string
  }

  try {
    const [result] = await db
      .insert(users)
      .values({
        email: input.email,
        username: input.username,
        displayName: input.displayName || input.username,
        passwordHash,
        dateOfBirth: input.dateOfBirth,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        kycStatus: users.kycStatus,
      })
    user = result!
  } catch (dbErr: any) {
    // Fallback if kyc_status column doesn't exist yet (migration not run)
    if (dbErr?.message?.includes('kyc_status')) {
      const [result] = await db
        .insert(users)
        .values({
          email: input.email,
          username: input.username,
          displayName: input.displayName || input.username,
          passwordHash,
          dateOfBirth: input.dateOfBirth,
        })
        .returning({
          id: users.id,
          email: users.email,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: users.role,
        })
      user = { ...result!, kycStatus: 'none' }
    } else {
      throw dbErr
    }
  }

  if (!user) throw new AppError('INTERNAL', 'Erro ao criar usuario', 500)

  await Promise.all([
    db.insert(userSettings).values({ userId: user.id }),
    db.insert(fancoinWallets).values({ userId: user.id }),
    db.insert(userGamification).values({ userId: user.id }),
  ])

  const accessToken = generateAccessToken(user.id, user.role)
  const refreshToken = generateRefreshToken(user.id)

  // Send verification + welcome emails (non-blocking)
  const verifyToken = generateEmailVerifyToken(user.id, user.email)
  sendVerificationEmail(user.email, verifyToken).catch((err) =>
    console.error('Failed to send verification email:', err),
  )
  sendWelcomeEmail(user.email, user.displayName || user.username).catch((err) =>
    console.error('Failed to send welcome email:', err),
  )

  // Notify admins of new signup (non-blocking)
  sendNewSignupAlert({
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
  }).catch((err) => console.error('Failed to send signup alert:', err))

  return { user, accessToken, refreshToken }
}

export async function login(input: LoginInput) {
  // Check account lockout before processing
  const lockout = isAccountLocked(input.email)
  if (lockout.locked) {
    throw new AppError(
      'ACCOUNT_LOCKED',
      `Conta temporariamente bloqueada. Tente novamente em ${lockout.retryAfterSeconds} segundos.`,
      429,
    )
  }

  let user: any

  try {
    const [result] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1)
    user = result
  } catch (dbErr: any) {
    if (dbErr?.message?.includes('kyc_status')) {
      const [result] = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          displayName: users.displayName,
          passwordHash: users.passwordHash,
          avatarUrl: users.avatarUrl,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1)
      user = result ? { ...result, kycStatus: 'none' } : null
    } else {
      throw dbErr
    }
  }

  // Permanently deleted accounts cannot login
  if (user && !user.isActive && user.passwordHash === 'DELETED') {
    throw new AppError('ACCOUNT_DELETED', 'Esta conta foi excluida permanentemente', 403)
  }

  // Always compute password hash to prevent timing-based user enumeration
  const dummyHash = '$2b$12$LJ3m4ys3LgDEgONkMJvxOOtXnGKfWxPPAI8R8hKbx3yQ.5GzXMwSe'
  const valid = await verifyPassword(input.password, user?.passwordHash || dummyHash)
  if (!user || !valid) {
    recordFailedLogin(input.email)
    throw new AppError('INVALID_CREDENTIALS', 'Email ou senha incorretos', 401)
  }

  // Clear lockout on successful login
  clearLoginAttempts(input.email)

  // Check if 2FA is enabled
  const [settings] = await db
    .select({ twoFactorEnabled: userSettings.twoFactorEnabled })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .limit(1)

  if (settings?.twoFactorEnabled) {
    // Initiate 2FA challenge - don't generate tokens yet
    const challengeToken = await initiate2fa(user.id, user.email, user.role)
    return {
      requires2fa: true,
      challengeToken,
      user: {
        email: user.email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3'),
      },
    }
  }

  // If user is deactivated (but not deleted), reactivate on login
  if (!user.isActive) {
    await db
      .update(users)
      .set({ isActive: true, deactivatedAt: null, deletionScheduledAt: null, lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id))
  } else {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
  }

  const accessToken = generateAccessToken(user.id, user.role)
  const refreshToken = generateRefreshToken(user.id)

  return {
    requires2fa: false,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      kycStatus: user.kycStatus ?? 'none',
      reactivated: !user.isActive,
    },
    accessToken,
    refreshToken,
  }
}

export async function getMe(userId: string) {
  let user: any

  try {
    const [result] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        kycStatus: users.kycStatus,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    user = result
  } catch (dbErr: any) {
    if (dbErr?.message?.includes('kyc_status')) {
      const [result] = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      user = result ? { ...result, kycStatus: 'none' } : null
    } else {
      throw dbErr
    }
  }

  if (!user) throw new AppError('NOT_FOUND', 'Usuario nao encontrado', 404)
  return user
}

export async function refreshTokens(token: string) {
  // Check if refresh token is blacklisted
  if (isRefreshTokenBlacklisted(token)) {
    throw new AppError('INVALID_TOKEN', 'Refresh token invalido', 401)
  }

  const payload = verifyRefreshToken(token)
  if (!payload) {
    throw new AppError('INVALID_TOKEN', 'Refresh token invalido', 401)
  }

  const [user] = await db
    .select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1)

  if (!user || !user.isActive) {
    throw new AppError('INVALID_TOKEN', 'Usuario nao encontrado', 401)
  }

  // Blacklist old refresh token (rotation)
  blacklistRefreshToken(token)

  const accessToken = generateAccessToken(user.id, user.role)
  const newRefreshToken = generateRefreshToken(user.id)

  return { accessToken, refreshToken: newRefreshToken }
}

// ── Email Verification (uses separate secret) ──

function generateEmailVerifyToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email, type: 'email_verify' }, getEmailVerifySecret(), { expiresIn: '24h' })
}

function verifyEmailToken(token: string): { sub: string; email: string } | null {
  try {
    const payload = jwt.verify(token, getEmailVerifySecret()) as any
    if (payload.type !== 'email_verify') return null
    return { sub: payload.sub, email: payload.email }
  } catch {
    return null
  }
}

export async function sendEmailVerification(userId: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) throw new AppError('NOT_FOUND', 'Usuario nao encontrado', 404)
  if (user.emailVerified) throw new AppError('ALREADY_VERIFIED', 'Email ja verificado', 400)

  const token = generateEmailVerifyToken(user.id, user.email)
  await sendVerificationEmail(user.email, token)

  return { sent: true }
}

export async function verifyEmail(token: string) {
  const payload = verifyEmailToken(token)
  if (!payload) throw new AppError('INVALID_TOKEN', 'Token invalido ou expirado', 400)

  const [user] = await db
    .select({ id: users.id, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1)

  if (!user) throw new AppError('NOT_FOUND', 'Usuario nao encontrado', 404)
  if (user.emailVerified) return { verified: true, alreadyVerified: true }

  await db
    .update(users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  return { verified: true, alreadyVerified: false }
}

// ── Password Reset (uses separate secret) ──

function generatePasswordResetToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'password_reset' }, getPasswordResetSecret(), { expiresIn: '1h' })
}

function verifyPasswordResetToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, getPasswordResetSecret()) as any
    if (payload.type !== 'password_reset') return null
    return { sub: payload.sub }
  } catch {
    return null
  }
}

export async function forgotPassword(email: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, isActive: users.isActive })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  // Always return success to prevent email enumeration
  if (!user || !user.isActive) return { sent: true }

  const token = generatePasswordResetToken(user.id)
  await sendPasswordResetEmail(user.email, token)

  return { sent: true }
}

export async function resetPassword(token: string, newPassword: string) {
  const payload = verifyPasswordResetToken(token)
  if (!payload) throw new AppError('INVALID_TOKEN', 'Token invalido ou expirado', 400)

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1)

  if (!user) throw new AppError('NOT_FOUND', 'Usuario nao encontrado', 404)

  const passwordHash = await hashPassword(newPassword)

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  // Blacklist the reset token to prevent reuse
  const { blacklistRefreshToken } = await import('../utils/tokens')
  blacklistRefreshToken(token)

  return { reset: true }
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message)
  }
}
