import { eq, and, sql, lt, desc } from 'drizzle-orm'
import { fanCommitments, fancoinWallets, fancoinTransactions } from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import { COMMITMENT_CONFIG } from '@fandreams/shared'
import { getWallet, rewardEngagement } from './fancoin.service'

// ── Create Commitment ──

export async function createCommitment(fanId: string, creatorId: string, amount: number, durationDays: number) {
  if (fanId === creatorId) throw new AppError('INVALID', 'Nao pode se comprometer consigo mesmo', 400)
  if (!Number.isInteger(amount) || amount < COMMITMENT_CONFIG.minAmount) {
    throw new AppError('INVALID_AMOUNT', `Minimo: ${COMMITMENT_CONFIG.minAmount} FanCoins`, 400)
  }
  if (amount > COMMITMENT_CONFIG.maxAmount) {
    throw new AppError('INVALID_AMOUNT', `Maximo: ${COMMITMENT_CONFIG.maxAmount.toLocaleString()} FanCoins`, 400)
  }
  if (!COMMITMENT_CONFIG.durations.includes(durationDays as 30 | 60 | 90)) {
    throw new AppError('INVALID_DURATION', `Duracao deve ser: ${COMMITMENT_CONFIG.durations.join(', ')} dias`, 400)
  }

  // Check existing active commitment to same creator
  const [existing] = await db
    .select({ id: fanCommitments.id })
    .from(fanCommitments)
    .where(
      and(
        eq(fanCommitments.fanId, fanId),
        eq(fanCommitments.creatorId, creatorId),
        eq(fanCommitments.status, 'active'),
      ),
    )
    .limit(1)

  if (existing) {
    throw new AppError('ALREADY_COMMITTED', 'Voce ja tem um compromisso ativo com este criador', 409)
  }

  // ATOMIC debit: lock FanCoins from fan wallet
  const [debitResult] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} - ${amount}`,
      bonusBalance: sql`GREATEST(0, ${fancoinWallets.bonusBalance} - ${amount})`,
      totalSpent: sql`${fancoinWallets.totalSpent} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(
      sql`${fancoinWallets.userId} = ${fanId} AND ${fancoinWallets.balance} >= ${amount}`,
    )
    .returning({ balance: fancoinWallets.balance })

  if (!debitResult) throw new AppError('INSUFFICIENT_BALANCE', 'Saldo insuficiente', 400)

  const startedAt = new Date()
  const endsAt = new Date(startedAt.getTime() + durationDays * 24 * 60 * 60 * 1000)

  const [commitment] = await db
    .insert(fanCommitments)
    .values({
      fanId,
      creatorId,
      amount,
      durationDays,
      startedAt,
      endsAt,
    })
    .returning()

  await db.insert(fancoinTransactions).values({
    userId: fanId,
    type: 'commitment_lock',
    amount: -amount,
    balanceAfter: Number(debitResult.balance),
    referenceId: commitment.id,
    description: `Compromisso: ${amount.toLocaleString()} FanCoins por ${durationDays} dias`,
  })

  return commitment
}

// ── Complete Commitment (at end of period) ──

export async function completeCommitment(commitmentId: string) {
  const [commitment] = await db
    .select()
    .from(fanCommitments)
    .where(eq(fanCommitments.id, commitmentId))
    .limit(1)

  if (!commitment) throw new AppError('NOT_FOUND', 'Compromisso nao encontrado', 404)
  if (commitment.status !== 'active') throw new AppError('NOT_ACTIVE', 'Compromisso nao esta ativo', 400)
  if (new Date() < commitment.endsAt) throw new AppError('NOT_ENDED', 'Compromisso ainda nao encerrou', 400)

  // Return locked FanCoins to fan
  await getWallet(commitment.fanId)
  const [creditResult] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${commitment.amount}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, commitment.fanId))
    .returning({ balance: fancoinWallets.balance })

  // Grant completion bonus (non-withdrawable)
  const bonus = Math.floor(commitment.amount * COMMITMENT_CONFIG.completionBonusRate)

  if (bonus > 0) {
    await db
      .update(fancoinWallets)
      .set({
        balance: sql`${fancoinWallets.balance} + ${bonus}`,
        bonusBalance: sql`${fancoinWallets.bonusBalance} + ${bonus}`,
        totalEarned: sql`${fancoinWallets.totalEarned} + ${bonus}`,
        updatedAt: new Date(),
      })
      .where(eq(fancoinWallets.userId, commitment.fanId))
  }

  const finalBalance = Number(creditResult?.balance ?? 0) + bonus

  await db
    .update(fanCommitments)
    .set({
      status: 'completed',
      bonusGranted: bonus,
    })
    .where(eq(fanCommitments.id, commitmentId))

  await db.insert(fancoinTransactions).values([
    {
      userId: commitment.fanId,
      type: 'commitment_complete',
      amount: commitment.amount,
      balanceAfter: finalBalance - bonus,
      referenceId: commitmentId,
      description: `Compromisso concluido: ${commitment.amount.toLocaleString()} FanCoins devolvidos`,
    },
    ...(bonus > 0
      ? [{
          userId: commitment.fanId,
          type: 'commitment_bonus' as const,
          amount: bonus,
          balanceAfter: finalBalance,
          referenceId: commitmentId,
          description: `Bonus de fidelidade: ${bonus.toLocaleString()} FanCoins (nao sacavel)`,
        }]
      : []),
  ])

  return { completed: true, refunded: commitment.amount, bonus, finalBalance }
}

