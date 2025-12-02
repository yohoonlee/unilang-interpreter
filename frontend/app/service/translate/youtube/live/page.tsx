"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"

// 지원 언어 목록
const LANGUAGES: Record<string, string> = {
  "ko": "한국어",
  "en": "English",
  "ja": "日本語",
  "zh": "中文",
  "es": "Español",
  "fr": "Français",
  "de": "Deutsch",
  "auto": "자동 감지",
}

export default function YouTubeLivePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">로딩 중...</div>}>
      <YouTubeLivePageContent />
    </Suspense>
  )
}

function YouTubeLivePageContent() {
  const searchParams = useSearchParams()
  const videoId = searchParams.get("v")
  const sourceLang = searchParams.get("source") || "auto"
  const targetLang = searchParams.get("target") || "ko"
  
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [lastUtterance, setLastUtterance] = useState<{ original: string; translated: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isListeningRef = useRef(false)

  // 언어 코드 변환
  const getLanguageCode = (code: string): string => {
    const langMap: Record<string, string> = {
      "ko": "ko-KR",
      "en": "en-US",
      "ja": "ja-JP",
      "zh": "zh-CN",
      "es": "es-ES",
      "fr": "fr-FR",
      "de": "de-DE",
      "auto": "en-US",
    }
    return langMap[code] || "en-US"
  }

  // 번역 함수
  const translateText = async (text: string, from: string, to: string): Promise<string> => {
    if (from === to || to === "none") return text
    
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: text,
            source: from === "auto" ? undefined : from,
            target: to,
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
    recognition.lang = getLanguageCode(sourceLang)
    recognition.maxAlternatives = 3

    let sentenceBuffer = ""
    let silenceTimer: NodeJS.Timeout | null = null
    const SILENCE_THRESHOLD = 1500

    recognition.onresult = async (event) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        const confidence = result[0].confidence
        
        if (result.isFinal) {
          if (confidence === undefined || confidence >= 0.5) {
            finalTranscript += transcript
          }
        } else {
          interimTranscript += transcript
        }
      }

      setCurrentTranscript(interimTranscript)

      if (finalTranscript.trim()) {
        sentenceBuffer += (sentenceBuffer ? " " : "") + finalTranscript.trim()
        
        if (silenceTimer) clearTimeout(silenceTimer)
        
        if (/[.!?。！？]$/.test(sentenceBuffer.trim())) {
          await processUtterance(sentenceBuffer.trim())
          sentenceBuffer = ""
          setCurrentTranscript("")
        } else {
          silenceTimer = setTimeout(async () => {
            if (sentenceBuffer.trim()) {
              await processUtterance(sentenceBuffer.trim())
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
      if (sentenceBuffer.trim()) {
        processUtterance(sentenceBuffer.trim())
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

  // 발화 처리 (번역 포함)
  const processUtterance = async (text: string) => {
    const srcLang = sourceLang === "auto" ? "en" : sourceLang
    let translated = ""
    
    try {
      if (targetLang !== "none" && targetLang !== srcLang) {
        translated = await translateText(text, srcLang, targetLang)
      }
    } catch (err) {
      console.error("번역 실패:", err)
    }
    
    setLastUtterance({ original: text, translated })
  }

  // 시스템 오디오 캡처 + 음성 인식 시작
  const startCapture = async () => {
    try {
      setError(null)
      
      // 화면 공유로 시스템 오디오 캡처
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      })

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        setError("오디오 공유를 체크해주세요!")
        stream.getTracks().forEach(track => track.stop())
        return
      }

      // 비디오 트랙 중지
      stream.getVideoTracks().forEach(track => track.stop())
      
      // 음성 인식 시작
      const recognition = initRecognition()
      if (recognition) {
        recognitionRef.current = recognition
        isListeningRef.current = true
        setIsListening(true)
        recognition.start()
      }

      // 스트림 종료 감지
      audioTracks[0].onended = () => {
        stopCapture()
      }

      setIsReady(true)
      
    } catch (err) {
      if ((err as Error).name === "NotAllowedError") {
        setError("화면 공유가 취소되었습니다.")
      } else {
        setError("시스템 오디오 캡처 실패")
      }
    }
  }

  // 캡처 중지
  const stopCapture = () => {
    if (recognitionRef.current) {
      isListeningRef.current = false
      recognitionRef.current.stop()
      setIsListening(false)
    }
    setIsReady(false)
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

  // 자동 시작 (페이지 로드 시)
  useEffect(() => {
    if (videoId) {
      // 약간의 딜레이 후 자동 시작
      const timer = setTimeout(() => {
        startCapture()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [videoId])

  if (!videoId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>YouTube 비디오 ID가 필요합니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* YouTube 영상 - 전체 화면 */}
      <div className="flex-1 relative">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* 자막 오버레이 - 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* 상태 표시 바 */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/70">
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-medium">UniLang</span>
            {isListening ? (
              <span className="flex items-center gap-1 text-green-400 text-xs">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                실시간 통역 중
              </span>
            ) : (
              <span className="text-yellow-400 text-xs">대기 중</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">
              {LANGUAGES[sourceLang] || sourceLang} → {LANGUAGES[targetLang] || targetLang}
            </span>
            {!isReady && (
              <button
                onClick={startCapture}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-full"
              >
                시작
              </button>
            )}
            {isReady && (
              <button
                onClick={stopCapture}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full"
              >
                중지
              </button>
            )}
          </div>
        </div>

        {/* 자막 영역 */}
        <div className="px-4 py-3 bg-black/85 min-h-[80px]">
          {error ? (
            <p className="text-red-400 text-center text-sm">{error}</p>
          ) : (
            <>
              {/* 현재 인식 중인 텍스트 */}
              {currentTranscript && (
                <p className="text-yellow-300 text-center text-lg mb-2 opacity-70">
                  {currentTranscript}...
                </p>
              )}
              
              {/* 최종 자막 */}
              {lastUtterance ? (
                <div className="text-center space-y-1">
                  <p className="text-white text-xl font-medium drop-shadow-lg">
                    {lastUtterance.original}
                  </p>
                  {lastUtterance.translated && (
                    <p className="text-green-400 text-xl font-medium drop-shadow-lg">
                      {lastUtterance.translated}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-center text-sm">
                  {isListening ? "🎤 음성을 기다리는 중..." : "시작 버튼을 눌러주세요"}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

