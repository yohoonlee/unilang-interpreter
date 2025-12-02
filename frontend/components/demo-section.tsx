"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Globe, Sparkles } from "lucide-react"

const demoMessages = [
  {
    speaker: "영어",
    flag: "🇺🇸",
    original: "Good morning everyone, thank you for joining today's meeting.",
    translated: "안녕하세요 여러분, 오늘 회의에 참석해 주셔서 감사합니다.",
  },
  {
    speaker: "일본어",
    flag: "🇯🇵",
    original: "本日の議題について説明させていただきます。",
    translated: "오늘의 안건에 대해 설명드리겠습니다.",
  },
  {
    speaker: "중국어",
    flag: "🇨🇳",
    original: "我们需要讨论一下下个季度的计划。",
    translated: "다음 분기 계획에 대해 논의해야 합니다.",
  },
]

export function DemoSection() {
  const [isListening, setIsListening] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [visibleMessages, setVisibleMessages] = useState<number[]>([])
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

  useEffect(() => {
    if (isVisible) {
      demoMessages.forEach((_, index) => {
        setTimeout(
          () => {
            setVisibleMessages((prev) => [...prev, index])
          },
          (index + 1) * 400,
        )
      })
    }
  }, [isVisible])

  return (
    <section id="demo" ref={sectionRef} className="py-24 relative mesh-gradient">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent dark:via-blue-950/30 -z-10" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge
            variant="secondary"
            className="mb-4 gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20"
          >
            <Globe className="h-3 w-3 text-blue-500" />
            <span className="gradient-text font-medium">실시간 데모</span>
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <span className="gradient-text">실시간 통역 체험</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            다국어 회의가 어떻게 실시간으로 번역되는지 확인해보세요
          </p>
        </div>

        <div
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative rounded-3xl p-[2px] bg-gradient-to-br from-blue-500/60 via-cyan-500/40 to-purple-500/60 shadow-2xl shadow-blue-500/20 animate-gradient">
            <Card className="rounded-[22px] border-0 overflow-hidden bg-gradient-to-b from-white/98 to-slate-50/95 dark:from-slate-900/98 dark:to-slate-950/95 backdrop-blur-xl">
              {/* Demo Header */}
              <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-purple-600/20 animate-gradient" />
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: "20px 20px",
                  }}
                />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-400 shadow-sm shadow-red-400/50" />
                      <div className="h-3 w-3 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400/50" />
                      <div className="h-3 w-3 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
                    </div>
                    <div className="ml-4 flex items-center gap-2 text-white/90">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm font-medium">UniLang 실시간 통역</span>
                    </div>
                  </div>
                  <Badge
                    className={`transition-all ${
                      isListening
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg shadow-green-500/30"
                        : "bg-slate-700 text-slate-300 border-slate-600"
                    }`}
                  >
                    {isListening ? (
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        통역 중
                      </span>
                    ) : (
                      "대기 중"
                    )}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6 lg:p-8">
                {/* Messages */}
                <div className="space-y-4 mb-8 max-h-96 overflow-y-auto">
                  {demoMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`relative rounded-2xl p-5 card-hover-glow transition-all duration-500 ${
                        visibleMessages.includes(index) ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-purple-500/20 flex items-center justify-center text-xl shadow-inner border border-blue-500/10">
                          {message.flag}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">{message.speaker}</span>
                      </div>
                      <p className="text-foreground mb-4 leading-relaxed">{message.original}</p>
                      <div className="flex items-start gap-3 pt-4 border-t border-border/50">
                        <Badge
                          variant="outline"
                          className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 text-blue-600"
                        >
                          🇰🇷 한국어
                        </Badge>
                        <p className="text-sm text-muted-foreground flex-1 leading-relaxed">{message.translated}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center pt-6 border-t border-border/50">
                  <Button
                    size="lg"
                    className={`px-8 transition-all duration-300 ${
                      isListening
                        ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
                        : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                    } hover:scale-105`}
                    onClick={() => setIsListening(!isListening)}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-5 w-5 mr-2" />
                        통역 중지
                      </>
                    ) : (
                      <>
                        <Mic className="h-5 w-5 mr-2" />
                        통역 시작
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
