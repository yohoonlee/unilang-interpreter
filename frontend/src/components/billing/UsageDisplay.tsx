import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatMinutes, formatPrice, type UsageSummary } from '@/types/billing'
import { Clock, MessageSquare, FileText, TrendingUp } from 'lucide-react'

interface UsageDisplayProps {
  usage: UsageSummary
  className?: string
}

export function UsageDisplay({ usage, className }: UsageDisplayProps) {
  const usagePercent = useMemo(() => {
    return Math.min(100, (usage.totalMinutes / usage.includedMinutes) * 100)
  }, [usage.totalMinutes, usage.includedMinutes])

  const isOverage = usage.overageMinutes > 0

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>이번 달 사용량</span>
          <span className="text-sm font-normal text-slate-500">
            {new Date(usage.periodStart).toLocaleDateString()} ~{' '}
            {new Date(usage.periodEnd).toLocaleDateString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 사용량 프로그레스 바 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">
              {formatMinutes(usage.totalMinutes)} / {formatMinutes(usage.includedMinutes)}
            </span>
            <span
              className={cn(
                'text-sm font-medium',
                isOverage ? 'text-amber-600' : 'text-slate-600'
              )}
            >
              {usagePercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${usagePercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                usagePercent >= 100
                  ? 'bg-gradient-to-r from-amber-500 to-red-500'
                  : usagePercent >= 80
                  ? 'bg-gradient-to-r from-primary-500 to-amber-500'
                  : 'bg-gradient-to-r from-primary-400 to-primary-600'
              )}
            />
          </div>
          {isOverage && (
            <p className="text-sm text-amber-600 mt-2">
              ⚠️ 포함 시간을 초과했습니다. 추가 요금이 발생합니다.
            </p>
          )}
        </div>

        {/* 상세 사용량 */}
        <div className="grid sm:grid-cols-3 gap-4">
          <UsageCard
            icon={<Clock className="w-5 h-5" />}
            label="STT 처리"
            value={`${usage.sttMinutes.toFixed(1)}분`}
            color="blue"
          />
          <UsageCard
            icon={<MessageSquare className="w-5 h-5" />}
            label="번역"
            value={`${usage.translationCharacters.toLocaleString()}자`}
            color="emerald"
          />
          <UsageCard
            icon={<FileText className="w-5 h-5" />}
            label="AI 요약"
            value={`${usage.summaryCount}회`}
            color="purple"
          />
        </div>

        {/* 비용 요약 */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>기본 요금</span>
            <span>{formatPrice(usage.baseCost)}</span>
          </div>
          {usage.overageCost > 0 && (
            <div className="flex items-center justify-between text-sm text-amber-600 mb-2">
              <span>초과 사용 ({usage.overageMinutes}분)</span>
              <span>{formatPrice(usage.overageCost)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="font-medium text-slate-900">예상 청구액</span>
            <span className="text-xl font-bold text-primary-600">
              {formatPrice(usage.totalCost)}
            </span>
          </div>
        </div>

        {/* 일별 사용량 차트 (간단 버전) */}
        {usage.dailyUsage.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              일별 사용량
            </h4>
            <div className="flex items-end gap-1 h-20">
              {usage.dailyUsage.map((day, index) => {
                const maxMinutes = Math.max(
                  ...usage.dailyUsage.map((d) => d.minutes)
                )
                const height =
                  maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0

                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'w-full rounded-t-sm min-h-[4px]',
                        day.minutes > 0 ? 'bg-primary-500' : 'bg-slate-200'
                      )}
                      title={`${day.date}: ${day.minutes}분`}
                    />
                    <span className="text-xs text-slate-400">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UsageCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'blue' | 'emerald' | 'purple'
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colors[color])}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

// 사용량 알림 배너
export function UsageAlert({
  percent,
  remainingMinutes,
}: {
  percent: number
  remainingMinutes: number
}) {
  if (percent < 80) return null

  const isOverage = percent >= 100

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center justify-between px-4 py-3 rounded-xl',
        isOverage
          ? 'bg-red-50 border border-red-200'
          : 'bg-amber-50 border border-amber-200'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{isOverage ? '🚨' : '⚠️'}</span>
        <div>
          <p className={cn('font-medium', isOverage ? 'text-red-700' : 'text-amber-700')}>
            {isOverage
              ? '포함 시간을 모두 사용했습니다'
              : `포함 시간의 ${percent.toFixed(0)}%를 사용했습니다`}
          </p>
          <p className={cn('text-sm', isOverage ? 'text-red-600' : 'text-amber-600')}>
            {isOverage
              ? '추가 사용 시 초과 요금이 발생합니다'
              : `남은 시간: ${formatMinutes(remainingMinutes)}`}
          </p>
        </div>
      </div>
      {!isOverage && (
        <a
          href="/pricing"
          className="text-sm font-medium text-amber-700 hover:text-amber-800 underline"
        >
          요금제 업그레이드
        </a>
      )}
    </motion.div>
  )
}

