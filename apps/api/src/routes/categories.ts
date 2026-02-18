import { Hono } from 'hono'
import * as categoryService from '../services/category.service'
import { success } from '../utils/response'

const categoriesRoute = new Hono()

// Public endpoint — returns all active content categories
categoriesRoute.get('/', async (c) => {
  // Auto-seed on first request if table is empty
  await categoryService.seedDefaultCategories()

  const categories = await categoryService.getActiveCategories()
  return success(c, { categories })
})

export default categoriesRoute
