"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GradientIcon } from "@/components/gradient-icon"
import { Mic, Languages, FileText, Shield, Zap, Users } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const features = [
  {
    icon: Mic,
    title: "실시간 음성 인식",
    description: "Google Speech-to-Text 기반의 정확한 음성 인식으로 모든 발언을 텍스트로 변환합니다.",
    gradient: "blue" as const,
  },
  {
    icon: Languages,
    title: "다국어 실시간 번역",
    description: "14개 이상의 언어를 지원하며, 화자별로 자국어 자막을 실시간으로 제공합니다.",
    gradient: "cyan" as const,
  },
  {
    icon: FileText,
    title: "회의 기록 & 요약",
    description: "모든 회의 내용이 자동 저장되고, AI가 핵심 내용을 요약해 드립니다.",
    gradient: "orange" as const,
  },
  {
    icon: Shield,
    title: "보안 연결",
    description: "종단간 암호화를 통해 회의 내용을 안전하게 보호합니다.",
    gradient: "green" as const,
  },
  {
    icon: Zap,
    title: "즉시 시작",
    description: "복잡한 설정 없이 브라우저에서 바로 실시간 통역을 시작할 수 있습니다.",
    gradient: "purple" as const,
  },
  {
    icon: Users,
    title: "다중 참가자 지원",
    description: "여러 참가자가 동시에 각자의 언어로 자막을 볼 수 있습니다.",
    gradient: "pink" as const,
  },
]

export function FeaturesSection() {
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
    <section id="features" ref={sectionRef} className="py-24 relative mesh-gradient">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent dark:via-blue-950/20 -z-10" />
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <span className="gradient-text">주요 기능</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">화상회의의 언어 장벽을 완전히 해소합니다</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className={`group glass-panel premium-card rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm card-hover-lift overflow-hidden transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-cyan-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <CardHeader className="relative">
                <GradientIcon
                  icon={feature.icon}
                  gradient={feature.gradient}
                  className="mb-4 group-hover:scale-110 transition-transform duration-300"
                />
                <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
