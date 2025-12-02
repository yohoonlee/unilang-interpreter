"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const plans = [
  {
    name: "무료 체험",
    price: "₩0",
    period: "월",
    description: "서비스 체험을 위한 무료 플랜",
    features: [
      "월 30분 실시간 통역",
      "3개 언어 지원",
      "기본 음성 인식",
      "회의 기록 저장 (7일)",
    ],
    buttonText: "무료로 시작",
    popular: false,
  },
  {
    name: "베이직",
    price: "₩9,900",
    period: "월",
    description: "개인 및 소규모 팀을 위한 플랜",
    features: [
      "월 5시간 실시간 통역",
      "초과 시 ₩200/분",
      "5개 언어 지원",
      "AI 회의 요약",
      "회의 기록 저장 (30일)",
    ],
    buttonText: "베이직 시작",
    popular: false,
  },
  {
    name: "프로",
    price: "₩29,900",
    period: "월",
    description: "전문가와 팀을 위한 고급 기능",
    features: [
      "월 20시간 실시간 통역",
      "초과 시 ₩150/분",
      "14개 언어 전체 지원",
      "고급 AI 음성 인식",
      "AI 회의 요약",
      "회의 기록 저장 (90일)",
      "API 접근",
    ],
    buttonText: "프로 시작하기",
    popular: true,
  },
  {
    name: "엔터프라이즈",
    price: "문의",
    period: "",
    description: "대기업을 위한 맞춤 솔루션",
    features: [
      "무제한 실시간 통역",
      "전용 서버 제공",
      "SLA 99.9% 보장",
      "커스텀 통합 지원",
      "전담 계정 관리자",
      "온프레미스 배포 옵션",
    ],
    buttonText: "문의하기",
    popular: false,
  },
]

export function PricingSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="pricing" ref={sectionRef} className="py-24 relative section-gradient-light">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-900/50 dark:to-slate-950 -z-10" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <span className="gradient-text">요금제</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">비즈니스 규모에 맞는 플랜을 선택하세요</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-start">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Popular plan with gradient border */}
              <div className={`relative ${plan.popular ? "md:-mt-4" : ""}`}>
                {plan.popular && (
                  <>
                    {/* Gradient border wrapper */}
                    <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-500 animate-gradient opacity-90" />
                    {/* Glow effect */}
                    <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-500/30 via-cyan-500/20 to-purple-500/30 blur-2xl animate-pulse-glow" />
                  </>
                )}

                <Card
                  className={`relative h-full ${
                    plan.popular
                      ? "rounded-3xl border-0 shadow-2xl shadow-blue-500/25 bg-gradient-to-b from-white/98 to-slate-50/95 dark:from-slate-900/98 dark:to-slate-950/95"
                      : "glass-panel premium-card rounded-2xl"
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-500 border-0 px-4 py-1.5 shadow-lg shadow-blue-500/40 gap-1">
                      <Sparkles className="h-3 w-3" />
                      인기
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-2 pt-8">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                    <div className="pt-6">
                      <span className={`text-5xl font-bold ${plan.popular ? "gradient-text" : "text-foreground"}`}>
                        {plan.price}
                      </span>
                      {plan.period && <span className="text-muted-foreground">/{plan.period}</span>}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6">
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              plan.popular
                                ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md shadow-blue-500/30"
                                : "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20"
                            }`}
                          >
                            <Check className={`h-3 w-3 ${plan.popular ? "text-white" : "text-blue-600"}`} />
                          </div>
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full transition-all duration-300 ${
                        plan.popular
                          ? "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02]"
                          : "bg-secondary hover:bg-secondary/80 hover:scale-[1.02]"
                      }`}
                      variant={plan.popular ? "default" : "secondary"}
                    >
                      {plan.buttonText}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
