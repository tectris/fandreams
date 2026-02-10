import { eq, and, sql, desc, count } from 'drizzle-orm'
import {
  guilds, guildMembers, guildTreasuryTransactions, guildSubscriptions,
  creatorProfiles, users, fancoinWallets, fancoinTransactions,
} from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import { GUILD_CONFIG } from '@fandreams/shared'
import { getWallet } from './fancoin.service'

// ── Guild CRUD ──

interface CreateGuildParams {
  name: string
  slug: string
  description?: string
  avatarUrl?: string
  coverUrl?: string
  category?: string
  leaderId: string
  maxMembers?: number
  minCreatorScore?: number
  comboSubscriptionPrice?: number
}

export async function createGuild(params: CreateGuildParams) {
  // Verify leader is a creator with sufficient score
  const [profile] = await db
    .select({ creatorScore: creatorProfiles.creatorScore })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, params.leaderId))
    .limit(1)

  if (!profile) {
    throw new AppError('NOT_CREATOR', 'Apenas criadores podem criar guildas', 403)
  }

  // Check for existing guild membership
  const [existing] = await db
    .select({ id: guildMembers.id })
    .from(guildMembers)
    .where(eq(guildMembers.userId, params.leaderId))
    .limit(1)

  if (existing) {
    throw new AppError('ALREADY_IN_GUILD', 'Voce ja esta em uma guilda. Saia primeiro para criar outra.', 409)
  }

  const [guild] = await db
    .insert(guilds)
    .values({
      name: params.name,
      slug: params.slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      description: params.description,
      avatarUrl: params.avatarUrl,
      coverUrl: params.coverUrl,
      category: params.category,
      leaderId: params.leaderId,
      maxMembers: params.maxMembers || GUILD_CONFIG.maxMembers,
      minCreatorScore: params.minCreatorScore ?? GUILD_CONFIG.minCreatorScore,
      comboSubscriptionPrice: params.comboSubscriptionPrice ? String(params.comboSubscriptionPrice) : null,
    })
    .returning()

  // Add leader as first member
  await db.insert(guildMembers).values({
    guildId: guild.id,
    userId: params.leaderId,
    role: 'leader',
  })

  return guild
}

