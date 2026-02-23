import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Skipping migrations.')
  process.exit(0)
}

const sql = neon(process.env.DATABASE_URL)

interface Migration {
  name: string
  up: string
}

const migrations: Migration[] = [
  {
    name: '0001_add-document-acceptances',
    up: `
      CREATE TABLE IF NOT EXISTS "document_acceptances" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "document_key" varchar(50) NOT NULL,
        "document_version" varchar(50) NOT NULL,
        "ip_address" varchar(45) NOT NULL,
        "user_agent" text,
        "accepted_at" timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_doc_acceptances_user_id" ON "document_acceptances" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_doc_acceptances_document_key" ON "document_acceptances" ("document_key");
      CREATE INDEX IF NOT EXISTS "idx_doc_acceptances_user_document" ON "document_acceptances" ("user_id", "document_key");
    `,
  },
  {
    name: '0002_add-messages-setting',
    up: `
      DO $$
      BEGIN
        -- Add messages_setting column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'creator_profiles' AND column_name = 'messages_setting'
        ) THEN
          ALTER TABLE "creator_profiles"
            ADD COLUMN "messages_setting" varchar(20) NOT NULL DEFAULT 'all';

          -- Migrate data from messages_enabled if that column exists
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'creator_profiles' AND column_name = 'messages_enabled'
          ) THEN
            UPDATE "creator_profiles"
              SET "messages_setting" = CASE
                WHEN "messages_enabled" = true THEN 'all'
                ELSE 'disabled'
              END;
          END IF;
        END IF;

        -- Drop old column if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'creator_profiles' AND column_name = 'messages_enabled'
        ) THEN
          ALTER TABLE "creator_profiles" DROP COLUMN "messages_enabled";
        END IF;
      END $$;
    `,
  },
]

async function runMigrations() {
  console.log('Running migrations...')

  // Create migrations tracking table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS "_migrations" (
      "name" varchar(255) PRIMARY KEY,
      "applied_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `

  for (const migration of migrations) {
    // Check if already applied
    const [existing] = await sql`
      SELECT 1 FROM "_migrations" WHERE "name" = ${migration.name}
    `
    if (existing) {
      console.log(`  [skip] ${migration.name} (already applied)`)
      continue
    }

    console.log(`  [run]  ${migration.name}`)
    try {
      await sql(migration.up)
      await sql`INSERT INTO "_migrations" ("name") VALUES (${migration.name})`
      console.log(`  [done] ${migration.name}`)
    } catch (err) {
      console.error(`  [FAIL] ${migration.name}:`, err)
      process.exit(1)
    }
  }

  console.log('All migrations complete.')
}

runMigrations().catch((err) => {
  console.error('Migration runner failed:', err)
  process.exit(1)
})
