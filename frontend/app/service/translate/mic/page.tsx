"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Mic, 
  MicOff, 
  Globe, 
  ArrowRight, 
  Volume2,
  Loader2,
  ArrowLeft,
  Settings
} from "lucide-react"
import Link from "next/link"

// 지원 언어 목록
const LANGUAGES = [
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

interface TranscriptItem {
  id: string
  original: string
  translated: string
  sourceLanguage: string
  targetLanguage: string
  timestamp: Date
}

export default function MicTranslatePage() {
  const [isListening, setIsListening] = useState(false)
  const [sourceLanguage, setSourceLanguage] = useState("en")
  const [targetLanguage, setTargetLanguage] = useState("ko")
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptContainerRef = useRef<HTMLDivElement>(null)

  // Web Speech API 초기화
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = getLanguageCode(sourceLanguage)

        recognitionRef.current.onresult = async (event) => {
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

          if (finalTranscript) {
            await translateAndAdd(finalTranscript)
            setCurrentTranscript("")
          }
        }

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error)
          if (event.error === "not-allowed") {
            setError("마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요.")
          } else {
            setError(`음성 인식 오류: ${event.error}`)
          }
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          if (isListening) {
            recognitionRef.current?.start()
          }
        }
      } else {
        setError("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.")
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [sourceLanguage])

  // 언어 코드 변환
  const getLanguageCode = (code: string) => {
    const langMap: Record<string, string> = {
      ko: "ko-KR",
      en: "en-US",
      ja: "ja-JP",
      zh: "zh-CN",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      vi: "vi-VN",
      th: "th-TH",
      id: "id-ID",
    }
    return langMap[code] || "en-US"
  }

  // Google Translate API 호출
  const translateText = async (text: string, source: string, target: string): Promise<string> => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    
    if (!apiKey) {
      throw new Error("Google API 키가 설정되지 않았습니다.")
    }

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          source: source,
          target: target,
          format: "text",
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || "번역 실패")
    }

    const data = await response.json()
    return data.data.translations[0].translatedText
  }

  // 번역 후 목록에 추가
  const translateAndAdd = async (text: string) => {
    if (!text.trim()) return

    setIsTranslating(true)
    try {
      const translated = await translateText(text, sourceLanguage, targetLanguage)
      
      const newItem: TranscriptItem = {
        id: Date.now().toString(),
        original: text,
        translated: translated,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        timestamp: new Date(),
      }

      setTranscripts((prev) => [...prev, newItem])
      
      // 스크롤 맨 아래로
      setTimeout(() => {
        transcriptContainerRef.current?.scrollTo({
          top: transcriptContainerRef.current.scrollHeight,
          behavior: "smooth",
        })
      }, 100)
    } catch (err) {
      console.error("Translation error:", err)
      setError(err instanceof Error ? err.message : "번역 중 오류가 발생했습니다.")
    } finally {
      setIsTranslating(false)
    }
  }

  // 녹음 시작/중지
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError("음성 인식이 초기화되지 않았습니다.")
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setError(null)
      recognitionRef.current.lang = getLanguageCode(sourceLanguage)
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  // 언어 스왑
  const swapLanguages = () => {
    setSourceLanguage(targetLanguage)
    setTargetLanguage(sourceLanguage)
  }

  const getLanguageInfo = (code: string) => {
    return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0]
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg">
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 dark:text-white">실시간 음성 통역</h1>
                <p className="text-xs text-slate-500">마이크로 말하면 실시간 번역</p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 언어 선택 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              {/* Source Language */}
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1 text-center">음성 언어</label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  disabled={isListening}
                  className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={swapLanguages}
                disabled={isListening}
                className="mt-5 rounded-full"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>

              {/* Target Language */}
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1 text-center">번역 언어</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 통역 결과 */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-teal-500" />
              통역 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={transcriptContainerRef}
              className="h-[400px] overflow-y-auto space-y-4 p-2"
            >
              {transcripts.length === 0 && !currentTranscript && (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>마이크 버튼을 눌러 말씀해주세요</p>
                    <p className="text-sm mt-2">음성이 실시간으로 번역됩니다</p>
                  </div>
                </div>
              )}

              {transcripts.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getLanguageInfo(item.sourceLanguage).flag}</span>
                    <p className="text-slate-700 dark:text-slate-300 flex-1">{item.original}</p>
                  </div>
                  <div className="flex items-start gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-lg">{getLanguageInfo(item.targetLanguage).flag}</span>
                    <p className="text-teal-600 dark:text-teal-400 font-medium flex-1">{item.translated}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 text-right">
                    {item.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              ))}

              {/* 현재 인식 중인 텍스트 */}
              {currentTranscript && (
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border-2 border-teal-200 dark:border-teal-800 animate-pulse">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getLanguageInfo(sourceLanguage).flag}</span>
                    <p className="text-slate-600 dark:text-slate-400">{currentTranscript}</p>
                  </div>
                </div>
              )}

              {/* 번역 중 표시 */}
              {isTranslating && (
                <div className="flex items-center justify-center gap-2 text-teal-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">번역 중...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 마이크 버튼 */}
        <div className="flex justify-center">
          <Button
            onClick={toggleListening}
            size="lg"
            className={`h-20 w-20 rounded-full shadow-lg transition-all ${
              isListening
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-gradient-to-br from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
            }`}
          >
            {isListening ? (
              <MicOff className="h-8 w-8 text-white" />
            ) : (
              <Mic className="h-8 w-8 text-white" />
            )}
          </Button>
        </div>
        <p className="text-center text-sm text-slate-500 mt-4">
          {isListening ? "듣는 중... 말씀해주세요" : "버튼을 눌러 시작하세요"}
        </p>

        {/* 상태 표시 */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isListening ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
            <span>음성 인식</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isTranslating ? "bg-teal-500 animate-pulse" : "bg-slate-300"}`} />
            <span>번역</span>
          </div>
        </div>
      </main>
    </div>
  )
}

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