export async function getGuild(guildId: string) {
  const [guild] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1)
  if (!guild) throw new AppError('NOT_FOUND', 'Guilda nao encontrada', 404)

  const members = await db
    .select({
      id: guildMembers.id,
      userId: guildMembers.userId,
      role: guildMembers.role,
      totalContributed: guildMembers.totalContributed,
      joinedAt: guildMembers.joinedAt,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(guildMembers)
    .innerJoin(users, eq(guildMembers.userId, users.id))
    .where(eq(guildMembers.guildId, guildId))

  return { ...guild, members }
}

export async function getGuildBySlug(slug: string) {
  const [guild] = await db.select().from(guilds).where(eq(guilds.slug, slug)).limit(1)
  if (!guild) throw new AppError('NOT_FOUND', 'Guilda nao encontrada', 404)
  return getGuild(guild.id)
}

export async function listGuilds(page = 1, limit = 20) {
  const offset = (page - 1) * limit

  const items = await db
    .select()
    .from(guilds)
    .where(eq(guilds.isActive, true))
    .orderBy(desc(guilds.totalMembers))
    .limit(limit)
    .offset(offset)

  const [total] = await db
    .select({ count: count() })
    .from(guilds)
    .where(eq(guilds.isActive, true))

  return { items, total: total?.count || 0, page, limit }
}

// ── Guild Membership ──

export async function joinGuild(guildId: string, userId: string) {
  const [guild] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1)
  if (!guild) throw new AppError('NOT_FOUND', 'Guilda nao encontrada', 404)
  if (!guild.isRecruiting) throw new AppError('NOT_RECRUITING', 'Esta guilda nao esta recrutando', 400)

  // Verify user is a creator
  const [profile] = await db
    .select({ creatorScore: creatorProfiles.creatorScore })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1)

  if (!profile) throw new AppError('NOT_CREATOR', 'Apenas criadores podem entrar em guildas', 403)

  // Check minimum creator score
  if (Number(profile.creatorScore) < guild.minCreatorScore) {
    throw new AppError(
      'LOW_SCORE',
      `Creator Score minimo: ${guild.minCreatorScore}. Seu score: ${Number(profile.creatorScore).toFixed(0)}`,
      400,
    )
  }

  // Check member limit
  if (guild.totalMembers >= guild.maxMembers) {
    throw new AppError('GUILD_FULL', 'Guilda esta cheia', 400)
  }

  // Check if already in any guild
  const [existingMembership] = await db
    .select({ id: guildMembers.id })
    .from(guildMembers)
    .where(eq(guildMembers.userId, userId))
    .limit(1)

  if (existingMembership) {
    throw new AppError('ALREADY_IN_GUILD', 'Voce ja esta em uma guilda', 409)
  }

  await db.insert(guildMembers).values({
    guildId,
    userId,
    role: 'member',
  })

  await db
    .update(guilds)
    .set({
      totalMembers: sql`${guilds.totalMembers} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(guilds.id, guildId))

  return { joined: true }
}

export async function leaveGuild(guildId: string, userId: string) {
  const [member] = await db
    .select()
    .from(guildMembers)
    .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)))
    .limit(1)

  if (!member) throw new AppError('NOT_MEMBER', 'Voce nao e membro desta guilda', 400)
  if (member.role === 'leader') {
    throw new AppError('LEADER_CANNOT_LEAVE', 'O lider nao pode sair. Transfira a lideranca primeiro.', 400)
  }

  await db
    .delete(guildMembers)
    .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)))

  await db
    .update(guilds)
    .set({
      totalMembers: sql`GREATEST(1, ${guilds.totalMembers} - 1)`,
      updatedAt: new Date(),
    })
    .where(eq(guilds.id, guildId))

  return { left: true }
}

// ── Guild Treasury ──

/**
 * Contribute FanCoins from member earnings to guild treasury.
 * Called automatically when a guild member receives tips/PPV/subscriptions.
 */
export async function contributeTreasury(guildId: string, userId: string, earningsAmount: number) {
  const [guild] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1)
  if (!guild) return null

  const contributionRate = Number(guild.treasuryContributionPercent) / 100
  const contribution = Math.floor(earningsAmount * contributionRate)
  if (contribution <= 0) return null

  // Debit from member wallet
  const [debit] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} - ${contribution}`,
      totalSpent: sql`${fancoinWallets.totalSpent} + ${contribution}`,
      updatedAt: new Date(),
    })
    .where(
      sql`${fancoinWallets.userId} = ${userId} AND ${fancoinWallets.balance} >= ${contribution}`,
    )
    .returning({ balance: fancoinWallets.balance })

  if (!debit) return null

  // ATOMIC credit guild treasury (prevents race condition on concurrent contributions)
  const [updatedGuild] = await db
    .update(guilds)
    .set({
      treasuryBalance: sql`${guilds.treasuryBalance} + ${contribution}`,
      updatedAt: new Date(),
    })
    .where(eq(guilds.id, guildId))
    .returning({ treasuryBalance: guilds.treasuryBalance })

  const newTreasuryBalance = Number(updatedGuild?.treasuryBalance ?? 0)

  // Record transaction
  await db.insert(guildTreasuryTransactions).values({
    guildId,
    userId,
    type: 'contribution',
    amount: contribution,
    balanceAfter: newTreasuryBalance,
    description: `Contribuicao automatica (${(contributionRate * 100).toFixed(1)}%)`,
  })

  // Update member's total contributed
  await db
    .update(guildMembers)
    .set({ totalContributed: sql`${guildMembers.totalContributed} + ${contribution}` })
    .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)))

  await db.insert(fancoinTransactions).values({
    userId,
    type: 'guild_contribution',
    amount: -contribution,
    balanceAfter: Number(debit.balance),
    description: `Contribuicao para guilda ${guild.name}`,
  })

  return { contribution, newTreasuryBalance }
}

export async function getTreasuryHistory(guildId: string, limit = 50) {
  return db
    .select()
    .from(guildTreasuryTransactions)
    .where(eq(guildTreasuryTransactions.guildId, guildId))
    .orderBy(desc(guildTreasuryTransactions.createdAt))
    .limit(limit)
}

// ── Guild Combo Subscriptions ──

