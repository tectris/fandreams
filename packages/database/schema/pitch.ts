import { pgTable, uuid, varchar, integer, decimal, boolean, timestamp, text, jsonb, index } from 'drizzle-orm/pg-core'
import { users } from './users'

// ── FanDreamsPitch — Crowdfunding Campaigns ──

export const pitchCampaigns = pgTable(
  'pitch_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    coverImageUrl: text('cover_image_url'),
    category: varchar('category', { length: 50 }),
    /** Goal in FanCoins */
    goalAmount: integer('goal_amount').notNull(),
    /** Current amount raised */
    raisedAmount: integer('raised_amount').default(0).notNull(),
    totalContributors: integer('total_contributors').default(0).notNull(),
    /** Reward tiers as JSON array: [{amount, title, description}] */
    rewardTiers: jsonb('reward_tiers').default('[]').notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(), // draft, active, funded, delivered, failed, cancelled
    /** Days until campaign ends (from activation) */
    durationDays: integer('duration_days').default(30).notNull(),
    /** Deadline for the campaign */
    endsAt: timestamp('ends_at', { withTimezone: true }),
    /** Deadline for delivery after funding */
    deliveryDeadlineDays: integer('delivery_deadline_days').default(90).notNull(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    /** Average rating from contributors (1-5) */
    averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
    totalRatings: integer('total_ratings').default(0).notNull(),
    cancelledReason: text('cancelled_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_pitch_creator').on(table.creatorId),
    index('idx_pitch_status').on(table.status),
  ],
)

export const pitchContributions = pgTable(
  'pitch_contributions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .references(() => pitchCampaigns.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    amount: integer('amount').notNull(),
    /** Which reward tier was selected */
    rewardTierIndex: integer('reward_tier_index'),
    status: varchar('status', { length: 20 }).default('active').notNull(), // active, refunded
    /** Rating given after delivery (1-5) */
    rating: integer('rating'),
    ratingComment: text('rating_comment'),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_pitch_contrib_campaign').on(table.campaignId),
    index('idx_pitch_contrib_user').on(table.userId),
  ],
)

// ── Pitch Updates (Creator posts progress) ──

export const pitchUpdates = pgTable(
  'pitch_updates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .references(() => pitchCampaigns.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_pitch_updates_campaign').on(table.campaignId)],
)

// Type exports
export type PitchCampaign = typeof pitchCampaigns.$inferSelect
export type NewPitchCampaign = typeof pitchCampaigns.$inferInsert
export type PitchContribution = typeof pitchContributions.$inferSelect
export type PitchUpdate = typeof pitchUpdates.$inferSelect
