"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Youtube, Monitor, MessageSquare } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { ZoomLogo, TeamsLogo, MeetLogo, WebexLogo } from "@/components/platform-logos"

const platforms = [
  {
    name: "Zoom",
    description: "화상회의 연동",
    Logo: ZoomLogo,
  },
  {
    name: "MS Teams",
    description: "업무 협업",
    Logo: TeamsLogo,
  },
  {
    name: "Google Meet",
    description: "구글 미팅",
    Logo: MeetLogo,
  },
  {
    name: "Webex",
    description: "시스코 웹엑스",
    Logo: WebexLogo,
  },
]

const mediaSources = [
  { icon: Youtube, name: "YouTube", description: "영상 자막 번역", gradient: "from-red-500 to-orange-500" },
  { icon: Monitor, name: "영상 파일", description: "로컬 파일 업로드", gradient: "from-blue-500 to-cyan-500" },
  { icon: Monitor, name: "화면 캡처", description: "시스템 오디오 포함", gradient: "from-green-500 to-emerald-500" },
  {
    icon: MessageSquare,
    name: "영상통화",
    description: "Discord, 카카오톡 등",
    gradient: "from-purple-500 to-pink-500",
  },
]

export function PlatformSection() {
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
    <section ref={sectionRef} className="py-24 relative section-gradient-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <span className="gradient-text">지원 플랫폼</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            다양한 화상회의 플랫폼과 미디어 소스를 지원합니다
          </p>
        </div>

        <Card className="glass-panel inner-glow rounded-2xl overflow-hidden max-w-5xl mx-auto">
          <CardContent className="p-8">
            {/* Supported Platforms */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-center gap-4">
                {platforms.map((platform, index) => (
                  <div
                    key={platform.name}
                    className={`group flex flex-col items-center justify-center w-40 h-28 px-4 py-4 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-white/20 hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-500 cursor-pointer ${
                      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    <platform.Logo className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform duration-300" />
                    <span className="font-medium text-foreground text-sm">{platform.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent mb-8" />

            {/* Media Sources - Same size as platforms */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {mediaSources.map((source, index) => (
                <div
                  key={source.name}
                  className={`group flex flex-col items-center justify-center w-40 h-28 px-4 py-4 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-white/20 hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-500 cursor-pointer ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${(index + 4) * 100}ms` }}
                >
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${source.gradient} shadow-md mb-2 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <source.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-medium text-foreground text-sm">{source.name}</span>
                  <span className="text-xs text-muted-foreground">{source.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
