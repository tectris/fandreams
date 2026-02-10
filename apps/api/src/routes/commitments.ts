import { Hono } from 'hono'
import { z } from 'zod'
import { validateBody } from '../middleware/validation'
import { authMiddleware, creatorMiddleware } from '../middleware/auth'
import { financialRateLimit } from '../middleware/rateLimit'
import * as commitmentService from '../services/commitment.service'
import { success, error } from '../utils/response'
import { AppError } from '../services/auth.service'
import { COMMITMENT_CONFIG } from '@fandreams/shared'

const commitments = new Hono()

// ── Fan Routes ──

commitments.get('/config', (c) => {
  return success(c, COMMITMENT_CONFIG)
})

const createCommitmentSchema = z.object({
  creatorId: z.string().uuid(),
  amount: z.number().int().positive(),
  durationDays: z.number().int().refine((v) => [30, 60, 90].includes(v), {
    message: 'Duracao deve ser 30, 60 ou 90 dias',
  }),
})

commitments.post('/', authMiddleware, financialRateLimit, validateBody(createCommitmentSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const body = c.req.valid('json')
    const commitment = await commitmentService.createCommitment(userId, body.creatorId, body.amount, body.durationDays)
    return success(c, commitment)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

commitments.get('/my', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const result = await commitmentService.getMyCommitments(userId)
  return success(c, result)
})

commitments.post('/:id/withdraw', authMiddleware, financialRateLimit, async (c) => {
  try {
    const { userId } = c.get('user')
    const result = await commitmentService.withdrawCommitmentEarly(c.req.param('id'), userId)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Creator Routes (see who committed to you) ──

commitments.get('/creator', authMiddleware, creatorMiddleware, async (c) => {
  const { userId } = c.get('user')
  const result = await commitmentService.getCommitmentsForCreator(userId)
  return success(c, result)
})

export default commitments
