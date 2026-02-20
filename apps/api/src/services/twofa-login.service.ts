import { eq } from 'drizzle-orm'
import { users } from '@fandreams/database'
import { db } from '../config/database'
import { generateAccessToken, generateRefreshToken } from '../utils/tokens'
import { verify2fa } from './twofa.service'
import { AppError } from './auth.service'

export async function complete2faLogin(challengeToken: string, code: string) {
  const result = verify2fa(challengeToken, code)

  if (!result) {
    throw new AppError('INVALID_OTP', 'Codigo invalido ou expirado', 401)
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      kycStatus: users.kycStatus,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, result.userId))
    .limit(1)

  if (!user) throw new AppError('NOT_FOUND', 'Usuario nao encontrado', 404)

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
