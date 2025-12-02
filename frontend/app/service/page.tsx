"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Home, 
  Languages, 
  Video, 
  CreditCard, 
  Settings, 
  Globe, 
  Sparkles,
  Mic,
  Play,
  Clock,
  FileText,
  BarChart3,
  LogOut,
  User,
  Youtube,
  Users,
  FileAudio,
  Monitor,
  History,
  Volume2
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const menuItems = [
  { id: "home", label: "홈", icon: Home },
  { id: "translate", label: "실시간 통역", icon: Mic },
  { id: "record", label: "녹음 통역", icon: FileAudio },
  { id: "videocall", label: "화상회의", icon: Monitor },
  { id: "youtube", label: "YouTube", icon: Youtube },
  { id: "history", label: "기록", icon: History },
  { id: "pricing", label: "요금제", icon: CreditCard },
  { id: "settings", label: "설정", icon: Settings },
]

export default function ServicePage() {
  const [activeMenu, setActiveMenu] = useState("home")
  const [userEmail, setUserEmail] = useState("user@example.com")
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    getUser()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    
    // 팝업 창인 경우: 부모 창으로 이동 후 팝업 닫기
    if (window.opener) {
      window.opener.location.href = "/"
      window.close()
    } else {
      // 일반 창인 경우: 그냥 이동
      window.location.href = "/"
    }
  }

  // 실시간 통역 시작 버튼 핸들러
  const startTranslation = () => {
    setActiveMenu("translate")
  }

  const renderContent = () => {
    switch (activeMenu) {
      case "home":
        return <HomeContent onStartTranslation={startTranslation} />
      case "translate":
        return <TranslateContent />
      case "record":
        return <RecordContent />
      case "videocall":
        return <VideoCallContent />
      case "youtube":
        return <YouTubeContent />
      case "history":
        return <HistoryContent />
      case "pricing":
        return <PricingContent />
      case "settings":
        return <SettingsContent />
      default:
        return <HomeContent onStartTranslation={startTranslation} />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-md">
              <Globe className="h-4 w-4 text-white" />
              <Sparkles className="absolute -top-1 -right-1 h-2.5 w-2.5 text-yellow-400" />
            </div>
            <span className="text-lg font-bold text-slate-800">UniLang</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="h-4 w-4" />
              <span>{userEmail}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                  activeMenu === item.id
                    ? "text-teal-600 border-teal-500 bg-teal-50/50"
                    : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={activeMenu === "translate" ? "" : "container mx-auto px-4 py-8"}>
        {renderContent()}
      </main>
    </div>
  )
}

function HomeContent({ onStartTranslation }: { onStartTranslation: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
        <p className="text-slate-600">UniLang 실시간 통역 서비스에 오신 것을 환영합니다.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>이번 달 사용 시간</CardDescription>
            <CardTitle className="text-3xl text-teal-600">2시간 30분</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">남은 시간: 2시간 30분</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 회의 횟수</CardDescription>
            <CardTitle className="text-3xl text-blue-600">12회</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">이번 달 진행한 회의</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>현재 플랜</CardDescription>
            <CardTitle className="text-3xl text-purple-600">베이직</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">월 5시간 포함</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 시작</CardTitle>
          <CardDescription>자주 사용하는 기능을 바로 시작하세요</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-3">
          <Button 
            className="h-24 flex-col gap-2 bg-gradient-to-br from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
            onClick={onStartTranslation}
          >
            <Mic className="h-6 w-6" />
            <span>실시간 통역</span>
          </Button>
          <Link href="/service/translate/record" className="w-full">
            <Button variant="outline" className="h-24 flex-col gap-2 w-full border-purple-200 hover:bg-purple-50">
              <Users className="h-6 w-6 text-purple-500" />
              <span className="text-purple-700">녹음 통역</span>
            </Button>
          </Link>
          <Link href="/service/translate/meeting" className="w-full">
            <Button variant="outline" className="h-24 flex-col gap-2 w-full border-indigo-200 hover:bg-indigo-50">
              <Monitor className="h-6 w-6 text-indigo-500" />
              <span className="text-indigo-700">화상회의 통역</span>
            </Button>
          </Link>
          <Link href="/service/translate/youtube" className="w-full">
            <Button variant="outline" className="h-24 flex-col gap-2 w-full border-red-200 hover:bg-red-50">
              <Youtube className="h-6 w-6 text-red-500" />
              <span className="text-red-700">YouTube 통역</span>
            </Button>
          </Link>
          <Link href="/service/history" className="w-full">
            <Button variant="outline" className="h-24 flex-col gap-2 w-full">
              <FileText className="h-6 w-6" />
              <span>기록 보기</span>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

// 실시간 통역 서비스 - iframe으로 기존 통역 페이지 로드 (embedded 모드)
function TranslateContent() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <iframe 
        src="/service/translate/mic?embedded=true" 
        className="w-full h-full border-0"
        title="실시간 통역"
      />
    </div>
  )
}

