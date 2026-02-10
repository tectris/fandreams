import { eq, and, sql, lt, desc } from 'drizzle-orm'
import { bonusGrants, fancoinWallets, fancoinTransactions } from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import { getWallet } from './fancoin.service'

// ── Create Bonus Grants ──

type VestingRule = 'never' | 'revenue' | 'time' | 'condition'

interface CreateBonusGrantParams {
  userId: string
  type: string
  totalAmount: number
  vestingRule: VestingRule
  /** For 'revenue' vesting: rate at which revenue unlocks bonus (e.g. 0.04 = 4%) */
  vestingRate?: number
  /** For 'time' vesting: when bonus becomes withdrawable */
  vestingUnlockAt?: Date
  /** For 'condition' vesting: description of the condition */
  vestingCondition?: string
  referenceId?: string
  description?: string
}

export async function createBonusGrant(params: CreateBonusGrantParams) {
  const vestingRevenueRequired =
    params.vestingRule === 'revenue' && params.vestingRate
      ? String(Math.ceil(params.totalAmount / params.vestingRate))
      : null

  const [grant] = await db
    .insert(bonusGrants)
    .values({
      userId: params.userId,
      type: params.type,
      totalAmount: params.totalAmount,
      vestingRule: params.vestingRule,
      vestingRate: params.vestingRate ? String(params.vestingRate) : null,
      vestingRevenueRequired,
      vestingUnlockAt: params.vestingUnlockAt,
      vestingCondition: params.vestingCondition,
      referenceId: params.referenceId,
      description: params.description,
    })
    .returning()

  // Also credit the user's bonusBalance (non-withdrawable until vested)
  await getWallet(params.userId)
  await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${params.totalAmount}`,
      bonusBalance: sql`${fancoinWallets.bonusBalance} + ${params.totalAmount}`,
      totalEarned: sql`${fancoinWallets.totalEarned} + ${params.totalAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, params.userId))

  const [wallet] = await db
    .select({ balance: fancoinWallets.balance })
    .from(fancoinWallets)
    .where(eq(fancoinWallets.userId, params.userId))
    .limit(1)

  await db.insert(fancoinTransactions).values({
    userId: params.userId,
    type: `bonus_${params.type}`,
    amount: params.totalAmount,
    balanceAfter: Number(wallet?.balance ?? 0),
    referenceId: params.referenceId,
    description: params.description || `Bonus: ${params.type} (${params.vestingRule})`,
  })

  return grant
}

// ── Process Revenue-Based Vesting ──

/**
 * Called whenever a creator earns revenue (tips, PPV, subscriptions).
 * Checks active revenue-vesting bonus grants and unlocks proportionally.
 */
export async function processRevenueVesting(userId: string, revenueAmount: number) {
  if (revenueAmount <= 0) return []

  const grants = await db
    .select()
    .from(bonusGrants)
    .where(
      and(
        eq(bonusGrants.userId, userId),
        eq(bonusGrants.vestingRule, 'revenue'),
        eq(bonusGrants.vestingComplete, false),
        eq(bonusGrants.status, 'active'),
      ),
    )

  const results = []

  for (const grant of grants) {
    const rate = Number(grant.vestingRate || 0)
    if (rate <= 0) continue

    const unlockAmount = Math.floor(revenueAmount * rate)
    if (unlockAmount <= 0) continue

    const remaining = Math.max(0, grant.totalAmount - grant.unlockedAmount - grant.spentAmount)
    const actualUnlock = Math.min(unlockAmount, remaining)
    if (actualUnlock <= 0) continue

    const newAccumulated = Number(grant.vestingRevenueAccumulated || 0) + revenueAmount
    const newUnlocked = grant.unlockedAmount + actualUnlock
    const isComplete = newUnlocked >= grant.totalAmount - grant.spentAmount

    await db
      .update(bonusGrants)
      .set({
        unlockedAmount: newUnlocked,
        vestingRevenueAccumulated: String(newAccumulated),
        vestingComplete: isComplete,
        status: isComplete ? 'fully_vested' : 'active',
        updatedAt: new Date(),
      })
      .where(eq(bonusGrants.id, grant.id))

    // Move unlocked amount from bonusBalance to withdrawable
    // (decrease bonusBalance without decreasing balance)
    if (actualUnlock > 0) {
      await db
        .update(fancoinWallets)
        .set({
          bonusBalance: sql`GREATEST(0, ${fancoinWallets.bonusBalance} - ${actualUnlock})`,
          updatedAt: new Date(),
        })
        .where(eq(fancoinWallets.userId, userId))
    }

    results.push({ grantId: grant.id, unlocked: actualUnlock, isComplete })
  }

  return results
}

// ── Process Time-Based Vesting ──

/**
 * Called periodically to check and unlock time-based bonus grants.
 */
export async function processTimeVesting() {
  const now = new Date()

  const grants = await db
    .select()
    .from(bonusGrants)
    .where(
      and(
        eq(bonusGrants.vestingRule, 'time'),
        eq(bonusGrants.vestingComplete, false),
        eq(bonusGrants.status, 'active'),
        lt(bonusGrants.vestingUnlockAt, now),
      ),
    )

  for (const grant of grants) {
    const remaining = Math.max(0, grant.totalAmount - grant.unlockedAmount - grant.spentAmount)
    if (remaining <= 0) continue

    await db
      .update(bonusGrants)
      .set({
        unlockedAmount: Math.max(0, grant.totalAmount - grant.spentAmount),
        vestingComplete: true,
        status: 'fully_vested',
        updatedAt: new Date(),
      })
      .where(eq(bonusGrants.id, grant.id))

    // Move from bonusBalance to withdrawable
    await db
      .update(fancoinWallets)
      .set({
        bonusBalance: sql`GREATEST(0, ${fancoinWallets.bonusBalance} - ${remaining})`,
        updatedAt: new Date(),
      })
      .where(eq(fancoinWallets.userId, grant.userId))
  }

  return grants.length
}

// ── Complete Condition-Based Vesting ──

export async function completeConditionVesting(grantId: string) {
  const [grant] = await db
    .select()
    .from(bonusGrants)
    .where(eq(bonusGrants.id, grantId))
    .limit(1)

  if (!grant) throw new AppError('NOT_FOUND', 'Bonus grant nao encontrado', 404)
  if (grant.vestingComplete) return grant

  const remaining = Math.max(0, grant.totalAmount - grant.unlockedAmount - grant.spentAmount)

  await db
    .update(bonusGrants)
    .set({
      unlockedAmount: Math.max(0, grant.totalAmount - grant.spentAmount),
      vestingComplete: true,
      status: 'fully_vested',
      updatedAt: new Date(),
    })
    .where(eq(bonusGrants.id, grantId))

  if (remaining > 0) {
    await db
      .update(fancoinWallets)
      .set({
        bonusBalance: sql`GREATEST(0, ${fancoinWallets.bonusBalance} - ${remaining})`,
        updatedAt: new Date(),
      })
      .where(eq(fancoinWallets.userId, grant.userId))
  }

  return { ...grant, vestingComplete: true }
}

// ── Get User's Bonus Grants ──

export async function getUserBonusGrants(userId: string) {
  return db
    .select()
    .from(bonusGrants)
    .where(eq(bonusGrants.userId, userId))
    .orderBy(desc(bonusGrants.createdAt))
}
