import { eq, and, sql } from 'drizzle-orm'
import { fancoinWallets, fancoinTransactions, creatorProfiles, users, posts, payments, userGamification } from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import { FANCOIN_PACKAGES, ECOSYSTEM_FUND_RATE, FAN_TIER_MULTIPLIERS } from '@fandreams/shared'
import { getPlatformFeeRate, getGraduatedFeeRate, getP2pFeeRate, brlToFancoins, getFancoinToBrl } from './withdrawal.service'

// ── Ecosystem Fund ──

/** Platform wallet ID for ecosystem fund accumulation */
const ECOSYSTEM_FUND_USER_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Deduct ecosystem fund contribution (1%) from a transaction amount.
 * Returns the amount after ecosystem fund deduction.
 * The deducted amount is recorded as a transaction on the platform fund wallet.
 */
async function collectEcosystemFund(amount: number, description: string): Promise<number> {
  const fundAmount = Math.floor(amount * ECOSYSTEM_FUND_RATE)
  if (fundAmount <= 0) return amount

  // Credit ecosystem fund wallet (fire-and-forget, never blocks main tx)
  try {
    await getWallet(ECOSYSTEM_FUND_USER_ID)
    await db
      .update(fancoinWallets)
      .set({
        balance: sql`${fancoinWallets.balance} + ${fundAmount}`,
        totalEarned: sql`${fancoinWallets.totalEarned} + ${fundAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(fancoinWallets.userId, ECOSYSTEM_FUND_USER_ID))

    await db.insert(fancoinTransactions).values({
      userId: ECOSYSTEM_FUND_USER_ID,
      type: 'ecosystem_fund',
      amount: fundAmount,
      balanceAfter: 0, // placeholder — actual balance tracked in wallet
      description,
    })
  } catch (e) {
    console.error('Ecosystem fund collection error (non-blocking):', e)
  }

  return amount - fundAmount
}

// ── Fan Tier Spending Multiplier ──

/**
 * Get the spending power multiplier for a user based on their fan tier.
 * Higher tiers get more value per FanCoin spent.
 * e.g. Obsidian tier: 100 FanCoins spent = 130 FanCoins value to creator
 */
async function getTierMultiplier(userId: string): Promise<number> {
  try {
    const [profile] = await db
      .select({ fanTier: userGamification.fanTier })
      .from(userGamification)
      .where(eq(userGamification.userId, userId))
      .limit(1)

    const tier = (profile?.fanTier || 'bronze') as keyof typeof FAN_TIER_MULTIPLIERS
    return FAN_TIER_MULTIPLIERS[tier] ?? 1.0
  } catch {
    return 1.0
  }
}

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

/**
 * Credit FanCoins from a custom (non-package) purchase.
 * Custom purchases use the base rate with no bonus.
 */
export async function purchaseCustomFancoins(userId: string, amountBrl: number) {
  const { CUSTOM_PURCHASE_LIMITS } = await import('@fandreams/shared')
  if (amountBrl < CUSTOM_PURCHASE_LIMITS.minBrl || amountBrl > CUSTOM_PURCHASE_LIMITS.maxBrl) {
    throw new AppError('INVALID', `Valor deve ser entre R$${CUSTOM_PURCHASE_LIMITS.minBrl} e R$${CUSTOM_PURCHASE_LIMITS.maxBrl}`, 400)
  }

  const coins = Math.floor(amountBrl / CUSTOM_PURCHASE_LIMITS.brlPerCoin)
  if (coins < CUSTOM_PURCHASE_LIMITS.minCoins) {
    throw new AppError('INVALID', `Minimo de ${CUSTOM_PURCHASE_LIMITS.minCoins} FanCoins`, 400)
  }

  // Ensure wallet exists
  await getWallet(userId)

  // Atomic credit: all purchased coins are non-withdrawable (bonusBalance)
  const [updated] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${coins}`,
      bonusBalance: sql`${fancoinWallets.bonusBalance} + ${coins}`,
      totalEarned: sql`${fancoinWallets.totalEarned} + ${coins}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, userId))
    .returning({ balance: fancoinWallets.balance })

  const newBalance = Number(updated?.balance ?? 0)
  const label = `${coins.toLocaleString()} FanCoins (personalizado)`

  const [tx] = await db
    .insert(fancoinTransactions)
    .values({
      userId,
      type: 'purchase',
      amount: coins,
      balanceAfter: newBalance,
      description: `Compra personalizada de ${label}`,
    })
    .returning()

  return { transaction: tx, newBalance, coins, amountBrl, label }
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

  // Tier multiplier: higher tier fans get a platform fee discount (platform absorbs the difference).
  // The total distributed never exceeds the amount debited from the sender.
  // e.g. Obsidian (1.3x): platform fee is reduced by 30%, so more of the original amount goes to the creator.
  const tierMultiplier = await getTierMultiplier(fromUserId)
  const feeRate = await getGraduatedFeeRate(toCreatorId)
  const adjustedFeeRate = feeRate / tierMultiplier // Higher tier = lower effective fee
  const platformCut = Math.floor(amount * adjustedFeeRate)
  const afterFee = amount - platformCut

  // Ecosystem fund: 1% of after-fee amount goes to platform fund
  const creatorAmount = await collectEcosystemFund(afterFee, `Fundo ecossistema: tip @${sender?.username} -> @${receiver?.username}`)

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

  // Trigger revenue-based vesting for creator's bonus grants (non-blocking)
  try {
    const { processRevenueVesting } = await import('./bonus-grant.service')
    await processRevenueVesting(toCreatorId, creatorAmount)
  } catch (e) {
    console.error('Revenue vesting error (non-blocking):', e)
  }

  // Auto guild treasury contribution if creator is in a guild (non-blocking)
  try {
    const { guildMembers: gm } = await import('@fandreams/database')
    const [membership] = await db
      .select({ guildId: gm.guildId })
      .from(gm)
      .where(eq(gm.userId, toCreatorId))
      .limit(1)
    if (membership) {
      const { contributeTreasury } = await import('./guild.service')
      await contributeTreasury(membership.guildId, toCreatorId, creatorAmount)
    }
  } catch (e) {
    console.error('Guild treasury contribution error (non-blocking):', e)
  }

  const ecosystemFund = afterFee - creatorAmount
  return { sent: amount, creatorReceived: creatorAmount, platformFee: platformCut, ecosystemFund, tierMultiplier }
}

/**
 * Preview a P2P transfer: returns the fee breakdown without executing.
 */
export async function previewTransfer(fromUserId: string, amount: number) {
  if (amount <= 0) throw new AppError('INVALID', 'Valor invalido', 400)
  if (!Number.isInteger(amount)) throw new AppError('INVALID', 'Valor deve ser inteiro', 400)

  const tierMultiplier = await getTierMultiplier(fromUserId)
  const feeRate = await getP2pFeeRate()
  const adjustedFeeRate = feeRate / tierMultiplier
  const platformCut = Math.floor(amount * adjustedFeeRate)
  const afterFee = amount - platformCut
  const ecosystemFund = Math.floor(afterFee * ECOSYSTEM_FUND_RATE)
  const receiverAmount = afterFee - ecosystemFund
  const fancoinToBrl = await getFancoinToBrl()

  return {
    amount,
    platformFee: platformCut,
    platformFeePercent: Math.round(adjustedFeeRate * 10000) / 100,
    ecosystemFund,
    ecosystemFundPercent: ECOSYSTEM_FUND_RATE * 100,
    totalFees: platformCut + ecosystemFund,
    totalFeesPercent: Math.round((platformCut + ecosystemFund) / amount * 10000) / 100,
    receiverGets: receiverAmount,
    receiverGetsBrl: Math.round(receiverAmount * fancoinToBrl * 100) / 100,
    tierMultiplier,
  }
}

/**
 * Transfer FanCoins between any two users (P2P wallet-to-wallet).
 * Uses a separate P2P fee rate (default 2%) instead of the general platform fee.
 */
export async function transferToUser(fromUserId: string, toUserId: string, amount: number, message?: string) {
  if (amount <= 0) throw new AppError('INVALID', 'Valor invalido', 400)
  if (!Number.isInteger(amount)) throw new AppError('INVALID', 'Valor deve ser inteiro', 400)
  if (fromUserId === toUserId) throw new AppError('INVALID', 'Nao pode transferir para si mesmo', 400)

  // Look up both usernames
  const [sender] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, fromUserId))
    .limit(1)
  const [receiver] = await db
    .select({ username: users.username, id: users.id })
    .from(users)
    .where(eq(users.id, toUserId))
    .limit(1)

  if (!receiver) throw new AppError('NOT_FOUND', 'Usuario destinatario nao encontrado', 404)

  // ATOMIC debit
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

  // Apply P2P-specific fee (lower than general platform fee)
  const tierMultiplier = await getTierMultiplier(fromUserId)
  const feeRate = await getP2pFeeRate()
  const adjustedFeeRate = feeRate / tierMultiplier
  const platformCut = Math.floor(amount * adjustedFeeRate)
  const afterFee = amount - platformCut

  // Ecosystem fund: 1%
  const receiverAmount = await collectEcosystemFund(afterFee, `Fundo ecossistema: transferencia @${sender?.username} -> @${receiver?.username}`)

  // ATOMIC credit
  const [creditResult] = await db
    .update(fancoinWallets)
    .set({
      balance: sql`${fancoinWallets.balance} + ${receiverAmount}`,
      totalEarned: sql`${fancoinWallets.totalEarned} + ${receiverAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(fancoinWallets.userId, toUserId))
    .returning({ balance: fancoinWallets.balance })

  if (!creditResult) {
    await getWallet(toUserId)
    await db
      .update(fancoinWallets)
      .set({
        balance: sql`${fancoinWallets.balance} + ${receiverAmount}`,
        totalEarned: sql`${fancoinWallets.totalEarned} + ${receiverAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(fancoinWallets.userId, toUserId))
  }

  const newReceiverBalance = Number(creditResult?.balance ?? receiverAmount)
  const senderUsername = sender?.username || 'usuario'
  const receiverUsername = receiver?.username || 'usuario'

  const msgSuffix = message ? ` — "${message}"` : ''

  await db.insert(fancoinTransactions).values([
    {
      userId: fromUserId,
      type: 'transfer_sent',
      amount: -amount,
      balanceAfter: newSenderBalance,
      description: `Transferencia para @${receiverUsername}${msgSuffix}`,
    },
    {
      userId: toUserId,
      type: 'transfer_received',
      amount: receiverAmount,
      balanceAfter: newReceiverBalance,
      description: `Transferencia de @${senderUsername}${msgSuffix}`,
    },
  ])

  const ecosystemFundAmount = afterFee - receiverAmount
  return {
    sent: amount,
    receiverGot: receiverAmount,
    platformFee: platformCut,
    ecosystemFund: ecosystemFundAmount,
    tierMultiplier,
    fromUsername: senderUsername,
    toUsername: receiverUsername,
  }
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

/**
 * Credit FanCoins after a confirmed custom-amount payment.
 * Called by the payment webhook handler for custom purchases.
 */
export async function creditCustomPurchase(userId: string, totalCoins: number, amountBrl: number, paymentId: string) {
  // Idempotency check
  const [existing] = await db
    .select({ id: fancoinTransactions.id })
    .from(fancoinTransactions)
    .where(
      sql`${fancoinTransactions.referenceId} = ${paymentId} AND ${fancoinTransactions.type} = 'purchase'`,
    )
    .limit(1)

  if (existing) {
    const wallet = await getWallet(userId)
    return { newBalance: Number(wallet.balance), credited: 0, duplicate: true }
  }

  await getWallet(userId)

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
  const label = `${totalCoins.toLocaleString()} FanCoins (R$${amountBrl.toFixed(2)})`

  await db.insert(fancoinTransactions).values({
    userId,
    type: 'purchase',
    amount: totalCoins,
    balanceAfter: newBalance,
    referenceId: paymentId,
    description: `Compra personalizada de ${label}`,
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

  // Tier multiplier: higher tier fans get a platform fee discount on PPV too
  const tierMultiplier = await getTierMultiplier(userId)
  const ppvFeeRate = await getGraduatedFeeRate(post.creatorId)
  const adjustedFeeRate = ppvFeeRate / tierMultiplier
  const platformCut = Math.floor(priceInCoins * adjustedFeeRate)
  const afterFee = priceInCoins - platformCut

  // Ecosystem fund: 1% to platform fund
  const creatorAmount = await collectEcosystemFund(afterFee, `Fundo ecossistema: PPV ${postId}`)

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

  // Trigger revenue-based vesting for creator's bonus grants (non-blocking)
  try {
    const { processRevenueVesting } = await import('./bonus-grant.service')
    await processRevenueVesting(post.creatorId, creatorAmount)
  } catch (e) {
    console.error('Revenue vesting error (non-blocking):', e)
  }

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
  const rawCoins = await brlToFancoins(creatorAmountBrl)
  if (rawCoins <= 0) return { credited: 0, newBalance: 0 }

  // Ecosystem fund: 1% from external earnings too
  const coinsEarned = await collectEcosystemFund(rawCoins, `Fundo ecossistema: ${type}`)

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

  // Trigger revenue-based vesting for creator's bonus grants (non-blocking)
  try {
    const { processRevenueVesting } = await import('./bonus-grant.service')
    await processRevenueVesting(creatorId, coinsEarned)
  } catch (e) {
    console.error('Revenue vesting error (non-blocking):', e)
  }

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
