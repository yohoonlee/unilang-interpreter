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
  List,
  Trash2,
  Calendar,
  Upload,
  Menu,
  FileText,
  Eye,
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

// YouTube 통역 기록 인터페이스
interface YouTubeSession {
  id: string
  title: string
  youtube_video_id: string
  youtube_title: string
  source_language: string
  target_languages: string[]
  started_at: string
  total_utterances: number
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
  
  // 시스템 오디오 캡처 모드
  const [isSystemAudioMode, setIsSystemAudioMode] = useState(false)
  const [isCapturingSystemAudio, setIsCapturingSystemAudio] = useState(false)
  const systemAudioStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // 자막 오버레이 창
  const [overlayWindow, setOverlayWindow] = useState<Window | null>(null)
  const [showOverlayButton, setShowOverlayButton] = useState(false)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isListeningRef = useRef(false)
  const liveResultsRef = useRef<HTMLDivElement>(null)
  
  // 기록 목록 상태
  const [showHistory, setShowHistory] = useState(false)
  const [youtubeSessions, setYoutubeSessions] = useState<YouTubeSession[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  
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

  // YouTube 통역 기록 불러오기
  const loadYoutubeHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoadingHistory(false)
        return
      }

      const { data, error } = await supabase
        .from("translation_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_type", "youtube")
        .order("started_at", { ascending: false })
        .limit(20)

