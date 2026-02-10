import { pgTable, uuid, varchar, integer, decimal, boolean, timestamp, text, jsonb, index, unique } from 'drizzle-orm/pg-core'
import { users } from './users'

// ── Guilds (Creator Clans) ──

export const guilds = pgTable('guilds', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  coverUrl: text('cover_url'),
  category: varchar('category', { length: 50 }),
  leaderId: uuid('leader_id')
    .references(() => users.id)
    .notNull(),
  coLeaderId: uuid('co_leader_id')
    .references(() => users.id),
  maxMembers: integer('max_members').default(20).notNull(),
  /** Percentage of member earnings contributed to guild treasury (0-10%) */
  treasuryContributionPercent: decimal('treasury_contribution_percent', { precision: 4, scale: 2 }).default('3.00').notNull(),
  treasuryBalance: integer('treasury_balance').default(0).notNull(),
  /** Guild combo subscription price (fans pay this for access to ALL guild creators) */
  comboSubscriptionPrice: decimal('combo_subscription_price', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true).notNull(),
  isRecruiting: boolean('is_recruiting').default(true).notNull(),
  /** Minimum Creator Score required to join */
  minCreatorScore: integer('min_creator_score').default(50).notNull(),
  totalMembers: integer('total_members').default(1).notNull(),
  totalSubscribers: integer('total_subscribers').default(0).notNull(),
  totalEarnings: decimal('total_earnings', { precision: 12, scale: 2 }).default('0').notNull(),
  /** Guild Wars stats */
  warsWon: integer('wars_won').default(0).notNull(),
  warsPlayed: integer('wars_played').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const guildMembers = pgTable(
  'guild_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guildId: uuid('guild_id')
      .references(() => guilds.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 20 }).default('member').notNull(), // leader, co_leader, member
    /** Total FanCoins contributed to treasury */
    totalContributed: integer('total_contributed').default(0).notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('unique_guild_member').on(table.guildId, table.userId),
    index('idx_guild_members_user').on(table.userId),
  ],
)

export const guildTreasuryTransactions = pgTable(
  'guild_treasury_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guildId: uuid('guild_id')
      .references(() => guilds.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    type: varchar('type', { length: 30 }).notNull(), // contribution, withdrawal, prize, expense
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    description: varchar('description', { length: 255 }),
    /** Requires approval for withdrawals — approved by vote or leader */
    approvedBy: uuid('approved_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_guild_treasury_guild').on(table.guildId)],
)

// ── Guild Subscriptions (Combo) ──

export const guildSubscriptions = pgTable(
  'guild_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guildId: uuid('guild_id')
      .references(() => guilds.id, { onDelete: 'cascade' })
      .notNull(),
    fanId: uuid('fan_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(), // active, cancelled, expired
    pricePaid: decimal('price_paid', { precision: 10, scale: 2 }).notNull(),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('unique_guild_sub').on(table.guildId, table.fanId),
    index('idx_guild_subs_fan').on(table.fanId),
  ],
)

// Type exports
export type Guild = typeof guilds.$inferSelect
export type NewGuild = typeof guilds.$inferInsert
export type GuildMember = typeof guildMembers.$inferSelect
export type GuildSubscription = typeof guildSubscriptions.$inferSelect
