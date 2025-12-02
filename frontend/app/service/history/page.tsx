"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ArrowLeft, 
  Globe, 
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Volume2,
  FileText,
  Mic,
  Youtube,
  Monitor,
  Upload
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

// 지원 언어 목록
const LANGUAGES: Record<string, { name: string; flag: string }> = {
  ko: { name: "한국어", flag: "🇰🇷" },
  en: { name: "영어", flag: "🇺🇸" },
  ja: { name: "일본어", flag: "🇯🇵" },
  zh: { name: "중국어", flag: "🇨🇳" },
  es: { name: "스페인어", flag: "🇪🇸" },
  fr: { name: "프랑스어", flag: "🇫🇷" },
  de: { name: "독일어", flag: "🇩🇪" },
  vi: { name: "베트남어", flag: "🇻🇳" },
  th: { name: "태국어", flag: "🇹🇭" },
  id: { name: "인도네시아어", flag: "🇮🇩" },
}

interface Translation {
  id: string
  translated_text: string
  target_language: string
  created_at: string
}

interface Utterance {
  id: string
  original_text: string
  original_language: string
  created_at: string
  translations: Translation[]
}

interface Session {
  id: string
  title: string
  session_type: string
  source_language: string
  target_languages: string[]
  started_at: string
  ended_at: string | null
  status: string
  total_utterances: number
  utterances?: Utterance[]
}

const SessionTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "mic":
      return <Mic className="h-4 w-4" />
    case "youtube":
      return <Youtube className="h-4 w-4" />
    case "screen":
      return <Monitor className="h-4 w-4" />
    case "file":
      return <Upload className="h-4 w-4" />
    default:
      return <Globe className="h-4 w-4" />
  }
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [loadingUtterances, setLoadingUtterances] = useState<string | null>(null)
  
  const supabase = createClient()

  // 세션 목록 가져오기
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("translation_sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(50)

        if (error) {
          console.error("세션 목록 가져오기 실패:", error)
        } else {
          setSessions(data || [])
        }
      } catch (err) {
        console.error("오류:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [supabase])

  // 세션 상세 내용 가져오기
  const fetchUtterances = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null)
      return
    }

    setLoadingUtterances(sessionId)
    try {
      // 발화 목록 가져오기
      const { data: utterances, error: utteranceError } = await supabase
        .from("utterances")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })

      if (utteranceError) {
        console.error("발화 목록 가져오기 실패:", utteranceError)
        return
      }

      // 각 발화의 번역 가져오기
      const utterancesWithTranslations = await Promise.all(
        (utterances || []).map(async (utterance) => {
          const { data: translations } = await supabase
            .from("translations")
            .select("*")
            .eq("utterance_id", utterance.id)

          return {
            ...utterance,
            translations: translations || []
          }
        })
      )

      // 세션 업데이트
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, utterances: utterancesWithTranslations }
          : session
      ))

      setExpandedSession(sessionId)
    } catch (err) {
      console.error("오류:", err)
    } finally {
      setLoadingUtterances(null)
    }
  }

  // 세션 삭제
  const deleteSession = async (sessionId: string) => {
    if (!confirm("이 통역 기록을 삭제하시겠습니까?")) return

    try {
      const { error } = await supabase
        .from("translation_sessions")
        .delete()
        .eq("id", sessionId)

      if (error) {
        console.error("삭제 실패:", error)
        alert("삭제에 실패했습니다.")
      } else {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      }
    } catch (err) {
      console.error("오류:", err)
    }
  }

  // TTS 재생
  const speakText = (text: string, languageCode: string) => {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = languageCode === "ko" ? "ko-KR" : 
                     languageCode === "en" ? "en-US" :
                     languageCode === "ja" ? "ja-JP" :
                     languageCode === "zh" ? "zh-CN" : "en-US"
    window.speechSynthesis.speak(utterance)
  }

  const getLanguageInfo = (code: string) => {
    return LANGUAGES[code] || { name: code, flag: "🌐" }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "진행 중"
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}분`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}시간 ${mins}분`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/service" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 dark:text-white">통역 기록</h1>
                <p className="text-xs text-slate-500">저장된 통역 내용 확인</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                저장된 통역 기록이 없습니다
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                마이크 통역 기능을 사용하면 자동으로 기록이 저장됩니다.
              </p>
              <Link href="/service/translate/mic">
                <Button className="bg-gradient-to-r from-teal-500 to-cyan-500">
                  <Mic className="h-4 w-4 mr-2" />
                  통역 시작하기
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => fetchUtterances(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        session.session_type === "mic" ? "bg-teal-100 text-teal-600" :
                        session.session_type === "youtube" ? "bg-red-100 text-red-600" :
                        "bg-blue-100 text-blue-600"
                      }`}>
                        <SessionTypeIcon type={session.session_type} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{session.title || "제목 없음"}</CardTitle>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(session.started_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(session.started_at)}
                          </span>
                          <span>
                            {formatDuration(session.started_at, session.ended_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <div className="flex items-center gap-1 text-sm">
                          <span>{getLanguageInfo(session.source_language).flag}</span>
                          <span>→</span>
                          {session.target_languages.map(lang => (
                            <span key={lang}>{getLanguageInfo(lang).flag}</span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">
                          {session.total_utterances || 0}개 발화
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {loadingUtterances === session.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500" />
                      ) : expandedSession === session.id ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* 발화 목록 */}
                {expandedSession === session.id && session.utterances && (
                  <CardContent className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {session.utterances.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">
                          저장된 발화가 없습니다.
                        </p>
                      ) : (
                        session.utterances.map((utterance, index) => (
                          <div
                            key={utterance.id}
                            className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-xs text-slate-400 w-6">{index + 1}</span>
                              <span className="text-lg">{getLanguageInfo(utterance.original_language).flag}</span>
                              <p className="flex-1 text-slate-700 dark:text-slate-300 text-sm">
                                {utterance.original_text}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => speakText(utterance.original_text, utterance.original_language)}
                              >
                                <Volume2 className="h-3 w-3" />
                              </Button>
                            </div>
                            {utterance.translations.map((translation) => (
                              <div
                                key={translation.id}
                                className="flex items-start gap-2 pl-8 pt-2 border-t border-slate-100 dark:border-slate-700"
                              >
                                <span className="text-lg">{getLanguageInfo(translation.target_language).flag}</span>
                                <p className="flex-1 text-teal-600 dark:text-teal-400 text-sm font-medium">
                                  {translation.translated_text}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={() => speakText(translation.translated_text, translation.target_language)}
                                >
                                  <Volume2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <p className="text-xs text-slate-400 text-right mt-2">
                              {formatTime(utterance.created_at)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}





