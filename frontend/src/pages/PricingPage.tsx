import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PricingPlans, CostEstimator } from '@/components/billing/PricingPlans'
import { toast } from '@/components/ui/Toaster'
import { type SubscriptionTier } from '@/types/billing'
import { ArrowLeft, HelpCircle } from 'lucide-react'

export default function PricingPage() {
  const navigate = useNavigate()
  const [currentTier] = useState<SubscriptionTier>('free') // TODO: API에서 가져오기

  const handleSelectPlan = async (tier: SubscriptionTier) => {
    if (tier === 'free') {
      toast.success('무료 요금제가 활성화되었습니다')
      return
    }

    // TODO: 결제 페이지로 이동 또는 결제 모달 표시
    toast.info(`${tier} 요금제 결제 페이지로 이동합니다`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/30">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>뒤로</span>
            </button>
            
            <h1 className="text-xl font-bold text-slate-900">
              요금제
            </h1>
            
            <div className="w-20" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 헤로 섹션 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            나에게 맞는 요금제를 선택하세요
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            UniLang Interpreter로 언어 장벽 없는 소통을 경험하세요.
            <br />
            모든 요금제에서 14개 언어를 지원합니다.
          </p>
        </motion.div>

        {/* 요금제 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <PricingPlans
            currentTier={currentTier}
            onSelectPlan={handleSelectPlan}
          />
        </motion.div>

        {/* 비용 계산기 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            💡 나에게 맞는 요금제 찾기
          </h2>
          <div className="max-w-xl mx-auto">
            <CostEstimator />
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            자주 묻는 질문
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            <FAQItem
              question="요금제는 언제든 변경할 수 있나요?"
              answer="네, 언제든지 업그레이드하거나 다운그레이드할 수 있습니다. 업그레이드 시 즉시 적용되며, 다운그레이드는 현재 결제 주기가 끝난 후 적용됩니다."
            />
            <FAQItem
              question="포함 시간을 다 쓰면 어떻게 되나요?"
              answer="포함 시간을 모두 사용하면 초과 요금이 적용됩니다. 요금제별로 분당 ₩150~₩250의 초과 요금이 부과됩니다. 사용량 80% 도달 시 알림을 보내드립니다."
            />
            <FAQItem
              question="환불 정책은 어떻게 되나요?"
              answer="결제 후 7일 이내에 서비스를 이용하지 않은 경우 100% 환불이 가능합니다. 크레딧의 경우 미사용 잔액은 언제든 환불 가능합니다."
            />
            <FAQItem
              question="팀이나 기업용 플랜이 있나요?"
              answer="네, 엔터프라이즈 플랜에서 팀 기능, 관리자 대시보드, 전용 지원 등을 제공합니다. 자세한 내용은 영업팀에 문의해 주세요."
            />
            <FAQItem
              question="어떤 결제 수단을 지원하나요?"
              answer="신용카드(Visa, Mastercard, AMEX), 카카오페이, 네이버페이, 계좌이체를 지원합니다. 기업 고객의 경우 청구서 결제도 가능합니다."
            />
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary-500 to-accent-500 text-white border-0">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">
                아직 고민 중이신가요?
              </h3>
              <p className="mb-6 text-white/90">
                무료 체험으로 시작해보세요. 매월 30분 무료로 사용하실 수 있습니다.
              </p>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/media-source')}
                className="bg-white text-primary-600 hover:bg-white/90"
              >
                무료로 시작하기
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}

// FAQ 아이템 컴포넌트
function FAQItem({
  question,
  answer,
}: {
  question: string
  answer: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isOpen ? 'ring-2 ring-primary-200' : ''
      }`}
      onClick={() => setIsOpen(!isOpen)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-slate-900">{question}</h4>
            {isOpen && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-slate-600 mt-2"
              >
                {answer}
              </motion.p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

