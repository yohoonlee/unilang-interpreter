"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Mic,
  MicOff,
  Square,
  Globe,
  ArrowRight,
  Volume2,
  Loader2,
  ArrowLeft,
  Settings,
  X,
  Save,
  History,
  Users,
  Clock,
  Languages,
  FileAudio,
  Link as LinkIcon,
  Youtube,
  Sparkles,
  Edit3,
  Check,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAssemblyAI, formatDuration, AssemblyAIResult, AssemblyAIUtterance } from "@/hooks/useAssemblyAI"
import { SpeakerMatcher } from "@/components/translate/SpeakerMatcher"

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
  { code: "vi", name: "베트남어", flag: "🇻🇳" },
  { code: "th", name: "태국어", flag: "🇹🇭" },
  { code: "id", name: "인도네시아어", flag: "🇮🇩" },
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
  { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-700 dark:text-pink-300", border: "border-pink-300" },
]

interface TranslatedUtterance extends AssemblyAIUtterance {
  translated?: string
  speakerName?: string
}

export default function RecordTranslatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <RecordTranslatePageContent />
    </Suspense>
  )
}

function RecordTranslatePageContent() {
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.get("embedded") === "true"
  
  // 상태
  const [mode, setMode] = useState<"idle" | "recording" | "url">("idle")
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [targetLanguage, setTargetLanguage] = useState("ko")
  const [result, setResult] = useState<AssemblyAIResult | null>(null)
  const [utterances, setUtterances] = useState<TranslatedUtterance[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [audioUrl, setAudioUrl] = useState("")
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({})
  const [showSpeakerMatcher, setShowSpeakerMatcher] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionTitle, setSessionTitle] = useState("")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleText, setEditTitleText] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  
  // 요약 관련
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState("")
  const [isSummarizing, setIsSummarizing] = useState(false)
  
  const supabase = createClient()

  // AssemblyAI 훅
  const {
    isRecording,
    isProcessing,
    recordingDuration,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    transcribeFromUrl,
  } = useAssemblyAI({
    languageCode: sourceLanguage === "auto" ? undefined : sourceLanguage,
    speakerLabels: true,
    onTranscriptReady: handleTranscriptReady,
    onError: (err) => setError(err),
    onUploadProgress: setUploadProgress,
  })

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
  async function handleTranscriptReady(res: AssemblyAIResult) {
    setResult(res)
    setMode("idle")
    
    // 세션 생성
    if (userId) {
      const session = await createSession(res)
      if (session) {
        setSessionId(session.id)
        setSessionTitle(session.title)
      }
    }
    
    // 번역 실행
    if (targetLanguage !== "none" && res.utterances.length > 0) {
      await translateUtterances(res.utterances)
    } else {
      setUtterances(res.utterances.map(u => ({ ...u })))
    }
  }

  // 세션 생성
  async function createSession(res: AssemblyAIResult) {
    if (!userId) return null
    
    try {
      const title = `녹음 통역 ${new Date().toLocaleDateString("ko-KR")}`
      
      const { data, error } = await supabase
        .from("translation_sessions")
        .insert({
          user_id: userId,
          title,
          session_type: "record",
          source_language: res.language || sourceLanguage,
          target_languages: targetLanguage === "none" ? [] : [targetLanguage],
          status: "completed",
          total_utterances: res.utterances.length,
          metadata: {
            transcriptId: res.transcriptId,
            duration: res.duration,
            confidence: res.confidence,
            speakerCount: Object.keys(res.speakerStats).length,
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
        translated.push({ ...utterance, translated: "" })
      }
    }
    
    setUtterances(translated)
    setIsTranslating(false)
    
    // DB 저장
    if (sessionId && userId) {
      await saveUtterancesToDb(translated)
    }
  }

  // 발화 DB 저장
  async function saveUtterancesToDb(items: TranslatedUtterance[]) {
    if (!sessionId || !userId) return
    
    for (const item of items) {
      try {
        // 발화 저장
        const { data: utterance, error: uError } = await supabase
          .from("utterances")
          .insert({
            session_id: sessionId,
            user_id: userId,
            speaker_name: speakerNames[item.speaker] || `화자 ${item.speaker}`,
            original_text: item.text,
            original_language: result?.language || sourceLanguage,
            confidence: item.confidence,
            metadata: { start: item.start, end: item.end },
          })
          .select()
          .single()

        if (uError) throw uError

        // 번역 저장
        if (item.translated && utterance) {
          await supabase
            .from("translations")
            .insert({
              utterance_id: utterance.id,
              translated_text: item.translated,
              target_language: targetLanguage,
              translation_provider: "google",
            })
        }
      } catch (err) {
        console.error("Save utterance error:", err)
      }
    }
  }

  // 녹음 시작
  const handleStartRecording = async () => {
    setError(null)
    setResult(null)
    setUtterances([])
    setMode("recording")
    await startRecording()
  }

  // 녹음 중지
  const handleStopRecording = async () => {
    await stopRecording()
  }

  // URL 전사
  const handleUrlTranscribe = async () => {
    if (!audioUrl.trim()) {
      setError("URL을 입력해주세요")
      return
    }
    setError(null)
    setResult(null)
    setUtterances([])
    await transcribeFromUrl(audioUrl)
  }

  // 요약 생성
  const generateSummary = async () => {
    if (!result?.transcriptId) return
    
    setIsSummarizing(true)
    try {
      const response = await fetch("/api/assemblyai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptId: result.transcriptId,
          summaryType: "meeting",
          language: targetLanguage === "none" ? sourceLanguage : targetLanguage,
        }),
      })
      
      const data = await response.json()
      if (data.success) {
        setSummary(data.summary)
        setShowSummary(true)
      } else {
        setError(data.error || "요약 생성 실패")
      }
    } catch (err) {
      setError("요약 생성 중 오류 발생")
    } finally {
      setIsSummarizing(false)
    }
  }

  // 제목 저장
  const saveTitle = async () => {
    if (!sessionId || !editTitleText.trim()) return
    
    await supabase
      .from("translation_sessions")
      .update({ title: editTitleText })
      .eq("id", sessionId)
    
    setSessionTitle(editTitleText)
    setIsEditingTitle(false)
  }

  // 화자 색상 가져오기
  const getSpeakerColor = (speaker: string) => {
    const index = speaker.charCodeAt(0) - 65
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length]
  }

  // 화자 이름 가져오기
  const getSpeakerName = (speaker: string) => {
    return speakerNames[speaker] || `화자 ${speaker}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800">
      {/* 헤더 */}
      {!isEmbedded && (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/service" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-lg font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                🎙️ 녹음 통역 (화자 구분)
              </h1>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {/* 제어 패널 */}
        <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
          <CardContent className="p-4">
            {/* 세션 제목 */}
            {sessionTitle && (
              <div className="mb-4 flex items-center gap-2">
                {isEditingTitle ? (
                  <>
                    <input
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      className="flex-1 px-3 py-1 rounded border border-teal-300 bg-white text-sm"
                      placeholder="제목 입력..."
                    />
                    <Button size="sm" onClick={saveTitle}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-lg font-semibold text-teal-700 dark:text-teal-300">
                      📁 {sessionTitle}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditTitleText(sessionTitle)
                        setIsEditingTitle(true)
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* 언어 선택 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">음성 언어</label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  disabled={isRecording || isProcessing}
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
                  disabled={isRecording || isProcessing}
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

            {/* 모드 선택 / 녹음 컨트롤 */}
            {mode === "idle" && !isProcessing && !result && (
              <div className="flex gap-2">
                <Button
                  onClick={handleStartRecording}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  마이크 녹음
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode("url")}
                  className="flex-1"
                >
                  <LinkIcon className="h-5 w-5 mr-2" />
                  URL / YouTube
                </Button>
              </div>
            )}

            {/* URL 입력 모드 */}
            {mode === "url" && !isProcessing && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="오디오/비디오 URL 또는 YouTube URL 입력..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <Button onClick={handleUrlTranscribe}>
                    <Globe className="h-4 w-4 mr-2" />
                    전사
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Youtube className="h-4 w-4" />
                  YouTube URL도 지원됩니다
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMode("idle")}>
                  취소
                </Button>
              </div>
            )}

            {/* 녹음 중 */}
            {isRecording && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full bg-red-500 animate-pulse flex items-center justify-center"
                    style={{
                      transform: `scale(${1 + audioLevel * 0.3})`,
                      transition: "transform 0.1s",
                    }}
                  >
                    <Mic className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-mono font-bold text-red-500">
                      {formatDuration(recordingDuration)}
                    </div>
                    <div className="text-sm text-slate-500">녹음 중... (최소 1초)</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleStopRecording}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    녹음 종료
                  </Button>
                  <Button variant="outline" onClick={cancelRecording}>
                    취소
                  </Button>
                </div>
              </div>
            )}

            {/* 처리 중 */}
            {isProcessing && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Loader2 className="h-12 w-12 text-teal-500 animate-spin" />
                  <div>
                    <div className="font-medium text-lg">
                      {uploadProgress < 50 ? "업로드 중..." : "음성 분석 중..."}
                    </div>
                    <div className="text-sm text-slate-500">
                      화자 구분 및 전사 처리 중입니다
                    </div>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 결과 있을 때 - 새 녹음 버튼 */}
            {result && mode === "idle" && !isProcessing && (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setResult(null)
                    setUtterances([])
                    setSessionId(null)
                    setSessionTitle("")
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  새 녹음
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
                {Object.keys(result.speakerStats).length > 0 && (
                  <Button
                    onClick={() => setShowSpeakerMatcher(true)}
                    variant="outline"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    화자 매칭
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* 전사 결과 */}
        {result && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Languages className="h-5 w-5 text-teal-500" />
                  전사 결과
                  {result.language && (
                    <span className="text-sm font-normal text-slate-500">
                      ({LANGUAGES.find(l => l.code === result.language)?.name || result.language})
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {Math.round(result.duration)}초
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {Object.keys(result.speakerStats).length}명
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 화자 통계 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(result.speakerStats).map(([speaker, stats]) => {
                  const color = getSpeakerColor(speaker)
                  return (
                    <div
                      key={speaker}
                      className={`px-3 py-1.5 rounded-full text-sm ${color.bg} ${color.text} border ${color.border}`}
                    >
                      <input
                        type="text"
                        value={speakerNames[speaker] || ""}
                        onChange={(e) => setSpeakerNames(prev => ({ ...prev, [speaker]: e.target.value }))}
                        placeholder={`화자 ${speaker}`}
                        className="bg-transparent border-none outline-none w-20 text-center placeholder:text-current placeholder:opacity-70"
                      />
                      <span className="ml-1 opacity-70">({stats.count}회)</span>
                    </div>
                  )
                })}
              </div>

              {/* 번역 중 표시 */}
              {isTranslating && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
                  <span className="text-sm text-teal-700 dark:text-teal-300">번역 중...</span>
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
                        <span className={`font-medium ${color.text}`}>
                          {getSpeakerName(utterance.speaker)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatTimestamp(utterance.start)} - {formatTimestamp(utterance.end)}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        {utterance.text}
                      </p>
                      {utterance.translated && (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 border-t pt-2 border-slate-200 dark:border-slate-700">
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

        {/* 화자 매칭 모달 */}
        {showSpeakerMatcher && result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl">
              <SpeakerMatcher
                sessionId={sessionId || "temp"}
                speakers={Object.keys(result.speakerStats)}
                onSave={(mappings) => {
                  const names: Record<string, string> = {}
                  mappings.forEach(m => {
                    names[m.speakerId] = m.participantName
                  })
                  setSpeakerNames(names)
                  setShowSpeakerMatcher(false)
                }}
                onCancel={() => setShowSpeakerMatcher(false)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// 타임스탬프 포맷
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}










