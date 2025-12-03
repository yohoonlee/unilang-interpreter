"use client"

import { useState, useEffect, useRef, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

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

// Deepgram 언어 코드 매핑
const DEEPGRAM_LANGUAGES: Record<string, string> = {
  "ko": "ko",
  "en": "en",
  "ja": "ja",
  "zh": "zh",
  "es": "es",
  "fr": "fr",
  "de": "de",
  "auto": "en",
}

interface Utterance {
  id: string
  original: string
  translated: string
  timestamp: Date
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
  const router = useRouter()
  const videoId = searchParams.get("v")
  const sourceLang = searchParams.get("source") || "auto"
  const targetLang = searchParams.get("target") || "ko"
  
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [utterances, setUtterances] = useState<Utterance[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>("대기 중")
  const [showInstructions, setShowInstructions] = useState(true)
  
  // AI 재처리 상태
  const [isReorganizing, setIsReorganizing] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState("")
  const [showSummary, setShowSummary] = useState(false)
  
  // DB 저장 상태
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const websocketRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const utterancesEndRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  // 자동 스크롤
  useEffect(() => {
    if (utterancesEndRef.current) {
      utterancesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [utterances])

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
    
    const newUtterance: Utterance = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      original: text,
      translated,
      timestamp: new Date(),
    }
    
    setUtterances(prev => [...prev, newUtterance])
  }, [sourceLang, targetLang, translateText])

  // Deepgram API 키 가져오기
  const getDeepgramApiKey = async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/deepgram/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      
      const data = await response.json()
      console.log("[Deepgram] Token API response:", data)
      
      if (data.apiKey) {
        return data.apiKey
      }
      
      const errorMsg = data.error || `API 키 가져오기 실패 (${response.status})`
      setError(`Deepgram: ${errorMsg}`)
      throw new Error(errorMsg)
    } catch (err) {
      console.error("Deepgram API 키 오류:", err)
      return null
    }
  }

  // 시스템 오디오 캡처 시작
  const startCapture = async () => {
    try {
      setError(null)
      setConnectionStatus("연결 중...")
      setShowInstructions(false)
      
      // 1. 시스템 오디오 캡처 (화면 공유) - 현재 탭 우선
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        // @ts-expect-error - Chrome specific options
        preferCurrentTab: true,
        selfBrowserSurface: "include",
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
      
      console.log("[Deepgram] 오디오 트랙 캡처 성공:", audioTracks[0].label)
      setConnectionStatus("API 연결 중...")

      // 2. Deepgram API 키 가져오기
      const apiKey = await getDeepgramApiKey()
      if (!apiKey) {
        setError("Deepgram 연결 실패. API 키를 확인해주세요.")
        stream.getTracks().forEach(track => track.stop())
        setConnectionStatus("대기 중")
        return
      }

      console.log("[Deepgram] API 키 가져오기 성공")
      setConnectionStatus("음성 인식 연결 중...")

      // 3. 언어 코드 설정
      const deepgramLang = DEEPGRAM_LANGUAGES[sourceLang] || "en"

      // 4. WebSocket 연결
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&model=nova-2&language=${deepgramLang}&punctuate=true&interim_results=true`,
        ["token", apiKey]
      )

      ws.onopen = () => {
        console.log("[Deepgram] WebSocket 연결됨")
        setConnectionStatus("연결됨 ✓")
        setIsListening(true)
        setIsReady(true)

        // 5. 오디오 데이터 전송
        const audioContext = new AudioContext({ sampleRate: 16000 })
        audioContextRef.current = audioContext
        const source = audioContext.createMediaStreamSource(streamRef.current!)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)

        source.connect(processor)
        // 하울링 방지
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 0
        processor.connect(gainNode)
        gainNode.connect(audioContext.destination)

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0)
            const pcmData = convertFloat32ToInt16(inputData)
            ws.send(pcmData.buffer)
          }
        }
      }

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === "Results" && data.channel?.alternatives?.[0]) {
            const transcript = data.channel.alternatives[0].transcript
            
            if (data.is_final && transcript?.trim()) {
              console.log("[Deepgram] 최종 인식:", transcript)
              setCurrentTranscript("")
              await processUtterance(transcript.trim())
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
        setError("음성 인식 연결 오류")
        setConnectionStatus("오류")
      }

      ws.onclose = (event) => {
        console.log("[Deepgram] WebSocket 종료:", event.code, event.reason)
        setIsListening(false)
        setConnectionStatus("연결 종료")
      }

      websocketRef.current = ws

      // 스트림 종료 감지
      audioTracks[0].onended = () => {
        console.log("[Deepgram] 오디오 트랙 종료")
        stopCapture()
      }

    } catch (err) {
      console.error("[Deepgram] 캡처 오류:", err)
      if ((err as Error).name === "NotAllowedError") {
        setError("화면 공유가 취소되었습니다.")
      } else {
        setError("시스템 오디오 캡처 실패: " + (err as Error).message)
      }
      setConnectionStatus("대기 중")
    }
  }

  // Float32 to Int16 변환
  const convertFloat32ToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return int16Array
  }

  // 캡처 중지
  const stopCapture = () => {
    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setIsListening(false)
    setIsReady(false)
    setConnectionStatus("대기 중")
  }

  // AI 재정리
  const reorganizeWithAI = async () => {
    if (utterances.length === 0) {
      setError("재정리할 내용이 없습니다.")
      return
    }
    
    setIsReorganizing(true)
    setError(null)
    
    try {
      const utteranceData = utterances.map((u, i) => ({
        id: i + 1,
        text: u.original,
        translated: u.translated,
      }))
      
      const response = await fetch("/api/gemini/reorganize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utterances: utteranceData,
          targetLanguage: sourceLang === "auto" ? "en" : sourceLang,
        }),
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || "AI 재정리 요청 실패")
      }
      
      const reorganized = result.data as { merged_from: number[]; text: string }[]
      
      if (!Array.isArray(reorganized) || reorganized.length === 0) {
        throw new Error("AI 응답 형식이 올바르지 않습니다.")
      }
      
      // 재정리된 결과로 utterances 업데이트
      const newUtterances: Utterance[] = []
      for (const item of reorganized) {
        let translated = item.text
        if (targetLang !== "none" && sourceLang !== targetLang) {
          const srcLang = sourceLang === "auto" ? "en" : sourceLang
          translated = await translateText(item.text, srcLang, targetLang)
        }
        
        newUtterances.push({
          id: `reorg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          original: item.text,
          translated: targetLang === "none" ? "" : translated,
          timestamp: new Date(),
        })
      }
      
      setUtterances(newUtterances)
      
    } catch (err) {
      console.error("AI 재정리 오류:", err)
      setError(err instanceof Error ? err.message : "AI 재정리 중 오류가 발생했습니다.")
    } finally {
      setIsReorganizing(false)
    }
  }

  // 요약 생성
  const generateSummary = async () => {
    if (utterances.length === 0) {
      setError("요약할 내용이 없습니다.")
      return
    }
    
    setIsSummarizing(true)
    setError(null)
    
    try {
      const fullText = utterances.map(u => u.original).join("\n")
      
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fullText,
          language: targetLang === "none" ? (sourceLang === "auto" ? "en" : sourceLang) : targetLang,
        }),
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || "요약 생성 실패")
      }
      
      setSummary(result.summary)
      setShowSummary(true)
      
    } catch (err) {
      console.error("요약 생성 오류:", err)
      setError(err instanceof Error ? err.message : "요약 생성 중 오류가 발생했습니다.")
    } finally {
      setIsSummarizing(false)
    }
  }

  // DB에 저장
  const saveToDatabase = async () => {
    if (utterances.length === 0 || !videoId) {
      setError("저장할 내용이 없습니다.")
      return
    }
    
    setIsSaving(true)
    setError(null)
    
    try {
      // 1. 세션 생성
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          source_type: "youtube",
          source_language: sourceLang === "auto" ? "en" : sourceLang,
          target_language: targetLang,
          status: "completed",
          youtube_video_id: videoId,
        })
        .select()
        .single()
      
      if (sessionError) throw sessionError
      
      setSessionId(session.id)
      
      // 2. 발화 저장
      for (const utterance of utterances) {
        const { data: utt, error: uttError } = await supabase
          .from("utterances")
          .insert({
            session_id: session.id,
            text: utterance.original,
            source_language: sourceLang === "auto" ? "en" : sourceLang,
          })
          .select()
          .single()
        
        if (uttError) throw uttError
        
        // 3. 번역 저장
        if (utterance.translated) {
          await supabase
            .from("translations")
            .insert({
              utterance_id: utt.id,
              text: utterance.translated,
              target_language: targetLang,
            })
        }
      }
      
      // 4. 요약 저장 (있으면)
      if (summary) {
        await supabase
          .from("summaries")
          .insert({
            session_id: session.id,
            content: summary,
            language: targetLang === "none" ? (sourceLang === "auto" ? "en" : sourceLang) : targetLang,
          })
      }
      
      setError(null)
      alert("저장되었습니다!")
      
    } catch (err) {
      console.error("저장 오류:", err)
      setError("저장 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [])

  if (!videoId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>YouTube 비디오 ID가 필요합니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* YouTube 영상 영역 */}
      <div className="relative" style={{ height: "55vh" }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* 컨트롤 바 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-bold">🌐 UniLang</span>
          {isListening ? (
            <span className="flex items-center gap-1 text-green-400 text-xs">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              실시간 통역 중 (Deepgram)
            </span>
          ) : (
            <span className="text-yellow-400 text-xs">{connectionStatus}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">
            {LANGUAGES[sourceLang] || sourceLang} → {LANGUAGES[targetLang] || targetLang}
          </span>
          
          {!isReady ? (
            <button
              onClick={startCapture}
              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              🎧 시작하기
            </button>
          ) : (
            <button
              onClick={stopCapture}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ⏹ 중지
            </button>
          )}
        </div>
      </div>

      {/* 안내 메시지 (처음에만) */}
      {showInstructions && !isReady && (
        <div className="px-4 py-3 bg-blue-900/50 border-b border-blue-700">
          <p className="text-blue-200 text-sm">
            📌 <strong>사용법:</strong> &quot;시작하기&quot; 클릭 → 화면 공유 창에서 <strong>이 탭</strong> 선택 → <strong>&quot;탭 오디오도 공유&quot;</strong> 체크 ✓ → 공유
          </p>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="px-4 py-2 bg-red-900/50 border-b border-red-700">
          <p className="text-red-300 text-sm whitespace-pre-line">{error}</p>
        </div>
      )}

      {/* 자막 히스토리 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: "30vh" }}>
        {utterances.length === 0 ? (
          <p className="text-slate-500 text-center text-sm py-4">
            {isListening 
              ? "🎧 음성 인식 중... YouTube 영상을 재생해주세요" 
              : "위 버튼을 클릭하여 실시간 통역을 시작하세요"}
          </p>
        ) : (
          <>
            {utterances.map((utt, idx) => (
              <div key={utt.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 text-xs font-mono">#{idx + 1}</span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{utt.original}</p>
                    {utt.translated && (
                      <p className="text-green-400 text-sm mt-1">{utt.translated}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={utterancesEndRef} />
          </>
        )}
        
        {/* 현재 인식 중인 텍스트 */}
        {currentTranscript && (
          <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-700/50">
            <p className="text-yellow-300 text-sm opacity-70">{currentTranscript}...</p>
          </div>
        )}
      </div>

      {/* 하단 액션 바 */}
      {utterances.length > 0 && (
        <div className="px-4 py-3 bg-slate-800 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">
              총 {utterances.length}개 문장
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={reorganizeWithAI}
                disabled={isReorganizing}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {isReorganizing ? "처리 중..." : "✨ AI 재정리"}
              </button>
              
              <button
                onClick={generateSummary}
                disabled={isSummarizing}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {isSummarizing ? "생성 중..." : "📝 요약"}
              </button>
              
              <button
                onClick={saveToDatabase}
                disabled={isSaving}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {isSaving ? "저장 중..." : "💾 저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 요약 모달 */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-white font-bold">📝 요약</h3>
              <button
                onClick={() => setShowSummary(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <p className="text-slate-200 whitespace-pre-wrap">{summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
