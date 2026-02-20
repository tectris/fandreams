/** Default content categories seeded into the platform.
 *  The `slug` is used as a stable identifier; `name` is the display label. */
export const DEFAULT_CONTENT_CATEGORIES = [
  { name: 'Lifestyle', slug: 'lifestyle', isAdult: false, sortOrder: 0 },
  { name: 'Fitness & Saude', slug: 'fitness-saude', isAdult: false, sortOrder: 1 },
  { name: 'Arte & Fotografia', slug: 'arte-fotografia', isAdult: false, sortOrder: 2 },
  { name: 'Musica', slug: 'musica', isAdult: false, sortOrder: 3 },
  { name: 'Educacao & Tutoriais', slug: 'educacao-tutoriais', isAdult: false, sortOrder: 4 },
  { name: 'Gaming', slug: 'gaming', isAdult: false, sortOrder: 5 },
  { name: 'Culinaria', slug: 'culinaria', isAdult: false, sortOrder: 6 },
  { name: 'Moda & Beleza', slug: 'moda-beleza', isAdult: false, sortOrder: 7 },
  { name: 'Humor & Entretenimento', slug: 'humor-entretenimento', isAdult: false, sortOrder: 8 },
  { name: 'Adulto (18+)', slug: 'adulto', isAdult: true, sortOrder: 9 },
  { name: 'Outro', slug: 'outro', isAdult: false, sortOrder: 10 },
] as const

export type ContentCategorySlug = (typeof DEFAULT_CONTENT_CATEGORIES)[number]['slug']

/** Maximum number of tags allowed per post */
export const MAX_TAGS_PER_POST = 5
