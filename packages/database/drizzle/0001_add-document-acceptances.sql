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
