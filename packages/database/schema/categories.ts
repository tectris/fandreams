import { pgTable, uuid, varchar, boolean, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const contentCategories = pgTable(
  'content_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull(),
    slug: varchar('slug', { length: 50 }).notNull(),
    isAdult: boolean('is_adult').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_content_categories_slug').on(table.slug),
    uniqueIndex('idx_content_categories_name').on(table.name),
  ],
)

export type ContentCategory = typeof contentCategories.$inferSelect
export type NewContentCategory = typeof contentCategories.$inferInsert
