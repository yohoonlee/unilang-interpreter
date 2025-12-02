"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Youtube,
  Globe,
  Loader2,
  ArrowLeft,
  X,
  Users,
  Clock,
  Languages,
  Sparkles,
  Play,
  ExternalLink,
  Download,
  Copy,
  Check,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

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
  { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", border: "border-red-300" },
  { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300" },
  { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", border: "border-green-300" },
  { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300" },
]

interface Utterance {
  speaker: string
  text: string
  start: number
  end: number
  translated?: string
}

interface TranscriptResult {
  transcriptId: string
  text: string
  language: string
  duration: number
  utterances: Utterance[]
  speakerStats: Record<string, { count: number; duration: number }>
}

export default function YouTubeTranslatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <YouTubeTranslatePageContent />
    </Suspense>
  )
}

function YouTubeTranslatePageContent() {
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.get("embedded") === "true"
  
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [videoId, setVideoId] = useState<string | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [targetLanguage, setTargetLanguage] = useState("ko")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("")
  const [result, setResult] = useState<TranscriptResult | null>(null)
  const [utterances, setUtterances] = useState<Utterance[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [summary, setSummary] = useState("")
  const [showSummary, setShowSummary] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  
  const supabase = createClient()

  // YouTube URL에서 비디오 ID 추출
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // URL 변경 시 비디오 ID 추출
  useEffect(() => {
    const id = extractVideoId(youtubeUrl)
    setVideoId(id)
  }, [youtubeUrl])

  // 전사 시작
  const startTranscription = async () => {
    if (!youtubeUrl.trim()) {
      setError("YouTube URL을 입력해주세요")
      return
    }
    
    setError(null)
    setResult(null)
    setUtterances([])
    setIsProcessing(true)
    setProgress(0)
    setProgressText("전사 요청 중...")

    try {
      // AssemblyAI는 YouTube URL을 직접 지원
      setProgress(20)
      setProgressText("YouTube 오디오 추출 중...")
      
      const response = await fetch("/api/assemblyai/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: youtubeUrl,
          languageCode: sourceLanguage === "auto" ? undefined : sourceLanguage,
          speakerLabels: true,
        }),
      })

      setProgress(80)
      setProgressText("전사 완료, 결과 처리 중...")

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || "전사 실패")
      }

      setResult(data)
      setProgress(100)
      
      // 번역 실행
      if (targetLanguage !== "none" && data.utterances?.length > 0) {
        await translateUtterances(data.utterances)
      } else {
        setUtterances(data.utterances || [])
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "전사 중 오류 발생")
    } finally {
      setIsProcessing(false)
      setProgress(0)
      setProgressText("")
    }
  }

  // 발화 번역
  async function translateUtterances(items: Utterance[]) {
    if (targetLanguage === "none") {
      setUtterances(items)
      return
    }
    
    setIsTranslating(true)
    const translated: Utterance[] = []
    
    for (let i = 0; i < items.length; i++) {
      const utterance = items[i]
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
          summaryType: "general",
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

  // 텍스트 복사
  const copyTranscript = async () => {
    const text = utterances
      .map(u => `[${formatTimestamp(u.start)}] ${u.text}${u.translated ? `\n→ ${u.translated}` : ""}`)
      .join("\n\n")
    
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // SRT 다운로드
  const downloadSRT = () => {
    let srt = ""
    utterances.forEach((u, i) => {
      srt += `${i + 1}\n`
      srt += `${formatSRTTime(u.start)} --> ${formatSRTTime(u.end)}\n`
      srt += `${u.translated || u.text}\n\n`
    })
    
    const blob = new Blob([srt], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `youtube_${videoId}_subtitles.srt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 화자 색상
  const getSpeakerColor = (speaker: string) => {
    const index = speaker.charCodeAt(0) - 65
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 dark:from-slate-900 dark:to-slate-800">
      {/* 헤더 */}
      {!isEmbedded && (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/service" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-lg font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                📺 YouTube 통역
              </h1>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {/* URL 입력 */}
        <Card className="border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <CardContent className="p-4 space-y-4">
            {/* URL 입력 */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                YouTube URL
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={isProcessing}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <Button
                  onClick={startTranscription}
                  disabled={!youtubeUrl.trim() || isProcessing}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 px-6"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      전사 시작
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 비디오 미리보기 */}
            {videoId && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}

            {/* 언어 선택 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">원본 언어</label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  disabled={isProcessing}
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
                  disabled={isProcessing}
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

            {/* 진행 상태 */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{progressText}</span>
                  <span className="text-red-500">{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 에러 */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* 결과 */}
        {result && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Languages className="h-5 w-5 text-red-500" />
                  전사 결과
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {Math.round(result.duration)}초
                  </span>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {Object.keys(result.speakerStats).length}명
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 액션 버튼 */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={generateSummary}
                  disabled={isSummarizing}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {isSummarizing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  AI 요약
                </Button>
                <Button onClick={copyTranscript} size="sm" variant="outline">
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "복사됨!" : "복사"}
                </Button>
                <Button onClick={downloadSRT} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  SRT 다운로드
                </Button>
              </div>

              {/* 번역 중 */}
              {isTranslating && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                  <span className="text-sm text-orange-700">번역 중...</span>
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

// 타임스탬프 포맷 (밀리초)
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

// SRT 시간 포맷
function formatSRTTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")},${milliseconds.toString().padStart(3, "0")}`
}

