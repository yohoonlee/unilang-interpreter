"use client"

import { useState, useEffect, useRef, Suspense } from "react"
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
  Mic,
  MicOff,
  Volume2,
  Radio,
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
  
  // 실시간 통역 모드
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [noSubtitleError, setNoSubtitleError] = useState(false)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isListeningRef = useRef(false)
  
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
    setNoSubtitleError(false)
    setIsProcessing(true)
    setProgress(0)
    setProgressText("전사 요청 중...")

    try {
      // YouTube 자막 API 사용
      setProgress(20)
      setProgressText("YouTube 자막 추출 중...")
      
      const response = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl,
          targetLanguage: targetLanguage !== "none" ? targetLanguage : null,
        }),
      })

      setProgress(80)
      setProgressText("전사 완료, 결과 처리 중...")

      const data = await response.json()
      
      if (!data.success) {
        // 자막이 없는 경우 실시간 모드 제안
        if (data.error?.includes("자막이 없") || data.error?.includes("자막을 찾을 수 없") || data.error?.includes("자막을 가져올 수 없")) {
          setNoSubtitleError(true)
          setError(null)
        } else {
          throw new Error(data.error || "전사 실패")
        }
        return
      }

      setResult({
        transcriptId: data.videoId,
        text: data.text,
        language: data.language,
        duration: data.duration,
        utterances: data.utterances,
        speakerStats: data.speakerStats,
      })
      setUtterances(data.utterances || [])
      setProgress(100)

    } catch (err) {
      setError(err instanceof Error ? err.message : "전사 중 오류 발생")
    } finally {
      setIsProcessing(false)
      setProgress(0)
      setProgressText("")
    }
  }

  // ===== 실시간 통역 모드 =====
  
  // 언어 코드 변환
  const getLanguageCode = (code: string): string => {
    const langMap: Record<string, string> = {
      ko: "ko-KR",
      en: "en-US",
      ja: "ja-JP",
      zh: "zh-CN",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      auto: "en-US",
    }
    return langMap[code] || "en-US"
  }

  // 번역 함수
  const translateText = async (text: string, source: string, target: string): Promise<string> => {
    if (!text.trim() || target === "none" || source === target) return text
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: text,
            source: source === "auto" ? undefined : source,
            target: target,
            format: "text",
          }),
        }
      )
      
      const data = await response.json()
      return data.data?.translations?.[0]?.translatedText || text
    } catch {
      return text
    }
  }

  // 실시간 통역 시작
  const startLiveMode = () => {
    setIsLiveMode(true)
    setNoSubtitleError(false)
    setUtterances([])
    setResult(null)
  }

  // 실시간 통역에서 번역 추가
  const addLiveUtterance = async (text: string) => {
    const srcLang = sourceLanguage === "auto" ? "en" : sourceLanguage
    const translated = targetLanguage !== "none" 
      ? await translateText(text, srcLang, targetLanguage)
      : ""
    
    const newUtterance: Utterance = {
      speaker: "A",
      text: text,
      start: Date.now(),
      end: Date.now(),
      translated,
    }
    
    setUtterances(prev => [...prev, newUtterance])
  }

  // 음성 인식 초기화
  const initRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError("이 브라우저는 음성 인식을 지원하지 않습니다.")
      return null
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = getLanguageCode(sourceLanguage)

    recognition.onresult = (event) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      setCurrentTranscript(interimTranscript)

      if (finalTranscript.trim()) {
        addLiveUtterance(finalTranscript.trim())
        setCurrentTranscript("")
      }
    }

    recognition.onerror = (event) => {
      console.error("음성 인식 오류:", event.error)
      if (event.error === "no-speech" && isListeningRef.current) {
        // 자동 재시작
        try {
          recognition.stop()
          setTimeout(() => {
            if (isListeningRef.current) {
              recognition.start()
            }
          }, 100)
        } catch {}
      }
    }

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start()
        } catch {}
      }
    }

    return recognition
  }

  // 실시간 통역 토글
  const toggleLiveListening = () => {
    if (isListening) {
      // 중지
      isListeningRef.current = false
      setIsListening(false)
      recognitionRef.current?.stop()
    } else {
      // 시작
      const recognition = initRecognition()
      if (recognition) {
        recognitionRef.current = recognition
        isListeningRef.current = true
        setIsListening(true)
        recognition.start()
      }
    }
  }

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        isListeningRef.current = false
        recognitionRef.current.stop()
      }
    }
  }, [])

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

  // 요약 생성 (Gemini 사용)
  const generateSummary = async () => {
    if (!result?.text || utterances.length === 0) return
    
    setIsSummarizing(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
      if (!apiKey) throw new Error("API 키가 설정되지 않았습니다.")
      
      // 전체 텍스트 또는 번역된 텍스트 사용
      const textToSummarize = utterances
        .map(u => u.translated || u.text)
        .join("\n")
      
      const summaryLang = targetLanguage === "none" 
        ? (sourceLanguage === "auto" ? "ko" : sourceLanguage) 
        : targetLanguage
      
      const langName = LANGUAGES.find(l => l.code === summaryLang)?.name || "한국어"
      
      const prompt = `다음은 YouTube 동영상의 자막입니다. ${langName}로 핵심 내용을 요약해주세요.

자막 내용:
${textToSummarize}

요약 (${langName}):`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048,
            },
          }),
        }
      )
      
      if (!response.ok) throw new Error("요약 생성 실패")
      
      const data = await response.json()
      const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text || "요약을 생성할 수 없습니다."
      
      setSummary(summaryText)
      setShowSummary(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "요약 생성 중 오류 발생")
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

        {/* 자막이 없는 경우 - 실시간 모드 제안 */}
        {noSubtitleError && !isLiveMode && (
          <Card className="border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
                  <Volume2 className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                    자막이 없는 영상입니다
                  </h3>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    실시간 통역 모드로 영상을 재생하면서 음성을 번역할 수 있습니다.
                  </p>
                </div>
                <Button
                  onClick={startLiveMode}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Radio className="h-5 w-5 mr-2" />
                  실시간 통역 모드 시작
                </Button>
                <p className="text-xs text-amber-500">
                  💡 영상을 재생하고 마이크 버튼을 눌러 스피커 소리를 인식합니다
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 실시간 통역 모드 */}
        {isLiveMode && (
          <Card className="border-green-300 dark:border-green-700 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Radio className="h-5 w-5 text-green-500" />
                  실시간 통역 모드
                  {isListening && (
                    <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                      LIVE
                    </span>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsLiveMode(false)
                    if (isListening) toggleLiveListening()
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  1. 위의 YouTube 영상을 재생하세요<br/>
                  2. 아래 마이크 버튼을 눌러 음성 인식을 시작하세요<br/>
                  3. 스피커에서 나오는 소리가 자동으로 번역됩니다
                </p>
                
                <div className="flex items-center justify-center gap-4">
                  <Button
                    onClick={toggleLiveListening}
                    size="lg"
                    className={`rounded-full w-16 h-16 ${
                      isListening 
                        ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="h-8 w-8" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                  </Button>
                </div>
                
                {isListening && (
                  <div className="mt-4 text-center text-sm text-green-600 dark:text-green-400">
                    🎤 음성 인식 중... 스피커 소리를 듣고 있습니다
                  </div>
                )}
              </div>

              {/* 현재 인식 중인 텍스트 */}
              {currentTranscript && (
                <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg border border-teal-200 dark:border-teal-700">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-medium text-teal-700 dark:text-teal-300">실시간 인식 중...</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{currentTranscript}</p>
                </div>
              )}

              {/* 실시간 번역 결과 */}
              {utterances.length > 0 && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {utterances.map((utterance, index) => (
                    <div
                      key={index}
                      className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <p className="text-slate-700 dark:text-slate-300">
                        {utterance.text}
                      </p>
                      {utterance.translated && (
                        <p className="mt-2 text-sm text-green-600 dark:text-green-400 border-t pt-2 border-slate-200 dark:border-slate-700">
                          🌐 {utterance.translated}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 액션 버튼 */}
              {utterances.length > 0 && (
                <div className="flex gap-2">
                  <Button onClick={copyTranscript} size="sm" variant="outline">
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? "복사됨!" : "복사"}
                  </Button>
                  <Button onClick={generateSummary} size="sm" variant="outline" disabled={isSummarizing}>
                    {isSummarizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    AI 요약
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 결과 */}
        {result && !isLiveMode && (
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

