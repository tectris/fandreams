import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const documentAcceptances = pgTable(
  'document_acceptances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    documentKey: varchar('document_key', { length: 50 }).notNull(),
    documentVersion: varchar('document_version', { length: 50 }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: text('user_agent'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_doc_acceptances_user_id').on(table.userId),
    index('idx_doc_acceptances_document_key').on(table.documentKey),
    index('idx_doc_acceptances_user_document').on(table.userId, table.documentKey),
  ],
)

export type DocumentAcceptance = typeof documentAcceptances.$inferSelect
export type NewDocumentAcceptance = typeof documentAcceptances.$inferInsert
