import { eq, sql, gte, and, count } from 'drizzle-orm'
import { creatorProfiles, posts, users, fancoinTransactions } from '@fandreams/database'
import { db } from '../config/database'
import { CREATOR_SCORE_WEIGHTS } from '@fandreams/shared'

/**
 * Creator Score: 0-100 composite metric based on creator performance.
 * Used for guild eligibility, discovery ranking, and trust signals.
 *
 * Components (weights sum to 1.0):
 * - engagement (0.25): likes, comments, tips per post
 * - consistency (0.20): posting frequency
 * - retention (0.20): subscriber retention
 * - monetization (0.15): earnings growth
 * - responsiveness (0.10): message response rate (placeholder)
 * - quality (0.10): absence of reports
 */

interface ScoreBreakdown {
  engagement: number
  consistency: number
  retention: number
  monetization: number
  responsiveness: number
  quality: number
  total: number
}

export async function calculateCreatorScore(creatorId: string): Promise<ScoreBreakdown> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Fetch all data in parallel
  const [profileData, postStats, recentPosts, earningsData] = await Promise.all([
    // Creator profile
    db
      .select({
        totalSubscribers: creatorProfiles.totalSubscribers,
        totalEarnings: creatorProfiles.totalEarnings,
        createdAt: creatorProfiles.createdAt,
      })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.userId, creatorId))
      .limit(1),

    // Post engagement stats (last 30 days)
    db
      .select({
        totalPosts: count(),
        avgLikes: sql<number>`COALESCE(AVG(${posts.likeCount}), 0)::int`,
        avgComments: sql<number>`COALESCE(AVG(${posts.commentCount}), 0)::int`,
        avgTips: sql<number>`COALESCE(AVG(${posts.tipCount}), 0)::int`,
      })
      .from(posts)
      .where(and(eq(posts.creatorId, creatorId), gte(posts.createdAt, thirtyDaysAgo))),

    // Total recent posts for consistency
    db
      .select({ count: count() })
      .from(posts)
      .where(and(eq(posts.creatorId, creatorId), gte(posts.createdAt, thirtyDaysAgo))),

    // Earnings in last 30 days
    db
      .select({
        totalEarned: sql<number>`COALESCE(SUM(CASE WHEN ${fancoinTransactions.amount} > 0 THEN ${fancoinTransactions.amount} ELSE 0 END), 0)::int`,
      })
      .from(fancoinTransactions)
      .where(
        and(
          eq(fancoinTransactions.userId, creatorId),
          gte(fancoinTransactions.createdAt, thirtyDaysAgo),
          sql`${fancoinTransactions.type} IN ('tip_received', 'ppv_received', 'subscription_earned')`,
        ),
      ),
  ])

  const profile = profileData[0]
  const stats = postStats[0]
  const recent = recentPosts[0]
  const earnings = earningsData[0]

  if (!profile) {
    return { engagement: 0, consistency: 0, retention: 0, monetization: 0, responsiveness: 0, quality: 0, total: 0 }
  }

  // 1. Engagement score (0-100): based on avg interaction per post
  const avgInteractions = (Number(stats?.avgLikes || 0) + Number(stats?.avgComments || 0) * 2 + Number(stats?.avgTips || 0) * 5)
  const engagement = Math.min(100, avgInteractions * 2)

  // 2. Consistency score (0-100): based on posting frequency (target: 1 post/day = 30/month)
  const postCount = Number(recent?.count || 0)
  const consistency = Math.min(100, (postCount / 30) * 100)

  // 3. Retention score (0-100): based on subscriber count relative to account age
  const accountAgeDays = Math.max(1, (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const subsPerMonth = (Number(profile.totalSubscribers || 0) / accountAgeDays) * 30
  const retention = Math.min(100, subsPerMonth * 10)

  // 4. Monetization score (0-100): recent earnings relative to subscriber base
  const monthlyEarnings = Number(earnings?.totalEarned || 0)
  const subs = Math.max(1, Number(profile.totalSubscribers || 1))
  const earningsPerSub = monthlyEarnings / subs
  const monetization = Math.min(100, earningsPerSub / 10)

  // 5. Responsiveness (0-100): placeholder — will integrate with message response tracking later
  const responsiveness = 70 // Default to good until message analytics are available

  // 6. Quality (0-100): placeholder — will integrate with reports tracking later
  const quality = 80 // Default to good until report analytics are available

  const total = Math.round(
    engagement * CREATOR_SCORE_WEIGHTS.engagement +
    consistency * CREATOR_SCORE_WEIGHTS.consistency +
    retention * CREATOR_SCORE_WEIGHTS.retention +
    monetization * CREATOR_SCORE_WEIGHTS.monetization +
    responsiveness * CREATOR_SCORE_WEIGHTS.responsiveness +
    quality * CREATOR_SCORE_WEIGHTS.quality,
  )

  return {
    engagement: Math.round(engagement),
    consistency: Math.round(consistency),
    retention: Math.round(retention),
    monetization: Math.round(monetization),
    responsiveness: Math.round(responsiveness),
    quality: Math.round(quality),
    total: Math.min(100, total),
  }
}

/**
 * Recalculate and persist creator score.
 * Should be called periodically (e.g. daily cron) or after significant events.
 */
export async function updateCreatorScore(creatorId: string) {
  const breakdown = await calculateCreatorScore(creatorId)

  await db
    .update(creatorProfiles)
    .set({
      creatorScore: String(breakdown.total),
      updatedAt: new Date(),
    })
    .where(eq(creatorProfiles.userId, creatorId))

  return breakdown
}

/**
 * Get the current creator score and breakdown for display.
 */
export async function getCreatorScore(creatorId: string) {
  const [profile] = await db
    .select({
      creatorScore: creatorProfiles.creatorScore,
      updatedAt: creatorProfiles.updatedAt,
    })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, creatorId))
    .limit(1)

  const breakdown = await calculateCreatorScore(creatorId)

  return {
    score: breakdown.total,
    storedScore: Number(profile?.creatorScore || 0),
    breakdown,
    lastUpdated: profile?.updatedAt,
  }
}

/**
 * Batch recalculate all creator scores. Call from a periodic job.
 */
export async function recalculateAllScores() {
  const creators = await db
    .select({ userId: creatorProfiles.userId })
    .from(creatorProfiles)

  let updated = 0
  for (const creator of creators) {
    try {
      await updateCreatorScore(creator.userId)
      updated++
    } catch (e) {
      console.error(`Failed to update score for creator ${creator.userId}:`, e)
    }
  }

  return { updated, total: creators.length }
}
