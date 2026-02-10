import { Hono } from 'hono'
import { z } from 'zod'
import { validateBody } from '../middleware/validation'
import { authMiddleware, creatorMiddleware } from '../middleware/auth'
import { financialRateLimit } from '../middleware/rateLimit'
import * as pitchService from '../services/pitch.service'
import { success, error, paginated } from '../utils/response'
import { AppError } from '../services/auth.service'

const pitch = new Hono()

// ── Public Routes ──

const ALLOWED_CAMPAIGN_STATUSES = ['active', 'funded', 'delivered', 'failed']

pitch.get('/campaigns', async (c) => {
  const page = Math.max(1, Math.floor(Number(c.req.query('page') || 1)))
  const limit = Math.min(100, Math.max(1, Math.floor(Number(c.req.query('limit') || 20))))
  const rawStatus = c.req.query('status') || 'active'
  const status = ALLOWED_CAMPAIGN_STATUSES.includes(rawStatus) ? rawStatus : 'active'
  const category = c.req.query('category')
  const result = await pitchService.listCampaigns(page, limit, status, category)
  return paginated(c, result.items, { page: result.page, limit: result.limit, total: result.total })
})

pitch.get('/campaigns/:id', async (c) => {
  try {
    const campaign = await pitchService.getCampaign(c.req.param('id'))
    return success(c, campaign)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Creator Routes ──

const createCampaignSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  coverImageUrl: z.string().url().optional(),
  category: z.string().max(50).optional(),
  goalAmount: z.number().int().positive(),
  durationDays: z.number().int().min(7).max(90).optional(),
  deliveryDeadlineDays: z.number().int().min(7).max(365).optional(),
  rewardTiers: z
    .array(
      z.object({
        amount: z.number().int().positive(),
        title: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
      }),
    )
    .max(10)
    .optional(),
})

pitch.post('/campaigns', authMiddleware, creatorMiddleware, validateBody(createCampaignSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const body = c.req.valid('json')
    const campaign = await pitchService.createCampaign({ ...body, creatorId: userId })
    return success(c, campaign)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

const postUpdateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
})

pitch.post('/campaigns/:id/updates', authMiddleware, creatorMiddleware, validateBody(postUpdateSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const body = c.req.valid('json')
    const update = await pitchService.postCampaignUpdate(c.req.param('id'), userId, body.title, body.content)
    return success(c, update)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Fan Routes ──

const contributeSchema = z.object({
  amount: z.number().int().positive(),
  rewardTierIndex: z.number().int().min(0).optional(),
})

pitch.post('/campaigns/:id/contribute', authMiddleware, financialRateLimit, validateBody(contributeSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const body = c.req.valid('json')
    const result = await pitchService.contributeToCampaign(c.req.param('id'), userId, body.amount, body.rewardTierIndex)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

pitch.post('/campaigns/:id/rate', authMiddleware, validateBody(rateSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const body = c.req.valid('json')
    const result = await pitchService.rateCampaign(c.req.param('id'), userId, body.rating, body.comment)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

pitch.get('/my/contributions', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const contributions = await pitchService.getUserContributions(userId)
  return success(c, contributions)
})

export default pitch
