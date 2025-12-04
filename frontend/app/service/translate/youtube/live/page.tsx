"use client"

import { useState, useEffect, useRef, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// YouTube IFrame API 타입 정의
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string
          playerVars?: Record<string, number | string>
          events?: {
            onReady?: (event: { target: YTPlayer }) => void
            onStateChange?: (event: { data: number; target: YTPlayer }) => void
          }
        }
      ) => YTPlayer
      PlayerState: {
        PLAYING: number
        PAUSED: number
        ENDED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
}

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
  startTime: number // 시작 시간 (ms)
}

interface SavedSession {
  videoId: string
  sourceLang: string
  targetLang: string
  utterances: Utterance[]
  savedAt: string
  summary?: string
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
  const autostart = searchParams.get("autostart") === "true"
  
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
  
  // 저장 상태
  const [isSaving, setIsSaving] = useState(false)
  const [hasSavedData, setHasSavedData] = useState(false)
  const [showReplayChoice, setShowReplayChoice] = useState(false)
  
  // YouTube 정보
  const [youtubeTitle, setYoutubeTitle] = useState<string>("")
  const [dbSessionId, setDbSessionId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  const supabase = createClient()
  
  // 크게보기/작게보기 토글
  const [isLargeView, setIsLargeView] = useState(false)
  
  // 타임싱크 재생 모드
  const [isReplayMode, setIsReplayMode] = useState(false)
  const [replayIndex, setReplayIndex] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<number>(0)
  
  const websocketRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const utterancesEndRef = useRef<HTMLDivElement>(null)
  const hasAutoStarted = useRef(false)
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // 전체화면 모드
  const [isFullscreen, setIsFullscreen] = useState(false)
  const fullscreenContainerRef = useRef<HTMLDivElement>(null)
  
  // YouTube Player API
  const playerRef = useRef<YTPlayer | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [currentVideoTime, setCurrentVideoTime] = useState(0)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [currentSyncIndex, setCurrentSyncIndex] = useState(-1)

  // 저장된 데이터 키
  const getStorageKey = () => `unilang_youtube_${videoId}_${sourceLang}_${targetLang}`
  
  // 시간 포맷 (ms → mm:ss)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // YouTube IFrame API 로드
  useEffect(() => {
    if (!videoId) return
    
    // API가 이미 로드되어 있으면 플레이어 초기화
    if (window.YT && window.YT.Player) {
      initializePlayer()
      return
    }
    
    // API 로드
    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    const firstScriptTag = document.getElementsByTagName("script")[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    
    // API 로드 완료 시 플레이어 초기화
    window.onYouTubeIframeAPIReady = () => {
      initializePlayer()
    }
    
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [videoId])
  
  // 플레이어 초기화
  const initializePlayer = useCallback(() => {
    if (!videoId || playerRef.current) return
    
    const playerElement = document.getElementById("youtube-player")
    if (!playerElement) return
    
    playerRef.current = new window.YT.Player("youtube-player", {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
        enablejsapi: 1,
        modestbranding: 1,
      },
      events: {
        onReady: (event) => {
          console.log("[YouTube] Player ready")
          setIsPlayerReady(true)
        },
        onStateChange: (event) => {
          // 재생 상태 변경 시
          if (event.data === window.YT.PlayerState.PLAYING && isReplayMode) {
            startSyncTimer()
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            stopSyncTimer()
          }
        }
      }
    })
  }, [videoId, isReplayMode])
  
  // 동기화 타이머 시작
  const startSyncTimer = useCallback(() => {
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    
    syncIntervalRef.current = setInterval(() => {
      if (playerRef.current && isReplayMode) {
        const currentTime = playerRef.current.getCurrentTime() * 1000 // ms로 변환
        setCurrentVideoTime(currentTime)
        
        // 현재 시간에 해당하는 자막 찾기
        const index = utterances.findIndex((utt, idx) => {
          const nextUtt = utterances[idx + 1]
          if (nextUtt) {
            return utt.startTime <= currentTime && currentTime < nextUtt.startTime
          }
          return utt.startTime <= currentTime
        })
        
        if (index !== -1 && index !== currentSyncIndex) {
          setCurrentSyncIndex(index)
        }
      }
    }, 200) // 200ms 간격으로 동기화
  }, [utterances, currentSyncIndex, isReplayMode])
  
  // 동기화 타이머 정지
  const stopSyncTimer = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }
  }
  
