// Standalone migration script - runs with plain `node`, no tsx needed.
// Uses @neondatabase/serverless which is already installed.

import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  console.log('No DATABASE_URL set, skipping migrations.')
  process.exit(0)
}

const sql = neon(process.env.DATABASE_URL)

async function run() {
  // 1. Migration: messages_enabled (boolean) → messages_setting (varchar)
  const cols = await sql(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'creator_profiles'
       AND column_name IN ('messages_setting', 'messages_enabled')`
  )
  const colNames = cols.map((r) => r.column_name)
  console.log('  creator_profiles relevant columns:', colNames.join(', ') || '(none)')

  if (!colNames.includes('messages_setting')) {
    console.log('  Adding messages_setting column...')
    await sql(`ALTER TABLE "creator_profiles" ADD COLUMN "messages_setting" varchar(20) NOT NULL DEFAULT 'all'`)

    if (colNames.includes('messages_enabled')) {
      console.log('  Migrating data from messages_enabled...')
      await sql(`UPDATE "creator_profiles" SET "messages_setting" = CASE WHEN "messages_enabled" = true THEN 'all' ELSE 'disabled' END`)
    }
    console.log('  messages_setting column created.')
  } else {
    console.log('  messages_setting already exists, skipping.')
  }

  if (colNames.includes('messages_enabled')) {
    console.log('  Dropping legacy messages_enabled column...')
    await sql(`ALTER TABLE "creator_profiles" DROP COLUMN "messages_enabled"`)
    console.log('  messages_enabled dropped.')
  }

  // 2. Migration: create document_acceptances table
  await sql(`CREATE TABLE IF NOT EXISTS "document_acceptances" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "document_key" varchar(50) NOT NULL,
    "document_version" varchar(50) NOT NULL,
    "ip_address" varchar(45) NOT NULL,
    "user_agent" text,
    "accepted_at" timestamp with time zone DEFAULT now() NOT NULL
  )`)
  await sql(`CREATE INDEX IF NOT EXISTS "idx_doc_acceptances_user_id" ON "document_acceptances" ("user_id")`)
  await sql(`CREATE INDEX IF NOT EXISTS "idx_doc_acceptances_document_key" ON "document_acceptances" ("document_key")`)
  await sql(`CREATE INDEX IF NOT EXISTS "idx_doc_acceptances_user_document" ON "document_acceptances" ("user_id", "document_key")`)
  console.log('  document_acceptances table ensured.')

  console.log('All migrations complete.')
}

run().catch((err) => {
  console.error('Migration FAILED:', err.message || err)
  process.exit(1)
})
