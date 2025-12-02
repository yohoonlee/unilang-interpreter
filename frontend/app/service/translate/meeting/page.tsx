"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Monitor,
  MonitorOff,
  Globe,
  Loader2,
  ArrowLeft,
  X,
  Users,
  Clock,
  Languages,
  Sparkles,
  Volume2,
  Settings,
  AlertCircle,
  CheckCircle,
  Video,
  Mic,
  Square,
  Play,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useSystemAudioCapture, isSystemAudioCaptureSupported } from "@/hooks/useSystemAudioCapture"
import { useAssemblyAI, AssemblyAIResult, AssemblyAIUtterance } from "@/hooks/useAssemblyAI"

// 지원 언어 목록
const LANGUAGES = [
  { code: "auto", name: "자동 감지", flag: "🌐" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "영어", flag: "🇺🇸" },
  { code: "ja", name: "일본어", flag: "🇯🇵" },
  { code: "zh", name: "중국어", flag: "🇨🇳" },
  { code: "es", name: "스페인어", flag: "🇪🇸" },
  { code: "fr", name: "프랑스어", flag: "🇫🇷" },
  { code: "de", name: "독일어", flag: "🇩🇪" },
]

const TARGET_LANGUAGES = [
  { code: "none", name: "선택안함 (원문만)", flag: "📝" },
  ...LANGUAGES.filter(l => l.code !== "auto"),
]

