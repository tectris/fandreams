import { eq, and, sql, desc } from 'drizzle-orm'
import {
  affiliatePrograms,
  affiliateLevels,
  affiliateLinks,
  affiliateReferrals,
  affiliateCommissions,
  users,
} from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import * as fancoinService from './fancoin.service'
import { brlToFancoins } from './withdrawal.service'

// ── Affiliate Program (Creator) ──

export async function getProgram(creatorId: string) {
  const [program] = await db
    .select()
    .from(affiliatePrograms)
    .where(eq(affiliatePrograms.creatorId, creatorId))
    .limit(1)

  if (!program) return null

  const levels = await db
    .select()
    .from(affiliateLevels)
    .where(eq(affiliateLevels.creatorId, creatorId))
    .orderBy(affiliateLevels.level)

  return { ...program, levels }
}

export async function upsertProgram(
  creatorId: string,
  params: { isActive: boolean; levels: Array<{ level: number; commissionPercent: number }> },
) {
  // Validate: max 2 levels, each between 1-50%
  if (params.levels.length > 2) throw new AppError('INVALID', 'Maximo 2 niveis de afiliados', 400)
  for (const l of params.levels) {
    if (l.commissionPercent < 1 || l.commissionPercent > 50) {
      throw new AppError('INVALID', `Comissao nivel ${l.level} deve ser entre 1% e 50%`, 400)
    }
  }

  // Total affiliate commission cannot exceed 50% of creator's share
  const totalPercent = params.levels.reduce((sum, l) => sum + l.commissionPercent, 0)
  if (totalPercent > 50) {
    throw new AppError('INVALID', 'Total de comissoes de afiliados nao pode ultrapassar 50%', 400)
  }

  // Upsert program
  await db
    .insert(affiliatePrograms)
    .values({
      creatorId,
      isActive: params.isActive,
      maxLevels: params.levels.length,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: affiliatePrograms.creatorId,
      set: {
        isActive: params.isActive,
        maxLevels: params.levels.length,
        updatedAt: new Date(),
      },
    })

  // Delete old levels and insert new ones
  await db.delete(affiliateLevels).where(eq(affiliateLevels.creatorId, creatorId))
  if (params.levels.length > 0) {
    await db.insert(affiliateLevels).values(
      params.levels.map((l) => ({
        creatorId,
        level: l.level,
        commissionPercent: String(l.commissionPercent),
      })),
    )
  }

  return getProgram(creatorId)
}

// ── Affiliate Links ──

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function createLink(affiliateUserId: string, creatorId: string) {
  // Cannot be affiliate of yourself
  if (affiliateUserId === creatorId) {
    throw new AppError('INVALID', 'Voce nao pode ser afiliado de si mesmo', 400)
  }

  // Check program exists and is active
  const program = await getProgram(creatorId)
  if (!program || !program.isActive) {
    throw new AppError('NOT_FOUND', 'Este criador nao tem programa de afiliados ativo', 404)
  }

  // Check if link already exists
  const [existing] = await db
    .select()
    .from(affiliateLinks)
    .where(and(eq(affiliateLinks.affiliateUserId, affiliateUserId), eq(affiliateLinks.creatorId, creatorId)))
    .limit(1)

  if (existing) return existing

  // Generate unique code
  let code = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const [dup] = await db.select({ id: affiliateLinks.id }).from(affiliateLinks).where(eq(affiliateLinks.code, code)).limit(1)
    if (!dup) break
    code = generateCode()
    attempts++
  }

  const [link] = await db
    .insert(affiliateLinks)
    .values({ affiliateUserId, creatorId, code })
    .returning()

  return link
}

