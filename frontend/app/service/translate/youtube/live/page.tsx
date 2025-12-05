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
  "auto": "자동 감지",
  "ko": "한국어",
  "en": "English",
  "zh": "中文",
  "ja": "日本語",
  "es": "Español",
  "ar": "العربية",
  "de": "Deutsch",
  "fr": "Français",
  "hi": "हिन्दी",
  "id": "Bahasa Indonesia",
  "it": "Italiano",
  "ms": "Bahasa Melayu",
  "nl": "Nederlands",
  "pl": "Polski",
  "pt": "Português",
  "ru": "Русский",
  "th": "ภาษาไทย",
  "tr": "Türkçe",
  "vi": "Tiếng Việt",
}

// Deepgram 언어 코드 매핑
const DEEPGRAM_LANGUAGES: Record<string, string> = {
  "auto": "en",
  "ko": "ko",
  "en": "en",
  "zh": "zh",
  "ja": "ja",
  "es": "es",
  "ar": "ar",
  "de": "de",
  "fr": "fr",
  "hi": "hi",
  "id": "id",
  "it": "it",
  "ms": "ms",
  "nl": "nl",
  "pl": "pl",
  "pt": "pt",
  "ru": "ru",
  "th": "th",
  "tr": "tr",
  "vi": "vi",
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
  isReorganized?: boolean  // AI 재정리 여부
  videoDuration?: number   // 영상 총 시간 (ms)
  lastTextTime?: number    // 마지막 텍스트 시간 (ms)
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
  const quickSummaryMode = searchParams.get("quickSummary") === "true"
  const hasSubtitles = searchParams.get("hasSubtitles") === "true"
  const realtimeMode = searchParams.get("realtimeMode") === "true"
  const loadSaved = searchParams.get("loadSaved") === "true"
  const startFullscreen = false  // 전체화면 자동 진입 비활성화 (브라우저 보안 정책)
  
  const [isListening, setIsListening] = useState(false)
  const [isQuickSummaryRunning, setIsQuickSummaryRunning] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [utterances, setUtterances] = useState<Utterance[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>("대기 중")
  const [showInstructions, setShowInstructions] = useState(true)
  
  // 자막 모드 상태
  const [hasPreloadedSubtitles, setHasPreloadedSubtitles] = useState(hasSubtitles)
  const [isProcessingSubtitles, setIsProcessingSubtitles] = useState(false)
  const [shouldLoadSavedSession, setShouldLoadSavedSession] = useState(loadSaved)
  
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
  
  // 자막 영역 높이 (사용자 조절 가능)
  const [subtitleHeight, setSubtitleHeight] = useState(200) // px
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)
  
  // AI 재정리 여부
  const [isReorganized, setIsReorganized] = useState(false)
  
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
  
  // 영상 길이 및 저장 완료율
  const [videoDuration, setVideoDuration] = useState(0)  // 영상 총 시간 (ms)
  const [savedDataCoverage, setSavedDataCoverage] = useState(0)  // 저장 완료율 (%)
  
  // 오디오 모드 (화자 목소리 vs 번역 음성)
  const [audioMode, setAudioMode] = useState<"original" | "translated">("original")
  const audioModeRef = useRef<"original" | "translated">("original")  // closure 문제 해결용
  const audioRef = useRef<HTMLAudioElement | null>(null)  // Google Cloud TTS 오디오
  const lastSpokenIndexRef = useRef(-1)
  const isSpeakingRef = useRef(false)  // TTS 진행 중 여부
  const ttsQueueRef = useRef<{text: string, lang: string}[]>([])  // TTS 대기 큐
  const seekSpeedMultiplierRef = useRef(1.0)  // 시간 이동 시 속도 배수 (1.0 = 기본, 1.5 = 빠르게)

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
    
    const loadPlayer = () => {
      // DOM 요소가 준비될 때까지 대기
      const checkAndInit = () => {
        const playerElement = document.getElementById("youtube-player")
        if (playerElement && !playerRef.current) {
          initializePlayer()
        } else if (!playerElement) {
          // DOM이 아직 준비되지 않았으면 재시도
          setTimeout(checkAndInit, 100)
        }
      }
      checkAndInit()
    }
    
    // API가 이미 로드되어 있으면 플레이어 초기화
    if (window.YT && window.YT.Player) {
      loadPlayer()
      return
    }
    
    // API 로드
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    if (!existingScript) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }
    
    // API 로드 완료 시 플레이어 초기화
    window.onYouTubeIframeAPIReady = () => {
      loadPlayer()
    }
    
    // API가 이미 로드되었는데 콜백이 이미 호출된 경우
    const checkAPILoaded = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkAPILoaded)
        loadPlayer()
      }
    }, 100)
    
    return () => {
      clearInterval(checkAPILoaded)
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
          // 영상 길이 저장
          const duration = event.target.getDuration() * 1000 // ms로 변환
          setVideoDuration(duration)
          console.log(`[YouTube] 영상 길이: ${Math.floor(duration/1000)}초`)
        },
        onStateChange: (event) => {
          // 재생 상태 변경 시 - ref를 사용하여 최신 상태 참조
          console.log("[YouTube] 상태 변경:", event.data, "isReplayMode:", isReplayModeRef.current)
          if (event.data === window.YT.PlayerState.PLAYING && isReplayModeRef.current) {
            console.log("[YouTube] 재생 시작 - 동기화 타이머 시작")
            startSyncTimer()
            // 재생 재시작 시: 번역 음성 모드이면 TTS 재개 시도
            if (audioModeRef.current === "translated") {
              // 일시정지된 오디오가 있으면 이어서 재생
              if (resumeTTS()) {
                console.log("[YouTube] TTS 이어서 재생")
              } else {
                console.log("[YouTube] 재생 재시작 - 다음 자막 대기")
              }
            }
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            stopSyncTimer()
            pauseTTS()  // 일시정지: 오디오 위치 유지
          } else if (event.data === window.YT.PlayerState.ENDED) {
            stopTTS()  // 종료: 완전 초기화
            // 영상 종료 시 빠른 요약 모드이면 자동 처리
            if (quickSummaryMode && isQuickSummaryRunning) {
              console.log("[빠른 요약] 영상 종료 - 자동 AI 재정리 시작")
              handleQuickSummaryComplete()
            }
          }
        }
      }
    })
  }, [videoId])
  
  // 현재 동기화 인덱스를 ref로 관리 (closure 문제 해결)
  const currentSyncIndexRef = useRef(currentSyncIndex)
  useEffect(() => {
    currentSyncIndexRef.current = currentSyncIndex
  }, [currentSyncIndex])
  
  // utterances를 ref로 관리 (closure 문제 해결)
  const utterancesRef = useRef(utterances)
  useEffect(() => {
    utterancesRef.current = utterances
    console.log("[ref 업데이트] utterances:", utterances.length, "개")
  }, [utterances])

  // 동기화 타이머 시작
  const startSyncTimer = useCallback(() => {
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    
    console.log("[동기화] 타이머 시작, utterances:", utterancesRef.current.length, "개")
    
    syncIntervalRef.current = setInterval(() => {
      const currentUtterances = utterancesRef.current // ref에서 최신 값 가져오기
      
      if (playerRef.current && currentUtterances.length > 0) {
        const currentTime = playerRef.current.getCurrentTime() * 1000 // ms로 변환
        setCurrentVideoTime(currentTime)
        
        // startTime이 유효한지 확인 (모두 0이면 시간 기반 균등 분배)
        const hasValidStartTime = currentUtterances.some(u => u.startTime > 0)
        
        let newIndex = -1
        
        if (hasValidStartTime) {
          // 원본 startTime 기반 동기화
          // 영상 시간이 첫 번째 자막 시간보다 작으면 첫 번째 자막 표시
          if (currentTime < (currentUtterances[0]?.startTime || 0)) {
            newIndex = 0
          } else {
            newIndex = currentUtterances.findIndex((utt, idx) => {
              const nextUtt = currentUtterances[idx + 1]
              if (nextUtt) {
                return utt.startTime <= currentTime && currentTime < nextUtt.startTime
              }
              return utt.startTime <= currentTime
            })
            // findIndex가 -1 반환하면 마지막으로 찾은 자막 유지 또는 첫 번째
            if (newIndex === -1) {
              // 마지막 자막보다 시간이 지났으면 마지막 자막 유지
              const lastUtt = currentUtterances[currentUtterances.length - 1]
              if (lastUtt && currentTime >= lastUtt.startTime) {
                newIndex = currentUtterances.length - 1
              } else {
                newIndex = 0
              }
            }
          }
        } else {
          // startTime이 없는 경우: 영상 길이 기준 균등 분배
          try {
            const duration = playerRef.current.getDuration() * 1000 // ms
            if (duration > 0) {
              const timePerUtterance = duration / currentUtterances.length
              newIndex = Math.min(
                Math.floor(currentTime / timePerUtterance),
                currentUtterances.length - 1
              )
            }
          } catch {
            // 영상 길이를 가져올 수 없는 경우
            newIndex = 0
          }
        }
        
        // ref를 사용하여 비교 (closure 문제 해결)
        if (newIndex !== -1 && newIndex !== currentSyncIndexRef.current) {
          // 인덱스가 2 이상 차이나면 시간 이동(seek)으로 간주
          const indexDiff = Math.abs(newIndex - currentSyncIndexRef.current)
          if (indexDiff > 1) {
            // 현재 자막의 남은 시간 계산 (다음 자막 시작 시간 - 현재 영상 시간)
            const nextUtterance = currentUtterances[newIndex + 1]
            const currentUtterance = currentUtterances[newIndex]
            const endTime = nextUtterance?.startTime || (currentUtterance?.startTime || 0) + 10000 // 다음 자막 없으면 10초 가정
            const remainingTime = endTime - currentTime
            
            console.log(`[동기화] 시간 이동 감지 (${currentSyncIndexRef.current} → ${newIndex}), 남은시간: ${Math.floor(remainingTime/1000)}초`)
            
            // TTS 중지 및 큐 비우기
            ttsQueueRef.current = []
            if (audioRef.current) {
              audioRef.current.pause()
              if (audioRef.current.src) {
                URL.revokeObjectURL(audioRef.current.src)
              }
              audioRef.current = null
            }
            isSpeakingRef.current = false
            
            // 옵션 C: 남은 시간에 따라 처리
            if (remainingTime < 3000) {
              // 남은 시간 < 3초: 현재 자막 건너뛰기 (다음 자막부터 TTS)
              console.log(`[동기화] 남은시간 ${Math.floor(remainingTime/1000)}초 < 3초 → 건너뛰기`)
              lastSpokenIndexRef.current = newIndex // 현재 자막은 읽은 것으로 처리
            } else {
              // 남은 시간 >= 3초: 빠른 속도로 TTS 재생 (speedMultiplier 적용)
              console.log(`[동기화] 남은시간 ${Math.floor(remainingTime/1000)}초 >= 3초 → 1.5x 속도로 읽기`)
              lastSpokenIndexRef.current = newIndex - 1 // 현재 자막 읽도록 설정
              seekSpeedMultiplierRef.current = 1.5 // 시간 이동 시 속도 증가
            }
          }
          setCurrentSyncIndex(newIndex)
          console.log(`[동기화] 자막 ${newIndex + 1}/${currentUtterances.length}, 영상시간: ${Math.floor(currentTime/1000)}초, startTime: ${currentUtterances[newIndex]?.startTime}`)
        }
      }
    }, 300) // 300ms 간격으로 동기화
  }, [])
  
  // 동기화 타이머 정지
  const stopSyncTimer = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }
  }
  
  // 리플레이 모드 + utterances가 있으면 자동으로 동기화 타이머 시작 (백업용)
  // 주의: YouTube onStateChange(PLAYING)에서도 호출되므로 중복 방지
  useEffect(() => {
    if (isReplayMode && utterances.length > 0 && isPlayerReady && !syncIntervalRef.current) {
      console.log(`[동기화] 백업 타이머 시작 - utterances: ${utterances.length}개`)
      startSyncTimer()
    }
    
    return () => {
      // 컴포넌트 언마운트 시 타이머 정리
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [isReplayMode, utterances.length, isPlayerReady, startSyncTimer])
  
  // 자막 클릭 시 해당 시간으로 이동
  const seekToUtterance = (utt: Utterance) => {
    if (playerRef.current && isReplayMode && utt.startTime) {
      stopTTS()  // 시간 이동: 완전 초기화
      const seekTime = utt.startTime / 1000 // 초로 변환
      playerRef.current.seekTo(seekTime, true)
      playerRef.current.playVideo()
    }
  }

  // 자막 영역 높이 드래그 조절
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartY.current = e.clientY
    dragStartHeight.current = subtitleHeight
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const diff = dragStartY.current - e.clientY
      const newHeight = Math.max(100, Math.min(500, dragStartHeight.current + diff))
      setSubtitleHeight(newHeight)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

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

  // 저장된 데이터 확인 - 로컬, DB(내 데이터), 공유 데이터 순으로 확인
  // 95% 이상 커버리지일 때만 저장본 보기 활성화
  useEffect(() => {
    const checkSavedData = async () => {
      if (!videoId) return
      
      const MIN_COVERAGE = 95 // 최소 커버리지 (%)
      
      // 1. 로컬 스토리지 확인
      const saved = localStorage.getItem(getStorageKey())
      if (saved) {
        try {
          const data: SavedSession = JSON.parse(saved)
          // 커버리지 계산
          if (data.videoDuration && data.lastTextTime) {
            const coverage = (data.lastTextTime / data.videoDuration) * 100
            setSavedDataCoverage(coverage)
            console.log(`[저장본 확인] 로컬 커버리지: ${coverage.toFixed(1)}%`)
            
            if (coverage >= MIN_COVERAGE) {
              setHasSavedData(true)
              setShowReplayChoice(true)
              return
            } else {
              console.log(`[저장본 확인] 커버리지 미달 (${coverage.toFixed(1)}% < ${MIN_COVERAGE}%) - 저장본 보기 비활성화`)
            }
          } else {
            // 이전 형식 데이터는 그대로 활성화
            setHasSavedData(true)
            setShowReplayChoice(true)
            return
          }
        } catch {
          // 파싱 실패 시 기존 로직
          setHasSavedData(true)
          setShowReplayChoice(true)
          return
        }
      }
      
      // 2. DB 확인 (내 데이터 + 공유 데이터)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        // 내 데이터 확인
        if (user) {
          const { data: mySession } = await supabase
            .from("translation_sessions")
            .select("id")
            .eq("user_id", user.id)
            .eq("youtube_video_id", videoId)
            .limit(1)
            .single()
          
          if (mySession) {
            setHasSavedData(true)
            setShowReplayChoice(true)
            return
          }
        }
        
        // 공유 데이터 확인 (같은 영상, 같은 언어)
        const { data: sharedSession } = await supabase
          .from("translation_sessions")
          .select("id")
          .eq("youtube_video_id", videoId)
          .eq("source_language", sourceLang === "auto" ? "en" : sourceLang)
          .contains("target_languages", [targetLang])
          .eq("status", "completed")
          .limit(1)
          .single()
        
        if (sharedSession) {
          setHasSavedData(true)
          setShowReplayChoice(true)
        }
      } catch (err) {
        // DB 조회 실패는 무시
      }
    }
    
    checkSavedData()
  }, [videoId, sourceLang, targetLang])

  // 자동 실행: 선택 화면이 표시될 때 URL 파라미터에 따라 자동으로 함수 호출
  const hasAutoExecuted = useRef(false)
  useEffect(() => {
    if (showReplayChoice && !hasAutoExecuted.current) {
      // loadSaved=true인 경우: "저장된 내용 보기" 자동 실행
      if (loadSaved) {
        console.log("🚀 자동 실행: 저장된 내용 보기")
        hasAutoExecuted.current = true
        // 약간의 지연 후 실행 (렌더링 완료 보장)
        setTimeout(() => {
          loadSavedData()
        }, 100)
      }
    }
  }, [showReplayChoice, loadSaved])

  // 자동 실행: 실시간 통역 모드 (자막 없음)
  useEffect(() => {
    if (realtimeMode && videoId && !hasAutoExecuted.current) {
      console.log("🚀 자동 실행: 실시간 통역 모드")
      hasAutoExecuted.current = true
      // 약간의 지연 후 실행
      setTimeout(() => {
        startCapture()
      }, 500)
    }
  }, [realtimeMode, videoId])

  // 자막 데이터 로드 및 처리 (통합 워크플로우)
  const processPreloadedSubtitles = useCallback(async () => {
    if (!hasPreloadedSubtitles || isProcessingSubtitles) return
    
    setIsProcessingSubtitles(true)
    setConnectionStatus("자막 처리 중...")
    
    try {
      // sessionStorage에서 자막 데이터 로드
      const subtitleDataStr = sessionStorage.getItem('unilang_subtitle_data')
      if (!subtitleDataStr) {
        console.error("자막 데이터를 찾을 수 없습니다")
        // 실시간 모드로 전환
        setHasPreloadedSubtitles(false)
        return
      }
      
      const subtitleData = JSON.parse(subtitleDataStr)
      console.log("자막 데이터 로드됨:", subtitleData)
      
      // sessionStorage에서 데이터 삭제 (일회성)
      sessionStorage.removeItem('unilang_subtitle_data')
      
      // 1단계: 자막을 Utterance 형식으로 변환
      setConnectionStatus("자막 변환 중...")
      // start는 이미 밀리초 (route.ts에서 변환됨)
      const convertedUtterances: Utterance[] = subtitleData.utterances.map((item: { start: number; text: string }, index: number) => ({
        id: `subtitle-${index}`,
        original: item.text,
        translated: "",
        timestamp: new Date(),
        startTime: Math.floor(item.start), // 이미 ms 단위
      }))
      
      // 2단계: 번역 수행
      if (targetLang !== "none" && targetLang !== sourceLang) {
        setConnectionStatus("번역 중...")
        let translatedCount = 0
        
        for (const utterance of convertedUtterances) {
          try {
            const translated = await translateText(utterance.original, subtitleData.language || sourceLang, targetLang)
            utterance.translated = translated
            translatedCount++
            setConnectionStatus(`번역 중... (${translatedCount}/${convertedUtterances.length})`)
          } catch (err) {
            console.error("번역 오류:", err)
            utterance.translated = utterance.original
          }
        }
      }
      
      setUtterances(convertedUtterances)
      setConnectionStatus("자막 처리 완료")
      
      // 3단계: AI 재처리
      setConnectionStatus("AI 재정리 중...")
      await handleReorganize(convertedUtterances)
      
      // 4단계: 요약 생성
      setConnectionStatus("요약 생성 중...")
      await handleSummarize(convertedUtterances)
      
      // 5단계: 저장
      setConnectionStatus("저장 중...")
      const sessionData: SavedSession = {
        videoId: videoId || "",
        sourceLang,
        targetLang,
        utterances: convertedUtterances,
        savedAt: new Date().toISOString(),
        summary: summary,
        isReorganized: true,
        videoDuration: subtitleData.duration ? subtitleData.duration * 1000 : 0,
        lastTextTime: convertedUtterances.length > 0 
          ? convertedUtterances[convertedUtterances.length - 1].startTime 
          : 0,
      }
      
      // LocalStorage에 저장
      localStorage.setItem(getStorageKey(), JSON.stringify(sessionData))
      setHasSavedData(true)
      
      // Supabase에도 저장 (백그라운드)
      saveToSupabase(sessionData).catch(console.error)
      
      // 재생 모드로 전환
      setIsReplayMode(true)
      setConnectionStatus("준비 완료 - 영상을 재생하세요")
      
    } catch (err) {
      console.error("자막 처리 오류:", err)
      setError("자막 처리 중 오류가 발생했습니다. 실시간 통역으로 전환합니다.")
      setHasPreloadedSubtitles(false)
    } finally {
      setIsProcessingSubtitles(false)
    }
  }, [hasPreloadedSubtitles, isProcessingSubtitles, videoId, sourceLang, targetLang, summary])
  
  // AI 재처리 함수 (내부용)
  const handleReorganize = async (currentUtterances: Utterance[]) => {
    if (currentUtterances.length === 0) return
    
    setIsReorganizing(true)
    try {
      const textToReorganize = currentUtterances
        .map(u => u.translated || u.original)
        .join("\n")
      
      const response = await fetch("/api/gemini/reorganize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToReorganize, language: targetLang }),
      })
      
      if (!response.ok) throw new Error("AI 재정리 실패")
      
      const data = await response.json()
      if (data.reorganizedText) {
        // 재정리된 텍스트를 utterances에 반영
        const lines = data.reorganizedText.split("\n").filter((l: string) => l.trim())
        const reorganizedUtterances = lines.map((line: string, index: number) => ({
          ...currentUtterances[index] || {
            id: `reorganized-${index}`,
            original: "",
            timestamp: new Date(),
            startTime: 0,
          },
          translated: line,
        }))
        setUtterances(reorganizedUtterances)
        setIsReorganized(true)
      }
    } catch (err) {
      console.error("AI 재정리 오류:", err)
    } finally {
      setIsReorganizing(false)
    }
  }
  
  // 요약 생성 함수 (내부용)
  const handleSummarize = async (currentUtterances: Utterance[]) => {
    if (currentUtterances.length === 0) return
    
    setIsSummarizing(true)
    try {
      const textToSummarize = currentUtterances
        .map(u => u.translated || u.original)
        .join("\n")
      
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSummarize, language: targetLang }),
      })
      
      if (!response.ok) throw new Error("요약 생성 실패")
      
      const data = await response.json()
      if (data.summary) {
        setSummary(data.summary)
      }
    } catch (err) {
      console.error("요약 생성 오류:", err)
    } finally {
      setIsSummarizing(false)
    }
  }
  
  // Supabase 저장 함수 (내부용)
  const saveToSupabase = async (sessionData: SavedSession) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase
        .from('translation_sessions')
        .upsert({
          user_id: user.id,
          video_id: sessionData.videoId,
          source_lang: sessionData.sourceLang,
          target_lang: sessionData.targetLang,
          summary: sessionData.summary,
          is_reorganized: sessionData.isReorganized,
          video_duration: sessionData.videoDuration,
          last_text_time: sessionData.lastTextTime,
          utterances: JSON.stringify(sessionData.utterances),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,video_id,source_lang,target_lang',
        })
      
      if (error) {
        console.error("Supabase 저장 오류:", error)
      } else {
        console.log("Supabase 저장 완료:", data)
      }
    } catch (err) {
      console.error("Supabase 저장 실패:", err)
    }
  }

  // 저장된 세션 로드 함수
  const loadSavedSession = useCallback(async () => {
    try {
      // localStorage에서 영구 저장된 세션 데이터 로드
      const storageKey = getStorageKey()
      console.log("🔍 저장 키:", storageKey)
      console.log("🔍 videoId:", videoId, "sourceLang:", sourceLang, "targetLang:", targetLang)
      
      // localStorage의 모든 키 출력 (디버그용)
      console.log("📦 localStorage 키 목록:")
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith("unilang_")) {
          console.log("  -", key)
        }
      }
      
      const savedSessionStr = localStorage.getItem(storageKey)
      if (!savedSessionStr) {
        console.error("❌ 저장된 세션 데이터를 찾을 수 없습니다:", storageKey)
        setShouldLoadSavedSession(false)
        // 실시간 모드로 전환
        setConnectionStatus("저장된 데이터 없음 - 대기 중")
        return
      }
      
      const savedSession = JSON.parse(savedSessionStr)
      console.log("✅ 저장된 세션 로드됨:", savedSession)
      console.log("✅ utterances 수:", savedSession.utterances?.length)
      
      // utterances 타입 변환 (timestamp를 Date로 변환)
      const convertedUtterances: Utterance[] = savedSession.utterances.map((u: {
        id: string
        original: string
        translated: string
        timestamp: string | Date
        startTime: number
      }) => ({
        id: u.id,
        original: u.original,
        translated: u.translated || u.original, // translated가 없으면 original 사용
        timestamp: typeof u.timestamp === 'string' ? new Date(u.timestamp) : u.timestamp,
        startTime: u.startTime || 0,
      }))
      
      console.log("📥 변환된 utterances:", convertedUtterances.length, "개")
      console.log("📥 첫 번째 utterance:", convertedUtterances[0])
      console.log("📥 번역 샘플:", convertedUtterances.slice(0, 3).map(u => ({
        original: u.original?.substring(0, 30),
        translated: u.translated?.substring(0, 30),
        startTime: u.startTime
      })))
      console.log("📥 summary:", savedSession.summary?.substring(0, 100))
      
      // 저장된 데이터로 상태 설정
      setUtterances(convertedUtterances)
      if (savedSession.summary) {
        setSummary(savedSession.summary)
        setShowSummary(false) // 요약 모달은 닫힌 상태로
      }
      if (savedSession.isReorganized) {
        setIsReorganized(true)
      }
      if (savedSession.videoDuration) {
        setVideoDuration(savedSession.videoDuration)
      }
      
      setHasSavedData(true)
      setIsReplayMode(true)
      setConnectionStatus("저장된 데이터 로드 완료 - 영상을 재생하세요")
      
    } catch (err) {
      console.error("저장된 세션 로드 오류:", err)
      setShouldLoadSavedSession(false)
    }
  }, [])

  // 자동 시작 (autostart 파라미터 처리)
  useEffect(() => {
    if (autostart && videoId && !hasAutoStarted.current && !showReplayChoice) {
      hasAutoStarted.current = true
      
      if (realtimeMode) {
        // 실시간 통역 모드
        console.log("🚀 자동 시작: 실시간 통역 모드")
        const timer = setTimeout(() => {
          startCapture()
        }, 500)
        return () => clearTimeout(timer)
      } else if (hasPreloadedSubtitles) {
        // 자막이 있는 경우: 자막 처리 워크플로우 시작
        const timer = setTimeout(() => {
          processPreloadedSubtitles()
        }, 1000)
        return () => clearTimeout(timer)
      } else if (!hasSavedData) {
        // 저장된 데이터 없음: 실시간 모드
        const timer = setTimeout(() => {
          startCapture()
        }, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [autostart, videoId, showReplayChoice, hasPreloadedSubtitles, realtimeMode, hasSavedData, processPreloadedSubtitles])

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

  // 발화 처리 (번역 포함) - YouTube 영상 시간 기반 정확한 타이밍
  const processUtterance = useCallback(async (text: string, detectedLang?: string) => {
    // 자동 감지 모드인 경우 감지된 언어 사용, 아니면 설정된 언어 사용
    const srcLang = sourceLang === "auto" 
      ? (detectedLang || "en") 
      : sourceLang
    
    let translated = ""
    
    // 동일 언어 선택 시 (영어→영어, 한국어→한국어)
    // 번역 없이 원본을 그대로 사용 (녹색으로 표시하기 위해)
    const isSameLanguage = targetLang === srcLang || targetLang === "none"
    
    if (isSameLanguage) {
      // 동일 언어: 원본을 그대로 표시 (번역 비용 절감)
      translated = text
      console.log(`[동일 언어] ${LANGUAGES[srcLang] || srcLang} - 번역 없이 원본 저장`)
    } else {
      try {
        translated = await translateText(text, srcLang, targetLang)
      } catch (err) {
        console.error("번역 실패:", err)
      }
    }
    
    // YouTube 영상의 현재 재생 시간을 정확하게 가져옴 (ms)
    let accurateStartTime = 0
    try {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        accurateStartTime = Math.floor(playerRef.current.getCurrentTime() * 1000)
        console.log(`[타이밍] YouTube 시간: ${formatTime(accurateStartTime)}`)
      } else if (sessionStartTime > 0) {
        // YouTube Player가 없으면 세션 시간 기준
        accurateStartTime = Date.now() - sessionStartTime
      }
    } catch (err) {
      console.error("[타이밍] YouTube 시간 가져오기 실패:", err)
      if (sessionStartTime > 0) {
        accurateStartTime = Date.now() - sessionStartTime
      }
    }
    
    const newUtterance: Utterance = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      original: text,
      translated,
      timestamp: new Date(),
      startTime: accurateStartTime,
    }
    
    // 다국어 감지 모드에서 감지된 언어 로깅
    if (sourceLang === "auto" && detectedLang) {
      console.log(`[다국어 감지] ${LANGUAGES[detectedLang] || detectedLang}: "${text.slice(0, 30)}..."`)
    }
    
    setUtterances(prev => [...prev, newUtterance])
  }, [sourceLang, targetLang, translateText, sessionStartTime, formatTime])

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
      
      // 빠른 요약 모드 시작
      if (quickSummaryMode) {
        setIsQuickSummaryRunning(true)
        console.log("[빠른 요약] 모드 시작 - 영상 끝까지 자동 추출")
      }
      
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
      // Note: detect_language는 Nova-2에서 지원되지만 multi 모드와 함께 사용
      // auto 모드에서는 영어 기본으로 시작하고, 응답의 detected_language 활용
      const wsUrl = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&model=nova-2&language=${deepgramLang}&punctuate=true&interim_results=true`
      
      const ws = new WebSocket(wsUrl, ["token", apiKey])

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
            // 다국어 자동 감지: 감지된 언어 추출
            const detectedLanguage = data.channel?.detected_language || 
                                     data.channel?.alternatives?.[0]?.languages?.[0] ||
                                     (sourceLang === "auto" ? "en" : sourceLang)
            
            if (data.is_final && transcript?.trim()) {
              setCurrentTranscript("")
              // 감지된 언어 정보와 함께 처리
              await processUtterance(transcript.trim(), detectedLanguage)
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

  // 창 닫기 플래그
  const [shouldCloseWindow, setShouldCloseWindow] = useState(false)
  
  // 캡처 중지 (기본 리소스 정리만)
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
  
  // 작업 종료 + 창 닫기 요청
  const stopAndClose = useCallback(() => {
    stopCapture()
    setShouldCloseWindow(true)
  }, [stopCapture])

  // 로컬 스토리지에 자동 저장
  const autoSaveToStorage = useCallback(() => {
    if (!videoId || utterances.length === 0) return
    
    try {
      // 마지막 텍스트 시간 계산
      const lastTextTime = utterances.length > 0 
        ? Math.max(...utterances.map(u => u.startTime || 0))
        : 0
      
      // 현재 영상 길이 가져오기
      const currentDuration = playerRef.current 
        ? playerRef.current.getDuration() * 1000 
        : videoDuration
      
      const sessionData: SavedSession = {
        videoId,
        sourceLang,
        targetLang,
        utterances,
        savedAt: new Date().toISOString(),
        summary: summary || undefined,
        isReorganized: isReorganized,  // AI 재정리 여부 저장
        videoDuration: currentDuration,  // 영상 총 시간
        lastTextTime: lastTextTime,      // 마지막 텍스트 시간
      }
      
      localStorage.setItem(getStorageKey(), JSON.stringify(sessionData))
      setHasSavedData(true)
      
      // 저장 완료율 계산
      if (currentDuration > 0) {
        const coverage = Math.min(100, (lastTextTime / currentDuration) * 100)
        setSavedDataCoverage(coverage)
        console.log(`[저장] 자동 저장 완료: ${utterances.length}개 문장, 커버리지: ${coverage.toFixed(1)}%`, isReorganized ? "(AI 재정리)" : "")
      } else {
        console.log("[저장] 자동 저장 완료:", utterances.length, "개 문장", isReorganized ? "(AI 재정리)" : "")
      }
    } catch (err) {
      console.error("[저장] 자동 저장 실패:", err)
    }
  }, [videoId, sourceLang, targetLang, utterances, summary, isReorganized, videoDuration])

  // DB에서 통역 데이터 불러오기 (자기 데이터 우선, 없으면 공유 데이터)
  const loadFromDatabase = async (): Promise<SavedSession | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      let session: any = null
      let isSharedData = false

      // 1. 먼저 자기 데이터 조회 (로그인한 경우)
      if (user) {
        const { data: mySession } = await supabase
          .from("translation_sessions")
          .select("id, youtube_title, user_id")
          .eq("user_id", user.id)
          .eq("youtube_video_id", videoId)
          .eq("source_language", sourceLang === "auto" ? "en" : sourceLang)
          .contains("target_languages", [targetLang])
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
        
        if (mySession) {
          session = mySession
        }
      }

      // 2. 자기 데이터가 없으면 AI 재정리본 우선 검색 (같은 언어)
      if (!session) {
        // 먼저 AI 재정리본 검색 (제목에 [AI 재정리] 포함)
        const { data: reorgSession } = await supabase
          .from("translation_sessions")
          .select("id, youtube_title, user_id, total_utterances, source_language, target_languages, title")
          .eq("youtube_video_id", videoId)
          .eq("source_language", sourceLang === "auto" ? "en" : sourceLang)
          .contains("target_languages", [targetLang])
          .eq("status", "completed")
          .ilike("title", "%[AI 재정리]%")
          .order("total_utterances", { ascending: false })
          .limit(1)
          .single()
        
        if (reorgSession) {
          session = reorgSession
          isSharedData = true
          console.log("[DB 불러오기] AI 재정리본 발견 (비용 절감)")
        } else {
          // AI 재정리본이 없으면 일반 공유 데이터 검색
          const { data: sharedSession } = await supabase
            .from("translation_sessions")
            .select("id, youtube_title, user_id, total_utterances, source_language, target_languages")
            .eq("youtube_video_id", videoId)
            .eq("source_language", sourceLang === "auto" ? "en" : sourceLang)
            .contains("target_languages", [targetLang])
            .eq("status", "completed")
            .order("total_utterances", { ascending: false })
            .limit(1)
            .single()
          
          if (sharedSession) {
            session = sharedSession
            isSharedData = true
            console.log("[DB 불러오기] 공유 데이터 발견 (같은 언어)")
          }
        }
      }
      
      // 3. 같은 언어 데이터도 없으면, 원본만 있는 데이터 검색하여 새 언어로 번역
      let needsTranslation = false
      if (!session) {
        const { data: anySession } = await supabase
          .from("translation_sessions")
          .select("id, youtube_title, user_id, total_utterances, source_language, target_languages")
          .eq("youtube_video_id", videoId)
          .eq("status", "completed")
          .order("total_utterances", { ascending: false })
          .limit(1)
          .single()
        
        if (anySession) {
          session = anySession
          isSharedData = true
          needsTranslation = true
          console.log("[DB 불러오기] 다른 언어 데이터 발견, 새로 번역 필요")
        }
      }

      if (!session) return null

      // 발화 및 번역 데이터 조회
      const { data: utterancesData, error: uttError } = await supabase
        .from("utterances")
        .select(`
          id,
          original_text,
          created_at,
          translations (
            translated_text,
            target_language
          )
        `)
        .eq("session_id", session.id)
        .order("created_at", { ascending: true })

      if (uttError || !utterancesData || utterancesData.length === 0) return null

      // SavedSession 형태로 변환
      const loadedUtterances: Utterance[] = []
      
      for (let idx = 0; idx < utterancesData.length; idx++) {
        const utt: any = utterancesData[idx]
        let translatedText = utt.translations?.[0]?.translated_text || ""
        
        // 다른 언어 데이터인 경우 새로 번역
        if (needsTranslation && targetLang !== "none") {
          try {
            const sessionSourceLang = session.source_language || "en"
            translatedText = await translateText(utt.original_text, sessionSourceLang, targetLang)
          } catch (err) {
            console.error("[번역 오류]", err)
            translatedText = ""
          }
        }
        
        // created_at 시간을 기반으로 상대적인 startTime 계산
        const firstTimestamp = utterancesData[0]?.created_at ? new Date(utterancesData[0].created_at).getTime() : 0
        const currentTimestamp = new Date(utt.created_at).getTime()
        const relativeStartTime = firstTimestamp > 0 ? currentTimestamp - firstTimestamp : idx * 3000
        
        loadedUtterances.push({
          id: utt.id,
          original: utt.original_text,
          translated: translatedText,
          timestamp: new Date(utt.created_at),
          startTime: relativeStartTime,  // DB 기록 시간 기반 상대 시간
        })
      }

      console.log(`[DB 불러오기] ${isSharedData ? "공유" : "내"} 데이터:`, loadedUtterances.length, "개 문장", needsTranslation ? "(새로 번역됨)" : "")

      return {
        videoId: videoId!,
        sourceLang: session.source_language || sourceLang,
        targetLang,
        utterances: loadedUtterances,
        savedAt: new Date().toISOString(),
        isReorganized: false,
      }
    } catch (err) {
      console.error("[DB 불러오기] 실패:", err)
      return null
    }
  }

  // 저장된 데이터 불러오기 (AI 재정리본 우선, 로컬 우선, 없으면 DB)
  // 플레이어 준비 상태 ref (closure 문제 해결)
  const isPlayerReadyRef = useRef(isPlayerReady)
  useEffect(() => {
    isPlayerReadyRef.current = isPlayerReady
  }, [isPlayerReady])
  
  // isReplayMode를 ref로 관리 (closure 문제 해결)
  const isReplayModeRef = useRef(isReplayMode)
  useEffect(() => {
    isReplayModeRef.current = isReplayMode
    console.log("[ref 업데이트] isReplayMode:", isReplayMode)
  }, [isReplayMode])

  const loadSavedData = async () => {
    let data: SavedSession | null = null
    let localData: SavedSession | null = null
    
    // 1. 로컬 스토리지에서 먼저 확인
    const saved = localStorage.getItem(getStorageKey())
    if (saved) {
      try {
        localData = JSON.parse(saved)
        console.log("[불러오기] 로컬 데이터 발견, AI재정리:", localData?.isReorganized)
      } catch (err) {
        console.error("[불러오기] 로컬 파싱 실패:", err)
      }
    }
    
    // 2. 로컬 데이터가 AI 재정리본이면 우선 사용 (최종본)
    if (localData?.isReorganized) {
      data = localData
      console.log("[불러오기] AI 재정리본 사용 (최종본)")
    }
    // 3. 로컬에 일반 데이터만 있으면 DB에서 AI 재정리본 확인
    else if (localData) {
      // 로컬 데이터 사용 (startTime 정보가 있으므로 동기화 가능)
      data = localData
      console.log("[불러오기] 로컬 원본 데이터 사용")
    }
    
    // 4. 로컬에 없으면 DB에서 불러오기
    if (!data) {
      data = await loadFromDatabase()
      if (data) {
        // DB 데이터를 로컬에 캐싱
        localStorage.setItem(getStorageKey(), JSON.stringify(data))
        console.log("[불러오기] DB에서 로드 후 로컬에 캐싱")
      }
    }
    
    if (data) {
      // utterances 타입 변환 (loadSavedSession과 동일하게)
      // startTime 보정: 너무 큰 값(10000 이상)이면 이미 ms, 작으면 초 단위로 가정
      const loadedUtterances: Utterance[] = data.utterances.map((u: {
        id: string
        original: string
        translated: string
        timestamp: string | Date
        startTime: number
      }) => {
        // startTime이 10000 이상이면 이미 밀리초로 저장된 것으로 가정
        // 10000ms = 10초, 일반적으로 자막은 초 단위 0~3600 범위
        let correctedStartTime = u.startTime || 0
        if (correctedStartTime > 10000) {
          // 이미 밀리초인데 또 *1000 되었을 가능성 체크
          // 영상 길이보다 큰 경우 /1000 적용
          if (data.videoDuration && correctedStartTime > data.videoDuration * 2) {
            correctedStartTime = Math.floor(correctedStartTime / 1000)
          }
        }
        
        return {
          id: u.id,
          original: u.original,
          translated: u.translated || u.original, // translated가 없으면 original 사용
          timestamp: typeof u.timestamp === 'string' ? new Date(u.timestamp) : u.timestamp,
          startTime: correctedStartTime,
        }
      })
      
      console.log("[불러오기] 변환된 utterances:", loadedUtterances.length, "개")
      console.log("[불러오기] 첫 번째 utterance:", loadedUtterances[0])
      console.log("[불러오기] startTime 확인 (ms):", loadedUtterances.slice(0, 5).map(u => `${u.startTime}ms = ${Math.floor(u.startTime/1000)}초`))
      
      setUtterances(loadedUtterances)
      
      // 요약 로드
      console.log("[불러오기] summary 확인:", data.summary ? "있음" : "없음", data.summary?.substring(0, 50))
      if (data.summary) {
        setSummary(data.summary)
        console.log("[불러오기] 요약 설정 완료")
      }
      // AI 재정리 여부 복원
      if (data.isReorganized) {
        setIsReorganized(true)
        console.log("[불러오기] AI 재정리본 로드됨")
      }
      // 영상 길이 복원
      if (data.videoDuration) {
        setVideoDuration(data.videoDuration)
      }
      
      setShowReplayChoice(false)
      setIsReplayMode(true)
      setCurrentSyncIndex(0)  // 첫 번째 자막부터 시작
      
      // YouTube 플레이어가 준비되면 영상 재생 시작 (동기화는 onStateChange에서 자동 처리)
      const startPlaybackWithSync = () => {
        // ref를 사용하여 최신 상태 확인 (closure 문제 해결)
        if (playerRef.current && isPlayerReadyRef.current) {
          // 영상을 처음(0초)부터 시작
          playerRef.current.seekTo(0, true)
          playerRef.current.playVideo()
          // startSyncTimer()는 onStateChange(PLAYING)에서 자동 호출됨
          console.log("[동기화] 영상 처음부터 재생 시작")
        } else {
          console.log("[동기화] 플레이어 준비 대기 중... playerRef:", !!playerRef.current, "isPlayerReady:", isPlayerReadyRef.current)
          // 플레이어가 아직 준비되지 않았으면 재시도
          setTimeout(startPlaybackWithSync, 500)
        }
      }
      
      // 약간의 딜레이 후 재생 시작
      setTimeout(startPlaybackWithSync, 800)
    } else {
      // 저장된 데이터가 없으면 모달 닫고 실시간 모드로 전환
      console.log("[불러오기] 저장된 데이터 없음 - 실시간 모드로 전환")
      setShowReplayChoice(false)
      setConnectionStatus("대기 중")
      // 자동 시작 파라미터가 있으면 실시간 통역 시작
      if (autostart || realtimeMode) {
        setTimeout(() => startCapture(), 500)
      }
    }
  }

  // 새로 통역 시작
  const startNewSession = () => {
    setShowReplayChoice(false)
    setUtterances([])
    setSummary("")
    setIsReplayMode(false)
    setIsReorganized(false)  // 새 세션이므로 초기화
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
      for (let i = 0; i < reorganized.length; i++) {
        const item = reorganized[i]
        let translated = item.text
        if (targetLang !== "none" && sourceLang !== targetLang) {
          const srcLang = sourceLang === "auto" ? "en" : sourceLang
          translated = await translateText(item.text, srcLang, targetLang)
        }
        
        // merged_from에서 첫 번째 인덱스의 startTime 사용 (동기화 유지)
        const firstMergedIdx = item.merged_from?.[0] ? item.merged_from[0] - 1 : i
        const originalStartTime = utterances[firstMergedIdx]?.startTime || 0
        
        newUtterances.push({
          id: `reorg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          original: item.text,
          translated: targetLang === "none" ? "" : translated,
          timestamp: utterances[firstMergedIdx]?.timestamp || new Date(),
          startTime: originalStartTime,  // 원본의 startTime 보존
        })
      }
      
      setUtterances(newUtterances)
      setIsReorganized(true)  // AI 재정리 완료 표시
      
      // 재정리 후 로컬 + DB 저장
      setTimeout(async () => {
        autoSaveToStorage()
        // DB에도 저장 (업데이트)
        const dbSaved = await saveToDatabase()
        if (dbSaved) {
          console.log("[AI 재정리] DB 저장 완료")
        }
      }, 500)
      
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
      
      console.log("[요약] 생성 완료:", result.summary?.substring(0, 50))
      setSummary(result.summary)
      console.log("[요약] setSummary 호출됨")
      setShowSummary(true)
      
      // 요약 후 로컬 + DB 저장
      setTimeout(async () => {
        autoSaveToStorage()
        // DB에 요약 저장
        await saveSummaryToDatabase(result.summary)
        console.log("[요약] 저장 완료")
      }, 500)
      
    } catch (err) {
      console.error("요약 생성 오류:", err)
      setError(err instanceof Error ? err.message : "요약 생성 중 오류가 발생했습니다.")
    } finally {
      setIsSummarizing(false)
    }
  }

  // 빠른 요약 완료 플래그
  const [quickSummaryCompleted, setQuickSummaryCompleted] = useState(false)
  
  // 빠른 요약 모드 완료 처리 (플래그만 설정)
  const handleQuickSummaryComplete = () => {
    if (utterances.length === 0) {
      setError("추출된 텍스트가 없습니다.")
      return
    }
    
    setIsQuickSummaryRunning(false)
    setQuickSummaryCompleted(true)
    console.log(`[빠른 요약] ${utterances.length}개 문장 추출 완료`)
  }

  // 요약을 DB에 저장
  const saveSummaryToDatabase = async (summaryText: string) => {
    if (!dbSessionId) {
      console.log("[요약 저장] 세션 ID 없음 - 먼저 세션 저장 필요")
      // 세션이 없으면 먼저 저장
      await saveToDatabase()
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !dbSessionId) return
      
      // translation_sessions 테이블에 summary 필드가 있다면 업데이트
      // 없다면 별도 테이블 사용 (여기서는 title에 요약 여부 표시)
      const { error } = await supabase
        .from("translation_sessions")
        .update({
          // summary 필드가 있다면: summary: summaryText
          // 없다면 제목에 표시
          title: youtubeTitle 
            ? `${youtubeTitle} (${LANGUAGES[sourceLang] || sourceLang} → ${LANGUAGES[targetLang] || targetLang})${isReorganized ? " [AI 재정리]" : ""} [요약완료]`
            : `YouTube 통역 - ${new Date().toLocaleString("ko-KR")}${isReorganized ? " [AI 재정리]" : ""} [요약완료]`,
        })
        .eq("id", dbSessionId)
      
      if (!error) {
        console.log("[요약 저장] DB 저장 완료")
      }
    } catch (err) {
      console.error("[요약 저장] 실패:", err)
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

      // AI 재정리 여부를 제목에 표시
      const reorgSuffix = isReorganized ? " [AI 재정리]" : ""
      const title = youtubeTitle 
        ? `${youtubeTitle} (${LANGUAGES[sourceLang] || sourceLang} → ${LANGUAGES[targetLang] || targetLang})${reorgSuffix}`
        : `YouTube 통역 - ${new Date().toLocaleString("ko-KR")}${reorgSuffix}`

      // 기존 세션 업데이트 또는 새 세션 생성
      if (dbSessionId) {
        // 기존 세션 업데이트 (AI 재정리 시 utterances도 업데이트)
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
        
        // AI 재정리 시 기존 utterances 삭제 후 새로 저장
        if (isReorganized) {
          // 기존 utterances 삭제
          await supabase
            .from("utterances")
            .delete()
            .eq("session_id", dbSessionId)
          
          // 새로운 utterances 저장
          for (const utt of utterances) {
            const { data: uttData, error: uttError } = await supabase
              .from("utterances")
              .insert({
                session_id: dbSessionId,
                original_text: utt.original,
                original_language: sourceLang === "auto" ? "en" : sourceLang,
                created_at: utt.timestamp.toISOString(),
              })
              .select()
              .single()
            
            if (!uttError && uttData && utt.translated) {
              await supabase
                .from("translations")
                .insert({
                  utterance_id: uttData.id,
                  translated_text: utt.translated,
                  target_language: targetLang,
                })
            }
          }
          console.log("[DB 저장] AI 재정리본 업데이트 완료")
        }
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

  // TTS 음성 선택
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('unilang_tts_voice') || ''
    }
    return ''
  })
  
  // Google Cloud TTS 음성 목록 (언어별)
  const voiceOptions: Record<string, { name: string; label: string; gender: string }[]> = {
    "ko": [
      { name: "ko-KR-Neural2-A", label: "여성 A (Neural)", gender: "female" },
      { name: "ko-KR-Neural2-B", label: "여성 B (Neural)", gender: "female" },
      { name: "ko-KR-Neural2-C", label: "남성 C (Neural)", gender: "male" },
      { name: "ko-KR-Wavenet-A", label: "여성 A (Wavenet)", gender: "female" },
      { name: "ko-KR-Wavenet-B", label: "여성 B (Wavenet)", gender: "female" },
      { name: "ko-KR-Wavenet-C", label: "남성 C (Wavenet)", gender: "male" },
      { name: "ko-KR-Wavenet-D", label: "남성 D (Wavenet)", gender: "male" },
    ],
    "en": [
      { name: "en-US-Neural2-A", label: "남성 A (Neural)", gender: "male" },
      { name: "en-US-Neural2-C", label: "여성 C (Neural)", gender: "female" },
      { name: "en-US-Neural2-D", label: "남성 D (Neural)", gender: "male" },
      { name: "en-US-Neural2-E", label: "여성 E (Neural)", gender: "female" },
      { name: "en-US-Neural2-F", label: "여성 F (Neural)", gender: "female" },
      { name: "en-US-Neural2-G", label: "여성 G (Neural)", gender: "female" },
      { name: "en-US-Neural2-H", label: "여성 H (Neural)", gender: "female" },
      { name: "en-US-Neural2-I", label: "남성 I (Neural)", gender: "male" },
      { name: "en-US-Neural2-J", label: "남성 J (Neural)", gender: "male" },
    ],
    "ja": [
      { name: "ja-JP-Neural2-B", label: "여성 B (Neural)", gender: "female" },
      { name: "ja-JP-Neural2-C", label: "남성 C (Neural)", gender: "male" },
      { name: "ja-JP-Neural2-D", label: "남성 D (Neural)", gender: "male" },
    ],
    "zh": [
      { name: "zh-CN-Neural2-A", label: "여성 A (Neural)", gender: "female" },
      { name: "zh-CN-Neural2-B", label: "남성 B (Neural)", gender: "male" },
      { name: "zh-CN-Neural2-C", label: "여성 C (Neural)", gender: "female" },
      { name: "zh-CN-Neural2-D", label: "남성 D (Neural)", gender: "male" },
    ],
  }
  
  // 현재 언어에 맞는 음성 목록
  const currentVoices = voiceOptions[targetLang] || voiceOptions["ko"] || []
  
  // 음성 선택 변경
  const selectVoice = (voiceName: string) => {
    setSelectedVoice(voiceName)
    localStorage.setItem('unilang_tts_voice', voiceName)
    setShowVoiceSelector(false)
  }
  
  // TTS 속도 설정 (0.5 ~ 2.0, 기본 1.3)
  const [ttsSpeed, setTtsSpeed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('unilang_tts_speed')
      return saved ? parseFloat(saved) : 1.3
    }
    return 1.3
  })
  
  // TTS 속도 변경 및 저장
  const changeTtsSpeed = (delta: number) => {
    setTtsSpeed(prev => {
      const newSpeed = Math.max(0.5, Math.min(2.0, prev + delta))
      localStorage.setItem('unilang_tts_speed', newSpeed.toString())
      return newSpeed
    })
  }
  
  // TTS 일시정지 (오디오 유지, 위치 기억)
  const pauseTTS = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      console.log(`⏸️ TTS 일시정지 (위치: ${audioRef.current.currentTime.toFixed(1)}초)`)
    }
  }
  
  // TTS 재개 (일시정지 위치에서 계속)
  const resumeTTS = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play()
      console.log(`▶️ TTS 재개 (위치: ${audioRef.current.currentTime.toFixed(1)}초)`)
      return true
    }
    return false
  }
  
  // TTS 완전 중지 (큐 비우기 + 오디오 삭제)
  const stopTTS = () => {
    // 큐 비우기
    ttsQueueRef.current = []
    isSpeakingRef.current = false
    lastSpokenIndexRef.current = -1
    
    // 현재 재생 중인 오디오 삭제
    if (audioRef.current) {
      audioRef.current.pause()
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src)
      }
      audioRef.current = null
    }
    console.log("🔇 TTS 완전 중지 및 초기화")
  }
  
  // TTS 큐에서 다음 항목 재생
  const processNextTTS = () => {
    if (ttsQueueRef.current.length === 0) {
      isSpeakingRef.current = false
      return
    }
    
    const next = ttsQueueRef.current.shift()
    if (next) {
      playTTS(next.text, next.lang)
    }
  }
  
  // Google Cloud TTS로 재생
  const playTTS = async (text: string, lang: string) => {
    isSpeakingRef.current = true
    
    // 시간 이동 시 속도 배수 적용 (1.0 = 기본, 1.5 = 빠르게)
    const speedMultiplier = seekSpeedMultiplierRef.current
    const effectiveSpeed = ttsSpeed * speedMultiplier
    
    // 속도 배수 리셋 (한 번만 적용)
    seekSpeedMultiplierRef.current = 1.0
    
    try {
      console.log(`🎤 Cloud TTS 요청: ${text.substring(0, 30)}... (속도: ${effectiveSpeed.toFixed(1)}x)`)
      
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          languageCode: lang,
          speed: effectiveSpeed,  // 시간 이동 시 빠른 속도 적용
          voiceName: selectedVoice || undefined,
        }),
      })
      
      if (!response.ok) {
        console.error("TTS API 오류:", response.status)
        processNextTTS()
        return
      }
      
      const data = await response.json()
      
      if (!data.audioContent) {
        console.error("TTS 오디오 없음")
        processNextTTS()
        return
      }
      
      // Base64 → Blob → URL
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: "audio/mp3" }
      )
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // 이전 오디오 정리
      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
      
      // 오디오 재생
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        processNextTTS()
      }
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        processNextTTS()
      }
      
      await audio.play()
      console.log(`🎤 Cloud TTS 재생 중: ${data.voice}`)
      
    } catch (err) {
      console.error("TTS 재생 오류:", err)
      processNextTTS()
    }
  }
  
  // TTS로 텍스트 읽기 (Google Cloud TTS - 분할 불필요)
  const speakText = (text: string, lang: string) => {
    if (!text.trim()) return
    
    // 이미 재생 중이면 큐에 추가
    if (isSpeakingRef.current) {
      ttsQueueRef.current.push({ text, lang })
      console.log(`🎤 TTS 큐 추가 (대기: ${ttsQueueRef.current.length}개)`)
      return
    }
    
    // 바로 재생
    playTTS(text, lang)
  }

  // 오디오 모드 토글
  const toggleAudioMode = () => {
    const newMode = audioMode === "original" ? "translated" : "original"
    setAudioMode(newMode)
    audioModeRef.current = newMode  // ref도 업데이트
    
    // YouTube 플레이어 음소거 제어 (IFrame API mute/unMute 사용)
    if (playerRef.current) {
      try {
        if (newMode === "translated") {
          // 번역 음성 모드: YouTube 음소거
          playerRef.current.mute?.()
          // 현재 자막부터 TTS 시작하도록 인덱스 리셋
          lastSpokenIndexRef.current = currentSyncIndex - 1
          console.log("🔇 YouTube 음소거 (번역 음성 모드)")
        } else {
          // 원본 음성 모드: YouTube 음소거 해제, TTS 중지
          playerRef.current.unMute?.()
          stopTTS()  // TTS 완전 중지
          console.log("🔊 YouTube 음소거 해제 (원본 음성 모드)")
        }
      } catch (err) {
        console.error("음소거 제어 실패:", err)
      }
    }
    
    console.log(`🔊 오디오 모드 변경: ${newMode}`)
  }

  // 번역 음성 모드일 때 현재 자막 읽기
  useEffect(() => {
    if (audioMode === "translated" && isReplayMode && currentSyncIndex >= 0) {
      const currentUtterance = utterances[currentSyncIndex]
      if (currentUtterance && lastSpokenIndexRef.current !== currentSyncIndex) {
        lastSpokenIndexRef.current = currentSyncIndex
        speakText(currentUtterance.translated || currentUtterance.original, targetLang)
      }
    }
  }, [audioMode, currentSyncIndex, isReplayMode, utterances, targetLang])

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

  // 전체화면 모드 자동 진입 비활성화 (브라우저 보안 정책으로 인해 사용자 상호작용 없이 불가능)
  // 사용자가 직접 "전체화면 전환" 버튼을 클릭해야 함
  const hasAutoFullscreened = useRef(false)

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

  // 창 닫기 요청 처리 (저장 + AI재정리 + 요약 후 닫기)
  useEffect(() => {
    if (shouldCloseWindow && utterances.length > 0) {
      const saveAndProcess = async () => {
        try {
          // 1. 자동 저장
          console.log("[작업 종료] 1/3 자동 저장 중...")
          autoSaveToStorage()
          await saveToDatabase()
          
          // 2. AI 재정리 (아직 안된 경우만)
          if (!isReorganized && utterances.length >= 3) {
            console.log("[작업 종료] 2/3 AI 재정리 중...")
            await reorganizeWithAI()
          }
          
          // 3. 요약 생성 (아직 없는 경우만)
          if (!summary && utterances.length >= 3) {
            console.log("[작업 종료] 3/3 요약 생성 중...")
            await generateSummary()
          }
          
          console.log("[작업 종료] 모든 처리 완료!")
        } catch (err) {
          console.error("[작업 종료] 처리 중 오류:", err)
        } finally {
          // 처리 완료 후 창 닫기
          setTimeout(() => window.close(), 500)
        }
      }
      saveAndProcess()
    } else if (shouldCloseWindow) {
      window.close()
    }
  }, [shouldCloseWindow])

  // 빠른 요약 완료 처리
  useEffect(() => {
    if (quickSummaryCompleted && utterances.length > 0) {
      const processQuickSummary = async () => {
        console.log("[빠른 요약] AI 재정리 시작...")
        
        // 1. 저장
        autoSaveToStorage()
        await saveToDatabase()
        
        // 2. AI 재정리
        if (!isReorganized) {
          await reorganizeWithAI()
        }
        
        // 3. 요약 생성
        await generateSummary()
        
        console.log("[빠른 요약] 완료!")
        setQuickSummaryCompleted(false)
      }
      processQuickSummary()
    }
  }, [quickSummaryCompleted])

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
  // - 크게보기: 현재 위치 기준 2개
  // - 작게보기: 현재 위치 기준 4개
  const getDisplayUtterances = () => {
    if (utterances.length === 0) return []
    
    const count = isLargeView ? 2 : 4
    
    if (isReplayMode && currentSyncIndex >= 0) {
      // 리플레이 모드: 현재 동기화 인덱스 기준으로 표시
      // 현재 자막이 중간에 오도록 (앞 1-2개, 현재, 뒤 1-2개)
      const startIdx = Math.max(0, currentSyncIndex - Math.floor(count / 2))
      const endIdx = Math.min(utterances.length, startIdx + count)
      return utterances.slice(startIdx, endIdx)
    } else {
      // 실시간 모드 또는 동기화 전: 최근 것들 표시
      return utterances.slice(-count)
    }
  }
  const displayUtterances = getDisplayUtterances()

  // 전체화면에서 표시할 자막 (동기화 모드면 현재 자막, 아니면 최신 자막)
  const displayedSubtitle = isReplayMode && currentSyncIndex >= 0 
    ? utterances[currentSyncIndex] 
    : (utterances.length > 0 ? utterances[utterances.length - 1] : null)

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* 전체화면 컨테이너 (YouTube + 자막 오버레이) */}
      <div 
        ref={fullscreenContainerRef}
        className={`relative ${isFullscreen ? 'bg-black flex-1' : 'flex-1 min-h-0'}`}
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
              {/* 동일 언어가 아닐 때만 원어 표시 */}
              {displayedSubtitle.original !== displayedSubtitle.translated && (
                <p className="text-white text-xl md:text-2xl text-center mb-2 drop-shadow-lg">
                  {displayedSubtitle.original}
                </p>
              )}
              {/* 번역어 (동일 언어일 때는 원본이 녹색으로 표시됨) */}
              {displayedSubtitle.translated && (
                <p className="text-green-400 text-2xl md:text-3xl font-bold text-center drop-shadow-lg">
                  {displayedSubtitle.translated}
                </p>
              )}
            </div>
            
            {/* 전체화면 종료 버튼 - 항상 표시 */}
            <div className="absolute top-4 right-4 pointer-events-auto flex items-center gap-2">
              {/* 음성 토글 버튼 - 전체화면 */}
              <button
                onClick={toggleAudioMode}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-lg"
              >
                {audioMode === "original" ? "🔊 화자음성" : "🗣️ 번역음성"}
              </button>
              
              {/* TTS 속도 조절 (전체화면, 번역 음성 모드) */}
              {audioMode === "translated" && (
                <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg px-2 py-1 shadow-lg">
                  <button
                    onClick={() => changeTtsSpeed(-0.2)}
                    className="w-7 h-7 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded"
                  >
                    -
                  </button>
                  <span className="text-white text-xs font-mono w-10 text-center">{ttsSpeed.toFixed(1)}x</span>
                  <button
                    onClick={() => changeTtsSpeed(0.2)}
                    className="w-7 h-7 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded"
                  >
                    +
                  </button>
                </div>
              )}
              
              <button
                onClick={exitFullscreen}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold shadow-lg"
              >
                ⛶ 창 모드
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
            ) : isQuickSummaryRunning ? (
              <span className="flex items-center gap-1 text-orange-400 text-xs">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                빠른 요약 진행 중... (영상 끝까지 자동 추출)
              </span>
            ) : (
              <span className="text-yellow-400 text-xs">{connectionStatus}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">
              {LANGUAGES[sourceLang] || sourceLang} → {LANGUAGES[targetLang] || targetLang}
            </span>
            
            {/* 오디오 모드 토글 버튼 - 빨간색 */}
            <button
              onClick={toggleAudioMode}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow-lg transition-colors"
              title={audioMode === "original" ? "번역 음성으로 듣기" : "원본 음성으로 듣기"}
            >
              {audioMode === "original" ? "🔊 화자음성" : "🗣️ 번역음성"}
            </button>
            
            {/* TTS 설정 버튼 (번역 음성 모드에서만 표시) */}
            {audioMode === "translated" && (
              <>
                {/* 음성 선택 드롭다운 */}
                <div className="relative">
                  <button
                    onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                    title="음성 선택"
                  >
                    🎙️ {selectedVoice ? selectedVoice.split('-').pop() : '기본'}
                  </button>
                  
                  {showVoiceSelector && (
                    <div className="absolute bottom-full left-0 mb-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto min-w-[180px]">
                      <button
                        onClick={() => selectVoice('')}
                        className={`w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-700 ${!selectedVoice ? 'bg-teal-700' : ''}`}
                      >
                        🔄 기본 (자동)
                      </button>
                      {currentVoices.map((voice, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectVoice(voice.name)}
                          className={`w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-700 ${selectedVoice === voice.name ? 'bg-teal-700' : ''}`}
                        >
                          {voice.gender === 'female' ? '👩' : '👨'} {voice.label}
                        </button>
                      ))}
                      {currentVoices.length === 0 && (
                        <p className="px-3 py-2 text-xs text-slate-400">음성 목록 없음</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* 속도 조절 */}
                <div className="flex items-center gap-1 bg-slate-700 rounded px-2 py-1">
                  <button
                    onClick={() => changeTtsSpeed(-0.2)}
                    className="w-6 h-6 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                    title="속도 감소"
                  >
                    -
                  </button>
                  <span className="text-white text-xs font-mono w-10 text-center">{ttsSpeed.toFixed(1)}x</span>
                  <button
                    onClick={() => changeTtsSpeed(0.2)}
                    className="w-6 h-6 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                    title="속도 증가"
                  >
                    +
                  </button>
                </div>
              </>
            
            )}
            
            {/* 전체화면 전환 버튼 - 빨간색으로 눈에 띄게 */}
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow-lg transition-colors"
              title="전체화면 (자막 오버레이)"
            >
              {isFullscreen ? "↙ 창 모드로 전환" : "↗ 전체화면 전환"}
            </button>
            
            {/* 자막 크게보기/작게보기 토글 */}
            <button
              onClick={() => setIsLargeView(!isLargeView)}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors"
            >
              {isLargeView ? "자막 작게보기" : "자막 크게보기"}
            </button>
            
            {/* 실시간 통역 모드에서만 시작/중단 버튼 표시 */}
            {!isReplayMode && (
              !isReady ? (
                <button
                  onClick={startCapture}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded transition-colors"
                >
                  🎧 통역 시작
                </button>
              ) : (
                <button
                  onClick={stopAndClose}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition-colors"
                >
                  ⏹ 작업 종료
                </button>
              )
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

      {/* 자막 영역 구분선 - 전체화면 아닐 때만 */}
      {!isFullscreen && (
        <div className="h-1 bg-slate-700 border-t border-slate-600" />
      )}

      {/* 자막 히스토리 영역 - 전체화면 아닐 때만 */}
      {!isFullscreen && (
      <div 
        className={`overflow-y-auto px-4 py-2 space-y-2 ${isLargeView ? 'flex flex-col justify-center' : ''}`}
        style={{ 
          height: isLargeView ? '220px' : '280px',  // 크게보기: 높이 늘림
          flexShrink: 0 
        }}
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
                      {/* 동일 언어가 아닐 때만 원본(흰색) 표시 */}
                      {utt.original !== utt.translated && (
                        <p className={`${isCurrentSync ? 'text-white' : 'text-white'} ${isLargeView ? 'text-lg leading-normal' : 'text-sm'}`}>
                          {utt.original}
                        </p>
                      )}
                      {/* 번역 (동일 언어일 때는 원본이 녹색으로 표시됨) */}
                      {utt.translated && (
                        <p className={`${utt.original !== utt.translated ? 'mt-1' : ''} ${isCurrentSync ? 'text-green-300' : 'text-green-400'} ${isLargeView ? 'text-xl font-bold leading-normal' : 'text-sm'}`}>
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

      {/* 하단 액션 바 - 전체화면 아닐 때만, 맨 아래 고정 */}
      {!isFullscreen && (
      <div className="px-4 py-3 bg-slate-800 border-t border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">
            총 {utterances.length}개 문장 
            {isReorganized && <span className="text-purple-400 ml-1">(AI 재정리)</span>}
            {hasSavedData && <span className="text-green-400 ml-1">(저장됨)</span>}
          </span>
          
          <div className="flex items-center gap-3">
            {/* 음성 토글 버튼 */}
            <button
              onClick={toggleAudioMode}
              className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              {audioMode === "original" ? "🔊 화자음성" : "🗣️ 번역음성"}
            </button>
            
            {/* 전체화면 전환 버튼 */}
            <button
              onClick={toggleFullscreen}
              className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              ↗ 전체화면
            </button>
            
            {/* 자막 크게보기 버튼 */}
            <button
              onClick={() => setIsLargeView(!isLargeView)}
              className="px-5 py-3 bg-slate-600 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              {isLargeView ? "📖 자막 작게" : "📖 자막 크게"}
            </button>
            
            {/* AI 재정리 버튼 - 완료 시 비활성화 */}
            <button
              onClick={reorganizeWithAI}
              disabled={isReorganizing || utterances.length === 0 || isReorganized}
              className={`px-5 py-3 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 ${
                isReorganized 
                  ? 'bg-purple-900 opacity-70 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50'
              }`}
            >
              {isReorganizing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  처리 중...
                </>
              ) : isReorganized ? (
                <>✅ AI 재정리 완료</>
              ) : (
                <>✨ AI 재정리</>
              )}
            </button>
            
            {/* 요약 버튼 - 완료 시 "요약본 완료" + 클릭 시 보기 */}
            <button
              onClick={() => summary ? setShowSummary(true) : generateSummary()}
              disabled={isSummarizing || utterances.length === 0}
              className={`px-5 py-3 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 ${
                summary 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50'
              }`}
            >
              {isSummarizing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  생성 중...
                </>
              ) : summary ? (
                <>✅ 요약본 보기</>
              ) : (
                <>📝 요약</>
              )}
            </button>
            
            {/* 저장 버튼 - 리플레이 모드에서는 숨김 */}
            {!isReplayMode && (
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
            )}
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