// 녹음 통역 서비스 (화자 구분 지원)
function RecordContent() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <iframe 
        src="/service/translate/record?embedded=true" 
        className="w-full h-full border-0"
        title="녹음 통역"
      />
    </div>
  )
}

// YouTube 통역 서비스
function YouTubeContent() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <iframe 
        src="/service/translate/youtube?embedded=true" 
        className="w-full h-full border-0"
        title="YouTube 통역"
      />
    </div>
  )
}

// 화상회의 통역
function VideoCallContent() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <iframe 
        src="/service/translate/meeting?embedded=true" 
        className="w-full h-full border-0"
        title="화상회의 통역"
      />
    </div>
  )
}

// 통역 기록
function HistoryContent() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <iframe 
        src="/service/history?embedded=true" 
        className="w-full h-full border-0"
        title="통역 기록"
      />
    </div>
  )
}

function MeetingContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">회의 기록</h1>
        <p className="text-slate-600">이전 회의 기록과 요약을 확인하세요.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Video className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">프로젝트 회의 #{i}</p>
                    <p className="text-sm text-slate-500">2025년 11월 {20 + i}일 · 45분</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">한국어 → 영어</Badge>
                  <Button variant="outline" size="sm">상세보기</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PricingContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">요금제 관리</h1>
        <p className="text-slate-600">현재 플랜과 사용량을 확인하세요.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>현재 플랜</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl font-bold text-teal-600">베이직</p>
                <p className="text-slate-500">₩9,900/월</p>
              </div>
              <Button>플랜 변경</Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">사용 시간</span>
                <span className="font-medium">2시간 30분 / 5시간</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-teal-500 h-2 rounded-full" style={{ width: "50%" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>이번 달 사용량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="font-medium">총 통역 시간</p>
                  <p className="text-sm text-slate-500">2시간 30분</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="font-medium">번역 횟수</p>
                  <p className="text-sm text-slate-500">1,234회</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SettingsContent() {
  // 오디오 설정 상태 (localStorage에서 불러오기)
  const [audioSettings, setAudioSettings] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("unilang_audio_settings")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // 파싱 실패 시 기본값
        }
      }
    }
    return {
      autoPlayTTS: false,
      ttsVolume: 1,
      ttsRate: 1,
      selectedMicDevice: "",
      selectedSpeakerDevice: "",
      realtimeSummary: false,
      saveToDb: true,
    }
  })

  // 오디오 장치 목록
  const [audioDevices, setAudioDevices] = useState<{
    microphones: MediaDeviceInfo[]
    speakers: MediaDeviceInfo[]
  }>({ microphones: [], speakers: [] })

  // 언어 설정
  const [sourceLanguage, setSourceLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("unilang_source_language") || "ko"
    }
    return "ko"
  })
  
  const [targetLanguage, setTargetLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("unilang_target_language") || "en"
    }
    return "en"
  })

  const LANGUAGES = [
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "en", name: "영어", flag: "🇺🇸" },
    { code: "ja", name: "일본어", flag: "🇯🇵" },
    { code: "zh", name: "중국어", flag: "🇨🇳" },
    { code: "es", name: "스페인어", flag: "🇪🇸" },
    { code: "fr", name: "프랑스어", flag: "🇫🇷" },
    { code: "de", name: "독일어", flag: "🇩🇪" },
    { code: "vi", name: "베트남어", flag: "🇻🇳" },
  ]

  // 오디오 장치 목록 가져오기
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const devices = await navigator.mediaDevices.enumerateDevices()
        setAudioDevices({
          microphones: devices.filter(d => d.kind === "audioinput"),
          speakers: devices.filter(d => d.kind === "audiooutput"),
        })
      } catch (err) {
        console.error("오디오 장치 목록 가져오기 실패:", err)
      }
    }
    getAudioDevices()
  }, [])

  // 설정 변경 시 localStorage에 저장
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("unilang_audio_settings", JSON.stringify(audioSettings))
    }
  }, [audioSettings])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("unilang_source_language", sourceLanguage)
      localStorage.setItem("unilang_target_language", targetLanguage)
    }
  }, [sourceLanguage, targetLanguage])

  // 음성 테스트
  const testVoice = () => {
    if (!("speechSynthesis" in window)) {
      alert("이 브라우저는 음성 합성을 지원하지 않습니다.")
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance("안녕하세요, 음성 테스트입니다.")
    utterance.lang = "ko-KR"
    utterance.volume = audioSettings.ttsVolume
    utterance.rate = audioSettings.ttsRate
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">설정</h1>
        <p className="text-slate-600">실시간 통역 및 서비스 설정을 관리하세요.</p>
      </div>

      {/* 기본 언어 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-teal-500" />
            기본 언어 설정
          </CardTitle>
          <CardDescription>음성 인식 및 번역에 사용될 기본 언어</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                🎤 음성 인식 언어
              </label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                🌐 번역 언어
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
              >
                <option value="none">📝 선택안함 (원문만)</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 오디오 장치 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-teal-500" />
            오디오 장치 설정
          </CardTitle>
          <CardDescription>마이크와 스피커를 선택하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                🎤 마이크 선택
              </label>
              <select
                value={audioSettings.selectedMicDevice}
                onChange={(e) => setAudioSettings((prev: typeof audioSettings) => ({ ...prev, selectedMicDevice: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
              >
                <option value="">기본 마이크</option>
                {audioDevices.microphones.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `마이크 ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                🔊 스피커 선택
              </label>
              <select
                value={audioSettings.selectedSpeakerDevice}
                onChange={(e) => setAudioSettings((prev: typeof audioSettings) => ({ ...prev, selectedSpeakerDevice: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
              >
                <option value="">기본 스피커</option>
                {audioDevices.speakers.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `스피커 ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TTS 음성 재생 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-teal-500" />
            음성 재생 (TTS) 설정
          </CardTitle>
          <CardDescription>번역된 내용을 음성으로 재생하는 설정</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 자동 TTS 재생 토글 */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-700">자동 음성 재생</p>
              <p className="text-sm text-slate-500">번역 완료 시 TTS로 자동 방송</p>
            </div>
            <button
              onClick={() => setAudioSettings((prev: typeof audioSettings) => ({ ...prev, autoPlayTTS: !prev.autoPlayTTS }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                audioSettings.autoPlayTTS ? "bg-teal-500" : "bg-slate-300"
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                audioSettings.autoPlayTTS ? "translate-x-6" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {audioSettings.autoPlayTTS && (
            <div className="p-3 bg-teal-50 rounded-lg text-sm text-teal-700">
              ✅ 번역이 완료되면 자동으로 TTS 음성이 재생됩니다
            </div>
          )}

          {/* 볼륨 조절 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              음성 볼륨: {Math.round(audioSettings.ttsVolume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={audioSettings.ttsVolume}
              onChange={(e) => setAudioSettings((prev: typeof audioSettings) => ({ ...prev, ttsVolume: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
          </div>

          {/* 속도 조절 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              음성 속도: {audioSettings.ttsRate}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={audioSettings.ttsRate}
              onChange={(e) => setAudioSettings((prev: typeof audioSettings) => ({ ...prev, ttsRate: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
          </div>

          {/* 음성 테스트 */}
          <Button onClick={testVoice} variant="outline" className="w-full">
            🔊 음성 테스트
          </Button>
        </CardContent>
      </Card>

      {/* 기록 및 요약 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-500" />
            기록 및 요약 설정
          </CardTitle>
          <CardDescription>통역 내용 저장 및 요약 관련 설정</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* DB 저장 토글 */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-700">💾 기록 자동 저장</p>
              <p className="text-sm text-slate-500">통역 내용을 데이터베이스에 자동 저장</p>
            </div>
            <button
              onClick={() => setAudioSettings((prev: typeof audioSettings) => ({ ...prev, saveToDb: !prev.saveToDb }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                audioSettings.saveToDb !== false ? "bg-teal-500" : "bg-slate-300"
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                audioSettings.saveToDb !== false ? "translate-x-6" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {/* 실시간 요약 토글 */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-700">✨ 실시간 요약</p>
              <p className="text-sm text-slate-500">회의 종료 시 AI 요약 자동 생성</p>
            </div>
            <button
              onClick={() => setAudioSettings((prev: typeof audioSettings) => ({ ...prev, realtimeSummary: !prev.realtimeSummary }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                audioSettings.realtimeSummary ? "bg-teal-500" : "bg-slate-300"
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                audioSettings.realtimeSummary ? "translate-x-6" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {audioSettings.realtimeSummary && (
            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
              ✨ 회의 종료 버튼을 누르면 AI가 자동으로 요약을 생성합니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 알림 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-teal-500" />
            알림 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-700">사용량 알림</p>
              <p className="text-sm text-slate-500">포함 시간 80% 도달 시 알림</p>
            </div>
            <input type="checkbox" defaultChecked className="h-5 w-5 rounded text-teal-500" />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-700">이메일 리포트</p>
              <p className="text-sm text-slate-500">주간 사용량 리포트 수신</p>
            </div>
            <input type="checkbox" className="h-5 w-5 rounded text-teal-500" />
          </div>
        </CardContent>
      </Card>

      {/* 저장 확인 메시지 */}
      <div className="p-4 bg-green-50 rounded-lg text-sm text-green-700 text-center">
        💾 설정은 자동으로 저장됩니다
      </div>
    </div>
  )
}
