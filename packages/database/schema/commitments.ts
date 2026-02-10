import { pgTable, uuid, varchar, integer, decimal, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core'
import { users } from './users'

// ── Fan Commitments (FanCoin Lock for Perks) ──

export const fanCommitments = pgTable(
  'fan_commitments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fanId: uuid('fan_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    creatorId: uuid('creator_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    /** FanCoins locked */
    amount: integer('amount').notNull(),
    /** Lock duration in days (30, 60, 90) */
    durationDays: integer('duration_days').notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(), // active, completed, withdrawn_early
    /** When the commitment started */
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    /** When it ends (startedAt + durationDays) */
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    /** When fan withdrew early (if applicable) */
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    /** Completion bonus (5% non-withdrawable) — granted at end */
    bonusGranted: integer('bonus_granted').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_commitments_fan').on(table.fanId),
    index('idx_commitments_creator').on(table.creatorId),
    index('idx_commitments_status').on(table.status),
  ],
)

// ── Bonus Grants (Individual Bonus Tracking with Vesting) ──

export const bonusGrants = pgTable(
  'bonus_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    /** Type of bonus: purchase, creator_welcome, engagement, campaign_prize, referral, commitment_bonus */
    type: varchar('type', { length: 30 }).notNull(),
    /** Total bonus amount in FanCoins */
    totalAmount: integer('total_amount').notNull(),
    /** Amount already unlocked (vested) into withdrawable */
    unlockedAmount: integer('unlocked_amount').default(0).notNull(),
    /** Amount consumed by spending (tips, PPV, etc.) */
    spentAmount: integer('spent_amount').default(0).notNull(),
    /** Vesting rule: 'never' | 'revenue' | 'time' | 'condition' */
    vestingRule: varchar('vesting_rule', { length: 20 }).default('never').notNull(),
    /** Vesting rate (for 'revenue' type): e.g. 0.04 = 4% of revenue unlocks bonus */
    vestingRate: decimal('vesting_rate', { precision: 5, scale: 4 }),
    /** Revenue required to fully unlock (calculated: totalAmount / vestingRate) */
    vestingRevenueRequired: decimal('vesting_revenue_required', { precision: 12, scale: 2 }),
    /** Revenue accumulated toward vesting */
    vestingRevenueAccumulated: decimal('vesting_revenue_accumulated', { precision: 12, scale: 2 }).default('0'),
    /** For 'time' vesting: when bonus becomes withdrawable */
    vestingUnlockAt: timestamp('vesting_unlock_at', { withTimezone: true }),
    /** For 'condition' vesting: JSON description of condition */
    vestingCondition: varchar('vesting_condition', { length: 255 }),
    /** Whether vesting condition has been met */
    vestingComplete: boolean('vesting_complete').default(false).notNull(),
    /** Reference to what generated this bonus (paymentId, campaignId, etc.) */
    referenceId: uuid('reference_id'),
    description: varchar('description', { length: 255 }),
    status: varchar('status', { length: 20 }).default('active').notNull(), // active, fully_vested, fully_spent, expired
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_bonus_grants_user').on(table.userId),
    index('idx_bonus_grants_type').on(table.type),
    index('idx_bonus_grants_status').on(table.status),
  ],
)

// Type exports
export type FanCommitment = typeof fanCommitments.$inferSelect
export type NewFanCommitment = typeof fanCommitments.$inferInsert
export type BonusGrant = typeof bonusGrants.$inferSelect
export type NewBonusGrant = typeof bonusGrants.$inferInsert
