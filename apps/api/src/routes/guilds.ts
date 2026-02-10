import { Hono } from 'hono'
import { z } from 'zod'
import { validateBody } from '../middleware/validation'
import { authMiddleware, creatorMiddleware } from '../middleware/auth'
import { financialRateLimit } from '../middleware/rateLimit'
import * as guildService from '../services/guild.service'
import { success, error, paginated } from '../utils/response'
import { AppError } from '../services/auth.service'

const guildsRoute = new Hono()

// ── Public Routes ──

guildsRoute.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1)
  const limit = Number(c.req.query('limit') || 20)
  const result = await guildService.listGuilds(page, limit)
  return paginated(c, result.items, { page: result.page, limit: result.limit, total: result.total })
})

// /me/guild must be before /:id to avoid "me" being matched as UUID
guildsRoute.get('/me/guild', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const guild = await guildService.getUserGuild(userId)
  return success(c, guild)
})

guildsRoute.get('/slug/:slug', async (c) => {
  try {
    const guild = await guildService.getGuildBySlug(c.req.param('slug'))
    return success(c, guild)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

guildsRoute.get('/:id', async (c) => {
  try {
    const guild = await guildService.getGuild(c.req.param('id'))
    return success(c, guild)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Authenticated Routes ──

const createGuildSchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  maxMembers: z.number().int().min(2).max(100).optional(),
  minCreatorScore: z.number().int().min(0).max(100).optional(),
  comboSubscriptionPrice: z.number().positive().optional(),
})

guildsRoute.post('/', authMiddleware, creatorMiddleware, validateBody(createGuildSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const body = c.req.valid('json')
    const guild = await guildService.createGuild({ ...body, leaderId: userId })
    return success(c, guild)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

guildsRoute.post('/:id/join', authMiddleware, creatorMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const result = await guildService.joinGuild(c.req.param('id'), userId)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

guildsRoute.post('/:id/leave', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const result = await guildService.leaveGuild(c.req.param('id'), userId)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

const updateGuildSchema = z.object({
  description: z.string().max(1000).optional(),
  isRecruiting: z.boolean().optional(),
  minCreatorScore: z.number().int().min(0).max(100).optional(),
  comboSubscriptionPrice: z.number().positive().optional(),
})

guildsRoute.patch('/:id', authMiddleware, creatorMiddleware, validateBody(updateGuildSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const body = c.req.valid('json')
    const updated = await guildService.updateGuild(c.req.param('id'), userId, body)
    return success(c, updated)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

guildsRoute.get('/:id/treasury', authMiddleware, async (c) => {
  const history = await guildService.getTreasuryHistory(c.req.param('id'))
  return success(c, history)
})

guildsRoute.post('/:id/subscribe', authMiddleware, financialRateLimit, async (c) => {
  try {
    const { userId } = c.get('user')
    const result = await guildService.subscribeToGuild(c.req.param('id'), userId)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

export default guildsRoute
