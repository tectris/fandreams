import { eq, and, sql } from 'drizzle-orm'
import { fancoinWallets, fancoinTransactions, creatorProfiles, users, posts, payments } from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import { FANCOIN_PACKAGES } from '@fandreams/shared'
import { getPlatformFeeRate, brlToFancoins } from './withdrawal.service'

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

  // Atomic credit: all purchased coins are non-withdrawable (bonusBalance)
  const [updated] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${pkg.coins}`,
      bonusBalance: sql`${fancoinWallets.bonusBalance} + ${pkg.coins}`,
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
  // Consume bonusBalance first (non-withdrawable coins are spent before withdrawable ones)
  const [debitResult] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} - ${amount}`,
      bonusBalance: sql`GREATEST(0, ${fancoinWallets.bonusBalance} - ${amount})`,
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

  const feeRate = await getPlatformFeeRate()
  const platformCut = Math.floor(amount * feeRate)
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
 *
 * All purchased FanCoins (base + bonus) are non-withdrawable (bonusBalance).
 * They can be spent on tips, PPV, etc. but never withdrawn as cash.
 * Only coins earned from other users (tips, PPV, subscriptions) are withdrawable.
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

  // Atomic credit: all purchased coins go to both balance AND bonusBalance (non-withdrawable)
  const [updated] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${totalCoins}`,
      bonusBalance: sql`${fancoinWallets.bonusBalance} + ${totalCoins}`,
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

export async function unlockPpv(userId: string, postId: string) {
  // Get post info
  const [post] = await db
    .select({ id: posts.id, creatorId: posts.creatorId, ppvPrice: posts.ppvPrice, visibility: posts.visibility })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  if (!post) throw new AppError('NOT_FOUND', 'Post nao encontrado', 404)
  if (post.visibility !== 'ppv' || !post.ppvPrice) {
    throw new AppError('INVALID', 'Este post nao e PPV', 400)
  }
  if (post.creatorId === userId) {
    throw new AppError('INVALID', 'Voce ja tem acesso a este post', 400)
  }

  // Check if already unlocked
  const [existing] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.type, 'ppv'),
        eq(payments.status, 'completed'),
        sql`${payments.metadata}->>'postId' = ${postId}`,
      ),
    )
    .limit(1)

  if (existing) throw new AppError('ALREADY_UNLOCKED', 'Voce ja desbloqueou este post', 409)

  // Convert ppvPrice (BRL) to FanCoins using dynamic rate
  const priceInCoins = await brlToFancoins(Number(post.ppvPrice))

  const ppvFeeRate = await getPlatformFeeRate()
  const platformCut = Math.floor(priceInCoins * ppvFeeRate)
  const creatorAmount = priceInCoins - platformCut

  // ATOMIC debit from buyer: prevents race condition / double-unlock
  // Consume bonusBalance first (non-withdrawable coins are spent before withdrawable ones)
  const [debitResult] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} - ${priceInCoins}`,
      bonusBalance: sql`GREATEST(0, ${fancoinWallets.bonusBalance} - ${priceInCoins})`,
      totalSpent: sql`${fancoinWallets.totalSpent} + ${priceInCoins}`,
      updatedAt: new Date(),
    })
    .where(
      sql`${fancoinWallets.userId} = ${userId} AND ${fancoinWallets.balance} >= ${priceInCoins}`,
    )
    .returning({ balance: fancoinWallets.balance })

  if (!debitResult) {
    throw new AppError('INSUFFICIENT_BALANCE', 'Saldo insuficiente de FanCoins', 400)
  }

  const newBalance = Number(debitResult.balance)

  // ATOMIC credit to creator
  await getWallet(post.creatorId)
  const [creditResult] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${creatorAmount}`,
      totalEarned: sql`${fancoinWallets.totalEarned} + ${creatorAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, post.creatorId))
    .returning({ balance: fancoinWallets.balance })

  const newCreatorBalance = Number(creditResult?.balance ?? creatorAmount)

  // FanCoin transactions
  const [sender] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1)
  const [creator] = await db.select({ username: users.username }).from(users).where(eq(users.id, post.creatorId)).limit(1)

  await db.insert(fancoinTransactions).values([
    {
      userId,
      type: 'ppv_unlock',
      amount: -priceInCoins,
      balanceAfter: newBalance,
      referenceId: postId,
      description: `Desbloqueio PPV - post de @${creator?.username || 'criador'}`,
    },
    {
      userId: post.creatorId,
      type: 'ppv_received',
      amount: creatorAmount,
      balanceAfter: newCreatorBalance,
      referenceId: postId,
      description: `PPV recebido de @${sender?.username || 'usuario'}`,
    },
  ])

  // Record in payments table for access tracking
  const ppvBrlFee = Number(post.ppvPrice) * ppvFeeRate
  await db.insert(payments).values({
    userId,
    recipientId: post.creatorId,
    type: 'ppv',
    amount: post.ppvPrice,
    platformFee: String(ppvBrlFee),
    creatorAmount: String(Number(post.ppvPrice) - ppvBrlFee),
    paymentProvider: 'fancoins',
    status: 'completed',
    metadata: { postId, method: 'fancoins', fancoinsSpent: priceInCoins },
  })

  // Update creator earnings
  const creatorAmountBrl = Number(post.ppvPrice) - ppvBrlFee
  await db
    .update(creatorProfiles)
    .set({ totalEarnings: sql`${creatorProfiles.totalEarnings} + ${creatorAmountBrl}` })
    .where(eq(creatorProfiles.userId, post.creatorId))

  return { unlocked: true, fancoinsSpent: priceInCoins, newBalance }
}

/**
 * Credit creator earnings as FanCoins from external payments (MP subscriptions, PPV via MP).
 * Converts BRL creator amount (already minus platform fee) to FanCoins using dynamic rate.
 */
export async function creditEarnings(
  creatorId: string,
  creatorAmountBrl: number,
  type: 'ppv_received' | 'subscription_earned' | 'affiliate_commission',
  description: string,
  referenceId?: string,
) {
  const coinsEarned = await brlToFancoins(creatorAmountBrl)
  if (coinsEarned <= 0) return { credited: 0, newBalance: 0 }

  // Ensure wallet exists
  await getWallet(creatorId)

  // Atomic credit
  const [updated] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${coinsEarned}`,
      totalEarned: sql`${fancoinWallets.totalEarned} + ${coinsEarned}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, creatorId))
    .returning({ balance: fancoinWallets.balance })

  const newBalance = Number(updated?.balance ?? 0)

  await db.insert(fancoinTransactions).values({
    userId: creatorId,
    type,
    amount: coinsEarned,
    balanceAfter: newBalance,
    referenceId,
    description,
  })

  // Also update BRL totalEarnings on creator profile
  await db
    .update(creatorProfiles)
    .set({ totalEarnings: sql`${creatorProfiles.totalEarnings} + ${creatorAmountBrl}` })
    .where(eq(creatorProfiles.userId, creatorId))

  return { credited: coinsEarned, newBalance }
}

export async function rewardEngagement(userId: string, type: string, amount: number) {
  if (amount <= 0) return 0

  // Ensure wallet exists
  await getWallet(userId)

  // Atomic credit — engagement rewards are non-withdrawable (bonusBalance)
  const [updated] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${amount}`,
      bonusBalance: sql`${fancoinWallets.bonusBalance} + ${amount}`,
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