  // 자막 클릭 시 해당 시간으로 이동
  const seekToUtterance = (utt: Utterance) => {
    if (playerRef.current && isReplayMode && utt.startTime) {
      const seekTime = utt.startTime / 1000 // 초로 변환
      playerRef.current.seekTo(seekTime, true)
      playerRef.current.playVideo()
    }
  }

  // 사용자 정보 및 YouTube 제목 가져오기
  useEffect(() => {
    const init = async () => {
      // 사용자 정보
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
      
      // YouTube 제목 가져오기
      if (videoId) {
        try {
          const response = await fetch(`/api/youtube/info?v=${videoId}`)
          const data = await response.json()
          if (data.success) {
            setYoutubeTitle(data.title)
          }
        } catch (err) {
          console.error("YouTube 제목 가져오기 실패:", err)
        }
      }
    }
    
    init()
  }, [videoId, supabase.auth])

  // 저장된 데이터 확인 - autostart여도 저장된 데이터 있으면 선택 모달 표시
  useEffect(() => {
    if (videoId) {
      const saved = localStorage.getItem(getStorageKey())
      if (saved) {
        setHasSavedData(true)
        // 저장된 데이터가 있으면 항상 선택 모달 표시
        setShowReplayChoice(true)
      }
    }
  }, [videoId, sourceLang, targetLang])