      if (error) {
        console.error("YouTube 기록 로드 실패:", error)
      } else {
        setYoutubeSessions(data || [])
      }
    } catch (err) {
      console.error("오류:", err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // 기록 삭제
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
        setYoutubeSessions(prev => prev.filter(s => s.id !== sessionId))
      }
    } catch (err) {
      console.error("오류:", err)
    }
  }

  // 기록에서 다시보기
  const playFromHistory = (session: YouTubeSession) => {
    const liveUrl = `/service/translate/youtube/live?v=${session.youtube_video_id}&source=${session.source_language}&target=${session.target_languages[0] || "ko"}`
    
    const width = Math.floor(window.screen.width * 0.9)
    const height = Math.floor(window.screen.height * 0.9)
    const left = Math.floor((window.screen.width - width) / 2)
    const top = Math.floor((window.screen.height - height) / 2)
    
    window.open(
      liveUrl,
      "unilang_live",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    )
  }

  // 기록에서 요약보기
  const [viewingSummary, setViewingSummary] = useState<{title: string, summary: string} | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  
  const viewSummaryFromHistory = async (session: YouTubeSession) => {
    setIsLoadingSummary(true)
    try {
      // 세션의 요약 정보 가져오기
      const { data: summaryData, error: summaryError } = await supabase
        .from("session_summaries")
        .select("summary_text")
        .eq("session_id", session.id)
        .single()
      
      if (summaryError || !summaryData?.summary_text) {
        // 요약이 없으면 발화 데이터로 새로 생성
        const { data: utterances, error: uttError } = await supabase
          .from("utterances")
          .select("original_text, translated_text")
          .eq("session_id", session.id)
          .order("start_time", { ascending: true })
        
        if (uttError || !utterances?.length) {
          alert("이 세션에 저장된 내용이 없습니다.")
          setIsLoadingSummary(false)
          return
        }
        
        // AI 요약 생성
        const textToSummarize = utterances
          .map(u => u.translated_text || u.original_text)
          .join("\n")
        
        const response = await fetch("/api/gemini/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textToSummarize,
            targetLanguage: session.target_languages?.[0] || "ko",
          }),
        })
        
        const result = await response.json()
        
        if (result.success) {
          setViewingSummary({
            title: session.youtube_title || session.title,
            summary: result.summary
          })
          
          // 요약 저장
          await supabase.from("session_summaries").upsert({
            session_id: session.id,
            summary_text: result.summary,
            language: session.target_languages?.[0] || "ko",
          })
        } else {
          alert("요약 생성에 실패했습니다.")
        }
      } else {
        setViewingSummary({
          title: session.youtube_title || session.title,
          summary: summaryData.summary_text
        })
      }
    } catch (err) {
      console.error("요약 로드 오류:", err)
      alert("요약을 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoadingSummary(false)
    }
  }

  // 기록 토글 시 데이터 로드
  useEffect(() => {
    if (showHistory) {
      loadYoutubeHistory()
    }
  }, [showHistory])

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

  // 원클릭 실시간 통역 시작 - YouTube를 팝업으로 열고 현재 페이지에서 자막 표시
  const startOneClickLiveMode = async (quickSummary = false) => {
    if (!videoId) {
      setError("YouTube URL을 먼저 입력해주세요")
      return
    }

    // YouTube + 자막 오버레이 페이지를 새 창으로 열기 (화면 90% 크기, 자동시작)
    const width = Math.floor(window.screen.width * 0.9)
    const height = Math.floor(window.screen.height * 0.9)
    const left = Math.floor((window.screen.width - width) / 2)
    const top = Math.floor((window.screen.height - height) / 2)
    
    // quickSummary 모드: 빠른 요약 모드로 실행
    const liveUrl = `/service/translate/youtube/live?v=${videoId}&source=${sourceLanguage}&target=${targetLanguage}&autostart=true${quickSummary ? '&quickSummary=true' : ''}`
    
    const liveWindow = window.open(
      liveUrl,
      "unilang_live",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    )
    
    if (!liveWindow) {
      // 팝업이 차단된 경우 새 탭으로 열기
      window.open(liveUrl, "_blank")
    }
  }

  // 자막 오버레이 창 열기
  const openOverlayWindow = () => {
    // 기존 창이 있으면 닫기
    if (overlayWindow && !overlayWindow.closed) {
      overlayWindow.close()
    }

    // 작은 오버레이 창 열기
    const width = 500
    const height = 200
    const left = window.screen.width - width - 20
    const top = window.screen.height - height - 100

    const newWindow = window.open(
      "",
      "subtitle_overlay",
      `width=${width},height=${height},left=${left},top=${top},alwaysOnTop=yes,toolbar=no,menubar=no,scrollbars=no,resizable=yes`
    )

    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>UniLang 자막</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: rgba(0, 0, 0, 0.85);
              color: white;
              padding: 12px;
              overflow: hidden;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
              font-size: 11px;
              color: #888;
            }
            .live-badge {
              background: #ef4444;
              color: white;
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 10px;
              animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            .content {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .original {
              font-size: 16px;
              color: #fff;
              margin-bottom: 6px;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            }
            .translated {
              font-size: 18px;
              color: #4ade80;
              font-weight: 500;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            }
            .waiting {
              color: #666;
              font-style: italic;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <span>🌐 UniLang 실시간 자막</span>
            <span class="live-badge">LIVE</span>
          </div>
          <div class="content">
            <div id="original" class="original"></div>
            <div id="translated" class="translated"></div>
            <div id="waiting" class="waiting">🎤 음성을 기다리는 중...</div>
          </div>
        </body>
        </html>
      `)
      newWindow.document.close()
      setOverlayWindow(newWindow)
    }
  }

  // 오버레이 창 업데이트
  const updateOverlayWindow = (original: string, translated: string) => {
    if (overlayWindow && !overlayWindow.closed) {
      try {
        const originalEl = overlayWindow.document.getElementById("original")
        const translatedEl = overlayWindow.document.getElementById("translated")
        const waitingEl = overlayWindow.document.getElementById("waiting")
        
        if (originalEl) originalEl.textContent = original
        if (translatedEl) translatedEl.textContent = translated ? `🌐 ${translated}` : ""
        if (waitingEl) waitingEl.style.display = original ? "none" : "block"
      } catch {
        // 창이 닫혔거나 접근 불가
      }
    }
  }

  // 실시간 통역에서 번역 추가
  const addLiveUtterance = async (text: string) => {
    console.log("[YouTube Live] 새 발화 추가:", text)
    
    const srcLang = sourceLanguage === "auto" ? "en" : sourceLanguage
    let translated = ""
    
    try {
      if (targetLanguage !== "none") {
        translated = await translateText(text, srcLang, targetLanguage)
        console.log("[YouTube Live] 번역 완료:", translated)
      }
    } catch (err) {
      console.error("[YouTube Live] 번역 실패:", err)
      // 번역 실패해도 원본은 표시
    }
    
    const newUtterance: Utterance = {
      speaker: "A",
      text: text,
      start: Date.now(),
      end: Date.now(),
      translated,
    }
    
    // 오버레이 창 업데이트
    updateOverlayWindow(text, translated)
    
    setUtterances(prev => {
      // 최신 결과를 맨 위에 추가 (DESC 순서)
      const updated = [newUtterance, ...prev]
      console.log("[YouTube Live] 총 발화 수:", updated.length)
      // 맨 위로 자동 스크롤
      setTimeout(() => {
        liveResultsRef.current?.scrollTo({
          top: 0,
          behavior: "smooth"
        })
      }, 100)
      return updated
    })
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
    // 정확도 향상을 위한 추가 설정
    recognition.maxAlternatives = 3  // 여러 대안 중 최적 선택

    // 문장 버퍼 (짧은 인식 결과를 모아서 처리)
    let sentenceBuffer = ""
    let silenceTimer: NodeJS.Timeout | null = null
    const SILENCE_THRESHOLD = 1500  // 1.5초 무음 시 문장 완료로 처리

    recognition.onresult = (event) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        // 가장 신뢰도 높은 결과 사용
        const result = event.results[i]
        const transcript = result[0].transcript
        const confidence = result[0].confidence
        
        if (result.isFinal) {
          // 신뢰도가 낮은 결과는 필터링 (0.5 이상만)
          if (confidence === undefined || confidence >= 0.5) {
            finalTranscript += transcript
            console.log(`[YouTube Live] 최종 인식 (신뢰도: ${(confidence * 100).toFixed(1)}%):`, transcript)
          } else {
            console.log(`[YouTube Live] 낮은 신뢰도로 무시 (${(confidence * 100).toFixed(1)}%):`, transcript)
          }
        } else {
          interimTranscript += transcript
        }
      }

      setCurrentTranscript(interimTranscript)

      if (finalTranscript.trim()) {
        // 문장 버퍼에 추가
        sentenceBuffer += (sentenceBuffer ? " " : "") + finalTranscript.trim()
        
        // 무음 타이머 리셋
        if (silenceTimer) clearTimeout(silenceTimer)
        
        // 문장 종결 부호가 있으면 즉시 처리
        if (/[.!?。！？]$/.test(sentenceBuffer.trim())) {
          addLiveUtterance(sentenceBuffer.trim())
          sentenceBuffer = ""
          setCurrentTranscript("")
        } else {
          // 무음 감지 시 문장 완료 처리
          silenceTimer = setTimeout(() => {
            if (sentenceBuffer.trim()) {
              addLiveUtterance(sentenceBuffer.trim())
              sentenceBuffer = ""
              setCurrentTranscript("")
            }
          }, SILENCE_THRESHOLD)
        }
      }
    }

    recognition.onerror = (event) => {
      console.error("음성 인식 오류:", event.error)
      if ((event.error === "no-speech" || event.error === "audio-capture") && isListeningRef.current) {
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
      // 남은 버퍼 처리
      if (sentenceBuffer.trim()) {
        addLiveUtterance(sentenceBuffer.trim())
        sentenceBuffer = ""
      }
      if (silenceTimer) clearTimeout(silenceTimer)
      
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
      console.log("[YouTube Live] 음성 인식 중지")
      isListeningRef.current = false
      setIsListening(false)
      recognitionRef.current?.stop()
    } else {
      // 시작
      console.log("[YouTube Live] 음성 인식 시작 시도")
      const recognition = initRecognition()
      if (recognition) {
        recognitionRef.current = recognition
        isListeningRef.current = true
        setIsListening(true)
        try {
          recognition.start()
          console.log("[YouTube Live] 음성 인식 시작됨")
        } catch (err) {
          console.error("[YouTube Live] 음성 인식 시작 오류:", err)
          setError("음성 인식을 시작할 수 없습니다. 마이크 권한을 확인해주세요.")
        }
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
      // 시스템 오디오 스트림 정리
      if (systemAudioStreamRef.current) {
        systemAudioStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // 시스템 오디오 캡처 시작
  const startSystemAudioCapture = async () => {
    try {
      console.log("[System Audio] 시스템 오디오 캡처 시작 요청")
      
      // getDisplayMedia로 화면 + 시스템 오디오 캡처
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // 화면 공유 필수 (오디오만 불가)
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      })

      // 오디오 트랙 확인
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        setError("⚠️ 오디오가 캡처되지 않았습니다!\n\n화면 공유 팝업에서:\n1. 'Chrome 탭' 선택\n2. 이 UniLang 탭 선택\n3. '오디오 공유' 체크 ✅\n4. '공유' 클릭")
        stream.getTracks().forEach(track => track.stop())
        return
      }

      console.log("[System Audio] 오디오 트랙 캡처 성공:", audioTracks[0].label)
      
      // 비디오 트랙은 필요 없으므로 중지 (오디오만 사용)
      stream.getVideoTracks().forEach(track => track.stop())
      
      systemAudioStreamRef.current = stream
      setIsCapturingSystemAudio(true)
      setIsSystemAudioMode(true)
      setIsLiveMode(true)
      setNoSubtitleError(false)
      setUtterances([])
      
      // 오디오 스트림을 Web Speech API와 연결
      // Web Speech API는 직접 스트림을 받지 못하므로, 
      // 시스템 오디오를 스피커로 출력하고 마이크로 다시 캡처하는 방식 사용
      // 또는 MediaRecorder로 녹음 후 AssemblyAI로 전송
      
      // 스트림 종료 감지
      audioTracks[0].onended = () => {
        console.log("[System Audio] 오디오 트랙 종료됨")
        stopSystemAudioCapture()
      }
      
      // 안내 메시지 - Deepgram 연결 대기
      setError("⏳ Deepgram 연결 중... 잠시만 기다려주세요.")
      
      // Deepgram으로 오디오 전송 시작
      await startDeepgramStream(new MediaStream(audioTracks))
      
    } catch (err) {
      console.error("[System Audio] 캡처 오류:", err)
      if ((err as Error).name === "NotAllowedError") {
        setError("화면 공유가 취소되었습니다.")
      } else {
        setError("시스템 오디오 캡처에 실패했습니다. 브라우저가 이 기능을 지원하는지 확인해주세요.")
      }
    }
  }

  // Deepgram WebSocket 참조
  const deepgramWSRef = useRef<WebSocket | null>(null)

  // Deepgram 스트리밍 시작
  const startDeepgramStream = async (audioStream: MediaStream) => {
    try {
      console.log("[Deepgram] 스트리밍 시작")
      
      // 1. API 키 가져오기
      const tokenResponse = await fetch("/api/deepgram/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      
      const tokenData = await tokenResponse.json()
      
      if (!tokenData.apiKey) {
        setError(`Deepgram 연결 실패: ${tokenData.error || "API 키 가져오기 실패"}`)
        stopSystemAudioCapture()
        return
      }
      
      console.log("[Deepgram] API 키 가져오기 성공")
      
      // 2. 언어 코드 설정
      const langCode = sourceLanguage === "auto" ? "en" : sourceLanguage
      const deepgramLang = langCode === "ko" ? "ko" : langCode === "ja" ? "ja" : langCode === "zh" ? "zh" : langCode === "es" ? "es" : langCode === "fr" ? "fr" : langCode === "de" ? "de" : "en"
      
      // 3. WebSocket 연결
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&model=nova-2&language=${deepgramLang}&punctuate=true&interim_results=true`,
        ["token", tokenData.apiKey]
      )
      
      deepgramWSRef.current = ws
      
      ws.onopen = () => {
        console.log("[Deepgram] WebSocket 연결됨")
        setError(null)
        setIsListening(true)
        
        // 4. 오디오 데이터 전송
        const audioContext = new AudioContext({ sampleRate: 16000 })
        audioContextRef.current = audioContext
        const source = audioContext.createMediaStreamSource(audioStream)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)
        
        source.connect(processor)
        // ScriptProcessor는 destination에 연결해야 작동함
        // 하울링 방지를 위해 GainNode를 0으로 설정
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 0 // 소리 출력 안함 (하울링 방지)
        processor.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0)
            // Float32 to Int16 변환 (PCM 16-bit)
            const int16Array = new Int16Array(inputData.length)
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]))
              int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
            }
            // 바이너리로 전송 (Deepgram은 바이너리 PCM 사용)
            ws.send(int16Array.buffer)
          }
        }
      }
      
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Deepgram 응답 형식 처리
          if (data.type === "Results" && data.channel?.alternatives?.[0]) {
            const transcript = data.channel.alternatives[0].transcript
            
            if (data.is_final && transcript?.trim()) {
              console.log("[Deepgram] 최종 인식:", transcript)
              setCurrentTranscript("")
              await addLiveUtterance(transcript.trim())
            } else if (transcript) {
              setCurrentTranscript(transcript)
            }
          }
        } catch (err) {
          console.error("[Deepgram] 메시지 파싱 오류:", err)
        }
      }
      
      ws.onerror = (err) => {
        console.error("[Deepgram] WebSocket 오류:", err)
        setError("Deepgram 연결 오류가 발생했습니다.")
      }
      
      ws.onclose = (event) => {
        console.log("[Deepgram] WebSocket 종료:", event.code, event.reason)
        setIsListening(false)
      }
      
    } catch (err) {
      console.error("[Deepgram] 스트리밍 오류:", err)
      setError("Deepgram 스트리밍 실패")
      stopSystemAudioCapture()
    }
  }

  // 시스템 오디오 캡처 중지
  const stopSystemAudioCapture = () => {
    console.log("[System Audio] 캡처 중지")
    
    // Deepgram WebSocket 종료
    if (deepgramWSRef.current) {
      deepgramWSRef.current.close()
      deepgramWSRef.current = null
    }
    
    // 음성 인식 중지
    if (recognitionRef.current) {
      isListeningRef.current = false
      recognitionRef.current.stop()
      setIsListening(false)
    }
    
    // 스트림 정리
    if (systemAudioStreamRef.current) {
      systemAudioStreamRef.current.getTracks().forEach(track => track.stop())
      systemAudioStreamRef.current = null
    }
    
    // 오디오 컨텍스트 정리
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    setIsCapturingSystemAudio(false)
    setIsSystemAudioMode(false)
  }

  // 시스템 오디오 캡처 토글
  const toggleSystemAudioCapture = () => {
    if (isCapturingSystemAudio) {
      stopSystemAudioCapture()
    } else {
      startSystemAudioCapture()
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

  // 요약 생성 (서버 API 라우트 사용)
  const generateSummary = async () => {
    if (utterances.length === 0) {
      setError("요약할 내용이 없습니다.")
      return
    }
    
    setIsSummarizing(true)
    try {
      // 전체 텍스트 또는 번역된 텍스트 사용
      const textToSummarize = utterances
        .map(u => u.translated || u.text)
        .join("\n")
      
      const summaryLang = targetLanguage === "none" 
        ? (sourceLanguage === "auto" ? "ko" : sourceLanguage) 
        : targetLanguage

      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSummarize,
          targetLanguage: summaryLang,
        }),
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || "요약 생성 실패")
      }
      
      setSummary(result.summary)
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
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowHistory(!showHistory)}
                className={`relative ${showHistory ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
                title="기록 목록"
              >
                <Menu className="h-5 w-5" />
                {youtubeSessions.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {youtubeSessions.length > 9 ? '9+' : youtubeSessions.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {/* 기록 목록 (슬라이드 패널) */}
        {showHistory && (
          <div className="fixed inset-0 z-50 flex">
            {/* 오버레이 */}
            <div 
              className="flex-1 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowHistory(false)}
            />
            {/* 사이드 패널 */}
            <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <List className="h-5 w-5 text-purple-500" />
                    YouTube 통역 기록
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowHistory(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                {/* 자막 업로드 버튼 */}
                <Link href="/service/translate/youtube/upload" className="block mt-3">
                  <Button 
                    variant="outline" 
                    className="w-full border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    자막 파일 업로드
                  </Button>
                </Link>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                  </div>
                ) : youtubeSessions.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <Youtube className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>저장된 기록이 없습니다.</p>
                    <p className="text-sm mt-1">통역 후 자동으로 저장됩니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {youtubeSessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* 썸네일 + 정보 */}
                        <div className="flex gap-3">
                          <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-200">
                            <img 
                              src={`https://img.youtube.com/vi/${session.youtube_video_id}/mqdefault.jpg`}
                              alt="썸네일"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{session.youtube_title || session.title}</h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <Calendar className="h-3 w-3" />
                              {new Date(session.started_at).toLocaleDateString("ko-KR")}
                              <span>•</span>
                              <span>{session.total_utterances || 0}문장</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 액션 버튼 */}
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playFromHistory(session)}
                            className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-xs"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            다시보기
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewSummaryFromHistory(session)}
                            className="flex-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 text-xs"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            요약보기
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSession(session.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* URL 입력 */}
        {!showHistory && (
        /* URL 입력 */
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
                    disabled={isProcessing || isLiveMode}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                {!isLiveMode ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={startTranscription}
                      disabled={!youtubeUrl.trim() || isProcessing}
                      className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 px-4"
                      title="자막이 있는 영상 전사"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Play className="h-5 w-5 mr-1" />
                          자막 추출
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => startOneClickLiveMode(false)}
                      disabled={!videoId || isProcessing}
                      className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 px-4"
                      title="실시간 통역 (자막 없는 영상)"
                    >
                      <Volume2 className="h-5 w-5 mr-1" />
                      실시간 통역
                    </Button>
                    <Button
                      onClick={() => startOneClickLiveMode(true)}
                      disabled={!videoId || isProcessing}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-4"
                      title="빠른 요약 (영상 끝까지 추출 후 AI 재정리)"
                    >
                      <Sparkles className="h-5 w-5 mr-1" />
                      빠른 요약
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setIsLiveMode(false)
                      if (isListening) toggleLiveListening()
                      if (isCapturingSystemAudio) stopSystemAudioCapture()
                      setShowOverlayButton(false)
                    }}
                    variant="outline"
                    className="border-red-400 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-5 w-5 mr-1" />
                    중지
                  </Button>
                )}
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
        )}

        {/* 에러 */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 whitespace-pre-line">
            {error}
          </div>
        )}

        {/* 자막이 없는 경우 - 대안 제안 */}
        {noSubtitleError && !isLiveMode && (
          <Card className="border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
                  <Volume2 className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                    서버에서 자막을 가져올 수 없습니다
                  </h3>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    YouTube가 서버 요청을 차단합니다. 아래 대안을 사용해주세요.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {/* 자막 업로드 (권장) */}
                  <Link href={`/service/translate/youtube/upload?url=${encodeURIComponent(youtubeUrl)}`}>
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                      <Upload className="h-5 w-5 mr-2" />
                      📁 자막 파일 직접 업로드 (권장)
                    </Button>
                  </Link>
                  <p className="text-xs text-orange-600">
                    ✨ <a href="https://downsub.com" target="_blank" className="underline">DownSub.com</a>에서 자막 다운로드 → 업로드
                  </p>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-amber-300"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-amber-50 dark:bg-amber-900/20 text-amber-500">또는</span>
                    </div>
                  </div>
                  
                  {/* 시스템 오디오 캡처 */}
                  <Button
                    onClick={startSystemAudioCapture}
                    variant="outline"
                    className="w-full border-green-400 text-green-700 hover:bg-green-100"
                  >
                    <Volume2 className="h-5 w-5 mr-2" />
                    🎧 시스템 오디오 캡처 (실시간 통역)
                  </Button>
                  <p className="text-xs text-green-600">
                    버튼 클릭 → YouTube 탭 선택 → "오디오 공유" 체크
                  </p>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-amber-300"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-amber-50 dark:bg-amber-900/20 text-amber-500">또는</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={startLiveMode}
                    variant="outline"
                    className="w-full border-amber-400 text-amber-700 hover:bg-amber-100"
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    마이크 모드 (스피커 소리를 마이크로 캡처)
                  </Button>
                </div>
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
                  {isSystemAudioMode && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                      시스템 오디오
                    </span>
                  )}
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
                    if (isCapturingSystemAudio) stopSystemAudioCapture()
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                {isSystemAudioMode ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-700">
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        🎧 시스템 오디오 캡처 중!
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        위의 YouTube 영상을 재생하세요. 음성이 자동으로 인식되어 아래에 자막이 표시됩니다.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <Button
                        onClick={openOverlayWindow}
                        size="sm"
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      >
                        <Languages className="h-4 w-4 mr-1" />
                        자막 오버레이 창 (전체화면용)
                      </Button>
                      <Button
                        onClick={() => window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank")}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        YouTube 새 탭
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    1. 위의 YouTube 영상을 재생하세요<br/>
                    2. 아래 마이크 버튼을 눌러 음성 인식을 시작하세요<br/>
                    3. 스피커에서 나오는 소리가 자동으로 번역됩니다
                  </p>
                )}
                
                <div className="flex items-center justify-center gap-4">
                  {isSystemAudioMode ? (
                    // 시스템 오디오 모드: 캡처 중지 버튼
                    <Button
                      onClick={stopSystemAudioCapture}
                      size="lg"
                      className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600 animate-pulse"
                    >
                      <Volume2 className="h-8 w-8" />
                    </Button>
                  ) : (
                    // 마이크 모드: 기존 마이크 버튼
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
                  )}
                </div>
                
                {isListening && (
                  <div className="mt-4 text-center text-sm text-green-600 dark:text-green-400">
                    {isSystemAudioMode ? (
                      <>🎧 시스템 오디오 캡처 중... YouTube 영상을 재생하세요</>
                    ) : (
                      <>🎤 음성 인식 중... 스피커 소리를 듣고 있습니다</>
                    )}
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
              <div 
                ref={liveResultsRef}
                className="space-y-3 max-h-[400px] overflow-y-auto min-h-[100px] bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3"
              >
                {utterances.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    {isListening ? (
                      <p>🎤 음성을 기다리는 중...</p>
                    ) : (
                      <p>마이크 버튼을 눌러 음성 인식을 시작하세요</p>
                    )}
                  </div>
                ) : (
                  utterances.map((utterance, index) => {
                    // 최신이 위에 있으므로 번호는 역순으로 계산
                    const displayNumber = utterances.length - index
                    return (
                      <div
                        key={`${utterance.start}-${index}`}
                        className={`p-3 rounded-lg border shadow-sm ${
                          index === 0 
                            ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700" 
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${index === 0 ? "text-green-600" : "text-slate-500"}`}>
                            #{displayNumber} {index === 0 && "✨ 최신"}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(utterance.start).toLocaleTimeString("ko-KR")}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          {utterance.text}
                        </p>
                        {utterance.translated && (
                          <p className="mt-2 text-sm text-green-600 dark:text-green-400 border-t pt-2 border-slate-200 dark:border-slate-700">
                            🌐 {utterance.translated}
                          </p>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

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

        {/* 기록에서 요약보기 모달 */}
        {viewingSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-500" />
                      요약
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">{viewingSummary.title}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setViewingSummary(null)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                  {viewingSummary.summary}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 요약 로딩 중 */}
        {isLoadingSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              <span>요약을 불러오는 중...</span>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
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

