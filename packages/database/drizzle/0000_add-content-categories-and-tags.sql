CREATE TYPE "public"."kyc_status" AS ENUM('none', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('fan', 'creator', 'admin');--> statement-breakpoint
CREATE TABLE "affiliate_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_user_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"commission_percent" numeric(5, 2) NOT NULL,
	"amount_brl" numeric(12, 2) NOT NULL,
	"coins_credit" integer NOT NULL,
	"status" varchar(20) DEFAULT 'credited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"commission_percent" numeric(5, 2) NOT NULL,
	CONSTRAINT "unique_creator_level" UNIQUE("creator_id","level")
);
--> statement-breakpoint
CREATE TABLE "affiliate_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_user_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"total_earned" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_links_code_unique" UNIQUE("code"),
	CONSTRAINT "unique_affiliate_creator" UNIQUE("affiliate_user_id","creator_id")
);
--> statement-breakpoint
CREATE TABLE "affiliate_programs" (
	"creator_id" uuid PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"max_levels" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"l1_affiliate_id" uuid NOT NULL,
	"l2_affiliate_id" uuid,
	"link_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_referral_creator" UNIQUE("referred_user_id","creator_id")
);
--> statement-breakpoint
CREATE TABLE "creator_bonuses" (
	"creator_id" uuid PRIMARY KEY NOT NULL,
	"bonus_coins" integer NOT NULL,
	"required_subscribers" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"is_adult" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonus_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"total_amount" integer NOT NULL,
	"unlocked_amount" integer DEFAULT 0 NOT NULL,
	"spent_amount" integer DEFAULT 0 NOT NULL,
	"vesting_rule" varchar(20) DEFAULT 'never' NOT NULL,
	"vesting_rate" numeric(5, 4),
	"vesting_revenue_required" numeric(12, 2),
	"vesting_revenue_accumulated" numeric(12, 2) DEFAULT '0',
	"vesting_unlock_at" timestamp with time zone,
	"vesting_condition" varchar(255),
	"vesting_complete" boolean DEFAULT false NOT NULL,
	"reference_id" uuid,
	"description" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fan_commitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fan_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"duration_days" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"bonus_granted" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"category" varchar(50),
	"tags" text[],
	"subscription_price" numeric(10, 2),
	"is_verified" boolean DEFAULT false NOT NULL,
	"verification_doc" text,
	"payout_method" varchar(20),
	"payout_details" jsonb,
	"commission_rate" numeric(4, 2) DEFAULT '12.00' NOT NULL,
	"total_earnings" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_subscribers" integer DEFAULT 0 NOT NULL,
	"creator_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"welcome_message" text,
	"messages_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_promos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"duration_days" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"description" text,
	"benefits" jsonb,
	"badge_url" text,
	"max_slots" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fancoin_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"amount" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"reference_id" uuid,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fancoin_wallets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"bonus_balance" bigint DEFAULT 0 NOT NULL,
	"total_earned" bigint DEFAULT 0 NOT NULL,
	"total_spent" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon_url" text NOT NULL,
	"category" varchar(30),
	"rarity" varchar(20) DEFAULT 'common' NOT NULL,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badges_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "daily_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"action_type" varchar(30),
	"target_count" integer DEFAULT 1 NOT NULL,
	"xp_reward" integer DEFAULT 10 NOT NULL,
	"fancoin_reward" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid,
	"user_id" uuid NOT NULL,
	"period" varchar(10) NOT NULL,
	"score" bigint DEFAULT 0 NOT NULL,
	"rank" integer,
	"snapshot_date" date DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "user_gamification" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"xp" bigint DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_active_date" date,
	"fan_tier" varchar(20) DEFAULT 'bronze' NOT NULL,
	"missions_completed" integer DEFAULT 0 NOT NULL,
	"total_badges" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_mission_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mission_id" uuid NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "unique_user_mission_date" UNIQUE("user_id","mission_id","date")
);
--> statement-breakpoint
CREATE TABLE "guild_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"total_contributed" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_guild_member" UNIQUE("guild_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "guild_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"price_paid" numeric(10, 2) NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_guild_sub" UNIQUE("guild_id","fan_id")
);
--> statement-breakpoint
CREATE TABLE "guild_treasury_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"description" varchar(255),
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"avatar_url" text,
	"cover_url" text,
	"category" varchar(50),
	"leader_id" uuid NOT NULL,
	"co_leader_id" uuid,
	"max_members" integer DEFAULT 20 NOT NULL,
	"treasury_contribution_percent" numeric(4, 2) DEFAULT '3.00' NOT NULL,
	"treasury_balance" integer DEFAULT 0 NOT NULL,
	"combo_subscription_price" numeric(10, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_recruiting" boolean DEFAULT true NOT NULL,
	"min_creator_score" integer DEFAULT 50 NOT NULL,
	"total_members" integer DEFAULT 1 NOT NULL,
	"total_subscribers" integer DEFAULT 0 NOT NULL,
	"total_earnings" numeric(12, 2) DEFAULT '0' NOT NULL,
	"wars_won" integer DEFAULT 0 NOT NULL,
	"wars_played" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guilds_name_unique" UNIQUE("name"),
	CONSTRAINT "guilds_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_1" uuid NOT NULL,
	"participant_2" uuid NOT NULL,
	"last_message_at" timestamp with time zone,
	"last_message_preview" text,
	"is_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_conversation" UNIQUE("participant_1","participant_2")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text,
	"media_url" text,
	"media_type" varchar(10),
	"is_ppv" boolean DEFAULT false NOT NULL,
	"ppv_price" numeric(10, 2),
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipient_id" uuid,
	"type" varchar(30) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"platform_fee" numeric(10, 2),
	"creator_amount" numeric(10, 2),
	"payment_provider" varchar(30),
	"provider_tx_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"fancoin_amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"method" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"pix_key" varchar(255),
	"bank_details" jsonb,
	"crypto_address" varchar(255),
	"crypto_network" varchar(30),
	"requires_manual_approval" boolean DEFAULT false NOT NULL,
	"approved_by" uuid,
	"rejected_reason" text,
	"risk_score" integer DEFAULT 0,
	"risk_flags" jsonb,
	"ip_address" varchar(45),
	"provider_tx_id" varchar(255),
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pitch_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"cover_image_url" text,
	"category" varchar(50),
	"goal_amount" integer NOT NULL,
	"raised_amount" integer DEFAULT 0 NOT NULL,
	"total_contributors" integer DEFAULT 0 NOT NULL,
	"reward_tiers" jsonb DEFAULT '[]' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"duration_days" integer DEFAULT 30 NOT NULL,
	"ends_at" timestamp with time zone,
	"delivery_deadline_days" integer DEFAULT 90 NOT NULL,
	"delivered_at" timestamp with time zone,
	"average_rating" numeric(3, 2),
	"total_ratings" integer DEFAULT 0 NOT NULL,
	"cancelled_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pitch_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reward_tier_index" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"rating" integer,
	"rating_comment" text,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pitch_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"whatsapp" varchar(20),
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cookie_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"accepted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(6) NOT NULL,
	"purpose" varchar(30) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_bookmarks" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_bookmarks_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"parent_id" uuid,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "post_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"media_type" varchar(10) NOT NULL,
	"storage_key" text NOT NULL,
	"thumbnail_url" text,
	"duration" integer,
	"width" integer,
	"height" integer,
	"file_size" integer,
	"is_preview" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"blurhash" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_code" varchar(12),
	"creator_id" uuid NOT NULL,
	"content_text" text,
	"post_type" varchar(20) DEFAULT 'regular' NOT NULL,
	"visibility" varchar(20) DEFAULT 'subscribers' NOT NULL,
	"tier_id" uuid,
	"category_id" uuid,
	"subcategory" varchar(30),
	"tags" text[],
	"ppv_price" numeric(10, 2),
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"tip_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_moderation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar(20) NOT NULL,
	"content_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"result" jsonb,
	"action" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" varchar(50) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fan_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"tier_id" uuid,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"price_paid" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"payment_provider" varchar(20),
	"provider_sub_id" varchar(255),
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_fan_creator" UNIQUE("fan_id","creator_id")
);
--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_front_key" text NOT NULL,
	"document_back_key" text NOT NULL,
	"selfie_key" text NOT NULL,
	"status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"rejected_reason" text,
	"reviewed_by" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"notification_email" boolean DEFAULT true NOT NULL,
	"notification_push" boolean DEFAULT true NOT NULL,
	"notification_messages" boolean DEFAULT true NOT NULL,
	"privacy_show_online" boolean DEFAULT true NOT NULL,
	"privacy_show_activity" boolean DEFAULT true NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" varchar(255),
	"theme" varchar(10) DEFAULT 'dark',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"display_name" varchar(100),
	"password_hash" varchar(255) NOT NULL,
	"avatar_url" text,
	"cover_url" text,
	"bio" text,
	"role" "user_role" DEFAULT 'fan' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"kyc_status" "kyc_status" DEFAULT 'none' NOT NULL,
	"date_of_birth" date,
	"country" varchar(2),
	"language" varchar(5) DEFAULT 'pt-BR',
	"timezone" varchar(50),
	"profile_views" integer DEFAULT 0 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "post_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid,
	"ip_address" varchar(45),
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_view_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_user_id" uuid NOT NULL,
	"viewer_user_id" uuid,
	"ip_address" varchar(45),
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliate_user_id_users_id_fk" FOREIGN KEY ("affiliate_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_levels" ADD CONSTRAINT "affiliate_levels_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_affiliate_user_id_users_id_fk" FOREIGN KEY ("affiliate_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_programs" ADD CONSTRAINT "affiliate_programs_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_l1_affiliate_id_users_id_fk" FOREIGN KEY ("l1_affiliate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_l2_affiliate_id_users_id_fk" FOREIGN KEY ("l2_affiliate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_link_id_affiliate_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."affiliate_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_bonuses" ADD CONSTRAINT "creator_bonuses_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_grants" ADD CONSTRAINT "bonus_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_commitments" ADD CONSTRAINT "fan_commitments_fan_id_users_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_commitments" ADD CONSTRAINT "fan_commitments_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_promos" ADD CONSTRAINT "subscription_promos_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_tiers" ADD CONSTRAINT "subscription_tiers_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fancoin_transactions" ADD CONSTRAINT "fancoin_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fancoin_wallets" ADD CONSTRAINT "fancoin_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_mission_id_daily_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."daily_missions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_subscriptions" ADD CONSTRAINT "guild_subscriptions_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_subscriptions" ADD CONSTRAINT "guild_subscriptions_fan_id_users_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_treasury_transactions" ADD CONSTRAINT "guild_treasury_transactions_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_treasury_transactions" ADD CONSTRAINT "guild_treasury_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_treasury_transactions" ADD CONSTRAINT "guild_treasury_transactions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_leader_id_users_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_co_leader_id_users_id_fk" FOREIGN KEY ("co_leader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_1_users_id_fk" FOREIGN KEY ("participant_1") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_2_users_id_fk" FOREIGN KEY ("participant_2") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pitch_campaigns" ADD CONSTRAINT "pitch_campaigns_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pitch_contributions" ADD CONSTRAINT "pitch_contributions_campaign_id_pitch_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."pitch_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pitch_contributions" ADD CONSTRAINT "pitch_contributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pitch_updates" ADD CONSTRAINT "pitch_updates_campaign_id_pitch_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."pitch_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cookie_consents" ADD CONSTRAINT "cookie_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_tier_id_subscription_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_content_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."content_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_fan_id_users_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tier_id_subscription_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_view_logs" ADD CONSTRAINT "profile_view_logs_profile_user_id_users_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_view_logs" ADD CONSTRAINT "profile_view_logs_viewer_user_id_users_id_fk" FOREIGN KEY ("viewer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_commissions_affiliate" ON "affiliate_commissions" USING btree ("affiliate_user_id");--> statement-breakpoint
CREATE INDEX "idx_commissions_creator" ON "affiliate_commissions" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_commissions_payment" ON "affiliate_commissions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_affiliate_links_code" ON "affiliate_links" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_affiliate_links_affiliate" ON "affiliate_links" USING btree ("affiliate_user_id");--> statement-breakpoint
CREATE INDEX "idx_referrals_l1" ON "affiliate_referrals" USING btree ("l1_affiliate_id");--> statement-breakpoint
CREATE INDEX "idx_referrals_l2" ON "affiliate_referrals" USING btree ("l2_affiliate_id");--> statement-breakpoint
CREATE INDEX "idx_referrals_creator" ON "affiliate_referrals" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_content_categories_slug" ON "content_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_content_categories_name" ON "content_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_bonus_grants_user" ON "bonus_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_bonus_grants_type" ON "bonus_grants" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_bonus_grants_status" ON "bonus_grants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_commitments_fan" ON "fan_commitments" USING btree ("fan_id");--> statement-breakpoint
CREATE INDEX "idx_commitments_creator" ON "fan_commitments" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_commitments_status" ON "fan_commitments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_fancoin_tx_user_id" ON "fancoin_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_leaderboard_period" ON "leaderboard_snapshots" USING btree ("period","snapshot_date","rank");--> statement-breakpoint
CREATE INDEX "idx_guild_members_user" ON "guild_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_guild_subs_fan" ON "guild_subscriptions" USING btree ("fan_id");--> statement-breakpoint
CREATE INDEX "idx_guild_treasury_guild" ON "guild_treasury_transactions" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_payments_user_id" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payments_recipient_id" ON "payments" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "idx_payments_created_at" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_payouts_creator_id" ON "payouts" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_payouts_status" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payouts_created_at" ON "payouts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_pitch_creator" ON "pitch_campaigns" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_pitch_status" ON "pitch_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pitch_contrib_campaign" ON "pitch_contributions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_pitch_contrib_user" ON "pitch_contributions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_pitch_updates_campaign" ON "pitch_updates" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_contact_messages_is_read" ON "contact_messages" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_contact_messages_created_at" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_cookie_consents_ip" ON "cookie_consents" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "idx_cookie_consents_created_at" ON "cookie_consents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_otp_codes_user_id" ON "otp_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_otp_codes_expires_at" ON "otp_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_posts_creator_id" ON "posts" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_posts_published_at" ON "posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_posts_visibility" ON "posts" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_posts_category_id" ON "posts" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_posts_short_code" ON "posts" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_fan_id" ON "subscriptions" USING btree ("fan_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_creator_id" ON "subscriptions" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_kyc_documents_user_id" ON "kyc_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_kyc_documents_status" ON "kyc_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_post_views_post_user" ON "post_views" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_post_views_post_ip" ON "post_views" USING btree ("post_id","ip_address");--> statement-breakpoint
CREATE INDEX "idx_post_views_viewed_at" ON "post_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "idx_profile_views_profile_viewer" ON "profile_view_logs" USING btree ("profile_user_id","viewer_user_id");--> statement-breakpoint
CREATE INDEX "idx_profile_views_profile_ip" ON "profile_view_logs" USING btree ("profile_user_id","ip_address");--> statement-breakpoint
CREATE INDEX "idx_profile_views_viewed_at" ON "profile_view_logs" USING btree ("viewed_at");