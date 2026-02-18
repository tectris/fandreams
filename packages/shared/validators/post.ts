import { z } from 'zod'

const tagSchema = z
  .string()
  .min(2, 'Tag deve ter pelo menos 2 caracteres')
  .max(25, 'Tag deve ter no maximo 25 caracteres')
  .regex(/^[a-zA-Z0-9À-ÿ\s-]+$/, 'Tag contem caracteres invalidos')
  .transform((t) => t.trim().toLowerCase())

export const createPostSchema = z.object({
  contentText: z.string().max(5000).optional(),
  postType: z.enum(['regular', 'poll', 'scheduled', 'ppv']).default('regular'),
  visibility: z.enum(['public', 'subscribers', 'ppv']).default('subscribers'),
  tierId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  subcategory: z.string().max(30).optional(),
  tags: z.array(tagSchema).max(5, 'Maximo de 5 tags por post').optional(),
  ppvPrice: z.number().min(1).max(10000).optional(),
  scheduledAt: z.string().datetime().optional(),
  media: z
    .array(
      z.object({
        key: z.string(),
        mediaType: z.string(),
      }),
    )
    .optional(),
})

export const updatePostSchema = z.object({
  contentText: z.string().max(5000).optional(),
  visibility: z.enum(['public', 'subscribers', 'ppv']).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isVisible: z.boolean().optional(),
})

export const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
