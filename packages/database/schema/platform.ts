import { pgTable, uuid, varchar, timestamp, text, boolean, index, integer } from 'drizzle-orm/pg-core'
import { users } from './users'

// Cookie consent tracking
export const cookieConsents = pgTable(
  'cookie_consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: text('user_agent'),
    accepted: boolean('accepted').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_cookie_consents_ip').on(table.ipAddress),
    index('idx_cookie_consents_created_at').on(table.createdAt),
  ],
)

// Contact form messages
export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    whatsapp: varchar('whatsapp', { length: 20 }),
    message: text('message').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_contact_messages_is_read').on(table.isRead),
    index('idx_contact_messages_created_at').on(table.createdAt),
  ],
)

// OTP codes for withdrawal authorization
export const otpCodes = pgTable(
  'otp_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    code: varchar('code', { length: 6 }).notNull(),
    purpose: varchar('purpose', { length: 30 }).notNull(), // 'withdrawal'
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    attempts: integer('attempts').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_otp_codes_user_id').on(table.userId),
    index('idx_otp_codes_expires_at').on(table.expiresAt),
  ],
)

export type CookieConsent = typeof cookieConsents.$inferSelect
export type NewCookieConsent = typeof cookieConsents.$inferInsert
export type ContactMessage = typeof contactMessages.$inferSelect
export type NewContactMessage = typeof contactMessages.$inferInsert
export type OtpCode = typeof otpCodes.$inferSelect
export type NewOtpCode = typeof otpCodes.$inferInsert
