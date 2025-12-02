"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Play, Sparkles, CheckCircle2, Zap, Globe2, Building2 } from "lucide-react"
import { useEffect, useState } from "react"

export function HeroSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="relative overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* 좌측 콘텐츠 */}
          <div className="max-w-xl">
            <div
              className={`inline-flex mb-6 transition-all duration-700 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <Badge
                variant="secondary"
                className="gap-2 px-4 py-2 text-sm bg-white/80 border border-teal-200 hover:border-teal-300 transition-colors rounded-full shadow-sm"
              >
                <Sparkles className="h-4 w-4 text-teal-500" />
                <span className="text-teal-600 font-medium">AI 기반 실시간 통역 플랫폼</span>
              </Badge>
            </div>

            <h1
              className={`mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.5rem] leading-[1.15] transition-all duration-700 delay-100 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <span className="text-[#0d4a5f]">AI 실시간 통역으로</span>
              <br />
              <span className="text-[#0d4a5f]">글로벌 소통을 혁신하세요</span>
            </h1>

            <p
              className={`mb-8 text-base text-slate-600 lg:text-lg leading-relaxed transition-all duration-700 delay-200 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              화상회의, YouTube, 영상통화에서 실시간 다국어 통역을 경험하세요.
              <br />
              최소 비용으로 최대 효과를 경험하세요
            </p>

            <div
              className={`grid grid-cols-2 gap-3 mb-8 transition-all duration-700 delay-300 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              {[
                { icon: CheckCircle2, text: "실시간 고정확도 통역" },
                { icon: Zap, text: "즉각적인 자막 생성" },
                { icon: Globe2, text: "14개국 언어 지원" },
                { icon: Building2, text: "기업별 맞춤 솔루션" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2.5 px-4 py-3 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-xl hover:border-teal-200 hover:bg-white/80 transition-all"
                >
                  <item.icon className="h-4 w-4 text-teal-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{item.text}</span>
                </div>
              ))}
            </div>

            <div
              className={`flex flex-wrap items-center gap-4 transition-all duration-700 delay-400 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <Button
                size="lg"
                className="bg-teal-500 hover:bg-teal-600 text-white gap-2 px-6 shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-[1.02] group rounded-xl"
              >
                무료로 시작하기
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 px-6 bg-white/70 backdrop-blur border-slate-200 hover:border-slate-300 hover:bg-white transition-all group rounded-xl"
              >
                <Play className="h-4 w-4 text-slate-600" />
                데모 보기
              </Button>
            </div>
          </div>

          <div
            className={`relative transition-all duration-1000 delay-500 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {/* 실시간 응답 라벨 */}
            <div className="absolute -top-2 right-8 z-10">
              <div className="px-4 py-1.5 bg-teal-500 text-white text-sm font-medium rounded-full shadow-lg">
                실시간 통역
              </div>
            </div>

            {/* 메인 데모 카드 */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
              {/* 윈도우 컨트롤 */}
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <span className="ml-3 text-sm text-slate-600 font-medium">AI 통역 데모</span>
              </div>

              {/* 채팅 콘텐츠 */}
              <div className="p-5 space-y-4">
                {/* 사용자 메시지 */}
                <div className="flex justify-end">
                  <div className="max-w-[85%]">
                    <div className="bg-teal-500 text-white px-4 py-3 rounded-2xl rounded-tr-md shadow-sm">
                      <p className="text-sm">{"Hello, let's start the meeting about Q4 results."}</p>
                    </div>
                  </div>
                </div>

                {/* AI 응답 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    AI
                  </div>
                  <div className="flex-1">
                    <div className="bg-slate-50 px-4 py-3 rounded-2xl rounded-tl-md border border-slate-100">
                      <p className="text-sm text-slate-700">안녕하세요, 4분기 실적에 대한 회의를 시작하겠습니다.</p>
                    </div>
                    {/* 정확도 라벨 */}
                    <div className="flex justify-end mt-1.5">
                      <span className="px-2.5 py-0.5 bg-teal-50 text-teal-600 text-xs font-medium rounded-full">
                        99.9% 정확도
                      </span>
                    </div>
                  </div>
                </div>

                {/* 두번째 사용자 메시지 */}
                <div className="flex justify-end">
                  <div className="max-w-[85%]">
                    <div className="bg-teal-500 text-white px-4 py-3 rounded-2xl rounded-tr-md shadow-sm">
                      <p className="text-sm">{"Can you share the revenue growth data?"}</p>
                    </div>
                  </div>
                </div>

                {/* 두번째 AI 응답 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    AI
                  </div>
                  <div className="flex-1">
                    <div className="bg-slate-50 px-4 py-3 rounded-2xl rounded-tl-md border border-slate-100">
                      <p className="text-sm text-slate-700">매출 성장 데이터를 공유해 주시겠어요?</p>
                    </div>
                  </div>
                </div>

                {/* RAG 기반 라벨 */}
                <div className="flex justify-start mt-2">
                  <div className="px-3 py-1.5 bg-teal-500 text-white text-xs font-medium rounded-full">
                    AI 기반 통역
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`mt-20 flex flex-wrap justify-center gap-16 lg:gap-24 transition-all duration-700 delay-600 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {[
            { value: "99.9%", label: "정확도", color: "text-teal-500" },
            { value: "24/7", label: "실시간 지원", color: "text-blue-500" },
            { value: "80%", label: "비용 절감", color: "text-emerald-500" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-4xl lg:text-5xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
