/**
 * 과금 관련 타입 정의
 */

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise'

export type BillingStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'

export interface PricingPlan {
  tier: SubscriptionTier
  name: string
  monthlyPrice: number | null
  yearlyPrice: number | null
  includedMinutes: number
  overageRate: number
  maxLanguages: number
  summaryEnabled: boolean
  apiAccess: boolean
  storageDays: number
  features: string[]
}

export interface Subscription {
  id: string
  userId: string
  tier: SubscriptionTier
  tierInfo: PricingPlan
  startedAt: string
  expiresAt?: string
  isActive: boolean
  monthlyIncludedMinutes: number
  currentMonthUsageMinutes: number
  remainingMinutes: number
  autoRenew: boolean
}

export interface UsageRecord {
  id: string
  userId: string
  sessionId?: string
  usageType: 'stt' | 'translation' | 'summary'
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
  metadata: Record<string, any>
  recordedAt: string
}

export interface UsageSummary {
  periodStart: string
  periodEnd: string
  totalMinutes: number
  includedMinutes: number
  overageMinutes: number
  sttMinutes: number
  translationCharacters: number
  summaryCount: number
  baseCost: number
  overageCost: number
  totalCost: number
  dailyUsage: {
    date: string
    minutes: number
    cost: number
  }[]
}

export interface Invoice {
  id: string
  userId: string
  billingPeriodStart: string
  billingPeriodEnd: string
  subtotal: number
  usageCharges: number
  discount: number
  tax: number
  total: number
  currency: string
  status: BillingStatus
  paidAt?: string
  lineItems: {
    description: string
    quantity: number
    unit: string
    unitPrice: number
    amount: number
  }[]
  createdAt: string
}

export interface Credit {
  id: string
  userId: string
  amount: number
  remaining: number
  expiresAt?: string
  purchasePrice?: number
  purchaseDate: string
  isActive: boolean
}

export interface CreditBalance {
  totalRemaining: number
  credits: Credit[]
}

export interface EstimatedCost {
  durationMinutes: number
  targetLanguageCount: number
  sttCostUsd: number
  translationCostUsd: number
  totalCostUsd: number
  consumerPriceKrw: number
  byTier: Record<string, number | null>
}

// 요금제 정보 (하드코딩)
export const PRICING_INFO: Record<SubscriptionTier, Omit<PricingPlan, 'features'>> = {
  free: {
    tier: 'free',
    name: '무료 체험',
    monthlyPrice: 0,
    yearlyPrice: 0,
    includedMinutes: 30,
    overageRate: 250,
    maxLanguages: 3,
    summaryEnabled: false,
    apiAccess: false,
    storageDays: 7,
  },
  basic: {
    tier: 'basic',
    name: '베이직',
    monthlyPrice: 9900,
    yearlyPrice: 99000,
    includedMinutes: 300,
    overageRate: 200,
    maxLanguages: 5,
    summaryEnabled: true,
    apiAccess: false,
    storageDays: 30,
  },
  pro: {
    tier: 'pro',
    name: '프로',
    monthlyPrice: 29900,
    yearlyPrice: 299000,
    includedMinutes: 1200,
    overageRate: 150,
    maxLanguages: 14,
    summaryEnabled: true,
    apiAccess: true,
    storageDays: 90,
  },
  enterprise: {
    tier: 'enterprise',
    name: '엔터프라이즈',
    monthlyPrice: null,
    yearlyPrice: null,
    includedMinutes: 999999,
    overageRate: 100,
    maxLanguages: 14,
    summaryEnabled: true,
    apiAccess: true,
    storageDays: 365,
  },
}

// 가격 포맷
export function formatPrice(price: number | null): string {
  if (price === null) return '문의'
  if (price === 0) return '무료'
  return `₩${price.toLocaleString()}`
}

// 분을 시간:분으로 변환
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}분`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}시간`
  return `${hours}시간 ${mins}분`
}

