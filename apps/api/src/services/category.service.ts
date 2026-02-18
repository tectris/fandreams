import { eq } from 'drizzle-orm'
import { contentCategories } from '@fandreams/database'
import { db } from '../config/database'
import { DEFAULT_CONTENT_CATEGORIES } from '@fandreams/shared'

export async function getActiveCategories() {
  const categories = await db
    .select()
    .from(contentCategories)
    .where(eq(contentCategories.isActive, true))
    .orderBy(contentCategories.sortOrder)

  return categories
}

export async function getCategoryById(id: string) {
  const [category] = await db
    .select()
    .from(contentCategories)
    .where(eq(contentCategories.id, id))
    .limit(1)

  return category || null
}

/** Seed default categories if the table is empty. Called on first request. */
export async function seedDefaultCategories() {
  const existing = await db
    .select({ id: contentCategories.id })
    .from(contentCategories)
    .limit(1)

  if (existing.length > 0) return

  for (const cat of DEFAULT_CONTENT_CATEGORIES) {
    await db.insert(contentCategories).values({
      name: cat.name,
      slug: cat.slug,
      isAdult: cat.isAdult,
      sortOrder: cat.sortOrder,
    })
  }
}
