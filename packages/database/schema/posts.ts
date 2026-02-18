import { pgTable, uuid, varchar, text, boolean, decimal, integer, timestamp, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { subscriptionTiers } from './creators'
import { contentCategories } from './categories'

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shortCode: varchar('short_code', { length: 12 }),
    creatorId: uuid('creator_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    contentText: text('content_text'),
    postType: varchar('post_type', { length: 20 }).default('regular').notNull(),
    visibility: varchar('visibility', { length: 20 }).default('subscribers').notNull(),
    tierId: uuid('tier_id').references(() => subscriptionTiers.id),
    categoryId: uuid('category_id').references(() => contentCategories.id),
    subcategory: varchar('subcategory', { length: 30 }),
    tags: text('tags').array(),
    ppvPrice: decimal('ppv_price', { precision: 10, scale: 2 }),
    isPinned: boolean('is_pinned').default(false).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    isVisible: boolean('is_visible').default(true).notNull(),
    likeCount: integer('like_count').default(0).notNull(),
    commentCount: integer('comment_count').default(0).notNull(),
    tipCount: integer('tip_count').default(0).notNull(),
    shareCount: integer('share_count').default(0).notNull(),
    viewCount: integer('view_count').default(0).notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_posts_creator_id').on(table.creatorId),
    index('idx_posts_published_at').on(table.publishedAt),
    index('idx_posts_visibility').on(table.visibility),
    index('idx_posts_category_id').on(table.categoryId),
    uniqueIndex('idx_posts_short_code').on(table.shortCode),
  ],
)

export const postMedia = pgTable('post_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  mediaType: varchar('media_type', { length: 10 }).notNull(),
  storageKey: text('storage_key').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration'),
  width: integer('width'),
  height: integer('height'),
  fileSize: integer('file_size'),
  isPreview: boolean('is_preview').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  blurhash: varchar('blurhash', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const postLikes = pgTable(
  'post_likes',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    postId: uuid('post_id')
      .references(() => posts.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.postId] })],
)

export const postComments = pgTable('post_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  parentId: uuid('parent_id'),
  isHidden: boolean('is_hidden').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const postBookmarks = pgTable(
  'post_bookmarks',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    postId: uuid('post_id')
      .references(() => posts.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.postId] })],
)

export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type PostMedia = typeof postMedia.$inferSelect
export type PostComment = typeof postComments.$inferSelect
