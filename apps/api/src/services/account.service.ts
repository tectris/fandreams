import { eq, and, lte, isNotNull } from 'drizzle-orm'
import { users, userSettings } from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import { verifyPassword } from '../utils/password'
import { sendAccountDeactivatedEmail, sendAccountReactivatedEmail, sendAccountDeletionScheduledEmail, sendAccountDeletedEmail } from './email.service'

const DELETION_GRACE_DAYS = 30

export async function deactivateAccount(userId: string, password: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName, username: users.username, passwordHash: users.passwordHash, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) throw new AppError('NOT_FOUND', 'Usuario nao encontrado', 404)

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw new AppError('INVALID_PASSWORD', 'Senha incorreta', 400)

  if (!user.isActive) throw new AppError('ALREADY_DEACTIVATED', 'Conta ja esta desativada', 409)

  await db
    .update(users)
    .set({ isActive: false, deactivatedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId))

  const name = user.displayName || user.username
  sendAccountDeactivatedEmail(user.email, name).catch((e) =>
    console.error('Failed to send deactivation email:', e),
  )

  return { deactivated: true }
}

export async function reactivateAccount(userId: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName, username: users.username, isActive: users.isActive, deletionScheduledAt: users.deletionScheduledAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) throw new AppError('NOT_FOUND', 'Usuario nao encontrado', 404)
  if (user.isActive) throw new AppError('ALREADY_ACTIVE', 'Conta ja esta ativa', 409)

  await db
    .update(users)
    .set({ isActive: true, deactivatedAt: null, deletionScheduledAt: null, updatedAt: new Date() })
    .where(eq(users.id, userId))

  const name = user.displayName || user.username
  sendAccountReactivatedEmail(user.email, name).catch((e) =>
    console.error('Failed to send reactivation email:', e),
  )

  return { reactivated: true }
}

export async function scheduleDeletion(userId: string, password: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName, username: users.username, passwordHash: users.passwordHash, deletionScheduledAt: users.deletionScheduledAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) throw new AppError('NOT_FOUND', 'Usuario nao encontrado', 404)

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw new AppError('INVALID_PASSWORD', 'Senha incorreta', 400)

  if (user.deletionScheduledAt) throw new AppError('ALREADY_SCHEDULED', 'Exclusao ja esta agendada', 409)

  const deletionDate = new Date()
  deletionDate.setDate(deletionDate.getDate() + DELETION_GRACE_DAYS)

  await db
    .update(users)
    .set({ isActive: false, deactivatedAt: new Date(), deletionScheduledAt: deletionDate, updatedAt: new Date() })
    .where(eq(users.id, userId))

  const name = user.displayName || user.username
  sendAccountDeletionScheduledEmail(user.email, name, deletionDate.toLocaleDateString('pt-BR')).catch((e) =>
    console.error('Failed to send deletion scheduled email:', e),
  )

  return { scheduled: true, deletionDate: deletionDate.toISOString() }
}

export async function cancelDeletion(userId: string) {
  const [user] = await db
    .select({ id: users.id, deletionScheduledAt: users.deletionScheduledAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) throw new AppError('NOT_FOUND', 'Usuario nao encontrado', 404)
  if (!user.deletionScheduledAt) throw new AppError('NO_DELETION', 'Nenhuma exclusao agendada', 400)

  await db
    .update(users)
    .set({ isActive: true, deactivatedAt: null, deletionScheduledAt: null, updatedAt: new Date() })
    .where(eq(users.id, userId))

  return { cancelled: true }
}

export async function processScheduledDeletions() {
  const now = new Date()

  const usersToDelete = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName, username: users.username })
    .from(users)
    .where(and(isNotNull(users.deletionScheduledAt), lte(users.deletionScheduledAt, now)))

  let deleted = 0
  for (const user of usersToDelete) {
    try {
      // Anonymize user data instead of hard delete to preserve referential integrity
      await db
        .update(users)
        .set({
          email: `deleted_${user.id}@deleted.fandreams.app`,
          username: `deleted_${user.id.slice(0, 8)}`,
          displayName: 'Usuario excluido',
          passwordHash: 'DELETED',
          avatarUrl: null,
          coverUrl: null,
          bio: null,
          dateOfBirth: null,
          country: null,
          isActive: false,
          deactivatedAt: now,
          deletionScheduledAt: null,
          updatedAt: now,
        })
        .where(eq(users.id, user.id))

      const name = user.displayName || user.username
      sendAccountDeletedEmail(user.email, name).catch(() => {})
      deleted++
    } catch (e) {
      console.error(`Failed to delete user ${user.id}:`, e)
    }
  }

  return { deleted, total: usersToDelete.length }
}