// ── Early Withdrawal ──

export async function withdrawCommitmentEarly(commitmentId: string, fanId: string) {
  const [commitment] = await db
    .select()
    .from(fanCommitments)
    .where(and(eq(fanCommitments.id, commitmentId), eq(fanCommitments.fanId, fanId)))
    .limit(1)

  if (!commitment) throw new AppError('NOT_FOUND', 'Compromisso nao encontrado', 404)
  if (commitment.status !== 'active') throw new AppError('NOT_ACTIVE', 'Compromisso nao esta ativo', 400)

  // Early withdrawal penalty: 10% of locked amount
  const penalty = Math.floor(commitment.amount * COMMITMENT_CONFIG.earlyWithdrawalPenalty)
  const refundAmount = commitment.amount - penalty

  await getWallet(fanId)
  const [creditResult] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${refundAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, fanId))
    .returning({ balance: fancoinWallets.balance })

  await db
    .update(fanCommitments)
    .set({
      status: 'withdrawn_early',
      withdrawnAt: new Date(),
    })
    .where(eq(fanCommitments.id, commitmentId))

  const newBalance = Number(creditResult?.balance ?? 0)

  await db.insert(fancoinTransactions).values({
    userId: fanId,
    type: 'commitment_early_withdraw',
    amount: refundAmount,
    balanceAfter: newBalance,
    referenceId: commitmentId,
    description: `Retirada antecipada: ${refundAmount.toLocaleString()} FanCoins (penalidade: ${penalty.toLocaleString()})`,
  })

  return { refunded: refundAmount, penalty, newBalance }
}

// ── Get Commitments ──

export async function getMyCommitments(fanId: string) {
  return db
    .select({
      commitment: fanCommitments,
      creatorUsername: users.username,
      creatorDisplayName: users.displayName,
      creatorAvatarUrl: users.avatarUrl,
    })
    .from(fanCommitments)
    .innerJoin(users, eq(fanCommitments.creatorId, users.id))
    .where(eq(fanCommitments.fanId, fanId))
    .orderBy(desc(fanCommitments.createdAt))
}

export async function getCommitmentsForCreator(creatorId: string) {
  return db
    .select({
      commitment: fanCommitments,
      fanUsername: users.username,
      fanDisplayName: users.displayName,
    })
    .from(fanCommitments)
    .innerJoin(users, eq(fanCommitments.fanId, users.id))
    .where(and(eq(fanCommitments.creatorId, creatorId), eq(fanCommitments.status, 'active')))
    .orderBy(desc(fanCommitments.createdAt))
}

// ── Auto-complete expired commitments ──

export async function completeExpiredCommitments() {
  const now = new Date()

  const expired = await db
    .select({ id: fanCommitments.id })
    .from(fanCommitments)
    .where(
      and(
        eq(fanCommitments.status, 'active'),
        lt(fanCommitments.endsAt, now),
      ),
    )

  let completed = 0
  for (const commitment of expired) {
    try {
      await completeCommitment(commitment.id)
      completed++
    } catch (e) {
      console.error(`Failed to complete commitment ${commitment.id}:`, e)
    }
  }

  return { completed, total: expired.length }
}
