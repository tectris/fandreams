import { Hono } from 'hono'
import { z } from 'zod'
import { purchaseFancoinsSchema, FANCOIN_PACKAGES } from '@fandreams/shared'
import { validateBody } from '../middleware/validation'
import { authMiddleware } from '../middleware/auth'
import { financialRateLimit } from '../middleware/rateLimit'
import * as fancoinService from '../services/fancoin.service'
import * as gamificationService from '../services/gamification.service'
import * as notificationService from '../services/notification.service'
import { db } from '../config/database'
import { users } from '@fandreams/database'
import { eq, like, and, ne, sql } from 'drizzle-orm'
import { success, error } from '../utils/response'
import { AppError } from '../services/auth.service'
import { getFancoinToBrl } from '../services/withdrawal.service'

const fancoins = new Hono()

fancoins.get('/wallet', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const [wallet, fancoinToBrl] = await Promise.all([
    fancoinService.getWallet(userId),
    getFancoinToBrl(),
  ])
  const balance = Number(wallet.balance || 0)
  const bonusBalance = Number(wallet.bonusBalance || 0)
  const withdrawableBalance = Math.max(0, balance - bonusBalance)
  return success(c, {
    ...wallet,
    fancoinToBrl,
    withdrawableBalance,
    withdrawableBalanceBrl: withdrawableBalance * fancoinToBrl,
    bonusBalanceBrl: bonusBalance * fancoinToBrl,
  })
})

fancoins.get('/transactions', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const limit = Number(c.req.query('limit') || 50)
  const txs = await fancoinService.getTransactions(userId, limit)
  return success(c, txs)
})

fancoins.get('/packages', async (c) => {
  return success(c, FANCOIN_PACKAGES)
})

fancoins.post('/purchase', authMiddleware, financialRateLimit, validateBody(purchaseFancoinsSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const body = c.req.valid('json')
    const result = await fancoinService.purchaseFancoins(userId, body.packageId)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

const tipSchema = z.object({
  creatorId: z.string().uuid(),
  amount: z.number().int().positive(),
  referenceId: z.string().uuid().optional(),
})

fancoins.post('/tip', authMiddleware, financialRateLimit, validateBody(tipSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const body = c.req.valid('json')
    const result = await fancoinService.sendTip(userId, body.creatorId, body.amount, body.referenceId)
    await gamificationService.addXp(userId, 'tip_sent')

    // Send notification to the creator (non-blocking — tip already succeeded)
    try {
      const [sender] = await db
        .select({ username: users.username, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      const senderName = sender?.displayName || sender?.username || 'Alguem'
      await notificationService.createNotification(
        body.creatorId,
        'tip_received',
        `${senderName} enviou ${body.amount} FanCoins!`,
        `@${sender?.username} enviou um tip de ${body.amount} FanCoins para voce.`,
        { fromUserId: userId, amount: body.amount, referenceId: body.referenceId, creatorUsername: sender?.username },
      )
    } catch (notifErr) {
      console.error('Failed to create tip notification:', notifErr)
    }

    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Search users by username for P2P transfers
fancoins.get('/search-user', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const q = c.req.query('q')?.trim()

  if (!q || q.length < 2) {
    return success(c, [])
  }

  const searchTerm = q.startsWith('@') ? q.slice(1) : q

  const results = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(
      and(
        like(users.username, `${searchTerm}%`),
        ne(users.id, userId),
        eq(users.isActive, true),
      ),
    )
    .limit(10)

  return success(c, results)
})

// P2P transfer fee preview
fancoins.get('/transfer-preview', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const amount = Number(c.req.query('amount'))

    if (!amount || !Number.isInteger(amount) || amount <= 0) {
      return error(c, 400, 'INVALID', 'Informe um valor inteiro positivo')
    }

    const preview = await fancoinService.previewTransfer(userId, amount)
    return success(c, preview)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// P2P transfer between wallets
const transferSchema = z.object({
  toUsername: z.string().min(1).max(50),
  amount: z.number().int().positive().max(1000000),
  message: z.string().max(200).optional(),
})

fancoins.post('/transfer', authMiddleware, financialRateLimit, validateBody(transferSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const body = c.req.valid('json')

    // Resolve username to userId
    const [recipient] = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(and(eq(users.username, body.toUsername), eq(users.isActive, true)))
      .limit(1)

    if (!recipient) {
      return error(c, 404, 'USER_NOT_FOUND', `Usuario @${body.toUsername} nao encontrado`)
    }

    const result = await fancoinService.transferToUser(userId, recipient.id, body.amount, body.message)

    // Send notification to recipient (non-blocking)
    try {
      const [sender] = await db
        .select({ username: users.username, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      const senderName = sender?.displayName || sender?.username || 'Alguem'
      const msgText = body.message ? ` com a mensagem: "${body.message}"` : ''
      await notificationService.createNotification(
        recipient.id,
        'transfer_received',
        `${senderName} transferiu ${body.amount} FanCoins!`,
        `@${sender?.username} transferiu ${body.amount} FanCoins para voce${msgText}.`,
        { fromUserId: userId, amount: body.amount, senderUsername: sender?.username },
      )
    } catch (notifErr) {
      console.error('Failed to create transfer notification:', notifErr)
    }

    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

export default fancoins