export async function subscribeToGuild(guildId: string, fanId: string) {
  const [guild] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1)
  if (!guild) throw new AppError('NOT_FOUND', 'Guilda nao encontrada', 404)
  if (!guild.comboSubscriptionPrice) {
    throw new AppError('NO_COMBO', 'Esta guilda nao oferece assinatura combo', 400)
  }

  // Check existing subscription
  const [existing] = await db
    .select({ id: guildSubscriptions.id })
    .from(guildSubscriptions)
    .where(
      and(
        eq(guildSubscriptions.guildId, guildId),
        eq(guildSubscriptions.fanId, fanId),
        eq(guildSubscriptions.status, 'active'),
      ),
    )
    .limit(1)

  if (existing) throw new AppError('ALREADY_SUBSCRIBED', 'Voce ja assina esta guilda', 409)

  const price = Number(guild.comboSubscriptionPrice)
  const priceInCoins = Math.round(price * 100) // Convert BRL to FanCoins (1 coin = R$0.01)

  // Debit fan wallet
  const [debit] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} - ${priceInCoins}`,
      bonusBalance: sql`GREATEST(0, ${fancoinWallets.bonusBalance} - ${priceInCoins})`,
      totalSpent: sql`${fancoinWallets.totalSpent} + ${priceInCoins}`,
      updatedAt: new Date(),
    })
    .where(
      sql`${fancoinWallets.userId} = ${fanId} AND ${fancoinWallets.balance} >= ${priceInCoins}`,
    )
    .returning({ balance: fancoinWallets.balance })

  if (!debit) throw new AppError('INSUFFICIENT_BALANCE', 'Saldo insuficiente', 400)

  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [sub] = await db
    .insert(guildSubscriptions)
    .values({
      guildId,
      fanId,
      pricePaid: String(price),
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    })
    .returning()

  // Update guild stats
  await db
    .update(guilds)
    .set({
      totalSubscribers: sql`${guilds.totalSubscribers} + 1`,
      totalEarnings: sql`${guilds.totalEarnings} + ${price}`,
      updatedAt: new Date(),
    })
    .where(eq(guilds.id, guildId))

  // Distribute earnings among guild members proportionally
  const members = await db
    .select({ userId: guildMembers.userId })
    .from(guildMembers)
    .where(eq(guildMembers.guildId, guildId))

  if (members.length > 0) {
    const perMember = Math.floor(priceInCoins / members.length)
    for (const member of members) {
      if (perMember <= 0) continue
      await getWallet(member.userId)
      await db
        .update(fancoinWallets)
        .set({
          balance: sql`${fancoinWallets.balance} + ${perMember}`,
          totalEarned: sql`${fancoinWallets.totalEarned} + ${perMember}`,
          updatedAt: new Date(),
        })
        .where(eq(fancoinWallets.userId, member.userId))
    }
  }

  return { subscription: sub, priceInCoins }
}

// ── Get User's Guild ──

export async function getUserGuild(userId: string) {
  const [membership] = await db
    .select({
      guildId: guildMembers.guildId,
      role: guildMembers.role,
      totalContributed: guildMembers.totalContributed,
      joinedAt: guildMembers.joinedAt,
    })
    .from(guildMembers)
    .where(eq(guildMembers.userId, userId))
    .limit(1)

  if (!membership) return null

  const guild = await getGuild(membership.guildId)
  return { ...guild, myRole: membership.role, myContributed: membership.totalContributed }
}

// ── Update Guild (Leader Only) ──

export async function updateGuild(
  guildId: string,
  leaderId: string,
  updates: {
    description?: string
    avatarUrl?: string
    coverUrl?: string
    isRecruiting?: boolean
    minCreatorScore?: number
    comboSubscriptionPrice?: number
  },
) {
  const [guild] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1)
  if (!guild) throw new AppError('NOT_FOUND', 'Guilda nao encontrada', 404)
  if (guild.leaderId !== leaderId && guild.coLeaderId !== leaderId) {
    throw new AppError('FORBIDDEN', 'Apenas o lider pode editar a guilda', 403)
  }

  const setClause: Record<string, any> = { updatedAt: new Date() }
  if (updates.description !== undefined) setClause.description = updates.description
  if (updates.avatarUrl !== undefined) setClause.avatarUrl = updates.avatarUrl
  if (updates.coverUrl !== undefined) setClause.coverUrl = updates.coverUrl
  if (updates.isRecruiting !== undefined) setClause.isRecruiting = updates.isRecruiting
  if (updates.minCreatorScore !== undefined) setClause.minCreatorScore = updates.minCreatorScore
  if (updates.comboSubscriptionPrice !== undefined) {
    setClause.comboSubscriptionPrice = String(updates.comboSubscriptionPrice)
  }

  const [updated] = await db
    .update(guilds)
    .set(setClause)
    .where(eq(guilds.id, guildId))
    .returning()

  return updated
}
