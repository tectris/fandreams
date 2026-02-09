import { eq, and, desc, sql } from 'drizzle-orm'
import { users, creatorProfiles, subscriptionTiers, subscriptionPromos, subscriptions, payments } from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import type { CreateTierInput, CreatePromoInput, UpdatePromoInput } from '@fandreams/shared'
import * as bonusService from './bonus.service'

export async function applyAsCreator(
  userId: string,
  data: { category: string; subscriptionPrice: number; tags?: string[] },
) {
  const [existing] = await db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1)

  if (existing) throw new AppError('ALREADY_CREATOR', 'Voce ja e um criador', 409)

  await db.update(users).set({ role: 'creator', updatedAt: new Date() }).where(eq(users.id, userId))

  const [profile] = await db
    .insert(creatorProfiles)
    .values({
      userId,
      category: data.category,
      subscriptionPrice: String(data.subscriptionPrice),
      tags: data.tags || [],
    })
    .returning()

  // Create bonus for new creator (non-blocking)
  bonusService.createBonusForCreator(userId).catch((e) => console.error('Failed to create bonus:', e))

  return profile
}

export async function getCreatorProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1)

  if (!profile) throw new AppError('NOT_FOUND', 'Perfil de criador nao encontrado', 404)

  const tiers = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.creatorId, userId))
    .orderBy(subscriptionTiers.sortOrder)

  const promos = await db
    .select()
    .from(subscriptionPromos)
    .where(eq(subscriptionPromos.creatorId, userId))
    .orderBy(subscriptionPromos.durationDays)

  return { ...profile, tiers, promos }
}

export async function updateCreatorProfile(
  userId: string,
  data: Partial<{
    category: string
    tags: string[]
    subscriptionPrice: number
    welcomeMessage: string
    messagesEnabled: boolean
    payoutMethod: string
    payoutDetails: unknown
  }>,
) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (data.category !== undefined) updateData.category = data.category
  if (data.tags !== undefined) updateData.tags = data.tags
  if (data.subscriptionPrice !== undefined) updateData.subscriptionPrice = String(data.subscriptionPrice)
  if (data.welcomeMessage !== undefined) updateData.welcomeMessage = data.welcomeMessage
  if (data.messagesEnabled !== undefined) updateData.messagesEnabled = data.messagesEnabled
  if (data.payoutMethod !== undefined) updateData.payoutMethod = data.payoutMethod
  if (data.payoutDetails !== undefined) updateData.payoutDetails = data.payoutDetails

  const [updated] = await db
    .update(creatorProfiles)
    .set(updateData)
    .where(eq(creatorProfiles.userId, userId))
    .returning()

  if (!updated) throw new AppError('NOT_FOUND', 'Perfil nao encontrado', 404)
  return updated
}

export async function createTier(creatorId: string, input: CreateTierInput) {
  const existing = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.creatorId, creatorId))

  if (existing.length >= 5) {
    throw new AppError('LIMIT_REACHED', 'Maximo de 5 tiers permitido', 400)
  }

  const [tier] = await db
    .insert(subscriptionTiers)
    .values({
      creatorId,
      name: input.name,
      price: String(input.price),
      description: input.description,
      benefits: input.benefits || [],
      maxSlots: input.maxSlots,
      sortOrder: existing.length,
    })
    .returning()

  return tier
}

export async function getCreatorEarnings(creatorId: string) {
  const [profile] = await db
    .select({ totalEarnings: creatorProfiles.totalEarnings, totalSubscribers: creatorProfiles.totalSubscribers })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, creatorId))
    .limit(1)

  const recentPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.recipientId, creatorId))
    .orderBy(desc(payments.createdAt))
    .limit(50)

  const activeSubscribers = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.creatorId, creatorId))

  return {
    totalEarnings: profile?.totalEarnings || '0',
    totalSubscribers: profile?.totalSubscribers || 0,
    activeSubscribers: activeSubscribers[0]?.count || 0,
    recentPayments,
  }
}

export async function getCreatorSubscribers(creatorId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit

  const subs = await db
    .select({
      id: subscriptions.id,
      fanId: subscriptions.fanId,
      status: subscriptions.status,
      pricePaid: subscriptions.pricePaid,
      createdAt: subscriptions.createdAt,
      fanUsername: users.username,
      fanDisplayName: users.displayName,
      fanAvatarUrl: users.avatarUrl,
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.fanId, users.id))
    .where(eq(subscriptions.creatorId, creatorId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(limit)
    .offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.creatorId, creatorId))

  return { subscribers: subs, total: count || 0 }
}

// ── Subscription Promos ──

export async function getCreatorPromos(creatorId: string) {
  return db
    .select()
    .from(subscriptionPromos)
    .where(eq(subscriptionPromos.creatorId, creatorId))
    .orderBy(subscriptionPromos.durationDays)
}

export async function getActivePromos(creatorId: string) {
  return db
    .select()
    .from(subscriptionPromos)
    .where(
      and(
        eq(subscriptionPromos.creatorId, creatorId),
        eq(subscriptionPromos.isActive, true),
      ),
    )
    .orderBy(subscriptionPromos.durationDays)
}

export async function createPromo(creatorId: string, input: CreatePromoInput) {
  // Check if a promo for this duration already exists
  const [existing] = await db
    .select()
    .from(subscriptionPromos)
    .where(
      and(
        eq(subscriptionPromos.creatorId, creatorId),
        eq(subscriptionPromos.durationDays, input.durationDays),
      ),
    )
    .limit(1)

  if (existing) {
    throw new AppError('ALREADY_EXISTS', `Ja existe uma promocao para ${input.durationDays} dias`, 409)
  }

  // Creator must have a subscription price set
  const [profile] = await db
    .select({ subscriptionPrice: creatorProfiles.subscriptionPrice })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, creatorId))
    .limit(1)

  if (!profile || !profile.subscriptionPrice || Number(profile.subscriptionPrice) <= 0) {
    throw new AppError('INVALID', 'Defina o preco mensal da assinatura antes de criar promocoes', 400)
  }

  const [promo] = await db
    .insert(subscriptionPromos)
    .values({
      creatorId,
      durationDays: input.durationDays,
      price: String(input.price),
      isActive: true,
    })
    .returning()

  return promo
}

export async function updatePromo(creatorId: string, promoId: string, input: UpdatePromoInput) {
  const [existing] = await db
    .select()
    .from(subscriptionPromos)
    .where(
      and(
        eq(subscriptionPromos.id, promoId),
        eq(subscriptionPromos.creatorId, creatorId),
      ),
    )
    .limit(1)

  if (!existing) throw new AppError('NOT_FOUND', 'Promocao nao encontrada', 404)

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (input.price !== undefined) updateData.price = String(input.price)
  if (input.isActive !== undefined) updateData.isActive = input.isActive

  const [updated] = await db
    .update(subscriptionPromos)
    .set(updateData)
    .where(eq(subscriptionPromos.id, promoId))
    .returning()

  return updated
}

export async function deletePromo(creatorId: string, promoId: string) {
  const [existing] = await db
    .select()
    .from(subscriptionPromos)
    .where(
      and(
        eq(subscriptionPromos.id, promoId),
        eq(subscriptionPromos.creatorId, creatorId),
      ),
    )
    .limit(1)

  if (!existing) throw new AppError('NOT_FOUND', 'Promocao nao encontrada', 404)

  await db.delete(subscriptionPromos).where(eq(subscriptionPromos.id, promoId))
  return { deleted: true }
}
