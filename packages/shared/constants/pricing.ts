export const PLATFORM_FEES = {
  subscription: 0.15,
  tip: 0.15,
  ppv: 0.15,
  fancoin_purchase: 0.15,
  marketplace: 0.15,
  top_creator_subscription: 0.15,
  introductory: 0.15,
} as const

export const PAYOUT_CONFIG = {
  minPayout: 50.0,
  payoutDays: [1, 15],
  pixProcessingTime: '24-48h',
  bankTransferProcessingTime: '1-3 business days',
  cryptoProcessingTime: '10-30 minutes',
  manualApprovalThreshold: 500.0,
  cooldownHours: 24,
  maxDailyWithdrawals: 3,
  maxDailyAmount: 10000.0,
  fancoinToBrl: 0.01,
} as const

export const PAYMENT_PROVIDERS = {
  mercadopago: { label: 'MercadoPago', methods: ['pix', 'credit_card'] as const },
  nowpayments: { label: 'Crypto', methods: ['crypto'] as const },
  paypal: { label: 'PayPal', methods: ['paypal'] as const },
} as const

export const WITHDRAWAL_METHODS = {
  pix: { label: 'PIX', minAmount: 10.0, processingTime: '24-48 horas' },
  bank_transfer: { label: 'Transferencia Bancaria', minAmount: 50.0, processingTime: '1-3 dias uteis' },
  crypto: { label: 'Crypto (USDT)', minAmount: 20.0, processingTime: '10-30 minutos' },
} as const

export const SUBSCRIPTION_LIMITS = {
  minPrice: 5.0,
  maxPrice: 5000.0,
  maxTiers: 5,
  currency: 'BRL',
} as const

export const TIP_LIMITS = {
  minTip: 1.0,
  maxTip: 50000.0,
} as const

export const CUSTOM_PURCHASE_LIMITS = {
  minBrl: 1.0,
  maxBrl: 10000.0,
  minCoins: 100,
  maxCoins: 1000000,
  /** Base rate: 1 FanCoin = R$0.01 (no bonus for custom amounts) */
  brlPerCoin: 0.01,
} as const

export const TOP_CREATOR_THRESHOLD = 50000
