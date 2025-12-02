import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  PRICING_INFO,
  formatPrice,
  formatMinutes,
  type SubscriptionTier,
} from '@/types/billing'
import { Check, Star, Building2 } from 'lucide-react'

interface PricingPlansProps {
  currentTier?: SubscriptionTier
  onSelectPlan?: (tier: SubscriptionTier) => void
}

const TIER_ICONS = {
  free: '🎁',
  basic: '✨',
  pro: '⚡',
  enterprise: '🏢',
}

const TIER_COLORS = {
  free: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    highlight: 'bg-slate-100',
    button: 'bg-slate-600 hover:bg-slate-700',
  },
  basic: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    highlight: 'bg-blue-100',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  pro: {
    bg: 'bg-gradient-to-br from-primary-50 to-purple-50',
    border: 'border-primary-300',
    highlight: 'bg-primary-100',
    button: 'bg-primary-600 hover:bg-primary-700',
  },
  enterprise: {
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
    border: 'border-amber-200',
    highlight: 'bg-amber-100',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
}

export function PricingPlans({ currentTier, onSelectPlan }: PricingPlansProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="space-y-8">
      {/* 결제 주기 선택 */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              billingCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            월간 결제
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              billingCycle === 'yearly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            연간 결제
            <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
              17% 할인
            </span>
          </button>
        </div>
      </div>

      {/* 요금제 카드 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(Object.keys(PRICING_INFO) as SubscriptionTier[]).map((tier, index) => {
          const info = PRICING_INFO[tier]
          const colors = TIER_COLORS[tier]
          const isCurrentPlan = currentTier === tier
          const isPopular = tier === 'pro'

          return (
            <motion.div
              key={tier}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  'relative h-full flex flex-col',
                  colors.bg,
                  colors.border,
                  'border-2',
                  isPopular && 'ring-2 ring-primary-500 ring-offset-2'
                )}
              >
                {/* 인기 배지 */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> 인기
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="text-3xl mb-2">{TIER_ICONS[tier]}</div>
                  <CardTitle className="text-xl">{info.name}</CardTitle>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  {/* 가격 */}
                  <div className="text-center mb-6">
                    {tier === 'enterprise' ? (
                      <div className="text-3xl font-bold text-slate-900">
                        문의
                      </div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-slate-900">
                          {formatPrice(
                            billingCycle === 'yearly'
                              ? Math.round((info.yearlyPrice || 0) / 12)
                              : info.monthlyPrice
                          )}
                        </div>
                        <div className="text-sm text-slate-500">
                          /{billingCycle === 'yearly' ? '월 (연간 결제)' : '월'}
                        </div>
                        {billingCycle === 'yearly' && info.yearlyPrice && (
                          <div className="text-xs text-slate-400 mt-1">
                            연 {formatPrice(info.yearlyPrice)}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* 핵심 정보 */}
                  <div
                    className={cn(
                      'rounded-xl p-4 mb-6 text-center',
                      colors.highlight
                    )}
                  >
                    <div className="text-2xl font-bold text-slate-900">
                      {formatMinutes(info.includedMinutes)}
                    </div>
                    <div className="text-sm text-slate-600">월 포함 시간</div>
                    <div className="text-xs text-slate-500 mt-1">
                      초과 시 {formatPrice(info.overageRate)}/분
                    </div>
                  </div>

                  {/* 기능 목록 */}
                  <ul className="space-y-3 mb-6 flex-1">
                    <FeatureItem>
                      최대 {info.maxLanguages}개 언어
                    </FeatureItem>
                    <FeatureItem available={info.summaryEnabled}>
                      AI 요약 기능
                    </FeatureItem>
                    <FeatureItem available={info.apiAccess}>
                      API 접근
                    </FeatureItem>
                    <FeatureItem>
                      기록 {info.storageDays}일 보관
                    </FeatureItem>
                  </ul>

                  {/* 버튼 */}
                  {isCurrentPlan ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled
                    >
                      현재 요금제
                    </Button>
                  ) : tier === 'enterprise' ? (
                    <Button
                      className={cn('w-full text-white', colors.button)}
                      onClick={() => window.open('mailto:sales@unilang.ai')}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      영업팀 문의
                    </Button>
                  ) : (
                    <Button
                      className={cn('w-full text-white', colors.button)}
                      onClick={() => onSelectPlan?.(tier)}
                    >
                      {tier === 'free' ? '무료로 시작' : '선택하기'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* 종량제 안내 */}
      <div className="text-center p-6 bg-slate-50 rounded-2xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          💡 종량제 (Pay-as-you-go)
        </h3>
        <p className="text-slate-600 mb-2">
          요금제 없이 사용한 만큼만 지불하세요
        </p>
        <p className="text-2xl font-bold text-slate-900">
          ₩250<span className="text-base font-normal text-slate-500">/분</span>
        </p>
        <p className="text-sm text-slate-500 mt-2">
          최소 과금 단위: 1분 | 10초 단위 반올림
        </p>
      </div>
    </div>
  )
}

// 기능 항목
function FeatureItem({
  children,
  available = true,
}: {
  children: React.ReactNode
  available?: boolean
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-2 text-sm',
        available ? 'text-slate-700' : 'text-slate-400'
      )}
    >
      <Check
        className={cn(
          'w-4 h-4 flex-shrink-0',
          available ? 'text-emerald-500' : 'text-slate-300'
        )}
      />
      {children}
    </li>
  )
}

// 비용 예측 컴포넌트
export function CostEstimator() {
  const [minutes, setMinutes] = useState(60)
  const [languages, setLanguages] = useState(1)

  // API 원가 계산 (USD)
  const sttCostUsd = minutes * 0.036
  const translationCostUsd = (minutes * 500 * 0.00002) * languages
  const totalCostUsd = sttCostUsd + translationCostUsd

  // 소비자가 (KRW)
  const payAsYouGo = minutes * 250
  const basicCost = 9900 + Math.max(0, minutes - 300) * 200
  const proCost = 29900 + Math.max(0, minutes - 1200) * 150

  return (
    <Card>
      <CardHeader>
        <CardTitle>비용 계산기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 사용량 입력 */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              예상 사용 시간 (분)
            </label>
            <input
              type="number"
              min={1}
              max={10000}
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              번역 대상 언어 수
            </label>
            <input
              type="number"
              min={1}
              max={14}
              value={languages}
              onChange={(e) => setLanguages(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* 원가 정보 */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <h4 className="text-sm font-medium text-slate-600 mb-2">
            API 원가 (참고)
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                ${sttCostUsd.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">STT</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">
                ${translationCostUsd.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">번역</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-primary-600">
                ${totalCostUsd.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">합계</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            ≈ ₩{Math.round(totalCostUsd * 1350).toLocaleString()} (환율 1,350원 기준)
          </p>
        </div>

        {/* 요금제별 비용 */}
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-3">
            요금제별 예상 비용
          </h4>
          <div className="space-y-2">
            <CostRow
              label="종량제"
              cost={payAsYouGo}
              highlight={payAsYouGo <= basicCost && payAsYouGo <= proCost}
            />
            <CostRow
              label="베이직"
              cost={basicCost}
              highlight={basicCost < payAsYouGo && basicCost <= proCost}
            />
            <CostRow
              label="프로"
              cost={proCost}
              highlight={proCost < payAsYouGo && proCost < basicCost}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CostRow({
  label,
  cost,
  highlight,
}: {
  label: string
  cost: number
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 rounded-lg',
        highlight ? 'bg-primary-50 border border-primary-200' : 'bg-slate-50'
      )}
    >
      <span className={cn('font-medium', highlight ? 'text-primary-700' : 'text-slate-700')}>
        {label}
        {highlight && (
          <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
            추천
          </span>
        )}
      </span>
      <span className={cn('font-bold', highlight ? 'text-primary-700' : 'text-slate-900')}>
        ₩{cost.toLocaleString()}
      </span>
    </div>
  )
}