// 화자 색상
const SPEAKER_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300" },
  { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", border: "border-green-300" },
  { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300" },
  { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", border: "border-red-300" },
  { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300" },
]

// 지원 플랫폼
const PLATFORMS = [
  { id: "zoom", name: "Zoom", icon: "📹", color: "bg-blue-500" },
  { id: "teams", name: "Microsoft Teams", icon: "💼", color: "bg-purple-600" },
  { id: "meet", name: "Google Meet", icon: "🎥", color: "bg-green-500" },
  { id: "discord", name: "Discord", icon: "🎮", color: "bg-indigo-600" },
  { id: "other", name: "기타", icon: "🖥️", color: "bg-slate-500" },
]

interface TranslatedUtterance extends AssemblyAIUtterance {
  translated?: string
}

export default function MeetingTranslatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <MeetingTranslatePageContent />
    </Suspense>
  )
}

function MeetingTranslatePageContent() {
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.get("embedded") === "true"
  
  // 상태
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [targetLanguage, setTargetLanguage] = useState("ko")
  const [isSupported, setIsSupported] = useState(true)
  const [captureMode, setCaptureMode] = useState<"idle" | "capturing" | "processing">("idle")
  const [utterances, setUtterances] = useState<TranslatedUtterance[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionTitle, setSessionTitle] = useState("")
  const [duration, setDuration] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  
  // 요약 관련
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState("")
  const [isSummarizing, setIsSummarizing] = useState(false)
  
  const supabase = createClient()
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // 시스템 오디오 캡처 훅
  const {
    isCapturing,
    audioLevel,
    error: captureError,
    startCapture,
    stopCapture,
    getRecordedAudio,
  } = useSystemAudioCapture({
    onAudioData: (chunk) => {
      audioChunksRef.current.push(chunk)
    },
    onError: (err) => setError(err),
  })

  // AssemblyAI 훅 (녹음 후 처리용)
  const {
    isProcessing,
    transcribeFromUrl,
  } = useAssemblyAI({
    languageCode: sourceLanguage === "auto" ? undefined : sourceLanguage,
    speakerLabels: true,
    onTranscriptReady: handleTranscriptReady,
    onError: (err) => setError(err),
  })

  // 브라우저 지원 확인
  useEffect(() => {
    setIsSupported(isSystemAudioCaptureSupported())
  }, [])

  // 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    loadUser()
  }, [])

  // 전사 완료 처리
  async function handleTranscriptReady(result: AssemblyAIResult) {
    setCaptureMode("idle")
    
    // 세션 생성
    if (userId && sessionId === null) {
      const session = await createSession(result)
      if (session) {
        setSessionId(session.id)
        setSessionTitle(session.title)
      }
    }
    
    // 번역 실행
    if (targetLanguage !== "none" && result.utterances.length > 0) {
      await translateUtterances(result.utterances)
    } else {
      setUtterances(result.utterances.map(u => ({ ...u })))
    }
  }

  // 세션 생성
  async function createSession(result: AssemblyAIResult) {
    if (!userId) return null
    
    try {
      const platformName = PLATFORMS.find(p => p.id === selectedPlatform)?.name || "화상회의"
      const title = `${platformName} 통역 ${new Date().toLocaleDateString("ko-KR")}`
      
      const { data, error } = await supabase
        .from("translation_sessions")
        .insert({
          user_id: userId,
          title,
          session_type: "meeting",
          source_language: result.language || sourceLanguage,
          target_languages: targetLanguage === "none" ? [] : [targetLanguage],
          status: "completed",
          total_utterances: result.utterances.length,
          metadata: {
            platform: selectedPlatform,
            duration: result.duration,
            speakerCount: Object.keys(result.speakerStats || {}).length,
          },
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error("Session creation error:", err)
      return null
    }
  }

  // 발화 번역
  async function translateUtterances(items: AssemblyAIUtterance[]) {
    if (targetLanguage === "none") {
      setUtterances(items.map(u => ({ ...u })))
      return
    }
    
    setIsTranslating(true)
    const translated: TranslatedUtterance[] = []
    
    for (const utterance of items) {
      try {
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              q: utterance.text,
              target: targetLanguage,
              format: "text",
            }),
          }
        )
        
        const data = await response.json()
        translated.push({
          ...utterance,
          translated: data.data?.translations?.[0]?.translatedText || "",
        })
      } catch (err) {
        translated.push({ ...utterance })
      }
    }
    
    setUtterances(translated)
    setIsTranslating(false)
  }

  // 캡처 시작
  const handleStartCapture = async () => {
    setError(null)
    setUtterances([])
    audioChunksRef.current = []
    setDuration(0)
    
    await startCapture(true) // 비디오도 캡처 (화면 공유 UI 표시용)
    setCaptureMode("capturing")
    
    // 시간 측정 시작
    const startTime = Date.now()
    durationIntervalRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
  }

  // 캡처 중지 및 처리
  const handleStopCapture = async () => {
    // 타이머 정지
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    
    stopCapture()
    setCaptureMode("processing")
    
    // 녹음된 오디오 가져오기
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
    
    if (audioBlob.size === 0) {
      setError("녹음된 오디오가 없습니다.")
      setCaptureMode("idle")
      return
    }
    
    console.log("[Meeting] Processing audio:", audioBlob.size, "bytes")
    
    try {
      // 파일 업로드
      const formData = new FormData()
      formData.append("file", audioBlob, "meeting_audio.webm")
      
      const uploadResponse = await fetch("/api/assemblyai/upload", {
        method: "POST",
        body: formData,
      })
      
      if (!uploadResponse.ok) {
        throw new Error("오디오 업로드 실패")
      }
      
      const uploadData = await uploadResponse.json()
      
      // 전사 요청
      await transcribeFromUrl(uploadData.uploadUrl)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리 중 오류 발생")
      setCaptureMode("idle")
    }
  }

  // 요약 생성
  const generateSummary = async () => {
    if (utterances.length === 0) return
    
    setIsSummarizing(true)
    try {
      // 텍스트 합치기
      const texts = utterances.map(u => u.text).join("\n")
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `다음 화상회의 내용을 한국어로 요약해주세요. 핵심 내용을 불릿 포인트로 정리해주세요.\n\n${texts}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            }
          }),
        }
      )
      
      const data = await response.json()
      const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text || "요약 생성 실패"
      setSummary(summaryText)
      setShowSummary(true)
      
    } catch (err) {
      setError("요약 생성 중 오류 발생")
    } finally {
      setIsSummarizing(false)
    }
  }

  // 화자 색상
  const getSpeakerColor = (speaker: string) => {
    const index = speaker.charCodeAt(0) - 65
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length]
  }

  // 시간 포맷
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // 타임스탬프 포맷
  const formatTimestamp = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      {/* 헤더 */}
      {!isEmbedded && (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/service" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                🎥 화상회의 통역
              </h1>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {/* 브라우저 지원 확인 */}
        {!isSupported && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-700">지원되지 않는 브라우저</p>
                <p className="text-sm text-red-600">
                  시스템 오디오 캡처를 지원하지 않습니다. Chrome, Edge 브라우저를 사용해주세요.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 제어 패널 */}
        <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
          <CardContent className="p-4 space-y-4">
            {/* 플랫폼 선택 */}
            {captureMode === "idle" && !isProcessing && utterances.length === 0 && (
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">
                  화상회의 플랫폼 선택
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => setSelectedPlatform(platform.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        selectedPlatform === platform.id
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                          : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{platform.icon}</span>
                      <span className="text-xs font-medium">{platform.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 언어 선택 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">음성 언어</label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  disabled={captureMode !== "idle"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">번역 언어</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  disabled={captureMode !== "idle"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {TARGET_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 캡처 시작 버튼 */}
            {captureMode === "idle" && !isProcessing && utterances.length === 0 && (
              <Button
                onClick={handleStartCapture}
                disabled={!selectedPlatform || !isSupported}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 h-14 text-lg"
              >
                <Monitor className="h-6 w-6 mr-2" />
                화면 공유 + 통역 시작
              </Button>
            )}

            {/* 캡처 중 */}
            {captureMode === "capturing" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full bg-indigo-500 animate-pulse flex items-center justify-center"
                    style={{
                      transform: `scale(${1 + audioLevel * 0.3})`,
                      transition: "transform 0.1s",
                    }}
                  >
                    <Video className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-mono font-bold text-indigo-600">
                      {formatDuration(duration)}
                    </div>
                    <div className="text-sm text-slate-500">
                      {selectedPlatform && PLATFORMS.find(p => p.id === selectedPlatform)?.name} 통역 중...
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {audioLevel > 0.1 ? (
                      <Volume2 className="h-5 w-5 text-green-500 animate-pulse" />
                    ) : (
                      <Volume2 className="h-5 w-5 text-slate-400" />
                    )}
                    <span className="text-sm text-slate-500">
                      {audioLevel > 0.1 ? "오디오 감지됨" : "대기 중"}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                  💡 <strong>Tip:</strong> 화면 공유 창에서 "시스템 오디오 공유"를 활성화해야 회의 소리가 캡처됩니다.
                </div>

                <Button
                  onClick={handleStopCapture}
                  className="w-full bg-red-500 hover:bg-red-600 h-12"
                >
                  <Square className="h-5 w-5 mr-2" />
                  통역 종료 및 저장
                </Button>
              </div>
            )}

            {/* 처리 중 */}
            {(captureMode === "processing" || isProcessing) && (
              <div className="flex items-center justify-center gap-4 py-8">
                <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
                <div>
                  <div className="font-medium text-lg">음성 분석 중...</div>
                  <div className="text-sm text-slate-500">화자 구분 및 전사 처리 중입니다</div>
                </div>
              </div>
            )}

            {/* 결과 있을 때 */}
            {utterances.length > 0 && captureMode === "idle" && !isProcessing && (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setUtterances([])
                    setSessionId(null)
                    setSessionTitle("")
                    audioChunksRef.current = []
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Video className="h-4 w-4 mr-2" />
                  새 회의
                </Button>
                <Button
                  onClick={generateSummary}
                  disabled={isSummarizing}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {isSummarizing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  AI 요약
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 사용 안내 */}
        {captureMode === "idle" && utterances.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                사용 방법
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">1</span>
                <p>Zoom, Teams, Meet 등 화상회의를 먼저 시작하세요.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">2</span>
                <p>위에서 플랫폼을 선택하고 "화면 공유 + 통역 시작" 버튼을 클릭하세요.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">3</span>
                <p>화면 공유 팝업에서 화상회의 창을 선택하고 <strong>"시스템 오디오 공유"</strong>를 꼭 체크하세요!</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">4</span>
                <p>회의가 끝나면 "통역 종료" 버튼을 눌러 결과를 확인하세요.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 에러 */}
        {(error || captureError) && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600">
            {error || captureError}
          </div>
        )}

        {/* 전사 결과 */}
        {utterances.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Languages className="h-5 w-5 text-indigo-500" />
                  통역 결과
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {new Set(utterances.map(u => u.speaker)).size}명
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 번역 중 */}
              {isTranslating && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  <span className="text-sm text-indigo-700">번역 중...</span>
                </div>
              )}

              {/* 발화 목록 */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {utterances.map((utterance, index) => {
                  const color = getSpeakerColor(utterance.speaker)
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${color.border} ${color.bg}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium text-sm ${color.text}`}>
                          화자 {utterance.speaker}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatTimestamp(utterance.start)}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        {utterance.text}
                      </p>
                      {utterance.translated && (
                        <p className="mt-2 text-sm text-slate-500 border-t pt-2 border-slate-200 dark:border-slate-700">
                          🌐 {utterance.translated}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 요약 모달 */}
        {showSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI 요약
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowSummary(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                  {summary}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}