export async function getMyLinks(affiliateUserId: string) {
  return db
    .select({
      id: affiliateLinks.id,
      affiliateUserId: affiliateLinks.affiliateUserId,
      creatorId: affiliateLinks.creatorId,
      code: affiliateLinks.code,
      clicks: affiliateLinks.clicks,
      conversions: affiliateLinks.conversions,
      totalEarned: affiliateLinks.totalEarned,
      createdAt: affiliateLinks.createdAt,
      creatorUsername: users.username,
      creatorDisplayName: users.displayName,
      creatorAvatarUrl: users.avatarUrl,
    })
    .from(affiliateLinks)
    .leftJoin(users, eq(affiliateLinks.creatorId, users.id))
    .where(eq(affiliateLinks.affiliateUserId, affiliateUserId))
    .orderBy(desc(affiliateLinks.createdAt))
}

export async function getProgramByUsername(username: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (!user) return null

  return getProgram(user.id)
}

export async function trackClick(code: string) {
  await db
    .update(affiliateLinks)
    .set({ clicks: sql`${affiliateLinks.clicks} + 1` })
    .where(eq(affiliateLinks.code, code))
}

// ── Referral Registration ──

export async function registerReferral(referredUserId: string, creatorId: string, refCode: string) {
  // Find the affiliate link
  const [link] = await db
    .select()
    .from(affiliateLinks)
    .where(eq(affiliateLinks.code, refCode))
    .limit(1)

  if (!link || link.creatorId !== creatorId) return null

  // Cannot refer yourself
  if (link.affiliateUserId === referredUserId) return null

  // Check if already referred
  const [existing] = await db
    .select({ id: affiliateReferrals.id })
    .from(affiliateReferrals)
    .where(and(eq(affiliateReferrals.referredUserId, referredUserId), eq(affiliateReferrals.creatorId, creatorId)))
    .limit(1)

  if (existing) return null

  // Check for L2: was this affiliate (L1) themselves recruited by someone for this creator?
  let l2AffiliateId: string | null = null
  const [l1AsReferred] = await db
    .select({ l1AffiliateId: affiliateReferrals.l1AffiliateId })
    .from(affiliateReferrals)
    .where(
      and(
        eq(affiliateReferrals.referredUserId, link.affiliateUserId),
        eq(affiliateReferrals.creatorId, creatorId),
      ),
    )
    .limit(1)

  if (l1AsReferred) {
    l2AffiliateId = l1AsReferred.l1AffiliateId
  }

  const [referral] = await db
    .insert(affiliateReferrals)
    .values({
      referredUserId,
      creatorId,
      l1AffiliateId: link.affiliateUserId,
      l2AffiliateId,
      linkId: link.id,
    })
    .returning()

  // Increment conversions on the link
  await db
    .update(affiliateLinks)
    .set({ conversions: sql`${affiliateLinks.conversions} + 1` })
    .where(eq(affiliateLinks.id, link.id))

  return referral
}

// ── Commission Distribution ──
// Called after a payment is confirmed. Returns the total affiliate commission in BRL.
// The commission is deducted from creatorGross (after platform fee).