  // 자동 시작 (autostart 파라미터가 있고 저장된 데이터가 없을 때만)
  useEffect(() => {
    if (autostart && videoId && !hasAutoStarted.current && !showReplayChoice && !hasSavedData) {
      hasAutoStarted.current = true
      // 약간의 딜레이 후 시작 (페이지 로드 완료 후)
      const timer = setTimeout(() => {
        startCapture()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [autostart, videoId, showReplayChoice])

  // 자동 스크롤 (실시간 모드: 최신으로, 재생 모드: 현재 자막으로)
  useEffect(() => {
    if (isLargeView) return
    
    if (isReplayMode && currentSyncIndex >= 0) {
      // 재생 모드: 현재 동기화된 자막으로 스크롤
      const element = document.querySelector(`[data-sync-index="${currentSyncIndex}"]`)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    } else if (utterancesEndRef.current) {
      // 실시간 모드: 최신 자막으로 스크롤
      utterancesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [utterances, isLargeView, currentSyncIndex, isReplayMode])

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
    
    const now = Date.now()
    const newUtterance: Utterance = {
      id: `${now}_${Math.random().toString(36).slice(2)}`,
      original: text,
      translated,
      timestamp: new Date(),
      startTime: sessionStartTime > 0 ? now - sessionStartTime : 0,
    }
    
    setUtterances(prev => [...prev, newUtterance])
  }, [sourceLang, targetLang, translateText, sessionStartTime])

  // Deepgram API 키 가져오기
  const getDeepgramApiKey = async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/deepgram/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      
      const data = await response.json()
      
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
      setSessionStartTime(Date.now())
      
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
      
      setConnectionStatus("API 연결 중...")

      // 2. Deepgram API 키 가져오기
      const apiKey = await getDeepgramApiKey()
      if (!apiKey) {
        setError("Deepgram 연결 실패. API 키를 확인해주세요.")
        stream.getTracks().forEach(track => track.stop())
        setConnectionStatus("대기 중")
        return
      }

      setConnectionStatus("음성 인식 연결 중...")

      // 3. 언어 코드 설정
      const deepgramLang = DEEPGRAM_LANGUAGES[sourceLang] || "en"

      // 4. WebSocket 연결
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&model=nova-2&language=${deepgramLang}&punctuate=true&interim_results=true`,
        ["token", apiKey]
      )

      ws.onopen = () => {
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

      ws.onerror = () => {
        setError("음성 인식 연결 오류")
        setConnectionStatus("오류")
      }

      ws.onclose = async () => {
        setIsListening(false)
        setConnectionStatus("연결 종료")
        // 공유 중지 시 자동 저장 (로컬 + DB)
        if (utterances.length > 0) {
          autoSaveToStorage()
          await saveToDatabase()
        }
      }

      websocketRef.current = ws

      // 스트림 종료 감지 (공유 중지)
      audioTracks[0].onended = () => {
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
  const stopCapture = useCallback(() => {
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
  }, [])

  // 로컬 스토리지에 자동 저장
  const autoSaveToStorage = useCallback(() => {
    if (!videoId || utterances.length === 0) return
    
    try {
      const sessionData: SavedSession = {
        videoId,
        sourceLang,
        targetLang,
        utterances,
        savedAt: new Date().toISOString(),
        summary: summary || undefined,
      }
      
      localStorage.setItem(getStorageKey(), JSON.stringify(sessionData))
      setHasSavedData(true)
      console.log("[저장] 자동 저장 완료:", utterances.length, "개 문장")
    } catch (err) {
      console.error("[저장] 자동 저장 실패:", err)
    }
  }, [videoId, sourceLang, targetLang, utterances, summary])

  // 저장된 데이터 불러오기
  const loadSavedData = () => {
    const saved = localStorage.getItem(getStorageKey())
    if (saved) {
      try {
        const data: SavedSession = JSON.parse(saved)
        const loadedUtterances = data.utterances.map(u => ({
          ...u,
          timestamp: new Date(u.timestamp),
        }))
        setUtterances(loadedUtterances)
        if (data.summary) {
          setSummary(data.summary)
        }
        setShowReplayChoice(false)
        setIsReplayMode(true)
        setCurrentSyncIndex(-1)
        
        // 첫 번째 자막 시간으로 YouTube 이동
        if (loadedUtterances.length > 0 && loadedUtterances[0].startTime > 0) {
          setTimeout(() => {
            if (playerRef.current) {
              const seekTime = loadedUtterances[0].startTime / 1000
              playerRef.current.seekTo(seekTime, true)
              playerRef.current.playVideo()
              startSyncTimer()
            }
          }, 500)
        }
      } catch (err) {
        console.error("[불러오기] 실패:", err)
        setError("저장된 데이터를 불러올 수 없습니다.")
      }
    }
  }

  // 새로 통역 시작
  const startNewSession = () => {
    setShowReplayChoice(false)
    setUtterances([])
    setSummary("")
    setIsReplayMode(false)
    if (autostart) {
      startCapture()
    }
  }

  // 타임싱크 재생 시작
  const startTimeSyncReplay = () => {
    if (utterances.length === 0) return
    
    setReplayIndex(0)
    
    // YouTube iframe 시작
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    if (iframe) {
      iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
    }
    
    // 타이머 시작
    const startTime = Date.now()
    replayIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      
      // 현재 시간에 맞는 utterance 찾기
      let newIndex = 0
      for (let i = 0; i < utterances.length; i++) {
        if (utterances[i].startTime <= elapsed) {
          newIndex = i
        } else {
          break
        }
      }
      setReplayIndex(newIndex)
    }, 100)
  }

  // 타임싱크 재생 중지
  const stopTimeSyncReplay = () => {
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current)
      replayIntervalRef.current = null
    }
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
          startTime: 0,
        })
      }
      
      setUtterances(newUtterances)
      // 재정리 후 자동 저장
      setTimeout(() => autoSaveToStorage(), 500)
      
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
      // 요약 후 자동 저장
      setTimeout(() => autoSaveToStorage(), 500)
      
    } catch (err) {
      console.error("요약 생성 오류:", err)
      setError(err instanceof Error ? err.message : "요약 생성 중 오류가 발생했습니다.")
    } finally {
      setIsSummarizing(false)
    }
  }

  // DB에 저장 (translation_sessions 테이블)
  const saveToDatabase = async () => {
    if (!videoId || utterances.length === 0) return false
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log("[DB 저장] 로그인되지 않음 - 로컬 저장만 수행")
        return false
      }

      const title = youtubeTitle 
        ? `${youtubeTitle} (${LANGUAGES[sourceLang] || sourceLang} → ${LANGUAGES[targetLang] || targetLang})`
        : `YouTube 통역 - ${new Date().toLocaleString("ko-KR")}`

      // 기존 세션 업데이트 또는 새 세션 생성
      if (dbSessionId) {
        // 기존 세션 업데이트
        const { error: updateError } = await supabase
          .from("translation_sessions")
          .update({
            title,
            ended_at: new Date().toISOString(),
            total_utterances: utterances.length,
            status: "completed",
          })
          .eq("id", dbSessionId)
        
        if (updateError) throw updateError
      } else {
        // 새 세션 생성
        const { data: session, error: sessionError } = await supabase
          .from("translation_sessions")
          .insert({
            user_id: user.id,
            title,
            session_type: "youtube",
            source_language: sourceLang === "auto" ? "en" : sourceLang,
            target_languages: [targetLang],
            youtube_video_id: videoId,
            youtube_title: youtubeTitle,
            status: "completed",
            total_utterances: utterances.length,
            started_at: new Date(sessionStartTime || Date.now()).toISOString(),
            ended_at: new Date().toISOString(),
          })
          .select()
          .single()
        
        if (sessionError) throw sessionError
        setDbSessionId(session.id)

        // 발화 저장
        for (const utt of utterances) {
          const { data: uttData, error: uttError } = await supabase
            .from("utterances")
            .insert({
              session_id: session.id,
              original_text: utt.original,
              original_language: sourceLang === "auto" ? "en" : sourceLang,
              created_at: utt.timestamp.toISOString(),
            })
            .select()
            .single()
          
          if (uttError) {
            console.error("발화 저장 실패:", uttError)
            continue
          }

          // 번역 저장
          if (utt.translated) {
            await supabase
              .from("translations")
              .insert({
                utterance_id: uttData.id,
                translated_text: utt.translated,
                target_language: targetLang,
              })
          }
        }
      }

      console.log("[DB 저장] 완료:", utterances.length, "개 문장")
      return true
    } catch (err) {
      console.error("[DB 저장] 실패:", err)
      return false
    }
  }

  // 수동 저장 (로컬 + DB)
  const manualSave = async () => {
    setIsSaving(true)
    setError(null)
    
    try {
      // 로컬 저장
      autoSaveToStorage()
      
      // DB 저장
      const dbSaved = await saveToDatabase()
      
      if (dbSaved) {
        alert("저장되었습니다! (로컬 + DB)")
      } else {
        alert("로컬에 저장되었습니다. (로그인 시 DB에도 저장됩니다)")
      }
    } catch (err) {
      console.error("저장 오류:", err)
      setError("저장 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  // 전체화면 진입
  const enterFullscreen = async () => {
    if (fullscreenContainerRef.current) {
      try {
        await fullscreenContainerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } catch (err) {
        console.error("전체화면 진입 실패:", err)
      }
    }
  }

  // 전체화면 종료
  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
      setIsFullscreen(false)
    } catch (err) {
      console.error("전체화면 종료 실패:", err)
    }
  }

  // 전체화면 토글
  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }

  // 전체화면 상태 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopCapture()
      stopTimeSyncReplay()
    }
  }, [stopCapture])

  // utterances 변경 시 자동 저장 (10개 문장마다)
  useEffect(() => {
    if (utterances.length > 0 && utterances.length % 10 === 0) {
      autoSaveToStorage()
    }
  }, [utterances.length, autoSaveToStorage])

  if (!videoId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>YouTube 비디오 ID가 필요합니다.</p>
      </div>
    )
  }

  // 다시보기 선택 모달
  if (showReplayChoice) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">📺 이전 통역 내역 발견!</h2>
          <p className="text-slate-400 text-center mb-6">
            이 영상의 저장된 통역 내역이 있습니다.<br/>
            어떻게 하시겠습니까?
          </p>
          <div className="space-y-3">
            <button
              onClick={loadSavedData}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all text-lg"
            >
              📖 저장된 내용 보기
            </button>
            <button
              onClick={startNewSession}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold rounded-xl transition-all text-lg"
            >
              🎤 새로 통역하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 표시할 utterances
  // - 크게보기: 최근 2개만
  // - 저장된 내용 보기 (replayMode): 전체 표시
  // - 일반 모드: 전체 표시
  const displayUtterances = isLargeView 
    ? utterances.slice(-2) 
    : utterances

  // 전체화면에서 표시할 자막 (동기화 모드면 현재 자막, 아니면 최신 자막)
  const displayedSubtitle = isReplayMode && currentSyncIndex >= 0 
    ? utterances[currentSyncIndex] 
    : (utterances.length > 0 ? utterances[utterances.length - 1] : null)

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* 전체화면 컨테이너 (YouTube + 자막 오버레이) */}
      <div 
        ref={fullscreenContainerRef}
        className={`relative ${isFullscreen ? 'bg-black' : ''}`}
        style={{ height: isFullscreen ? "100vh" : (isLargeView ? "50vh" : "55vh") }}
      >
        {/* YouTube 영상 (IFrame API) */}
        <div 
          id="youtube-player" 
          className="absolute inset-0 w-full h-full"
        />
        
        {/* 전체화면 하단 자막 오버레이 */}
        {isFullscreen && displayedSubtitle && (
          <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none">
            <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-16 pb-8 px-8">
              {/* 재생 시간 표시 (동기화 모드) */}
              {isReplayMode && displayedSubtitle.startTime > 0 && (
                <p className="text-blue-300 text-sm text-center mb-2 opacity-70">
                  ⏱ {formatTime(displayedSubtitle.startTime)}
                </p>
              )}
              {/* 원어 */}
              <p className="text-white text-xl md:text-2xl text-center mb-2 drop-shadow-lg">
                {displayedSubtitle.original}
              </p>
              {/* 번역어 */}
              {displayedSubtitle.translated && (
                <p className="text-green-400 text-2xl md:text-3xl font-bold text-center drop-shadow-lg">
                  {displayedSubtitle.translated}
                </p>
              )}
            </div>
            
            {/* 전체화면 종료 버튼 - 항상 표시 */}
            <div className="absolute top-4 right-4 pointer-events-auto">
              <button
                onClick={exitFullscreen}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-lg"
              >
                ⛶ 창 모드로 전환
              </button>
            </div>
            
            {/* 실시간 인식 중 표시 */}
            {currentTranscript && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                <p className="text-yellow-300/80 text-lg italic drop-shadow-lg">
                  {currentTranscript}...
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* 전체화면 컨트롤 (전체화면 상태에서만 상단에 표시) */}
        {isFullscreen && (
          <div className="absolute top-0 left-0 right-0 z-50">
            <div className="bg-gradient-to-b from-black/90 to-transparent p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">🌐 UniLang</span>
                {isListening && (
                  <span className="flex items-center gap-1 text-green-400 text-sm">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    실시간 통역 중
                  </span>
                )}
                <span className="text-white/70 text-sm truncate max-w-md">
                  📺 {youtubeTitle}
                </span>
              </div>
              <button
                onClick={exitFullscreen}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium"
              >
                ⛶ 창 모드
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 컨트롤 바 (YouTube 제목 포함) - 전체화면 아닐 때만 */}
      {!isFullscreen && (
      <div className="bg-slate-800 border-b border-slate-700">
        {/* 상단: YouTube 제목 */}
        <div className="px-4 py-1 bg-gradient-to-r from-red-900/60 to-orange-900/60 border-b border-slate-700">
          <p className="text-white text-sm font-medium truncate">
            📺 {youtubeTitle || "YouTube 영상 로딩 중..."}
          </p>
        </div>
        {/* 하단: 컨트롤 */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-bold">🌐 UniLang</span>
            {isListening ? (
              <span className="flex items-center gap-1 text-green-400 text-xs">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                통역 중
              </span>
            ) : isReplayMode ? (
              <span className="flex items-center gap-1 text-blue-400 text-xs">
                <span className="w-2 h-2 bg-blue-400 rounded-full" />
                저장된 내용
              </span>
            ) : (
              <span className="text-yellow-400 text-xs">{connectionStatus}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">
              {LANGUAGES[sourceLang] || sourceLang} → {LANGUAGES[targetLang] || targetLang}
            </span>
            
            {/* 전체화면 버튼 */}
            <button
              onClick={toggleFullscreen}
              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
              title="전체화면 (자막 오버레이)"
            >
              {isFullscreen ? "⛶ 창모드" : "⛶ 전체화면"}
            </button>
            
            {/* 크게보기/작게보기 토글 */}
            <button
              onClick={() => setIsLargeView(!isLargeView)}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors"
            >
              {isLargeView ? "작게보기" : "크게보기"}
            </button>
            
            {!isReplayMode && (
              !isReady ? (
                <button
                  onClick={startCapture}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded transition-colors"
                >
                  🎧 새로 통역
                </button>
              ) : (
                <button
                  onClick={stopCapture}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition-colors"
                >
                  공유 중지
                </button>
              )
            )}
            
            {isReplayMode && (
              <button
                onClick={() => {
                  setIsReplayMode(false)
                  setUtterances([])
                }}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded transition-colors"
              >
                🎤 새로 통역
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* 안내 메시지 (처음에만) - 전체화면 아닐 때만 */}
      {!isFullscreen && showInstructions && !isReady && !isReplayMode && (
        <div className="px-4 py-3 bg-blue-900/50 border-b border-blue-700">
          <p className="text-blue-200 text-sm">
            📌 <strong>사용법:</strong> &quot;시작하기&quot; 클릭 → 화면 공유 창에서 <strong>이 탭</strong> 선택 → <strong>&quot;탭 오디오도 공유&quot;</strong> 체크 ✓ → 공유
          </p>
        </div>
      )}

      {/* 에러 메시지 - 전체화면 아닐 때만 */}
      {!isFullscreen && error && (
        <div className="px-4 py-2 bg-red-900/50 border-b border-red-700">
          <p className="text-red-300 text-sm whitespace-pre-line">{error}</p>
        </div>
      )}

      {/* 자막 히스토리 영역 - 전체화면 아닐 때만 */}
      {!isFullscreen && (
      <div 
        className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 ${isLargeView ? 'flex flex-col justify-center' : ''}`}
        style={{ maxHeight: isLargeView ? "40vh" : "30vh" }}
      >
        {displayUtterances.length === 0 ? (
          <p className="text-slate-500 text-center text-sm py-4">
            {isListening 
              ? "🎧 음성 인식 중... YouTube 영상을 재생해주세요" 
              : isReplayMode
                ? "저장된 내용이 없습니다."
                : "위 버튼을 클릭하여 실시간 통역을 시작하세요"}
          </p>
        ) : (
          <>
            {displayUtterances.map((utt, idx) => {
              const actualIndex = utterances.indexOf(utt)
              const isCurrentSync = isReplayMode && actualIndex === currentSyncIndex
              
              return (
                <div 
                  key={utt.id}
                  data-sync-index={actualIndex}
                  onClick={() => isReplayMode && seekToUtterance(utt)}
                  className={`rounded-xl p-4 border transition-all ${
                    isCurrentSync
                      ? 'bg-blue-900/70 border-blue-500 ring-2 ring-blue-400/50 scale-[1.02]'
                      : isLargeView 
                        ? 'bg-slate-800 border-slate-600' 
                        : 'bg-slate-800/50 border-slate-700'
                  } ${isReplayMode ? 'cursor-pointer hover:bg-slate-700/70' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {!isLargeView && (
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs font-mono px-2 py-1 rounded ${
                          isCurrentSync ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'
                        }`}>
                          #{actualIndex + 1}
                        </span>
                        {isReplayMode && utt.startTime > 0 && (
                          <span className="text-slate-500 text-xs">
                            {formatTime(utt.startTime)}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className={`${isCurrentSync ? 'text-white' : 'text-white'} ${isLargeView ? 'text-xl leading-relaxed' : 'text-sm'}`}>
                        {utt.original}
                      </p>
                      {utt.translated && (
                        <p className={`mt-2 ${isCurrentSync ? 'text-green-300' : 'text-green-400'} ${isLargeView ? 'text-2xl font-bold leading-relaxed' : 'text-sm'}`}>
                          {utt.translated}
                        </p>
                      )}
                    </div>
                    {isCurrentSync && (
                      <span className="text-blue-400 text-xs animate-pulse">▶ 재생 중</span>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={utterancesEndRef} />
          </>
        )}
        
        {/* 현재 인식 중인 텍스트 */}
        {currentTranscript && (
          <div className={`rounded-xl p-4 border border-yellow-700/50 bg-yellow-900/30 ${isLargeView ? '' : ''}`}>
            <p className={`text-yellow-300 opacity-70 ${isLargeView ? 'text-xl' : 'text-sm'}`}>
              {currentTranscript}...
            </p>
          </div>
        )}
      </div>
      )}

      {/* 하단 액션 바 - 전체화면 아닐 때만 */}
      {!isFullscreen && (
      <div className="px-4 py-4 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">
            총 {utterances.length}개 문장 {hasSavedData && <span className="text-green-400">(저장됨)</span>}
          </span>
          
          <div className="flex items-center gap-3">
            <button
              onClick={reorganizeWithAI}
              disabled={isReorganizing || utterances.length === 0}
              className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              {isReorganizing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  처리 중...
                </>
              ) : (
                <>✨ AI 재정리</>
              )}
            </button>
            
            <button
              onClick={generateSummary}
              disabled={isSummarizing || utterances.length === 0}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              {isSummarizing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  생성 중...
                </>
              ) : (
                <>📝 요약</>
              )}
            </button>
            
            <button
              onClick={manualSave}
              disabled={isSaving || utterances.length === 0}
              className="px-5 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  저장 중...
                </>
              ) : (
                <>💾 저장</>
              )}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* 요약 모달 */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-white font-bold text-xl">📝 요약</h3>
              <button
                onClick={() => setShowSummary(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-200 whitespace-pre-wrap text-lg leading-relaxed">{summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
