"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  X,
  Home,
  Languages,
  Video,
  CreditCard,
  Settings,
  LogOut,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Globe,
  Sparkles,
} from "lucide-react"

interface ServiceDashboardProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
  onLogout: () => void
}

const tabs = [
  { id: "home", label: "홈", icon: Home },
  { id: "translation", label: "번역", icon: Languages },
  { id: "meeting", label: "회의", icon: Video },
  { id: "pricing", label: "요금제", icon: CreditCard },
  { id: "settings", label: "설정", icon: Settings },
]

const languages = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
]

export function ServiceDashboard({ isOpen, onClose, userEmail, onLogout }: ServiceDashboardProps) {
  const [activeTab, setActiveTab] = useState("home")
  const [sourceLang, setSourceLang] = useState("ko")
  const [targetLang, setTargetLang] = useState("en")
  const [isMicOn, setIsMicOn] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isTranslating, setIsTranslating] = useState(false)

  if (!isOpen) return null

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30 mb-4">
                <Globe className="h-10 w-10 text-white" />
                <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">환영합니다!</h3>
              <p className="text-gray-400">실시간 AI 통역 서비스를 시작하세요</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab("translation")}
                className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 hover:border-blue-500/50 transition-all group"
              >
                <Languages className="h-8 w-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-white font-medium">실시간 번역</p>
                <p className="text-xs text-gray-400">음성 번역 시작</p>
              </button>
              <button
                onClick={() => setActiveTab("meeting")}
                className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 hover:border-purple-500/50 transition-all group"
              >
                <Video className="h-8 w-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-white font-medium">회의 통역</p>
                <p className="text-xs text-gray-400">다자간 회의</p>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-sm font-medium text-gray-300 mb-3">최근 사용</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">한국어 → 영어</span>
                  <span className="text-gray-500">2시간 전</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">영어 → 일본어</span>
                  <span className="text-gray-500">어제</span>
                </div>
              </div>
            </div>
          </div>
        )

      case "translation":
        return (
          <div className="space-y-6">
            {/* Language Selection */}
            <div className="flex items-center gap-4">
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-500 outline-none"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-800">
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const temp = sourceLang
                  setSourceLang(targetLang)
                  setTargetLang(temp)
                }}
                className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
              >
                <Languages className="h-5 w-5 text-blue-400" />
              </button>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-500 outline-none"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-800">
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Translation Area */}
            <div className="grid gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 min-h-[120px]">
                <p className="text-xs text-gray-500 mb-2">원본 텍스트</p>
                <p className="text-gray-300">
                  {isTranslating ? "음성을 인식 중입니다..." : "마이크 버튼을 눌러 시작하세요"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 min-h-[120px]">
                <p className="text-xs text-blue-400 mb-2">번역 결과</p>
                <p className="text-white">
                  {isTranslating ? "Translating..." : "Press the microphone button to start"}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`p-4 rounded-full transition-all ${
                  isSpeakerOn
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-white/5 text-gray-400 border border-white/10"
                }`}
              >
                {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
              </button>
              <button
                onClick={() => {
                  setIsMicOn(!isMicOn)
                  setIsTranslating(!isMicOn)
                }}
                className={`p-6 rounded-full transition-all ${
                  isMicOn
                    ? "bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30 scale-110"
                    : "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 hover:scale-105"
                }`}
              >
                {isMicOn ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </button>
              <button className="p-4 rounded-full bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-all">
                <Settings className="h-6 w-6" />
              </button>
            </div>
          </div>
        )

      case "meeting":
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Video className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">회의 통역</h3>
              <p className="text-gray-400 mb-6">다자간 실시간 통역 회의를 시작하세요</p>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                새 회의 시작
              </Button>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-sm font-medium text-gray-300 mb-3">회의 참여하기</h4>
              <input
                type="text"
                placeholder="회의 코드 입력"
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 outline-none mb-3"
              />
              <Button variant="outline" className="w-full border-purple-500/30 hover:bg-purple-500/10 bg-transparent">
                참여
              </Button>
            </div>
          </div>
        )

      case "pricing":
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-white font-medium mb-1">현재 플랜</h4>
              <p className="text-2xl font-bold gradient-text">Free</p>
              <p className="text-sm text-gray-400 mt-1">월 100분 무료</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30">
              <h4 className="text-white font-medium mb-1">Pro 플랜</h4>
              <p className="text-2xl font-bold text-white">
                ₩29,000<span className="text-sm font-normal text-gray-400">/월</span>
              </p>
              <p className="text-sm text-gray-400 mt-1">무제한 통역</p>
              <Button className="w-full mt-4 bg-gradient-to-r from-blue-500 to-cyan-500">업그레이드</Button>
            </div>
          </div>
        )

      case "settings":
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-sm text-gray-400 mb-1">계정</h4>
              <p className="text-white">{userEmail}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-sm text-gray-400 mb-3">기본 언어 설정</h4>
              <select className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-500 outline-none">
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-800">
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-sm text-gray-400 mb-3">음성 설정</h4>
              <div className="flex items-center justify-between">
                <span className="text-white">자동 음성 출력</span>
                <button className="w-12 h-6 rounded-full bg-blue-500 relative">
                  <span className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
                </button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dashboard Modal */}
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] animate-in zoom-in-95 fade-in duration-200">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 shadow-2xl shadow-blue-500/20">
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors z-10"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>

          {/* Tab Navigation - Similar to image 1 */}
          <div className="border-b border-white/10 px-4 pt-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-4 scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/10 text-blue-400 border border-blue-500/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-blue-400" : ""}`} />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">{renderTabContent()}</div>

          {/* Footer */}
          <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-400">{userEmail}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
