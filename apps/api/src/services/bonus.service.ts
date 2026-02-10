import { eq } from 'drizzle-orm'
import { creatorBonuses, creatorProfiles } from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import { getSetting } from './withdrawal.service'
import * as fancoinService from './fancoin.service'

// ── Create bonus for new creator ──

export async function createBonusForCreator(creatorId: string) {
  const enabled = await getSetting<boolean>('creator_bonus_enabled', false)
  if (!enabled) return null

  const bonusCoins = await getSetting<number>('creator_bonus_coins', 1000)
  const requiredSubs = await getSetting<number>('creator_bonus_required_subs', 1)

  // Check if already exists
  const [existing] = await db
    .select()
    .from(creatorBonuses)
    .where(eq(creatorBonuses.creatorId, creatorId))
    .limit(1)

  if (existing) return existing

  const [bonus] = await db
    .insert(creatorBonuses)
    .values({
      creatorId,
      bonusCoins,
      requiredSubscribers: requiredSubs,
      status: 'pending',
    })
    .returning()

  return bonus
}

// ── Check if bonus is claimable (called when creator gets new subscriber) ──

export async function checkBonusEligibility(creatorId: string) {
  const [bonus] = await db
    .select()
    .from(creatorBonuses)
    .where(eq(creatorBonuses.creatorId, creatorId))
    .limit(1)

  if (!bonus || bonus.status !== 'pending') return null

  const [profile] = await db
    .select({ totalSubscribers: creatorProfiles.totalSubscribers })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, creatorId))
    .limit(1)

  if (!profile) return null

  if (profile.totalSubscribers >= bonus.requiredSubscribers) {
    await db
      .update(creatorBonuses)
      .set({ status: 'claimable' })
      .where(eq(creatorBonuses.creatorId, creatorId))

    return { ...bonus, status: 'claimable' as const }
  }

  return bonus
}

// ── Claim the bonus ──

export async function claimBonus(creatorId: string) {
  const [bonus] = await db
    .select()
    .from(creatorBonuses)
    .where(eq(creatorBonuses.creatorId, creatorId))
    .limit(1)

  if (!bonus) throw new AppError('NOT_FOUND', 'Bonus nao encontrado', 404)
  if (bonus.status === 'claimed') throw new AppError('ALREADY_CLAIMED', 'Bonus ja foi resgatado', 409)
  if (bonus.status === 'pending') {
    // Re-check eligibility
    const updated = await checkBonusEligibility(creatorId)
    if (!updated || updated.status !== 'claimable') {
      throw new AppError('NOT_ELIGIBLE', `Voce precisa ter pelo menos ${bonus.requiredSubscribers} assinante(s) para resgatar`, 400)
    }
  }

  // Credit FanCoins — bonus coins are non-withdrawable (added to bonusBalance)
  const wallet = await fancoinService.getWallet(creatorId)
  const newBalance = wallet.balance + bonus.bonusCoins

  const { fancoinWallets, fancoinTransactions } = await import('@fandreams/database')

  await db
    .update(fancoinWallets)
    .set({
      balance: newBalance,
      bonusBalance: wallet.bonusBalance + bonus.bonusCoins,
      totalEarned: wallet.totalEarned + bonus.bonusCoins,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, creatorId))

  await db.insert(fancoinTransactions).values({
    userId: creatorId,
    type: 'bonus_claimed',
    amount: bonus.bonusCoins,
    balanceAfter: newBalance,
    description: `Bonus de boas-vindas: ${bonus.bonusCoins.toLocaleString()} FanCoins (nao sacavel)`,
  })

  await db
    .update(creatorBonuses)
    .set({ status: 'claimed', claimedAt: new Date() })
    .where(eq(creatorBonuses.creatorId, creatorId))

  return { coins: bonus.bonusCoins, newBalance }
}

// ── Get bonus status ──

export async function getBonusStatus(creatorId: string) {
  const [bonus] = await db
    .select()
    .from(creatorBonuses)
    .where(eq(creatorBonuses.creatorId, creatorId))
    .limit(1)

  if (!bonus) return null

  const [profile] = await db
    .select({ totalSubscribers: creatorProfiles.totalSubscribers })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, creatorId))
    .limit(1)

  return {
    ...bonus,
    currentSubscribers: profile?.totalSubscribers || 0,
  }
}
