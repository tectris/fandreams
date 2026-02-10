import { eq, and, sql, desc, count, gte } from 'drizzle-orm'
import {
  pitchCampaigns, pitchContributions, pitchUpdates,
  creatorProfiles, users, fancoinWallets, fancoinTransactions,
} from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import { PITCH_CONFIG, ECOSYSTEM_FUND_RATE } from '@fandreams/shared'
import { getWallet } from './fancoin.service'

// ── Campaign CRUD ──

interface CreateCampaignParams {
  creatorId: string
  title: string
  description: string
  coverImageUrl?: string
  category?: string
  goalAmount: number
  durationDays?: number
  deliveryDeadlineDays?: number
  rewardTiers?: Array<{ amount: number; title: string; description: string }>
}

export async function createCampaign(params: CreateCampaignParams) {
  // Verify creator
  const [profile] = await db
    .select({ userId: creatorProfiles.userId })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, params.creatorId))
    .limit(1)

  if (!profile) throw new AppError('NOT_CREATOR', 'Apenas criadores podem criar campanhas', 403)

  if (params.goalAmount < PITCH_CONFIG.minGoal || params.goalAmount > PITCH_CONFIG.maxGoal) {
    throw new AppError('INVALID_GOAL', `Meta deve ser entre ${PITCH_CONFIG.minGoal} e ${PITCH_CONFIG.maxGoal.toLocaleString()} FanCoins`, 400)
  }

  const durationDays = params.durationDays || PITCH_CONFIG.defaultDurationDays
  if (durationDays < PITCH_CONFIG.minDurationDays || durationDays > PITCH_CONFIG.maxDurationDays) {
    throw new AppError('INVALID_DURATION', `Duracao deve ser entre ${PITCH_CONFIG.minDurationDays} e ${PITCH_CONFIG.maxDurationDays} dias`, 400)
  }

  if (params.rewardTiers && params.rewardTiers.length > PITCH_CONFIG.maxRewardTiers) {
    throw new AppError('TOO_MANY_TIERS', `Maximo de ${PITCH_CONFIG.maxRewardTiers} tiers de recompensa`, 400)
  }

  const endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)

  const [campaign] = await db
    .insert(pitchCampaigns)
    .values({
      creatorId: params.creatorId,
      title: params.title,
      description: params.description,
      coverImageUrl: params.coverImageUrl,
      category: params.category,
      goalAmount: params.goalAmount,
      durationDays,
      endsAt,
      deliveryDeadlineDays: params.deliveryDeadlineDays || PITCH_CONFIG.deliveryDeadlineDays,
      rewardTiers: params.rewardTiers || [],
      status: 'active',
    })
    .returning()

  return campaign
}

export async function getCampaign(campaignId: string) {
  const [campaign] = await db
    .select()
    .from(pitchCampaigns)
    .where(eq(pitchCampaigns.id, campaignId))
    .limit(1)

  if (!campaign) throw new AppError('NOT_FOUND', 'Campanha nao encontrada', 404)

  const [creator] = await db
    .select({
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, campaign.creatorId))
    .limit(1)

  const updates = await db
    .select()
    .from(pitchUpdates)
    .where(eq(pitchUpdates.campaignId, campaignId))
    .orderBy(desc(pitchUpdates.createdAt))

  return { ...campaign, creator, updates }
}

