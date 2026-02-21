-- Migration: Convert messages_enabled (boolean) to messages_setting (varchar)
-- Values: 'all' (anyone can message), 'subscribers' (only active subscribers), 'disabled' (no messages)

ALTER TABLE "creator_profiles"
  ADD COLUMN "messages_setting" varchar(20) NOT NULL DEFAULT 'all';

-- Migrate existing data: true -> 'all', false -> 'disabled'
UPDATE "creator_profiles"
  SET "messages_setting" = CASE
    WHEN "messages_enabled" = true THEN 'all'
    ELSE 'disabled'
  END;

ALTER TABLE "creator_profiles"
  DROP COLUMN "messages_enabled";
