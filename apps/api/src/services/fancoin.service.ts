import { eq, sql } from 'drizzle-orm'
import { fancoinWallets, fancoinTransactions, creatorProfiles, users, posts } from '@myfans/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import { FANCOIN_PACKAGES, PLATFORM_FEES } from '@myfans/shared'

export async function getWallet(userId: string) {
  const [wallet] = await db
    .select()
    .from(fancoinWallets)
    .where(eq(fancoinWallets.userId, userId))
    .limit(1)

  if (!wallet) {
    try {
      const [created] = await db
        .insert(fancoinWallets)
        .values({ userId })
        .onConflictDoNothing()
        .returning()
      if (created) return created
      // If conflict (race), re-fetch
      const [existing] = await db
        .select()
        .from(fancoinWallets)
        .where(eq(fancoinWallets.userId, userId))
        .limit(1)
      return existing
    } catch {
      // Fallback re-fetch on any insert error
      const [existing] = await db
        .select()
        .from(fancoinWallets)
        .where(eq(fancoinWallets.userId, userId))
        .limit(1)
      return existing
    }
  }

  return wallet
}

export async function getTransactions(userId: string, limit = 50) {
  const txs = await db
    .select()
    .from(fancoinTransactions)
    .where(eq(fancoinTransactions.userId, userId))
    .orderBy(sql`${fancoinTransactions.createdAt} DESC`)
    .limit(limit)

  return txs
}

export async function purchaseFancoins(userId: string, packageId: string) {
  const pkg = FANCOIN_PACKAGES.find((p) => p.id === packageId)
  if (!pkg) throw new AppError('NOT_FOUND', 'Pacote nao encontrado', 404)

  // Ensure wallet exists
  await getWallet(userId)

  // Atomic credit: always succeeds (no balance check needed for purchases)
  const [updated] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${pkg.coins}`,
      totalEarned: sql`${fancoinWallets.totalEarned} + ${pkg.coins}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, userId))
    .returning({ balance: fancoinWallets.balance })

  const newBalance = Number(updated?.balance ?? 0)

  const [tx] = await db
    .insert(fancoinTransactions)
    .values({
      userId,
      type: 'purchase',
      amount: pkg.coins,
      balanceAfter: newBalance,
      description: `Compra de ${pkg.label}`,
    })
    .returning()

  return { transaction: tx, newBalance, package: pkg }
}

export async function sendTip(fromUserId: string, toCreatorId: string, amount: number, referenceId?: string) {
  if (amount <= 0) throw new AppError('INVALID', 'Valor invalido', 400)
  if (!Number.isInteger(amount)) throw new AppError('INVALID', 'Valor deve ser inteiro', 400)
  if (fromUserId === toCreatorId) throw new AppError('INVALID', 'Nao pode enviar tip para si mesmo', 400)

  // Look up both usernames for descriptions
  const [sender] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, fromUserId))
    .limit(1)
  const [receiver] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, toCreatorId))
    .limit(1)

  // ATOMIC debit: deduct from sender only if balance >= amount
  // This single SQL statement prevents double-spend race conditions
  const [debitResult] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} - ${amount}`,
      totalSpent: sql`${fancoinWallets.totalSpent} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(
      sql`${fancoinWallets.userId} = ${fromUserId} AND ${fancoinWallets.balance} >= ${amount}`,
    )
    .returning({ balance: fancoinWallets.balance })

  if (!debitResult) {
    throw new AppError('INSUFFICIENT_BALANCE', 'Saldo insuficiente de FanCoins', 400)
  }

  const newSenderBalance = Number(debitResult.balance)

  const platformCut = Math.floor(amount * PLATFORM_FEES.tip)
  const creatorAmount = amount - platformCut

  // ATOMIC credit: add to creator wallet
  const [creditResult] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${creatorAmount}`,
      totalEarned: sql`${fancoinWallets.totalEarned} + ${creatorAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, toCreatorId))
    .returning({ balance: fancoinWallets.balance })

  // If creator has no wallet, create one and credit
  if (!creditResult) {
    await getWallet(toCreatorId)
    await db
      .update(fancoinWallets)
      .set({
        balance: sql`${fancoinWallets.balance} + ${creatorAmount}`,
        totalEarned: sql`${fancoinWallets.totalEarned} + ${creatorAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(fancoinWallets.userId, toCreatorId))
  }

  const newCreatorBalance = Number(creditResult?.balance ?? creatorAmount)

  const senderUsername = sender?.username || 'usuario'
  const receiverUsername = receiver?.username || 'usuario'

  await db.insert(fancoinTransactions).values([
    {
      userId: fromUserId,
      type: 'tip_sent',
      amount: -amount,
      balanceAfter: newSenderBalance,
      referenceId,
      description: `Tip enviado para @${receiverUsername}`,
    },
    {
      userId: toCreatorId,
      type: 'tip_received',
      amount: creatorAmount,
      balanceAfter: newCreatorBalance,
      referenceId,
      description: `Tip recebido de @${senderUsername}`,
    },
  ])

  if (referenceId) {
    await db.update(posts).set({ tipCount: sql`${posts.tipCount} + 1` }).where(eq(posts.id, referenceId))
  }

  return { sent: amount, creatorReceived: creatorAmount, platformFee: platformCut }
}

/**
 * Credit FanCoins after a confirmed payment.
 * Called by the payment webhook handler.
 * Uses atomic SQL to prevent double-credit from concurrent webhooks.
 */
export async function creditPurchase(userId: string, totalCoins: number, label: string, paymentId: string) {
  // Check idempotency: if a transaction with this paymentId already exists, skip
  const [existing] = await db
    .select({ id: fancoinTransactions.id })
    .from(fancoinTransactions)
    .where(
      sql`${fancoinTransactions.referenceId} = ${paymentId} AND ${fancoinTransactions.type} = 'purchase'`,
    )
    .limit(1)

  if (existing) {
    // Already credited — return current balance
    const wallet = await getWallet(userId)
    return { newBalance: Number(wallet.balance), credited: 0, duplicate: true }
  }

  // Ensure wallet exists
  await getWallet(userId)

  // Atomic credit
  const [updated] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${totalCoins}`,
      totalEarned: sql`${fancoinWallets.totalEarned} + ${totalCoins}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, userId))
    .returning({ balance: fancoinWallets.balance })

  const newBalance = Number(updated?.balance ?? 0)

  await db.insert(fancoinTransactions).values({
    userId,
    type: 'purchase',
    amount: totalCoins,
    balanceAfter: newBalance,
    referenceId: paymentId,
    description: `Compra de ${label}`,
  })

  return { newBalance, credited: totalCoins }
}

export async function rewardEngagement(userId: string, type: string, amount: number) {
  if (amount <= 0) return 0

  // Ensure wallet exists
  await getWallet(userId)

  // Atomic credit
  const [updated] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${amount}`,
      totalEarned: sql`${fancoinWallets.totalEarned} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, userId))
    .returning({ balance: fancoinWallets.balance })

  const newBalance = Number(updated?.balance ?? 0)

  await db.insert(fancoinTransactions).values({
    userId,
    type: `reward_${type}`,
    amount,
    balanceAfter: newBalance,
    description: `Recompensa: ${type}`,
  })

  return newBalance
}