export async function listCampaigns(page = 1, limit = 20, status?: string, category?: string) {
  const offset = (page - 1) * limit
  const conditions = []

  if (status) conditions.push(eq(pitchCampaigns.status, status))
  if (category) conditions.push(eq(pitchCampaigns.category, category))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const items = await db
    .select({
      id: pitchCampaigns.id,
      title: pitchCampaigns.title,
      description: pitchCampaigns.description,
      coverImageUrl: pitchCampaigns.coverImageUrl,
      category: pitchCampaigns.category,
      goalAmount: pitchCampaigns.goalAmount,
      raisedAmount: pitchCampaigns.raisedAmount,
      totalContributors: pitchCampaigns.totalContributors,
      status: pitchCampaigns.status,
      endsAt: pitchCampaigns.endsAt,
      averageRating: pitchCampaigns.averageRating,
      createdAt: pitchCampaigns.createdAt,
      creatorUsername: users.username,
      creatorDisplayName: users.displayName,
      creatorAvatarUrl: users.avatarUrl,
    })
    .from(pitchCampaigns)
    .innerJoin(users, eq(pitchCampaigns.creatorId, users.id))
    .where(whereClause)
    .orderBy(desc(pitchCampaigns.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db
    .select({ count: count() })
    .from(pitchCampaigns)
    .where(whereClause)

  return { items, total: totalResult?.count || 0, page, limit }
}

// ── Contributions ──

export async function contributeToCampaign(campaignId: string, userId: string, amount: number, rewardTierIndex?: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppError('INVALID_AMOUNT', 'Valor deve ser um numero inteiro positivo', 400)
  }

  const [campaign] = await db
    .select()
    .from(pitchCampaigns)
    .where(eq(pitchCampaigns.id, campaignId))
    .limit(1)

  if (!campaign) throw new AppError('NOT_FOUND', 'Campanha nao encontrada', 404)
  if (campaign.status !== 'active') throw new AppError('NOT_ACTIVE', 'Campanha nao esta ativa', 400)
  if (campaign.endsAt && new Date() > campaign.endsAt) {
    throw new AppError('CAMPAIGN_ENDED', 'Campanha encerrada', 400)
  }
  if (campaign.creatorId === userId) {
    throw new AppError('SELF_CONTRIBUTION', 'Criador nao pode contribuir para propria campanha', 400)
  }

  // Validate reward tier
  const tiers = campaign.rewardTiers as Array<{ amount: number; title: string; description: string }>
  if (rewardTierIndex !== undefined && rewardTierIndex !== null) {
    if (rewardTierIndex < 0 || rewardTierIndex >= tiers.length) {
      throw new AppError('INVALID_TIER', 'Tier de recompensa invalido', 400)
    }
    const tier = tiers[rewardTierIndex]
    if (tier && amount < tier.amount) {
      throw new AppError('BELOW_TIER_MIN', `Contribuicao minima para este tier: ${tier.amount} FanCoins`, 400)
    }
  }

  // ATOMIC debit from contributor (bonusBalance consumed first)
  const [debitResult] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} - ${amount}`,
      bonusBalance: sql`GREATEST(0, ${fancoinWallets.bonusBalance} - ${amount})`,
      totalSpent: sql`${fancoinWallets.totalSpent} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(
      sql`${fancoinWallets.userId} = ${userId} AND ${fancoinWallets.balance} >= ${amount}`,
    )
    .returning({ balance: fancoinWallets.balance })

  if (!debitResult) throw new AppError('INSUFFICIENT_BALANCE', 'Saldo insuficiente', 400)

  // Platform fee on contributions
  const platformCut = Math.floor(amount * PITCH_CONFIG.platformFeeRate)
  const ecosystemCut = Math.floor(amount * ECOSYSTEM_FUND_RATE)
  const creatorReceives = amount - platformCut - ecosystemCut

  // Credit creator wallet
  await getWallet(campaign.creatorId)
  await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${creatorReceives}`,
      totalEarned: sql`${fancoinWallets.totalEarned} + ${creatorReceives}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, campaign.creatorId))

  // Record contribution
  const [contribution] = await db
    .insert(pitchContributions)
    .values({
      campaignId,
      userId,
      amount,
      rewardTierIndex,
    })
    .returning()

  // Update campaign stats
  const newRaised = campaign.raisedAmount + amount
  const newStatus = newRaised >= campaign.goalAmount ? 'funded' : 'active'

  await db
    .update(pitchCampaigns)
    .set({
      raisedAmount: newRaised,
      totalContributors: sql`${pitchCampaigns.totalContributors} + 1`,
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(pitchCampaigns.id, campaignId))

  // Transactions
  const [sender] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1)

  await db.insert(fancoinTransactions).values([
    {
      userId,
      type: 'pitch_contribution',
      amount: -amount,
      balanceAfter: Number(debitResult.balance),
      referenceId: campaignId,
      description: `Contribuicao para "${campaign.title}"`,
    },
    {
      userId: campaign.creatorId,
      type: 'pitch_received',
      amount: creatorReceives,
      balanceAfter: 0, // placeholder
      referenceId: campaignId,
      description: `Contribuicao recebida de @${sender?.username || 'usuario'} para "${campaign.title}"`,
    },
  ])

  return {
    contribution,
    sent: amount,
    creatorReceives,
    platformFee: platformCut,
    campaignProgress: Math.round((newRaised / campaign.goalAmount) * 100),
    isFunded: newStatus === 'funded',
  }
}

// ── Campaign Updates ──

export async function postCampaignUpdate(campaignId: string, creatorId: string, title: string, content: string) {
  const [campaign] = await db
    .select()
    .from(pitchCampaigns)
    .where(eq(pitchCampaigns.id, campaignId))
    .limit(1)

  if (!campaign) throw new AppError('NOT_FOUND', 'Campanha nao encontrada', 404)
  if (campaign.creatorId !== creatorId) throw new AppError('FORBIDDEN', 'Apenas o criador pode postar updates', 403)

  const [update] = await db
    .insert(pitchUpdates)
    .values({ campaignId, title, content })
    .returning()

  return update
}

// ── Refunds (for failed campaigns) ──

