import { z } from 'zod'

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video']).optional(),
})

export const startConversationSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1).max(2000).optional(),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type StartConversationInput = z.infer<typeof startConversationSchema>
