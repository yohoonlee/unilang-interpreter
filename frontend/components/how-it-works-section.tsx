"use client"

import { Card, CardContent } from "@/components/ui/card"
import { GradientIcon } from "@/components/gradient-icon"
import { MonitorPlay, Globe2, Zap } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const steps = [
  {
    number: "01",
    icon: MonitorPlay,
    title: "플랫폼 연동",
    description: "사용하는 화상회의 플랫폼을 연동하세요",
    gradient: "blue" as const,
  },
  {
    number: "02",
    icon: Globe2,
    title: "언어 선택",
    description: "원하는 자막 언어를 선택하세요",
    gradient: "cyan" as const,
  },
  {
    number: "03",
    icon: Zap,
    title: "실시간 통역",
    description: "회의 중 실시간으로 번역된 자막을 확인하세요",
    gradient: "purple" as const,
  },
]

export function HowItWorksSection() {
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
    <section id="how-it-works" ref={sectionRef} className="py-24 relative section-gradient-alt">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950 -z-10" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <span className="gradient-text">사용 방법</span>
          </h2>
          <p className="text-lg text-muted-foreground">3단계로 간단하게 시작하세요</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`relative transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <Card className="group glass-panel premium-card rounded-2xl h-full overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                <CardContent className="pt-10 pb-8 px-6 text-center">
                  <div className="relative inline-flex mb-6">
                    <GradientIcon
                      icon={step.icon}
                      gradient={step.gradient}
                      size="lg"
                      className="group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-500/40 group-hover:shadow-blue-500/60 group-hover:scale-110 transition-all">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-blue-600 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>

              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8">
                  <div className="h-[2px] bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-500 dark:to-cyan-500 animate-pulse" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