export async function refundCampaign(campaignId: string) {
  const [campaign] = await db
    .select()
    .from(pitchCampaigns)
    .where(eq(pitchCampaigns.id, campaignId))
    .limit(1)

  if (!campaign) throw new AppError('NOT_FOUND', 'Campanha nao encontrada', 404)

  // Only refund active campaigns that ended without meeting goal
  if (campaign.status !== 'active' && campaign.status !== 'failed') {
    throw new AppError('INVALID_STATUS', 'Campanha nao pode ser reembolsada neste status', 400)
  }

  const contributions = await db
    .select()
    .from(pitchContributions)
    .where(and(eq(pitchContributions.campaignId, campaignId), eq(pitchContributions.status, 'active')))

  for (const contrib of contributions) {
    // Refund each contributor
    await getWallet(contrib.userId)
    await db
      .update(fancoinWallets)
      .set({
        balance: sql`${fancoinWallets.balance} + ${contrib.amount}`,
        totalSpent: sql`${fancoinWallets.totalSpent} - ${contrib.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(fancoinWallets.userId, contrib.userId))

    await db
      .update(pitchContributions)
      .set({ status: 'refunded', refundedAt: new Date() })
      .where(eq(pitchContributions.id, contrib.id))

    const [wallet] = await db
      .select({ balance: fancoinWallets.balance })
      .from(fancoinWallets)
      .where(eq(fancoinWallets.userId, contrib.userId))
      .limit(1)

    await db.insert(fancoinTransactions).values({
      userId: contrib.userId,
      type: 'pitch_refund',
      amount: contrib.amount,
      balanceAfter: Number(wallet?.balance ?? 0),
      referenceId: campaignId,
      description: `Reembolso campanha "${campaign.title}"`,
    })
  }

  await db
    .update(pitchCampaigns)
    .set({ status: 'failed', updatedAt: new Date() })
    .where(eq(pitchCampaigns.id, campaignId))

  return { refunded: contributions.length }
}

// ── Rating ──

export async function rateCampaign(campaignId: string, userId: string, rating: number, comment?: string) {
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new AppError('INVALID_RATING', 'Rating deve ser de 1 a 5', 400)
  }

  const [campaign] = await db
    .select()
    .from(pitchCampaigns)
    .where(eq(pitchCampaigns.id, campaignId))
    .limit(1)

  if (!campaign) throw new AppError('NOT_FOUND', 'Campanha nao encontrada', 404)
  if (campaign.status !== 'delivered' && campaign.status !== 'funded') {
    throw new AppError('NOT_DELIVERED', 'Campanha ainda nao foi entregue', 400)
  }

  // Only contributors can rate
  const [contribution] = await db
    .select()
    .from(pitchContributions)
    .where(
      and(
        eq(pitchContributions.campaignId, campaignId),
        eq(pitchContributions.userId, userId),
        eq(pitchContributions.status, 'active'),
      ),
    )
    .limit(1)

  if (!contribution) throw new AppError('NOT_CONTRIBUTOR', 'Apenas contribuidores podem avaliar', 403)
  if (contribution.rating) throw new AppError('ALREADY_RATED', 'Voce ja avaliou esta campanha', 409)

  await db
    .update(pitchContributions)
    .set({ rating, ratingComment: comment })
    .where(eq(pitchContributions.id, contribution.id))

  // Recalculate average rating
  const newTotalRatings = campaign.totalRatings + 1
  const currentAvg = Number(campaign.averageRating || 0)
  const newAvg = ((currentAvg * campaign.totalRatings) + rating) / newTotalRatings

  await db
    .update(pitchCampaigns)
    .set({
      averageRating: String(Math.round(newAvg * 100) / 100),
      totalRatings: newTotalRatings,
      updatedAt: new Date(),
    })
    .where(eq(pitchCampaigns.id, campaignId))

  return { rating, newAverageRating: newAvg }
}

// ── Get My Contributions ──

export async function getUserContributions(userId: string) {
  return db
    .select({
      contribution: pitchContributions,
      campaignTitle: pitchCampaigns.title,
      campaignStatus: pitchCampaigns.status,
      campaignGoal: pitchCampaigns.goalAmount,
      campaignRaised: pitchCampaigns.raisedAmount,
      creatorUsername: users.username,
    })
    .from(pitchContributions)
    .innerJoin(pitchCampaigns, eq(pitchContributions.campaignId, pitchCampaigns.id))
    .innerJoin(users, eq(pitchCampaigns.creatorId, users.id))
    .where(eq(pitchContributions.userId, userId))
    .orderBy(desc(pitchContributions.createdAt))
}

// ── Expire Campaigns ──

export async function expireEndedCampaigns() {
  const now = new Date()

  // Find active campaigns past their end date that didn't meet goal
  const expired = await db
    .select({ id: pitchCampaigns.id })
    .from(pitchCampaigns)
    .where(
      and(
        eq(pitchCampaigns.status, 'active'),
        sql`${pitchCampaigns.endsAt} IS NOT NULL AND ${pitchCampaigns.endsAt} < ${now}`,
        sql`${pitchCampaigns.raisedAmount} < ${pitchCampaigns.goalAmount}`,
      ),
    )

  for (const campaign of expired) {
    try {
      await refundCampaign(campaign.id)
    } catch (e) {
      console.error(`Failed to refund expired campaign ${campaign.id}:`, e)
    }
  }

  return { expired: expired.length }
}
