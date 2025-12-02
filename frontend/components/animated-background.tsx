"use client"

import { useEffect, useState } from "react"

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* 메인 배경 - 연한 그레이-블루 그라데이션 */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e8f4f8 100%)",
        }}
      />

      {/* 좌측 하단 분홍/보라색 번짐 - chatbot-ai-platform 스타일 */}
      <div
        className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(216, 180, 254, 0.6) 0%, rgba(192, 132, 252, 0.3) 30%, rgba(168, 85, 247, 0.1) 50%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* 좌측 상단 민트/청록색 번짐 */}
      <div
        className="absolute top-[-5%] left-[10%] w-[500px] h-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(153, 246, 228, 0.5) 0%, rgba(94, 234, 212, 0.25) 30%, rgba(45, 212, 191, 0.1) 50%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* 우측 상단 연한 청록색 번짐 */}
      <div
        className="absolute top-[5%] right-[5%] w-[550px] h-[550px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(165, 243, 252, 0.4) 0%, rgba(103, 232, 249, 0.2) 30%, rgba(34, 211, 238, 0.08) 50%, transparent 70%)",
          filter: "blur(75px)",
        }}
      />

      {/* 우측 중앙 민트색 번짐 */}
      <div
        className="absolute top-[40%] right-[-5%] w-[500px] h-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(167, 243, 208, 0.45) 0%, rgba(110, 231, 183, 0.2) 30%, rgba(52, 211, 153, 0.08) 50%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* 중앙 하단 연한 파란색 번짐 */}
      <div
        className="absolute bottom-[10%] left-[40%] w-[400px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(147, 197, 253, 0.35) 0%, rgba(96, 165, 250, 0.15) 30%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      {/* 중앙의 작은 파란 점 - chatbot-ai-platform 핵심 요소 */}
      <div className="absolute top-[58%] left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            boxShadow: "0 0 12px 4px rgba(59, 130, 246, 0.4), 0 0 24px 8px rgba(59, 130, 246, 0.2)",
          }}
        />
      </div>

      {/* 미세한 노이즈 텍스처 */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