export async function distributeCommissions(
  paymentId: string,
  buyerUserId: string,
  creatorId: string,
  creatorGrossBrl: number,
): Promise<{ totalCommissionBrl: number; distributions: Array<{ userId: string; level: number; amountBrl: number; coins: number }> }> {
  const distributions: Array<{ userId: string; level: number; amountBrl: number; coins: number }> = []

  // Check if buyer was referred to this creator
  const [referral] = await db
    .select()
    .from(affiliateReferrals)
    .where(
      and(
        eq(affiliateReferrals.referredUserId, buyerUserId),
        eq(affiliateReferrals.creatorId, creatorId),
      ),
    )
    .limit(1)

  if (!referral) return { totalCommissionBrl: 0, distributions }

  // Get creator's affiliate program
  const program = await getProgram(creatorId)
  if (!program || !program.isActive || program.levels.length === 0) {
    return { totalCommissionBrl: 0, distributions }
  }

  let totalCommissionBrl = 0

  // L1 Commission (direct referrer)
  const l1Level = program.levels.find((l) => l.level === 1)
  if (l1Level && referral.l1AffiliateId) {
    const l1Percent = Number(l1Level.commissionPercent)
    const l1Brl = Math.round(creatorGrossBrl * (l1Percent / 100) * 100) / 100
    const l1Coins = await brlToFancoins(l1Brl)

    if (l1Coins > 0) {
      // Credit FanCoins to L1 affiliate
      await fancoinService.creditEarnings(
        referral.l1AffiliateId,
        l1Brl,
        'affiliate_commission' as any,
        `Comissao L1 (${l1Percent}%) - afiliado`,
        paymentId,
      )

      // Record commission
      await db.insert(affiliateCommissions).values({
        affiliateUserId: referral.l1AffiliateId,
        creatorId,
        paymentId,
        level: 1,
        commissionPercent: l1Level.commissionPercent,
        amountBrl: String(l1Brl),
        coinsCredit: l1Coins,
      })

      // Update link total earned
      if (referral.linkId) {
        await db
          .update(affiliateLinks)
          .set({ totalEarned: sql`${affiliateLinks.totalEarned} + ${l1Brl}` })
          .where(eq(affiliateLinks.id, referral.linkId))
      }

      totalCommissionBrl += l1Brl
      distributions.push({ userId: referral.l1AffiliateId, level: 1, amountBrl: l1Brl, coins: l1Coins })
    }
  }

  // L2 Commission (recruiter of L1)
  const l2Level = program.levels.find((l) => l.level === 2)
  if (l2Level && referral.l2AffiliateId) {
    const l2Percent = Number(l2Level.commissionPercent)
    const l2Brl = Math.round(creatorGrossBrl * (l2Percent / 100) * 100) / 100
    const l2Coins = await brlToFancoins(l2Brl)

    if (l2Coins > 0) {
      await fancoinService.creditEarnings(
        referral.l2AffiliateId,
        l2Brl,
        'affiliate_commission' as any,
        `Comissao L2 (${l2Percent}%) - afiliado`,
        paymentId,
      )

      await db.insert(affiliateCommissions).values({
        affiliateUserId: referral.l2AffiliateId,
        creatorId,
        paymentId,
        level: 2,
        commissionPercent: l2Level.commissionPercent,
        amountBrl: String(l2Brl),
        coinsCredit: l2Coins,
      })

      totalCommissionBrl += l2Brl
      distributions.push({ userId: referral.l2AffiliateId, level: 2, amountBrl: l2Brl, coins: l2Coins })
    }
  }

  return { totalCommissionBrl, distributions }
}

// ── Affiliate Dashboard ──

export async function getAffiliateDashboard(userId: string) {
  const links = await getMyLinks(userId)

  const commissions = await db
    .select()
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.affiliateUserId, userId))
    .orderBy(desc(affiliateCommissions.createdAt))
    .limit(50)

  const totalEarned = commissions.reduce((sum, c) => sum + Number(c.amountBrl), 0)
  const totalCoins = commissions.reduce((sum, c) => sum + c.coinsCredit, 0)
  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0)
  const totalConversions = links.reduce((sum, l) => sum + l.conversions, 0)

  return {
    links,
    commissions,
    stats: { totalEarned, totalCoins, totalClicks, totalConversions, totalLinks: links.length },
  }
}

// ── Creator Affiliate Stats ──

export async function getCreatorAffiliateStats(creatorId: string) {
  const program = await getProgram(creatorId)

  const referrals = await db
    .select()
    .from(affiliateReferrals)
    .where(eq(affiliateReferrals.creatorId, creatorId))

  const commissions = await db
    .select()
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.creatorId, creatorId))
    .orderBy(desc(affiliateCommissions.createdAt))
    .limit(50)

  const totalPaid = commissions.reduce((sum, c) => sum + Number(c.amountBrl), 0)

  return {
    program,
    totalReferrals: referrals.length,
    totalCommissionsPaid: totalPaid,
    recentCommissions: commissions,
  }
}
