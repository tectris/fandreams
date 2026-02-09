import { pgTable, uuid, varchar, decimal, integer, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core'
import { users } from './users'

// ── Creator's affiliate program configuration ──

export const affiliatePrograms = pgTable('affiliate_programs', {
  creatorId: uuid('creator_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').default(false).notNull(),
  maxLevels: integer('max_levels').default(1).notNull(), // 1 or 2
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── Commission levels per affiliate program ──

export const affiliateLevels = pgTable(
  'affiliate_levels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    level: integer('level').notNull(), // 1 = direct referrer, 2 = recruiter of referrer
    commissionPercent: decimal('commission_percent', { precision: 5, scale: 2 }).notNull(), // e.g. 10.00 for 10%
  },
  (table) => [
    unique('unique_creator_level').on(table.creatorId, table.level),
  ],
)

// ── Affiliate tracking links ──

export const affiliateLinks = pgTable(
  'affiliate_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    affiliateUserId: uuid('affiliate_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    creatorId: uuid('creator_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    code: varchar('code', { length: 20 }).unique().notNull(),
    clicks: integer('clicks').default(0).notNull(),
    conversions: integer('conversions').default(0).notNull(),
    totalEarned: decimal('total_earned', { precision: 12, scale: 2 }).default('0').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('unique_affiliate_creator').on(table.affiliateUserId, table.creatorId),
    index('idx_affiliate_links_code').on(table.code),
    index('idx_affiliate_links_affiliate').on(table.affiliateUserId),
  ],
)

// ── Referral tracking: who referred whom to which creator ──

export const affiliateReferrals = pgTable(
  'affiliate_referrals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    referredUserId: uuid('referred_user_id')
      .references(() => users.id)
      .notNull(),
    creatorId: uuid('creator_id')
      .references(() => users.id)
      .notNull(),
    l1AffiliateId: uuid('l1_affiliate_id')
      .references(() => users.id)
      .notNull(), // direct referrer
    l2AffiliateId: uuid('l2_affiliate_id')
      .references(() => users.id), // who recruited the L1 affiliate (nullable)
    linkId: uuid('link_id')
      .references(() => affiliateLinks.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('unique_referral_creator').on(table.referredUserId, table.creatorId),
    index('idx_referrals_l1').on(table.l1AffiliateId),
    index('idx_referrals_l2').on(table.l2AffiliateId),
    index('idx_referrals_creator').on(table.creatorId),
  ],
)

// ── Commission records ──

export const affiliateCommissions = pgTable(
  'affiliate_commissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    affiliateUserId: uuid('affiliate_user_id')
      .references(() => users.id)
      .notNull(),
    creatorId: uuid('creator_id')
      .references(() => users.id)
      .notNull(),
    paymentId: uuid('payment_id').notNull(), // references payments.id
    level: integer('level').notNull(), // 1 or 2
    commissionPercent: decimal('commission_percent', { precision: 5, scale: 2 }).notNull(),
    amountBrl: decimal('amount_brl', { precision: 12, scale: 2 }).notNull(),
    coinsCredit: integer('coins_credit').notNull(),
    status: varchar('status', { length: 20 }).default('credited').notNull(), // credited, reversed
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_commissions_affiliate').on(table.affiliateUserId),
    index('idx_commissions_creator').on(table.creatorId),
    index('idx_commissions_payment').on(table.paymentId),
  ],
)

// ── Creator signup bonus ──

export const creatorBonuses = pgTable('creator_bonuses', {
  creatorId: uuid('creator_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  bonusCoins: integer('bonus_coins').notNull(),
  requiredSubscribers: integer('required_subscribers').default(1).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, claimable, claimed
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Type exports
export type AffiliateProgram = typeof affiliatePrograms.$inferSelect
export type AffiliateLevel = typeof affiliateLevels.$inferSelect
export type AffiliateLink = typeof affiliateLinks.$inferSelect
export type AffiliateReferral = typeof affiliateReferrals.$inferSelect
export type AffiliateCommission = typeof affiliateCommissions.$inferSelect
export type CreatorBonus = typeof creatorBonuses.$inferSelect
