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
  History
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">설정</h1>
        <p className="text-slate-600">계정 및 서비스 설정을 관리하세요.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기본 언어 설정</CardTitle>
          <CardDescription>자주 사용하는 언어를 설정하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">내 언어</p>
              <p className="text-sm text-slate-500">음성 인식에 사용됩니다</p>
            </div>
            <Button variant="outline">한국어</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">번역 언어</p>
              <p className="text-sm text-slate-500">자막으로 표시됩니다</p>
            </div>
            <Button variant="outline">영어, 일본어</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>알림 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">사용량 알림</p>
              <p className="text-sm text-slate-500">포함 시간 80% 도달 시 알림</p>
            </div>
            <input type="checkbox" defaultChecked className="h-5 w-5 rounded text-teal-500" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">이메일 리포트</p>
              <p className="text-sm text-slate-500">주간 사용량 리포트 수신</p>
            </div>
            <input type="checkbox" className="h-5 w-5 rounded text-teal-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
