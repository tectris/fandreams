import { Hono } from 'hono'
import { authMiddleware, creatorMiddleware, adminMiddleware } from '../middleware/auth'
import * as creatorScoreService from '../services/creator-score.service'
import { success, error } from '../utils/response'
import { AppError } from '../services/auth.service'
import { CREATOR_SCORE_WEIGHTS } from '@fandreams/shared'

const creatorScore = new Hono()

// ── Public: view a creator's score ──

creatorScore.get('/weights', (c) => {
  return success(c, CREATOR_SCORE_WEIGHTS)
})

// /me/* must be before /:creatorId to avoid "me" being matched as UUID
creatorScore.get('/me/score', authMiddleware, creatorMiddleware, async (c) => {
  const { userId } = c.get('user')
  const result = await creatorScoreService.getCreatorScore(userId)
  return success(c, result)
})

creatorScore.post('/me/recalculate', authMiddleware, creatorMiddleware, async (c) => {
  const { userId } = c.get('user')
  const breakdown = await creatorScoreService.updateCreatorScore(userId)
  return success(c, breakdown)
})

creatorScore.get('/:creatorId', async (c) => {
  try {
    const result = await creatorScoreService.getCreatorScore(c.req.param('creatorId'))
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// ── Admin: recalculate all scores ──

creatorScore.post('/admin/recalculate-all', authMiddleware, adminMiddleware, async (c) => {
  const result = await creatorScoreService.recalculateAllScores()
  return success(c, result)
})

export default creatorScore
