import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const databasePkgDir = resolve(__dirname, '../../../packages/database')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Skipping database push.')
  process.exit(0)
}

console.log('Pushing database schema to Neon...')

try {
  execSync('npx drizzle-kit push --force', {
    cwd: databasePkgDir,
    stdio: 'inherit',
    env: { ...process.env },
  })
  console.log('Database schema pushed successfully!')
} catch (error) {
  console.error('Failed to push database schema:', error)
  process.exit(1)
}
