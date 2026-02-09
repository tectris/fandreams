import { Hono } from 'hono'
import { z } from 'zod'
import { validateBody } from '../middleware/validation'
import { authMiddleware, creatorMiddleware } from '../middleware/auth'
import * as affiliateService from '../services/affiliate.service'
import * as bonusService from '../services/bonus.service'
import { success, error } from '../utils/response'
import { AppError } from '../services/auth.service'

const affiliates = new Hono()

// ── Creator: Manage Affiliate Program ──

const upsertProgramSchema = z.object({
  isActive: z.boolean(),
  levels: z.array(
    z.object({
      level: z.literal(1),
      commissionPercent: z.number().min(1).max(50),
    }),
  ).max(1),
})

affiliates.get('/program', authMiddleware, creatorMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const program = await affiliateService.getProgram(userId)
    return success(c, program)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

affiliates.patch('/program', authMiddleware, creatorMiddleware, validateBody(upsertProgramSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const body = c.req.valid('json')
    const program = await affiliateService.upsertProgram(userId, body)
    return success(c, program)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

affiliates.get('/creator-stats', authMiddleware, creatorMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const stats = await affiliateService.getCreatorAffiliateStats(userId)
    return success(c, stats)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Public: Get creator's affiliate program by username ──

affiliates.get('/program/by-username/:username', async (c) => {
  try {
    const username = c.req.param('username')
    const program = await affiliateService.getProgramByUsername(username)
    if (!program || !program.isActive) {
      return error(c, 404, 'NOT_FOUND', 'Programa de afiliados nao encontrado ou inativo')
    }
    return success(c, program)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Public: Get creator's affiliate program (for potential affiliates) ──

affiliates.get('/program/:creatorId', async (c) => {
  try {
    const creatorId = c.req.param('creatorId')
    const program = await affiliateService.getProgram(creatorId)
    if (!program || !program.isActive) {
      return error(c, 404, 'NOT_FOUND', 'Programa de afiliados nao encontrado ou inativo')
    }
    return success(c, program)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Affiliate: Manage Links ──

const createLinkSchema = z.object({
  creatorId: z.string().uuid(),
})

affiliates.post('/links', authMiddleware, validateBody(createLinkSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const { creatorId } = c.req.valid('json')
    const link = await affiliateService.createLink(userId, creatorId)
    return success(c, link)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

affiliates.get('/links', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const links = await affiliateService.getMyLinks(userId)
    return success(c, links)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Track click (public, no auth) ──

affiliates.post('/track/:code', async (c) => {
  try {
    const code = c.req.param('code')
    await affiliateService.trackClick(code)
    return success(c, { tracked: true })
  } catch (e) {
    return success(c, { tracked: false })
  }
})

// ── Register referral (called when user subscribes via ref link) ──

const registerReferralSchema = z.object({
  creatorId: z.string().uuid(),
  refCode: z.string().min(1),
})

affiliates.post('/referral', authMiddleware, validateBody(registerReferralSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const { creatorId, refCode } = c.req.valid('json')
    const referral = await affiliateService.registerReferral(userId, creatorId, refCode)
    return success(c, referral)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Affiliate Dashboard ──

affiliates.get('/dashboard', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const dashboard = await affiliateService.getAffiliateDashboard(userId)
    return success(c, dashboard)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Creator Bonus ──

affiliates.get('/bonus', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const bonus = await bonusService.getBonusStatus(userId)
    return success(c, bonus)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

affiliates.post('/bonus/claim', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const result = await bonusService.claimBonus(userId)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

export default affiliates
