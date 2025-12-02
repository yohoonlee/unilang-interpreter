"use client"

import { useState, useEffect, useRef, Suspense, useCallback } from "react"
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

// AssemblyAI 언어 코드 매핑
const ASSEMBLYAI_LANGUAGES: Record<string, string> = {
  "ko": "ko",
  "en": "en",
  "ja": "ja",
  "zh": "zh",
  "es": "es",
  "fr": "fr",
  "de": "de",
  "auto": "en", // 자동 감지는 영어로 기본 설정
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
  const [connectionStatus, setConnectionStatus] = useState<string>("대기 중")
  
  const websocketRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 번역 함수
  const translateText = useCallback(async (text: string, from: string, to: string): Promise<string> => {
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
  }, [])

  // 발화 처리 (번역 포함)
  const processUtterance = useCallback(async (text: string) => {
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
  }, [sourceLang, targetLang, translateText])

  // AssemblyAI 실시간 토큰 가져오기
  const getRealtimeToken = async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/assemblyai/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language_code: ASSEMBLYAI_LANGUAGES[sourceLang] || "en",
        }),
      })
      
      const data = await response.json()
      console.log("[AssemblyAI] Token API response:", data)
      
      if (data.token) {
        return data.token
      }
      
      // 더 자세한 에러 메시지
      const errorMsg = data.error || `토큰 발급 실패 (${response.status})`
      setError(`AssemblyAI: ${errorMsg}`)
      throw new Error(errorMsg)
    } catch (err) {
      console.error("AssemblyAI 토큰 오류:", err)
      return null
    }
  }

  // AssemblyAI WebSocket 연결 및 시스템 오디오 캡처
  const startCapture = async () => {
    try {
      setError(null)
      setConnectionStatus("연결 중...")
      
      // 1. 시스템 오디오 캡처 (화면 공유)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000,
        }
      })

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        setError("⚠️ 오디오 공유를 체크해주세요!\n\n화면 공유 시 '탭 오디오도 공유'를 켜주세요.")
        stream.getTracks().forEach(track => track.stop())
        setConnectionStatus("대기 중")
        return
      }

      // 비디오 트랙 중지 (오디오만 필요)
      stream.getVideoTracks().forEach(track => track.stop())
      streamRef.current = new MediaStream(audioTracks)
      
      console.log("[AssemblyAI] 오디오 트랙 캡처 성공:", audioTracks[0].label)
      setConnectionStatus("토큰 발급 중...")

      // 2. AssemblyAI 실시간 토큰 가져오기
      const token = await getRealtimeToken()
      if (!token) {
        setError("AssemblyAI 연결 실패. API 키를 확인해주세요.")
        stream.getTracks().forEach(track => track.stop())
        setConnectionStatus("대기 중")
        return
      }

      console.log("[AssemblyAI] 토큰 발급 성공")
      setConnectionStatus("WebSocket 연결 중...")

      // 3. WebSocket 연결
      const ws = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`
      )

      ws.onopen = () => {
        console.log("[AssemblyAI] WebSocket 연결됨")
        setConnectionStatus("연결됨")
        setIsListening(true)
        setIsReady(true)

        // 4. MediaRecorder로 오디오 청크 전송
        const audioContext = new AudioContext({ sampleRate: 16000 })
        const source = audioContext.createMediaStreamSource(streamRef.current!)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)

        source.connect(processor)
        processor.connect(audioContext.destination)

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0)
            const pcmData = convertFloat32ToInt16(inputData)
            const base64Audio = arrayBufferToBase64(pcmData.buffer)
            ws.send(JSON.stringify({ audio_data: base64Audio }))
          }
        }
      }

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data)
        
        if (data.message_type === "PartialTranscript") {
          setCurrentTranscript(data.text || "")
        } else if (data.message_type === "FinalTranscript") {
          const text = data.text?.trim()
          if (text) {
            console.log("[AssemblyAI] 최종 인식:", text)
            setCurrentTranscript("")
            await processUtterance(text)
          }
        } else if (data.message_type === "SessionBegins") {
          console.log("[AssemblyAI] 세션 시작:", data.session_id)
        }
      }

      ws.onerror = (err) => {
        console.error("[AssemblyAI] WebSocket 오류:", err)
        setError("AssemblyAI 연결 오류")
        setConnectionStatus("오류")
      }

      ws.onclose = (event) => {
        console.log("[AssemblyAI] WebSocket 종료:", event.code, event.reason)
        setIsListening(false)
        setConnectionStatus("연결 종료")
      }

      websocketRef.current = ws

      // 스트림 종료 감지
      audioTracks[0].onended = () => {
        console.log("[AssemblyAI] 오디오 트랙 종료")
        stopCapture()
      }

    } catch (err) {
      console.error("[AssemblyAI] 캡처 오류:", err)
      if ((err as Error).name === "NotAllowedError") {
        setError("화면 공유가 취소되었습니다.")
      } else {
        setError("시스템 오디오 캡처 실패: " + (err as Error).message)
      }
      setConnectionStatus("대기 중")
    }
  }

  // Float32 to Int16 변환 (AssemblyAI PCM 형식)
  const convertFloat32ToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return int16Array
  }

  // ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  // 캡처 중지
  const stopCapture = () => {
    // WebSocket 종료
    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
    }
    
    // MediaRecorder 중지
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    
    // 스트림 중지
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setIsListening(false)
    setIsReady(false)
    setConnectionStatus("대기 중")
  }

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [])

  // 자동 시작 (페이지 로드 시)
  useEffect(() => {
    if (videoId) {
      // 약간의 딜레이 후 자동 시작
      const timer = setTimeout(() => {
        startCapture()
      }, 500)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
                실시간 통역 중 (AssemblyAI)
              </span>
            ) : (
              <span className="text-yellow-400 text-xs">{connectionStatus}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">
              {LANGUAGES[sourceLang] || sourceLang} → {LANGUAGES[targetLang] || targetLang}
            </span>
            {!isReady && (
              <button
                onClick={startCapture}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-full transition-colors"
              >
                🎧 시스템 오디오 캡처
              </button>
            )}
            {isReady && (
              <button
                onClick={stopCapture}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full transition-colors"
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
                <p className="text-slate-400 text-center text-sm">
                  {isListening 
                    ? "🎧 시스템 오디오 인식 중... YouTube 영상을 재생해주세요" 
                    : connectionStatus === "대기 중" 
                      ? "위 버튼을 클릭하여 시스템 오디오 캡처를 시작하세요"
                      : connectionStatus}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

