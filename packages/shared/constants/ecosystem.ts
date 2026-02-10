/** Ecosystem Fund: 1% of every FanCoin transaction goes to the ecosystem fund */
export const ECOSYSTEM_FUND_RATE = 0.01

/** Fan Commitment configuration */
export const COMMITMENT_CONFIG = {
  durations: [30, 60, 90] as const,
  /** Bonus percentage granted at completion (non-withdrawable) */
  completionBonusRate: 0.05,
  /** Early withdrawal penalty: 10% of locked amount */
  earlyWithdrawalPenalty: 0.10,
  /** Minimum commitment amount in FanCoins */
  minAmount: 100,
  /** Maximum commitment amount in FanCoins */
  maxAmount: 1_000_000,
} as const

/** Guild configuration */
export const GUILD_CONFIG = {
  maxMembers: 20,
  minCreatorScore: 50,
  defaultTreasuryContributionPercent: 3.0,
  maxTreasuryContributionPercent: 10.0,
  minComboSubscriptionPrice: 10.0,
} as const

/** FanDreamsPitch (crowdfunding) configuration */
export const PITCH_CONFIG = {
  minGoal: 1000,
  maxGoal: 10_000_000,
  minDurationDays: 7,
  maxDurationDays: 90,
  defaultDurationDays: 30,
  deliveryDeadlineDays: 90,
  /** Platform fee on pitch contributions */
  platformFeeRate: 0.05,
  /** Max reward tiers per campaign */
  maxRewardTiers: 10,
} as const

/** Creator Score weights (sum = 1.0) */
export const CREATOR_SCORE_WEIGHTS = {
  /** Engagement: likes, comments, tips per post ratio */
  engagement: 0.25,
  /** Consistency: posting frequency */
  consistency: 0.20,
  /** Subscriber retention rate */
  retention: 0.20,
  /** Earnings growth and monetization */
  monetization: 0.15,
  /** Response rate and speed to messages */
  responsiveness: 0.10,
  /** Absence of reports, content quality */
  quality: 0.10,
} as const

/** Fan Tier spending power multipliers */
export const FAN_TIER_MULTIPLIERS = {
  bronze: 1.0,
  silver: 1.05,
  gold: 1.10,
  diamond: 1.20,
  obsidian: 1.30,
} as const
