import { Hono } from 'hono'
import { sendMessageSchema, startConversationSchema } from '@fandreams/shared'
import { validateBody } from '../middleware/validation'
import { authMiddleware } from '../middleware/auth'
import * as messageService from '../services/message.service'
import { success, paginated, error } from '../utils/response'
import { AppError } from '../services/auth.service'

const messagesRoute = new Hono()

// List my conversations
messagesRoute.get('/conversations', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const conversations = await messageService.getConversations(userId)
  return success(c, conversations)
})

// Start or get existing conversation
messagesRoute.post('/conversations', authMiddleware, validateBody(startConversationSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const { recipientId, content } = c.req.valid('json')
    const conversation = await messageService.getOrCreateConversation(userId, recipientId)

    // If content provided, send the first message
    if (content) {
      await messageService.sendMessage(conversation.id, userId, { content })
    }

    return success(c, conversation)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Get messages in a conversation
messagesRoute.get('/conversations/:id/messages', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const conversationId = c.req.param('id')
    const page = Number(c.req.query('page') || 1)
    const limit = Number(c.req.query('limit') || 50)
    const result = await messageService.getMessages(conversationId, userId, page, limit)
    return paginated(c, result.messages, { page, limit, total: result.total })
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Send a message
messagesRoute.post('/conversations/:id/messages', authMiddleware, validateBody(sendMessageSchema), async (c) => {
  try {
    const { userId } = c.get('user')
    const conversationId = c.req.param('id')
    const body = c.req.valid('json')
    const msg = await messageService.sendMessage(conversationId, userId, body)
    return success(c, msg)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Mark messages as read
messagesRoute.patch('/conversations/:id/read', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const conversationId = c.req.param('id')
    const result = await messageService.markAsRead(conversationId, userId)
    return success(c, result)
  } catch (e) {
    if (e instanceof AppError) return error(c, e.status as any, e.code, e.message)
    throw e
  }
})

// Get unread message count
messagesRoute.get('/unread-count', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const result = await messageService.getUnreadCount(userId)
  return success(c, result)
})

export default messagesRoute
