import { z } from 'zod'

export const createSubscriptionSchema = z.object({
  creatorId: z.string().uuid(),
  tierId: z.string().uuid().optional(),
  promoId: z.string().uuid().optional(),
  paymentMethod: z.enum(['pix', 'credit_card', 'crypto']).default('pix'),
})

export const tipSchema = z.object({
  creatorId: z.string().uuid(),
  amount: z.number().min(1).max(50000),
  postId: z.string().uuid().optional(),
  message: z.string().max(200).optional(),
})

export const purchaseFancoinsSchema = z.object({
  packageId: z.string(),
  paymentMethod: z.enum(['pix', 'credit_card']).default('pix'),
})

export const createTierSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(5).max(5000),
  description: z.string().max(500).optional(),
  benefits: z.array(z.string()).optional(),
  maxSlots: z.number().int().positive().optional(),
})

export const updateSubscriptionPriceSchema = z.object({
  subscriptionPrice: z.number().min(5).max(5000),
})

export const createPromoSchema = z.object({
  durationDays: z.union([
    z.literal(90),
    z.literal(180),
    z.literal(360),
  ]),
  price: z.number().min(5).max(50000),
})

export const updatePromoSchema = z.object({
  price: z.number().min(5).max(50000).optional(),
  isActive: z.boolean().optional(),
})

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
export type TipInput = z.infer<typeof tipSchema>
export type PurchaseFancoinsInput = z.infer<typeof purchaseFancoinsSchema>
export type CreateTierInput = z.infer<typeof createTierSchema>
export type UpdateSubscriptionPriceInput = z.infer<typeof updateSubscriptionPriceSchema>
export type CreatePromoInput = z.infer<typeof createPromoSchema>
export type UpdatePromoInput = z.infer<typeof updatePromoSchema>
