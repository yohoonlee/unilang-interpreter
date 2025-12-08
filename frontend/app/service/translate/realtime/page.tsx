"use client"

import { useState, useRef, useEffect, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Mic, 
  MicOff, 
  Globe, 
  ArrowRight, 
  Volume2,
  VolumeX,
  Loader2,
  ArrowLeft,
  Settings,
  X,
  Save,
  History,
  Edit3,
  Check,
  List,
  Trash2,
  Calendar,
  FileText,
  Sparkles,
  Languages,
  Menu,
  Play,
  Eye,
  Copy,
  Download,
  Printer,
  Pencil,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// 지원 언어 목록 (자동감지 제거 - Web Speech API 호환성 문제)
const LANGUAGES = [
  { code: "ko", name: "한국어", flag: "🇰🇷", ttsCode: "ko-KR" },
  { code: "en", name: "영어", flag: "🇺🇸", ttsCode: "en-US" },
  { code: "ja", name: "일본어", flag: "🇯🇵", ttsCode: "ja-JP" },
  { code: "zh", name: "중국어", flag: "🇨🇳", ttsCode: "zh-CN" },
  { code: "es", name: "스페인어", flag: "🇪🇸", ttsCode: "es-ES" },
  { code: "fr", name: "프랑스어", flag: "🇫🇷", ttsCode: "fr-FR" },
  { code: "de", name: "독일어", flag: "🇩🇪", ttsCode: "de-DE" },
  { code: "vi", name: "베트남어", flag: "🇻🇳", ttsCode: "vi-VN" },
  { code: "th", name: "태국어", flag: "🇹🇭", ttsCode: "th-TH" },
  { code: "id", name: "인도네시아어", flag: "🇮🇩", ttsCode: "id-ID" },
]

// 타겟 언어 목록 (선택안함 추가)
const TARGET_LANGUAGES = [
  { code: "none", name: "선택안함 (원문만 기록)", flag: "📝", ttsCode: "" },
  ...LANGUAGES
]

interface TranscriptItem {
  id: string
  original: string
  translated: string
  sourceLanguage: string
  targetLanguage: string
  timestamp: Date
  utteranceId?: string // DB 저장 시 발화 ID
  translationId?: string // DB 저장 시 번역 ID
}

interface AudioSettings {
  autoPlayTTS: boolean
  ttsVolume: number
  ttsRate: number
  ttsGender: "female" | "male" // TTS 음성 성별
  selectedMicDevice: string
  selectedSpeakerDevice: string
  realtimeSummary: boolean // 실시간 요약 여부
  meetingAccessType: "private" | "public" // 회의 공개 설정
  allowedEmails: string[] // 허용된 이메일 목록
}

interface SessionItem {
  id: string
  title: string
  created_at: string
  source_language: string
  target_languages: string[]
  total_utterances: number
  status: string
}

// Suspense wrapper for useSearchParams
export default function MicTranslatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <MicTranslatePageContent />
    </Suspense>
  )
}

function MicTranslatePageContent() {
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.get("embedded") === "true"
  
  // body 스크롤 제어 - 이 페이지에서만 body 스크롤 비활성화
  useEffect(() => {
    const originalBodyStyle = document.body.style.overflow
    const originalHtmlStyle = document.documentElement.style.overflow
    
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      document.body.style.overflow = originalBodyStyle
      document.documentElement.style.overflow = originalHtmlStyle
    }
  }, [])
  
  const [isListening, setIsListening] = useState(false)
  const [sourceLanguage, setSourceLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("unilang_source_language") || "ko"
    }
    return "ko"
  }) // 기본값: 설정에서 저장된 언어 또는 한국어
  const [targetLanguage, setTargetLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("unilang_target_language") || "en"
    }
    return "en"
  }) // 기본값: 설정에서 저장된 언어 또는 영어
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  
  // 페이지네이션 (20개 단위 로딩)
  const [totalUtteranceCount, setTotalUtteranceCount] = useState(0)
  const [hasMoreUtterances, setHasMoreUtterances] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentLoadedSessionId, setCurrentLoadedSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // DB 저장 관련
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveToDb, setSaveToDb] = useState(true) // DB 저장 여부
  
  // 편집 관련
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [isReTranslating, setIsReTranslating] = useState(false)
  
  // 세션 목록 관련
  const [showSessionList, setShowSessionList] = useState(false)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionTitle, setEditingSessionTitle] = useState("")
  const [currentSessionTitle, setCurrentSessionTitle] = useState("")
  const [currentSessionCreatedAt, setCurrentSessionCreatedAt] = useState<Date | null>(null)
  const [isEditingCurrentTitle, setIsEditingCurrentTitle] = useState(false)
  const [editCurrentTitleText, setEditCurrentTitleText] = useState("")
  
  // 회의 진행 시간 관련
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null) // 세션 시작 시간
  const [elapsedSeconds, setElapsedSeconds] = useState(0) // 경과 시간 (초)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null) // 타이머 인터벌
  
  // 언어 자동 감지 기능 제거됨 (Web Speech API 호환성 문제)
  
  // 요약 관련
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryText, setSummaryText] = useState("")
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summarySessionId, setSummarySessionId] = useState<string | null>(null)
  const [summaryLanguage, setSummaryLanguage] = useState("ko")
  const [savedSummaries, setSavedSummaries] = useState<Record<string, string>>({}) // 언어별 저장된 요약
  
  // 커스텀 확인 모달 관련
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalMessage, setConfirmModalMessage] = useState("")
  const [confirmModalCallback, setConfirmModalCallback] = useState<(() => void) | null>(null)
  const [hasExistingSummary, setHasExistingSummary] = useState(false)
  const [previewSummary, setPreviewSummary] = useState<{sessionId: string, text: string} | null>(null) // 목록 말풍선 요약
  
  // 문장 재정리 관련
  const [isReorganizing, setIsReorganizing] = useState(false) // AI 재정리 중
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set()) // 수동 병합용 선택된 항목
  const [mergeMode, setMergeMode] = useState(false) // 수동 병합 모드
  
  // 문서 정리 관련
  const [documentTextOriginal, setDocumentTextOriginal] = useState("") // 원어 회의록
  const [documentTextTranslated, setDocumentTextTranslated] = useState("") // 번역어 회의록
  const [isDocumenting, setIsDocumenting] = useState(false) // 문서 정리 중
  const [showDocumentModal, setShowDocumentModal] = useState(false) // 문서 보기 모달
  const [documentViewTab, setDocumentViewTab] = useState<"original" | "translated">("original") // 모달 탭
  
  // 회의기록 편집 관련
  const [isEditingDocument, setIsEditingDocument] = useState(false) // 편집 모드
  const [editDocumentText, setEditDocumentText] = useState("") // 편집 중인 텍스트
  const [showDocumentInPanel, setShowDocumentInPanel] = useState(false) // 패널에서 회의기록 보기
  const [isSavingDocument, setIsSavingDocument] = useState(false) // 저장 중
  
  // 시스템 오디오 캡처 관련 (PC 소리 인식)
  const [isSystemAudioMode, setIsSystemAudioMode] = useState(false)
  const [isCapturingSystemAudio, setIsCapturingSystemAudio] = useState(false)
  const systemAudioStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const deepgramWSRef = useRef<WebSocket | null>(null)
  
  // 네트워크 상태 및 오프라인 대기열 관련
  const [isOnline, setIsOnline] = useState(true)
  const [pendingQueue, setPendingQueue] = useState<{
    sessionId: string
    originalText: string
    originalLang: string
    translatedText: string
    targetLang: string
    localId: string
    timestamp: number
  }[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)
  const pendingQueueRef = useRef(pendingQueue)
  
  const supabase = createClient()
  
  // 오디오 설정 (로컬 스토리지에서 불러오기)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => {
    const defaultSettings: AudioSettings = {
      autoPlayTTS: false,
      ttsVolume: 1,
      ttsRate: 1,
      ttsGender: "male",
      selectedMicDevice: "",
      selectedSpeakerDevice: "",
      realtimeSummary: true, // 회의록 자동작성 (기본 활성화)
      meetingAccessType: "private",
      allowedEmails: [],
    }
    
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("unilang_audio_settings")
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // 기존 설정과 기본값 병합 (새 필드 누락 방지)
          return { ...defaultSettings, ...parsed }
        } catch {
          // 파싱 실패 시 기본값 사용
        }
      }
    }
    return defaultSettings
  })

  // 오디오 설정 변경 시 자동 저장 및 ref 업데이트
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("unilang_audio_settings", JSON.stringify(audioSettings))
    }
    // stale closure 방지를 위해 ref도 업데이트
    audioSettingsRef.current = audioSettings
  }, [audioSettings])

  // TTS 재생 중 여부 (ref로 관리 - YouTube와 동일)
  const isSpeakingRef = useRef(false)
  
  // AudioContext 워밍업 완료 상태
  const audioContextWarmedUpRef = useRef(false)
  
  // 🔑 핵심: 페이지의 첫 번째 클릭에서 AudioContext 워밍업
  // (YouTube는 비디오 플레이어가 있어서 이미 활성화됨, mic 페이지는 수동으로 해야 함)
  useEffect(() => {
    const warmupAudioContext = async () => {
      if (audioContextWarmedUpRef.current) return
      
      try {
        console.log("🔄 AudioContext 워밍업 시작...")
        
        // 1. AudioContext 생성 및 활성화
        if (!ttsAudioContextRef.current || ttsAudioContextRef.current.state === "closed") {
          ttsAudioContextRef.current = new AudioContext()
        }
        
        const ctx = ttsAudioContextRef.current
        
        // 2. suspended 상태면 resume
        if (ctx.state === "suspended") {
          await ctx.resume()
        }
        
        // 3. running 상태 대기
        let attempts = 0
        while (ctx.state !== "running" && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 20))
          attempts++
        }
        
        if (ctx.state !== "running") {
          console.warn("⚠️ AudioContext가 running 상태가 되지 않음")
          return
        }
        
        // 4. 무음 버퍼를 재생해서 완전히 워밍업
        const sampleRate = ctx.sampleRate
        const silentBuffer = ctx.createBuffer(1, sampleRate * 0.1, sampleRate) // 100ms 무음
        const source = ctx.createBufferSource()
        source.buffer = silentBuffer
        source.connect(ctx.destination)
        source.start(0)
        
        // 무음 재생 완료 대기
        await new Promise<void>(resolve => {
          source.onended = () => resolve()
          // 타임아웃 (안전장치)
          setTimeout(resolve, 200)
        })
        
        audioContextWarmedUpRef.current = true
        console.log("✅ AudioContext 워밍업 완료! (state:", ctx.state, "sampleRate:", sampleRate, ")")
        
        // 이벤트 리스너 제거
        document.removeEventListener("click", warmupAudioContext)
        document.removeEventListener("touchstart", warmupAudioContext)
      } catch (err) {
        console.log("AudioContext 워밍업 대기 중...", err)
      }
    }
    
    // 클릭 또는 터치 이벤트에서 워밍업
    document.addEventListener("click", warmupAudioContext)
    document.addEventListener("touchstart", warmupAudioContext)
    
    return () => {
      document.removeEventListener("click", warmupAudioContext)
      document.removeEventListener("touchstart", warmupAudioContext)
    }
  }, [])
  
  // 세션 ID 변경 시 ref 업데이트 (비동기 문제 해결)
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])
  
  // pendingQueue ref 업데이트
  useEffect(() => {
    pendingQueueRef.current = pendingQueue
  }, [pendingQueue])
  
  // 네트워크 상태 감지 및 대기열 처리
  useEffect(() => {
    // 초기 상태 설정
    setIsOnline(navigator.onLine)
    
    // localStorage에서 대기열 복구
    const savedQueue = localStorage.getItem("unilang_pending_queue")
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPendingQueue(parsed)
          console.log(`📥 대기열 복구: ${parsed.length}개 항목`)
        }
      } catch (e) {
        console.error("대기열 복구 실패:", e)
      }
    }
    
    const handleOnline = () => {
      console.log("🌐 네트워크 연결됨")
      setIsOnline(true)
    }
    
    const handleOffline = () => {
      console.log("📴 네트워크 끊김")
      setIsOnline(false)
    }
    
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])
  
  // 대기열 변경 시 localStorage에 저장
  useEffect(() => {
    if (pendingQueue.length > 0) {
      localStorage.setItem("unilang_pending_queue", JSON.stringify(pendingQueue))
    } else {
      localStorage.removeItem("unilang_pending_queue")
    }
  }, [pendingQueue])
  
  // 온라인 복구 시 대기열 처리
  useEffect(() => {
    const processQueue = async () => {
      if (!isOnline || isProcessingQueue || pendingQueueRef.current.length === 0) return
      
      setIsProcessingQueue(true)
      console.log(`🔄 대기열 처리 시작: ${pendingQueueRef.current.length}개 항목`)
      
      const queue = [...pendingQueueRef.current]
      const failedItems: typeof queue = []
      
      for (const item of queue) {
        try {
          // 발화 저장
          const { data: utterance, error: utteranceError } = await supabase
            .from("utterances")
            .insert({
              session_id: item.sessionId,
              user_id: userId,
              speaker_id: userId,
              original_text: item.originalText,
              original_language: item.originalLang,
            })
            .select()
            .single()
          
          if (utteranceError) {
            console.error("대기열 발화 저장 실패:", utteranceError)
            failedItems.push(item)
            continue
          }
          
          // 번역 저장
          const { error: translationError } = await supabase
            .from("translations")
            .insert({
              utterance_id: utterance.id,
              translated_text: item.translatedText,
              target_language: item.targetLang,
              translation_provider: "google"
            })
          
          if (translationError) {
            console.error("대기열 번역 저장 실패:", translationError)
            // 발화는 저장됐으므로 실패 목록에 추가하지 않음
          }
          
          console.log(`✅ 대기열 항목 저장 완료: ${item.localId}`)
          
          // 성공한 항목 제거 (하나씩 처리)
          setPendingQueue(prev => prev.filter(p => p.localId !== item.localId))
          
        } catch (err) {
          console.error("대기열 처리 오류:", err)
          failedItems.push(item)
        }
      }
      
      // 실패한 항목만 남김
      if (failedItems.length > 0) {
        setPendingQueue(failedItems)
        console.log(`⚠️ 대기열 처리 완료, ${failedItems.length}개 실패`)
      } else {
        setPendingQueue([])
        console.log("✅ 대기열 모두 처리 완료!")
      }
      
      setIsProcessingQueue(false)
    }
    
    if (isOnline && pendingQueue.length > 0 && !isProcessingQueue && userId) {
      processQueue()
    }
  }, [isOnline, pendingQueue.length, userId, isProcessingQueue, supabase])
  
  // 사용 가능한 오디오 장치
  const [audioDevices, setAudioDevices] = useState<{
    microphones: MediaDeviceInfo[]
    speakers: MediaDeviceInfo[]
  }>({ microphones: [], speakers: [] })
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptContainerRef = useRef<HTMLDivElement>(null)
  const isListeningRef = useRef(false) // stale closure 방지용
  const audioSettingsRef = useRef(audioSettings) // stale closure 방지용
  const lastProcessedTextRef = useRef<string>("") // 중복 처리 방지용
  const processingRef = useRef<boolean>(false) // 처리 중 플래그
  const sessionIdRef = useRef<string | null>(null) // 세션 ID ref (비동기 문제 해결용)
  
  // 문장 버퍼링 관련 ref (맥락 통역 개선)
  const sentenceBufferRef = useRef<string>("") // 문장 버퍼
  const sentenceTimestampRef = useRef<Date | null>(null) // 문장 시작 시간 (STT 결과가 처음 들어온 시점)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null) // 침묵 타이머
  const SILENCE_THRESHOLD = 1500 // 1.5초 침묵 후 번역 실행

  // 사용자 정보 가져오기
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [supabase])

  // userId가 설정되면 세션 목록 로드
  useEffect(() => {
    if (userId) {
      loadSessions()
    }
  }, [userId])

  // Supabase 실시간 구독 (translation_sessions 테이블 변경 감지)
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log("⚠️ 실시간 구독: 로그인 필요")
        return
      }
      
      console.log("📡 [Mic] 실시간 구독 설정 중...")
      
      channel = supabase
        .channel(`translation_sessions_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'translation_sessions',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📡 [Mic] 실시간: INSERT 감지', payload)
            loadSessions()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'translation_sessions',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📡 [Mic] 실시간: DELETE 감지', payload)
            loadSessions()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'translation_sessions',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📡 [Mic] 실시간: UPDATE 감지', payload)
            loadSessions()
          }
        )
        .subscribe((status) => {
          console.log('📡 [Mic] 실시간 구독 상태:', status)
        })
    }
    
    setupRealtimeSubscription()
    
    return () => {
      if (channel) {
        console.log("📡 [Mic] 실시간 구독 해제")
        supabase.removeChannel(channel)
      }
    }
  }, [])

  // 오디오 장치 목록 가져오기
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        // 권한 요청
        await navigator.mediaDevices.getUserMedia({ audio: true })
        
        const devices = await navigator.mediaDevices.enumerateDevices()
        const microphones = devices.filter(device => device.kind === "audioinput")
        const speakers = devices.filter(device => device.kind === "audiooutput")
        
        setAudioDevices({ microphones, speakers })
        
        // 기본 장치 설정
        if (microphones.length > 0 && !audioSettings.selectedMicDevice) {
          setAudioSettings(prev => ({ ...prev, selectedMicDevice: microphones[0].deviceId }))
        }
        if (speakers.length > 0 && !audioSettings.selectedSpeakerDevice) {
          setAudioSettings(prev => ({ ...prev, selectedSpeakerDevice: speakers[0].deviceId }))
        }
      } catch (err) {
        console.error("오디오 장치 목록 가져오기 실패:", err)
      }
    }
    
    getAudioDevices()
  }, [])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      isListeningRef.current = false
      
      // 타이머 정리
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      
      // 버퍼 및 시간 정리
      sentenceBufferRef.current = ""
      sentenceTimestampRef.current = null
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // 무시
        }
      }
    }
  }, [])

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
    return langMap[code] || "ko-KR" // 기본값: 한국어
  }

  // TTS 언어 코드 가져오기
  const getTTSLanguageCode = (code: string) => {
    const lang = LANGUAGES.find(l => l.code === code)
    return lang?.ttsCode || "en-US"
  }

  // TTS AudioContext 참조 (브라우저 자동재생 정책 우회)
  const ttsAudioContextRef = useRef<AudioContext | null>(null)
  const ttsSourceNodeRef = useRef<AudioBufferSourceNode | null>(null)

  // AudioContext 가져오기 또는 생성
  const getAudioContext = (): AudioContext => {
    if (!ttsAudioContextRef.current || ttsAudioContextRef.current.state === "closed") {
      ttsAudioContextRef.current = new AudioContext()
    }
    return ttsAudioContextRef.current
  }

  // AudioContext가 완전히 활성화될 때까지 대기
  const waitForAudioContextRunning = async (ctx: AudioContext, maxWait = 1000): Promise<boolean> => {
    if (ctx.state === "running") return true
    
    const startTime = Date.now()
    while (ctx.state !== "running" && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    return ctx.state === "running"
  }

  // AudioContext 워밍업 함수 (첫 재생 전 호출)
  const ensureAudioContextWarmedUp = async (): Promise<AudioContext> => {
    const ctx = getAudioContext()
    
    // 이미 워밍업 완료되었으면 바로 반환
    if (audioContextWarmedUpRef.current && ctx.state === "running") {
      return ctx
    }
    
    console.log("🔄 AudioContext 즉시 워밍업 시작...")
    
    // suspended 상태면 resume
    if (ctx.state === "suspended") {
      await ctx.resume()
    }
    
    // running 상태 대기
    let attempts = 0
    while (ctx.state !== "running" && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 10))
      attempts++
    }
    
    // 워밍업이 안 되어 있으면 무음 재생
    if (!audioContextWarmedUpRef.current) {
      const silentBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
      const source = ctx.createBufferSource()
      source.buffer = silentBuffer
      source.connect(ctx.destination)
      source.start(0)
      
      await new Promise<void>(resolve => {
        source.onended = () => resolve()
        setTimeout(resolve, 100)
      })
      
      audioContextWarmedUpRef.current = true
      console.log("✅ AudioContext 즉시 워밍업 완료!")
    }
    
    return ctx
  }

  // Google Cloud TTS로 재생 (AudioContext 사용 - 브라우저 정책 우회)
  const playTTS = async (text: string, lang: string) => {
    isSpeakingRef.current = true
    setIsSpeaking(true)
    
    try {
      console.log(`🎤 Cloud TTS 요청: ${text.substring(0, 30)}...`)
      
      // 🔑 핵심: AudioContext 워밍업 보장 (첫 번째 재생에서 중요)
      const audioContext = await ensureAudioContextWarmedUp()
      console.log("✅ AudioContext 준비 완료 (state:", audioContext.state, ")")
      
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          languageCode: lang,
          speed: audioSettings.ttsRate || 1.0,
          gender: audioSettings.ttsGender || "male",
        }),
      })
      
      if (!response.ok) {
        console.error("TTS API 오류:", response.status)
        isSpeakingRef.current = false
        setIsSpeaking(false)
        return
      }
      
      const data = await response.json()
      
      if (!data.audioContent) {
        console.error("TTS 오디오 없음")
        isSpeakingRef.current = false
        setIsSpeaking(false)
        return
      }
      
      // Base64 → ArrayBuffer
      const binaryString = atob(data.audioContent)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // 이전 재생 중지
      if (ttsSourceNodeRef.current) {
        try {
          ttsSourceNodeRef.current.stop()
        } catch (e) {
          // 이미 중지됨
        }
      }
      
      // AudioContext로 디코딩 및 재생
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0))
      
      // 🔑 무음 버퍼 추가 (앞부분 잘림 방지)
      const silenceDuration = 0.05 // 50ms 무음
      const sampleRate = audioContext.sampleRate
      const silenceSamples = Math.floor(silenceDuration * sampleRate)
      const totalSamples = silenceSamples + audioBuffer.length
      
      // 새 버퍼 생성 (무음 + 원본)
      const newBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        totalSamples,
        sampleRate
      )
      
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const newChannelData = newBuffer.getChannelData(channel)
        const originalData = audioBuffer.getChannelData(channel)
        // 앞부분 무음 (이미 0으로 초기화됨)
        // 원본 데이터 복사
        newChannelData.set(originalData, silenceSamples)
      }
      
      const sourceNode = audioContext.createBufferSource()
      sourceNode.buffer = newBuffer
      sourceNode.connect(audioContext.destination)
      
      sourceNode.onended = () => {
        isSpeakingRef.current = false
        setIsSpeaking(false)
        console.log("🎤 TTS 재생 완료")
      }
      
      ttsSourceNodeRef.current = sourceNode
      sourceNode.start(0)
      console.log(`🎤 Cloud TTS 재생 시작: ${data.voice}`)
      
      await audio.play()
      console.log(`🎤 Cloud TTS 재생 중: ${data.voice}`)
      
    } catch (err) {
      console.error("TTS 재생 오류:", err)
      isSpeakingRef.current = false
      setIsSpeaking(false)
    }
  }
  
  // TTS로 텍스트 읽기 (YouTube와 동일한 동기 함수)
  const speakText = (text: string, lang: string) => {
    if (!text?.trim()) return
    
    // 바로 재생 (YouTube와 동일)
    playTTS(text, lang)
  }

  // TTS 중지
  const stopSpeaking = () => {
    if (ttsSourceNodeRef.current) {
      try {
        ttsSourceNodeRef.current.stop()
      } catch (e) {
        // 이미 중지됨
      }
      ttsSourceNodeRef.current = null
    }
    isSpeakingRef.current = false
    setIsSpeaking(false)
  }

  // 세션 생성
  const createSession = async () => {
    if (!userId) return null
    
    try {
      // 사용자가 입력한 타이틀이 있으면 사용, 없으면 기본값 생성
      let titleToUse = editCurrentTitleText.trim() || currentSessionTitle.trim()
      
      if (!titleToUse) {
        // 기존 세션 개수 확인하여 제목 번호 부여
        const { count } = await supabase
          .from("translation_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("service_type", "realtime")
        
        const sessionNumber = (count || 0) + 1
        titleToUse = `통역 ${sessionNumber}`
      }
      
      const { data, error } = await supabase
        .from("translation_sessions")
        .insert({
          user_id: userId,
          title: titleToUse,
          session_type: "mic",
          service_type: "realtime", // 실시간 통역
          source_language: sourceLanguage,
          target_languages: [targetLanguage],
          status: "active"
        })
        .select()
        .single()
      
      if (error) {
        console.error("세션 생성 실패:", error)
        return null
      }
      
      setCurrentSessionTitle(titleToUse)
      setEditCurrentTitleText("")
      setIsEditingCurrentTitle(false)
      // 생성 시간 설정 (data.created_at이 없을 수 있으므로 현재 시간 사용)
      const createdAt = data.created_at ? new Date(data.created_at) : new Date()
      setCurrentSessionCreatedAt(createdAt)
      return data.id
    } catch (err) {
      console.error("세션 생성 오류:", err)
      return null
    }
  }

  // 발화 및 번역 저장 (네트워크 끊김 시 대기열에 추가)
  const saveUtterance = async (
    sessionId: string,
    originalText: string,
    originalLang: string,
    translatedText: string,
    targetLang: string,
    localId?: string // 대기열 항목의 로컬 ID (재시도 시 사용)
  ): Promise<{ utteranceId?: string; translationId?: string; queued?: boolean }> => {
    if (!userId || !saveToDb) return {}
    
    // 오프라인 상태면 즉시 대기열에 추가
    if (!navigator.onLine) {
      const queueItem = {
        sessionId,
        originalText,
        originalLang,
        translatedText,
        targetLang,
        localId: localId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      }
      setPendingQueue(prev => [...prev, queueItem])
      console.log("📴 오프라인 - 대기열에 추가:", queueItem.localId)
      return { queued: true }
    }
    
    // 재시도 로직 (최대 3회)
    const maxRetries = 3
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 발화 저장
        const { data: utterance, error: utteranceError } = await supabase
          .from("utterances")
          .insert({
            session_id: sessionId,
            user_id: userId,
            speaker_id: userId,
            original_text: originalText,
            original_language: originalLang,
          })
          .select()
          .single()
        
        if (utteranceError) {
          throw new Error(`발화 저장 실패: ${utteranceError.message}`)
        }
        
        // 번역 저장
        const { data: translation, error: translationError } = await supabase
          .from("translations")
          .insert({
            utterance_id: utterance.id,
            translated_text: translatedText,
            target_language: targetLang,
            translation_provider: "google"
          })
          .select()
          .single()
        
        if (translationError) {
          console.error("번역 저장 실패:", translationError)
          return { utteranceId: utterance.id }
        }
        
        return { utteranceId: utterance.id, translationId: translation.id }
        
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.warn(`저장 시도 ${attempt}/${maxRetries} 실패:`, lastError.message)
        
        // 마지막 시도가 아니면 잠시 대기 후 재시도
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // 지수 백오프
        }
      }
    }
    
    // 모든 재시도 실패 - 대기열에 추가
    console.error("❌ 저장 실패 (모든 재시도 소진):", lastError?.message)
    const queueItem = {
      sessionId,
      originalText,
      originalLang,
      translatedText,
      targetLang,
      localId: localId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }
    setPendingQueue(prev => [...prev, queueItem])
    console.log("📥 대기열에 추가:", queueItem.localId)
    
    return { queued: true }
  }

  // 커스텀 확인 모달 표시
  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModalMessage(message)
    setConfirmModalCallback(() => onConfirm)
    setShowConfirmModal(true)
  }

  // 발화 삭제
  const deleteTranscriptItem = async (item: TranscriptItem) => {
    showConfirm("이 발화를 삭제하시겠습니까?", async () => {
      // 로컬 상태에서 제거
      setTranscripts(prev => prev.filter(t => t.id !== item.id))
      
      // DB에서도 삭제
      if (item.utteranceId) {
        try {
          await supabase
            .from("utterances")
            .delete()
            .eq("id", item.utteranceId)
        } catch (err) {
          console.error("발화 삭제 오류:", err)
        }
      }
    })
  }

  // 발화 수정 및 재번역
  const updateUtterance = async (
    itemId: string,
    newOriginalText: string
  ) => {
    const item = transcripts.find(t => t.id === itemId)
    if (!item) return
    
    setIsReTranslating(true)
    
    try {
      // 번역 다시 실행
      let newTranslated = newOriginalText
      if (item.sourceLanguage !== item.targetLanguage) {
        newTranslated = await translateText(newOriginalText, item.sourceLanguage, item.targetLanguage)
      }
      
      // 로컬 상태 업데이트
      setTranscripts(prev => prev.map(t => 
        t.id === itemId 
          ? { ...t, original: newOriginalText, translated: newTranslated }
          : t
      ))
      
      // DB 업데이트
      if (item.utteranceId && saveToDb) {
        // 발화 업데이트
        await supabase
          .from("utterances")
          .update({ original_text: newOriginalText })
          .eq("id", item.utteranceId)
        
        // 번역 업데이트
        if (item.translationId) {
          await supabase
            .from("translations")
            .update({ translated_text: newTranslated })
            .eq("id", item.translationId)
        }
      }
      
      // 편집 모드 종료
      setEditingId(null)
      setEditText("")
      
    } catch (err) {
      console.error("수정 오류:", err)
      setError("수정 중 오류가 발생했습니다.")
    } finally {
      setIsReTranslating(false)
    }
  }

  // 세션 목록 로드
  const loadSessions = async () => {
    console.log("📋 loadSessions 호출, userId:", userId)
    if (!userId) {
      console.log("⚠️ userId가 없어서 세션 로드 스킵")
      return
    }
    
    setIsLoadingSessions(true)
    try {
      const { data, error } = await supabase
        .from("translation_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("session_type", "mic")
        .eq("service_type", "realtime") // 실시간 통역만 조회
        .order("created_at", { ascending: false })
      
      console.log("📋 세션 목록 결과:", { data, error })
      
      if (error) {
        console.error("세션 목록 로드 실패:", error)
        return
      }
      
      setSessions(data || [])
    } catch (err) {
      console.error("세션 목록 오류:", err)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  // 세션 제목 업데이트
  const updateSessionTitle = async (sessionIdToUpdate: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("translation_sessions")
        .update({ title: newTitle })
        .eq("id", sessionIdToUpdate)
      
      if (error) {
        console.error("세션 제목 업데이트 실패:", error)
        return
      }
      
      // 로컬 상태 업데이트
      setSessions(prev => prev.map(s => 
        s.id === sessionIdToUpdate ? { ...s, title: newTitle } : s
      ))
      
      // 현재 세션이면 제목 업데이트
      if (sessionId === sessionIdToUpdate) {
        setCurrentSessionTitle(newTitle)
      }
      
      setEditingSessionId(null)
      setEditingSessionTitle("")
    } catch (err) {
      console.error("세션 제목 수정 오류:", err)
    }
  }

  // 세션 삭제
  const deleteSession = async (sessionIdToDelete: string) => {
    showConfirm("이 통역 기록을 삭제하시겠습니까?", async () => {
      try {
        const { error } = await supabase
          .from("translation_sessions")
          .delete()
          .eq("id", sessionIdToDelete)
        
        if (error) {
          console.error("세션 삭제 실패:", error)
          return
        }
        
        // 로컬 상태에서 제거
        setSessions(prev => prev.filter(s => s.id !== sessionIdToDelete))
        
        // 현재 세션이 삭제되면 세션 초기화
        if (sessionId === sessionIdToDelete) {
          setSessionId(null)
          setTranscripts([])
          setCurrentSessionTitle("")
        }
      } catch (err) {
        console.error("세션 삭제 오류:", err)
      }
    })
  }

  // 세션 불러오기 (과거 기록 보기)
  const UTTERANCES_PER_PAGE = 20
  
  const loadSessionData = async (sessionToLoad: SessionItem) => {
    setIsLoadingSessions(true)
    try {
      console.log("세션 로드 시작:", sessionToLoad.id)
      
      // 먼저 전체 개수 확인
      const { count, error: countError } = await supabase
        .from("utterances")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionToLoad.id)
      
      if (countError) {
        console.error("발화 개수 조회 실패:", countError)
      }
      
      const totalCount = count || 0
      setTotalUtteranceCount(totalCount)
      setHasMoreUtterances(totalCount > UTTERANCES_PER_PAGE)
      setCurrentLoadedSessionId(sessionToLoad.id)
      
      console.log(`전체 발화 수: ${totalCount}, 처음 로드: ${UTTERANCES_PER_PAGE}개`)
      
      // 발화 데이터 로드 (최신 20개, 시간 역순)
      const { data: utterances, error: utteranceError } = await supabase
        .from("utterances")
        .select("id, original_text, original_language, created_at")
        .eq("session_id", sessionToLoad.id)
        .order("created_at", { ascending: false })
        .range(0, UTTERANCES_PER_PAGE - 1)
      
      if (utteranceError) {
        console.error("발화 로드 실패:", utteranceError)
        setError("발화 데이터를 불러오는데 실패했습니다.")
        return
      }
      
      console.log("불러온 발화 수:", utterances?.length || 0)
      
      if (!utterances || utterances.length === 0) {
        setTranscripts([])
        setSessionId(sessionToLoad.id)
        setCurrentSessionTitle(sessionToLoad.title)
        const createdAt = sessionToLoad.created_at ? new Date(sessionToLoad.created_at) : null
        setCurrentSessionCreatedAt(createdAt && !isNaN(createdAt.getTime()) ? createdAt : null)
        setSourceLanguage(sessionToLoad.source_language)
        if (sessionToLoad.target_languages.length > 0) {
          setTargetLanguage(sessionToLoad.target_languages[0])
        }
        setShowSessionList(false)
        return
      }
      
      // 번역 데이터 별도 로드
      const utteranceIds = utterances.map((u: { id: string }) => u.id)
      const { data: translations, error: translationError } = await supabase
        .from("translations")
        .select("id, utterance_id, translated_text, target_language")
        .in("utterance_id", utteranceIds)
      
      if (translationError) {
        console.error("번역 로드 실패:", translationError)
      }
      
      console.log("불러온 번역 수:", translations?.length || 0)
      
      // 디버깅: 데이터 로드 결과 확인
      if (utterances.length > 0) {
        console.log("첫 번째 발화:", utterances[0])
      }
      
      // 번역을 utterance_id로 매핑
      const translationMap = new Map<string, { id: string; translated_text: string; target_language: string }>()
      if (translations) {
        translations.forEach((t: { id: string; utterance_id: string; translated_text: string; target_language: string }) => {
          translationMap.set(t.utterance_id, t)
        })
      }
      
      // TranscriptItem 형식으로 변환
      const loadedTranscripts: TranscriptItem[] = utterances.map((u: {
        id: string
        original_text: string
        original_language: string
        created_at: string
      }) => {
        const translation = translationMap.get(u.id)
        return {
          id: u.id,
          original: u.original_text,
          translated: translation?.translated_text || "",
          sourceLanguage: u.original_language,
          targetLanguage: translation?.target_language || sessionToLoad.target_languages[0] || "ko",
          timestamp: new Date(u.created_at),
          utteranceId: u.id,
          translationId: translation?.id,
        }
      })
      
      console.log("변환된 transcripts:", loadedTranscripts.length, "개")
      
      setTranscripts(loadedTranscripts)
      setSessionId(sessionToLoad.id)
      setCurrentSessionTitle(sessionToLoad.title)
      // 날짜 파싱 오류 처리
      const createdAt = sessionToLoad.created_at ? new Date(sessionToLoad.created_at) : null
      setCurrentSessionCreatedAt(createdAt && !isNaN(createdAt.getTime()) ? createdAt : null)
      setSourceLanguage(sessionToLoad.source_language || "ko")
      if (sessionToLoad.target_languages && sessionToLoad.target_languages.length > 0) {
        setTargetLanguage(sessionToLoad.target_languages[0])
      }
      setShowSessionList(false)
      
      // 중요: 회의록 보기 모드 리셋 (STT/번역 결과 표시)
      setShowDocumentInPanel(false)
      setIsEditingDocument(false)
      
      // 세션의 회의록 데이터 로드
      const { data: sessionDoc } = await supabase
        .from("translation_sessions")
        .select("document_original_md, document_translated_md")
        .eq("id", sessionToLoad.id)
        .single()
      
      if (sessionDoc) {
        setDocumentTextOriginal(sessionDoc.document_original_md || "")
        setDocumentTextTranslated(sessionDoc.document_translated_md || "")
      } else {
        setDocumentTextOriginal("")
        setDocumentTextTranslated("")
      }
      
      // 디버깅: 데이터 로드 결과 표시
      if (loadedTranscripts.length === 0) {
        setError(`세션 "${sessionToLoad.title}"에 저장된 발화가 없습니다.`)
      }
      
    } catch (err) {
      console.error("세션 데이터 로드 오류:", err)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  // 더 많은 발화 로드 (20개씩 추가)
  const loadMoreUtterances = async () => {
    if (!currentLoadedSessionId || isLoadingMore || !hasMoreUtterances) return
    
    setIsLoadingMore(true)
    try {
      const currentOffset = transcripts.length
      console.log(`추가 로드: offset=${currentOffset}, limit=${UTTERANCES_PER_PAGE}`)
      
      // 다음 20개 발화 로드
      const { data: utterances, error: utteranceError } = await supabase
        .from("utterances")
        .select("id, original_text, original_language, created_at")
        .eq("session_id", currentLoadedSessionId)
        .order("created_at", { ascending: false })
        .range(currentOffset, currentOffset + UTTERANCES_PER_PAGE - 1)
      
      if (utteranceError) {
        console.error("추가 발화 로드 실패:", utteranceError)
        return
      }
      
      if (!utterances || utterances.length === 0) {
        setHasMoreUtterances(false)
        return
      }
      
      // 번역 데이터 로드
      const utteranceIds = utterances.map((u: { id: string }) => u.id)
      const { data: translations } = await supabase
        .from("translations")
        .select("id, utterance_id, translated_text, target_language")
        .in("utterance_id", utteranceIds)
      
      // 번역을 utterance_id로 매핑
      const translationMap = new Map<string, { id: string; translated_text: string; target_language: string }>()
      if (translations) {
        translations.forEach((t: { id: string; utterance_id: string; translated_text: string; target_language: string }) => {
          translationMap.set(t.utterance_id, t)
        })
      }
      
      // TranscriptItem 형식으로 변환
      const newTranscripts: TranscriptItem[] = utterances.map((u: {
        id: string
        original_text: string
        original_language: string
        created_at: string
      }) => {
        const translation = translationMap.get(u.id)
        return {
          id: u.id,
          original: u.original_text,
          translated: translation?.translated_text || "",
          sourceLanguage: u.original_language,
          targetLanguage: translation?.target_language || targetLanguage || "ko",
          timestamp: new Date(u.created_at),
          utteranceId: u.id,
          translationId: translation?.id,
        }
      })
      
      console.log(`추가 로드 완료: ${newTranscripts.length}개`)
      
      // 기존 transcripts에 추가
      setTranscripts(prev => [...prev, ...newTranscripts])
      
      // 더 불러올 데이터 있는지 확인
      const newTotal = currentOffset + utterances.length
      setHasMoreUtterances(newTotal < totalUtteranceCount)
      
    } catch (err) {
      console.error("추가 발화 로드 오류:", err)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // 새 세션 시작
  const startNewSession = () => {
    setSessionId(null)
    setTranscripts([])
    setCurrentSessionTitle("")
    setCurrentSessionCreatedAt(null)
    setShowSessionList(false)
  }

  // 현재 세션 제목 업데이트
  const updateCurrentSessionTitle = async () => {
    if (!sessionId || !editCurrentTitleText.trim()) return
    
    try {
      const { error } = await supabase
        .from("translation_sessions")
        .update({ title: editCurrentTitleText })
        .eq("id", sessionId)
      
      if (error) {
        console.error("세션 제목 업데이트 실패:", error)
        return
      }
      
      setCurrentSessionTitle(editCurrentTitleText)
      setIsEditingCurrentTitle(false)
      setEditCurrentTitleText("")
    } catch (err) {
      console.error("세션 제목 수정 오류:", err)
    }
  }

  // 세션 종료 (마이크 중지 시)
  const endSession = async () => {
    if (!sessionId) return
    
    try {
      await supabase
        .from("translation_sessions")
        .update({
          status: "paused", // 일시정지 상태
          total_utterances: transcripts.length
        })
        .eq("id", sessionId)
    } catch (err) {
      console.error("세션 일시정지 오류:", err)
    }
  }

  // 회의 최종 종료 (저장 + 자동화: AI재처리 → 문서정리 → 요약)
  const finalizeSession = async () => {
    if (!sessionId) {
      setError("종료할 세션이 없습니다.")
      return
    }
    
    // 마이크가 켜져있으면 먼저 중지
    if (isListening) {
      isListeningRef.current = false
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
      setCurrentTranscript("")
    }
    
    // 시스템 오디오 캡처 중이면 중지
    if (isCapturingSystemAudio) {
      stopSystemAudioCapture()
    }
    
    // 타이머 중지
    stopSessionTimer()
    const finalElapsedSeconds = elapsedSeconds
    
    try {
      // 세션 상태를 완료로 변경 (경과 시간 포함)
      await supabase
        .from("translation_sessions")
        .update({
          ended_at: new Date().toISOString(),
          status: "completed",
          total_utterances: transcripts.length,
          duration_seconds: finalElapsedSeconds // 총 소요 시간 저장
        })
        .eq("id", sessionId)
      
      // 내용이 있고 회의록 자동작성이 활성화되어 있으면 전체 자동화 실행
      if (transcripts.length > 0 && audioSettings.realtimeSummary) {
        // 🔄 Step 1: AI 재정리 (끊어진 문장 합치기)
        setError("🔄 AI 재정리 중...")
        await reorganizeSentences()
        
        // 🔄 Step 2: 문서 정리 (상세 회의록 생성)
        setError("📝 회의록 작성 중...")
        await generateAndSaveDocument()
        
        // 🔄 Step 3: 요약 생성
        setError("✨ 요약본 생성 중...")
        await summarizeCurrentSession()
        
        setError(null)
      } else if (transcripts.length > 0) {
        // 자동작성 비활성화 시 요약만 생성
        await summarizeCurrentSession()
      } else {
        // 내용이 없으면 세션 목록으로
        setSessionId(null)
        setCurrentSessionTitle("")
        setCurrentSessionCreatedAt(null)
        setSessionStartTime(null)
        setElapsedSeconds(0)
        setShowSessionList(true)
        loadSessions()
      }
      
    } catch (err) {
      console.error("세션 종료 오류:", err)
      setError("회의 종료 중 오류가 발생했습니다.")
    }
  }

  // 회의록 자동 생성 및 저장
  const generateAndSaveDocument = async () => {
    if (transcripts.length === 0) return
    
    setIsDocumenting(true)
    setDocumentTextOriginal("")
    setDocumentTextTranslated("")
    
    try {
      const srcLangName = getLanguageInfo(sourceLanguage).name
      const tgtLangName = getLanguageInfo(targetLanguage).name
      
      // 원어 텍스트만 추출
      const originalTexts = transcripts.map(t => t.original).join("\n")
      
      // 번역 텍스트만 추출
      const translatedTexts = transcripts
        .filter(t => t.translated && t.targetLanguage !== "none")
        .map(t => t.translated)
        .join("\n")
      
      // 원어와 번역어가 같거나 번역이 없으면 원어만 정리
      if (sourceLanguage === targetLanguage || targetLanguage === "none" || !translatedTexts) {
        const response = await fetch("/api/gemini/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalTexts,
            targetLanguage: sourceLanguage,
            customPrompt: `${getDocumentPrompt(sourceLanguage, srcLangName)}\n\n원본 텍스트:\n${originalTexts}`,
          }),
        })
        
        const result = await response.json()
        if (!result.success) throw new Error(result.error || "문서 정리 실패")
        
        setDocumentTextOriginal(result.summary)
        setDocumentTextTranslated("")
        
        // DB 저장
        await saveDocumentToDb(result.summary, "")
      } else {
        // 원어와 번역어 각각 정리 (병렬 처리)
        const [originalResponse, translatedResponse] = await Promise.all([
          fetch("/api/gemini/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: originalTexts,
              targetLanguage: sourceLanguage,
              customPrompt: `${getDocumentPrompt(sourceLanguage, srcLangName)}\n\n원본 텍스트:\n${originalTexts}`,
            }),
          }),
          fetch("/api/gemini/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: translatedTexts,
              targetLanguage: targetLanguage,
              customPrompt: `${getDocumentPrompt(targetLanguage, tgtLangName)}\n\n원본 텍스트:\n${translatedTexts}`,
            }),
          }),
        ])
        
        const [originalResult, translatedResult] = await Promise.all([
          originalResponse.json(),
          translatedResponse.json(),
        ])
        
        if (!originalResult.success) throw new Error(originalResult.error || "원어 문서 정리 실패")
        if (!translatedResult.success) throw new Error(translatedResult.error || "번역어 문서 정리 실패")
        
        setDocumentTextOriginal(originalResult.summary)
        setDocumentTextTranslated(translatedResult.summary)
        
        // DB 저장
        await saveDocumentToDb(originalResult.summary, translatedResult.summary)
      }
      
      // 회의록 보기 모드로 전환
      setDocumentViewTab("original")
      setShowDocumentInPanel(true)
      
    } catch (err) {
      console.error("회의록 자동 생성 오류:", err)
      setError(err instanceof Error ? err.message : "회의록 자동 생성에 실패했습니다.")
      // 실패해도 요약은 시도
      await summarizeCurrentSession()
    } finally {
      setIsDocumenting(false)
    }
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

  // 언어 감지 API 호출
  const detectLanguage = async (text: string): Promise<string> => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    
    if (!apiKey) {
      throw new Error("Google API 키가 설정되지 않았습니다.")
    }

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || "언어 감지 실패")
    }

    const data = await response.json()
    return data.data.detections[0][0].language
  }

  // ==================== 문장 재정리 기능 ====================

  // AI 자동 재정리 - 끊어진 문장을 맥락에 맞게 합침
  const reorganizeSentences = async () => {
    if (transcripts.length === 0) {
      setError("재정리할 문장이 없습니다.")
      return
    }

    setIsReorganizing(true)
    setError(null)

    try {
      // 발화 데이터 준비
      const utterances = transcripts.map((t, i) => ({
        id: i + 1,
        text: t.original,
        translated: t.translated,
      }))

      // 서버 API 라우트 호출
      const response = await fetch("/api/gemini/reorganize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utterances,
          targetLanguage,
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

      // 새로운 transcript 목록 생성 및 번역
      const newTranscripts: TranscriptItem[] = []
      
      for (const item of reorganized) {
        // 번역 실행
        let translated = item.text
        if (targetLanguage !== "none" && sourceLanguage !== targetLanguage) {
          translated = await translateText(item.text, sourceLanguage, targetLanguage)
        }

        const newId = `reorg_${Date.now()}_${Math.random().toString(36).slice(2)}`
        newTranscripts.push({
          id: newId,
          original: item.text,
          translated: targetLanguage === "none" ? "" : translated,
          sourceLanguage,
          targetLanguage,
          timestamp: new Date(),
        })
      }

      // 기존 DB 데이터 삭제 (세션이 있는 경우)
      if (sessionId && saveToDb) {
        await supabase
          .from("utterances")
          .delete()
          .eq("session_id", sessionId)
      }

      // 새 데이터 저장
      for (const item of newTranscripts) {
        if (sessionId && saveToDb) {
          const { utteranceId, translationId } = await saveUtterance(
            sessionId,
            item.original,
            sourceLanguage,
            item.translated,
            targetLanguage
          )
          item.utteranceId = utteranceId
          item.translationId = translationId
        }
      }

      setTranscripts(newTranscripts)
      setError(null)
      
      // TTS 자동 재생 (선택적)
      if (audioSettingsRef.current.autoPlayTTS && newTranscripts.length > 0) {
        const lastItem = newTranscripts[newTranscripts.length - 1]
        if (lastItem.translated) {
          speakText(lastItem.translated, targetLanguage)
        }
      }

    } catch (err) {
      console.error("문장 재정리 오류:", err)
      setError(err instanceof Error ? err.message : "문장 재정리 중 오류가 발생했습니다.")
    } finally {
      setIsReorganizing(false)
    }
  }

  // 수동 병합 - 선택된 문장들을 하나로 합침
  const mergeSelectedSentences = async () => {
    if (selectedForMerge.size < 2) {
      setError("2개 이상의 문장을 선택해주세요.")
      return
    }

    // 선택된 항목들을 시간순으로 정렬 (먼저 말한 것이 앞에)
    const selectedItems = transcripts
      .filter(t => selectedForMerge.has(t.id))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    console.log("병합 순서:", selectedItems.map(t => ({
      time: t.timestamp.toLocaleTimeString(),
      text: t.original.substring(0, 20)
    })))

    // 원본 텍스트 합치기 (시간순)
    const mergedOriginal = selectedItems.map(t => t.original).join(" ")
    
    setIsReTranslating(true)

    try {
      // 합친 텍스트 번역
      let mergedTranslated = mergedOriginal
      if (targetLanguage !== "none" && sourceLanguage !== targetLanguage) {
        mergedTranslated = await translateText(mergedOriginal, sourceLanguage, targetLanguage)
      }

      // 새 항목 생성 (가장 빠른 시간 사용)
      const newId = `merged_${Date.now()}`
      const newItem: TranscriptItem = {
        id: newId,
        original: mergedOriginal,
        translated: targetLanguage === "none" ? "" : mergedTranslated,
        sourceLanguage,
        targetLanguage,
        timestamp: selectedItems[0].timestamp, // 가장 빠른(오래된) 시간 사용
      }

      // DB에서 기존 항목 삭제
      if (saveToDb) {
        for (const item of selectedItems) {
          if (item.utteranceId) {
            await supabase
              .from("utterances")
              .delete()
              .eq("id", item.utteranceId)
          }
        }
      }

      // DB에 새 항목 저장
      if (sessionId && saveToDb) {
        const { utteranceId, translationId } = await saveUtterance(
          sessionId,
          newItem.original,
          sourceLanguage,
          newItem.translated,
          targetLanguage
        )
        newItem.utteranceId = utteranceId
        newItem.translationId = translationId
      }

      // 로컬 상태 업데이트
      const selectedIds = new Set(selectedForMerge)
      setTranscripts(prev => {
        // 선택된 항목 제거하고, 첫 번째 위치에 새 항목 삽입
        const filtered = prev.filter(t => !selectedIds.has(t.id))
        const insertIndex = prev.findIndex(t => selectedIds.has(t.id))
        filtered.splice(insertIndex >= 0 ? insertIndex : 0, 0, newItem)
        return filtered
      })

      // 선택 초기화
      setSelectedForMerge(new Set())
      setMergeMode(false)

    } catch (err) {
      console.error("수동 병합 오류:", err)
      setError("문장 병합 중 오류가 발생했습니다.")
    } finally {
      setIsReTranslating(false)
    }
  }

  // 병합할 항목 선택/해제 토글
  const toggleSelectForMerge = (id: string) => {
    setSelectedForMerge(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // 병합 모드 취소
  const cancelMergeMode = () => {
    setMergeMode(false)
    setSelectedForMerge(new Set())
  }

  // ==================== 요약 기능 ====================

  // Gemini API로 요약 생성 (서버 API 라우트 사용)
  const generateSummary = async (texts: string[], language: string): Promise<string> => {
    if (!texts || texts.length === 0) {
      throw new Error("요약할 내용이 없습니다.")
    }

    const combinedText = texts.join("\n")
    
    console.log("요약 생성 시작:", { 언어: language, 텍스트수: texts.length })

    try {
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: combinedText,
          targetLanguage: language,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        console.error("요약 API 에러:", result.error)
        throw new Error(result.error || "요약 생성 실패")
      }

      console.log("요약 생성 완료")
      return result.summary
    } catch (fetchError) {
      console.error("요약 API 호출 오류:", fetchError)
      throw fetchError
    }
  }

  // 세션 요약 생성 (기존 요약이 있으면 로드, 없으면 생성)
  const summarizeSession = async (sessionIdToSummarize: string) => {
    setSummarySessionId(sessionIdToSummarize)
    setSummaryText("")
    setSavedSummaries({})
    setHasExistingSummary(false)
    setShowSummaryModal(true)
    
    try {
      // 먼저 기존 요약이 있는지 확인
      const { data: existingSummaries } = await supabase
        .from("session_summaries")
        .select("language, summary_text")
        .eq("session_id", sessionIdToSummarize)
      
      if (existingSummaries && existingSummaries.length > 0) {
        // 기존 요약이 있으면 로드
        const summaryMap: Record<string, string> = {}
        existingSummaries.forEach((s: { language: string, summary_text: string }) => {
          summaryMap[s.language] = s.summary_text
        })
        setSavedSummaries(summaryMap)
        setHasExistingSummary(true)
        
        // 선택된 언어의 요약이 있으면 표시, 없으면 첫 번째 언어 표시
        if (summaryMap[summaryLanguage]) {
          setSummaryText(summaryMap[summaryLanguage])
        } else {
          const firstLang = Object.keys(summaryMap)[0]
          setSummaryLanguage(firstLang)
          setSummaryText(summaryMap[firstLang])
        }
        setIsSummarizing(false)
        return
      }
      
      // 기존 요약이 없으면 새로 생성
      setIsSummarizing(true)
      
      // 발화 데이터 로드
      const { data: utterances, error } = await supabase
        .from("utterances")
        .select("original_text, original_language")
        .eq("session_id", sessionIdToSummarize)
        .order("created_at", { ascending: true })
      
      if (error || !utterances || utterances.length === 0) {
        setSummaryText("요약할 내용이 없습니다.")
        return
      }

      const texts = utterances.map((u: { original_text: string }) => u.original_text)
      const summary = await generateSummary(texts, summaryLanguage)
      setSummaryText(summary)
      
      // 생성된 요약을 DB에 저장
      await saveSummaryToDb(sessionIdToSummarize, summaryLanguage, summary)
      setSavedSummaries({ [summaryLanguage]: summary })
      
    } catch (err) {
      console.error("요약 오류:", err)
      setSummaryText("요약 생성 중 오류가 발생했습니다.")
    } finally {
      setIsSummarizing(false)
    }
  }
  
  // 요약을 DB에 저장
  const saveSummaryToDb = async (sessionId: string, language: string, summaryText: string) => {
    try {
      // 기존 같은 언어 요약이 있으면 업데이트, 없으면 생성
      const { data: existing } = await supabase
        .from("session_summaries")
        .select("id")
        .eq("session_id", sessionId)
        .eq("language", language)
        .single()
      
      if (existing) {
        await supabase
          .from("session_summaries")
          .update({ summary_text: summaryText, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
      } else {
        await supabase
          .from("session_summaries")
          .insert({
            session_id: sessionId,
            language: language,
            summary_text: summaryText,
            user_id: userId
          })
      }
    } catch (err) {
      console.error("요약 저장 오류:", err)
    }
  }
  
  // 세션 목록에서 요약 미리보기 로드
  const loadSummaryPreview = async (sessionId: string) => {
    try {
      const { data } = await supabase
        .from("session_summaries")
        .select("summary_text")
        .eq("session_id", sessionId)
        .eq("language", "ko")
        .single()
      
      if (data?.summary_text) {
        setPreviewSummary({ sessionId, text: data.summary_text })
      } else {
        setPreviewSummary({ sessionId, text: "요약이 아직 생성되지 않았습니다." })
      }
    } catch {
      setPreviewSummary({ sessionId, text: "요약이 아직 생성되지 않았습니다." })
    }
  }
  
  // 다른 언어로 요약 생성/로드
  const loadOrGenerateSummaryForLanguage = async (language: string) => {
    if (!summarySessionId) return
    
    setSummaryLanguage(language)
    
    // 메모리에 저장된 요약이 있으면 바로 표시
    if (savedSummaries[language]) {
      setSummaryText(savedSummaries[language])
      return
    }
    
    // 메모리에 없으면 DB에서 확인
    setIsSummarizing(true)
    setSummaryText("")
    
    try {
      // DB에서 해당 언어 요약 확인
      const { data: existingSummary } = await supabase
        .from("session_summaries")
        .select("summary_text")
        .eq("session_id", summarySessionId)
        .eq("language", language)
        .single()
      
      if (existingSummary?.summary_text) {
        // DB에 있으면 로드
        setSummaryText(existingSummary.summary_text)
        setSavedSummaries(prev => ({ ...prev, [language]: existingSummary.summary_text }))
        setIsSummarizing(false)
        return
      }
      
      // DB에도 없으면 새로 생성
      const { data: utterances } = await supabase
        .from("utterances")
        .select("original_text")
        .eq("session_id", summarySessionId)
        .order("created_at", { ascending: true })
      
      if (!utterances || utterances.length === 0) {
        setSummaryText("요약할 내용이 없습니다.")
        return
      }
      
      const texts = utterances.map((u: { original_text: string }) => u.original_text)
      const summary = await generateSummary(texts, language)
      setSummaryText(summary)
      
      // DB에 저장
      await saveSummaryToDb(summarySessionId, language, summary)
      setSavedSummaries(prev => ({ ...prev, [language]: summary }))
      
    } catch (err) {
      console.error("요약 생성 오류:", err)
      setSummaryText("요약 생성 중 오류가 발생했습니다.")
    } finally {
      setIsSummarizing(false)
    }
  }

  // 현재 세션 요약
  // ===== 요약 기능 =====
  
  const summarizeCurrentSession = async () => {
    if (transcripts.length === 0) {
      setError("요약할 내용이 없습니다.")
      return
    }
    
    // 세션 ID가 있으면 기존 로직 사용 (저장된 요약 확인)
    if (sessionId) {
      await summarizeSession(sessionId)
      return
    }
    
    // 세션 ID가 없으면 현재 transcripts로 요약
    setIsSummarizing(true)
    setSummarySessionId(null)
    setSummaryText("")
    setSavedSummaries({})
    setHasExistingSummary(false)
    setShowSummaryModal(true)
    
    try {
      const texts = transcripts.map(t => t.original).reverse() // 시간순 정렬
      const summary = await generateSummary(texts, summaryLanguage)
      setSummaryText(summary)
    } catch (err) {
      console.error("요약 오류:", err)
      setSummaryText("요약 생성 중 오류가 발생했습니다.")
    } finally {
      setIsSummarizing(false)
    }
  }

  // 문장 종결 감지 (마침표, 물음표, 느낌표 등)
  const isSentenceComplete = (text: string): boolean => {
    const trimmed = text.trim()
    // 문장 종결 부호 확인
    const endings = [".", "?", "!", "。", "？", "！", "~", "…"]
    return endings.some(e => trimmed.endsWith(e))
  }

  // 버퍼의 내용을 번역 (맥락 통역)
  const flushSentenceBuffer = async () => {
    const bufferedText = sentenceBufferRef.current.trim()
    if (!bufferedText) return
    
    // 캡처된 시작 시간 사용 (STT 결과가 처음 들어온 시점)
    const capturedTimestamp = sentenceTimestampRef.current || new Date()
    
    console.log("🔄 버퍼 플러시 (문장 완성):", bufferedText, "시작시간:", capturedTimestamp.toLocaleTimeString())
    
    // 버퍼 및 시간 초기화
    sentenceBufferRef.current = ""
    sentenceTimestampRef.current = null
    
    // 타이머 클리어
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    
    // 번역 실행 (캡처한 시작 시간 전달)
    await translateAndAdd(bufferedText, capturedTimestamp)
  }

  // 침묵 타이머 리셋 (발화 감지 시 호출)
  const resetSilenceTimer = () => {
    // 기존 타이머 클리어
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    
    // 새 타이머 설정 (1.5초 후 버퍼 플러시)
    silenceTimerRef.current = setTimeout(() => {
      if (sentenceBufferRef.current.trim()) {
        console.log("⏱️ 침묵 감지 - 버퍼 플러시")
        flushSentenceBuffer()
      }
    }, SILENCE_THRESHOLD)
  }

  // 번역 후 목록에 추가 (capturedTime: STT 결과가 처음 들어온 시점)
  const translateAndAdd = async (text: string, capturedTime?: Date) => {
    if (!text.trim()) return

    // STT 시작 시점의 timestamp 사용 (없으면 현재 시간)
    const utteranceTimestamp = capturedTime || new Date()
    
    setIsTranslating(true)
    try {
      let translated = text
      const actualSourceLang = sourceLanguage
      
      // 번역 스킵 조건: 선택안함 또는 같은 언어
      if (targetLanguage === "none") {
        translated = "" // 번역 없음 (원문만 기록)
      } else if (actualSourceLang === targetLanguage) {
        translated = text // 동일 언어
      } else {
        translated = await translateText(text, actualSourceLang, targetLanguage)
      }
      
      // DB에 저장하고 ID 받기 (ref 사용하여 최신 세션 ID 참조)
      let utteranceId: string | undefined
      let translationId: string | undefined
      const currentSessionId = sessionIdRef.current
      if (currentSessionId && saveToDb) {
        const result = await saveUtterance(currentSessionId, text, actualSourceLang, translated, targetLanguage)
        utteranceId = result.utteranceId
        translationId = result.translationId
      }

      const newItem: TranscriptItem = {
        id: Date.now().toString(),
        original: text,
        translated: translated,
        sourceLanguage: actualSourceLang,
        targetLanguage: targetLanguage,
        timestamp: utteranceTimestamp, // STT 시작 시점 사용
        utteranceId,
        translationId,
      }

      // 새 항목을 맨 앞에 추가 (최신이 위에) + 시간순 정렬
      setTranscripts((prev) => {
        const updated = [newItem, ...prev]
        // 시간순 정렬 (최신이 위에 = 내림차순)
        return updated.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      })
      
      // 자동 TTS 재생 (ref 사용으로 최신 설정값 참조)
      // 번역이 있고 (none이 아니고), 같은 언어가 아닐 때만 TTS 재생
      if (audioSettingsRef.current.autoPlayTTS && targetLanguage !== "none" && actualSourceLang !== targetLanguage && translated) {
        speakText(translated, targetLanguage)
      }
      
      // 스크롤 맨 위로
      setTimeout(() => {
        transcriptContainerRef.current?.scrollTo({
          top: 0,
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

  // 음성 인식 초기화 함수
  const initRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.")
      return null
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = getLanguageCode(sourceLanguage)

    recognition.onresult = async (event) => {
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

      // 실시간 텍스트 업데이트 (버퍼 + 현재 입력)
      const displayText = sentenceBufferRef.current + (interimTranscript || finalTranscript)
      setCurrentTranscript(displayText)

      if (finalTranscript) {
        const trimmedText = finalTranscript.trim()
        
        // 중복 처리 방지
        if (trimmedText === lastProcessedTextRef.current) {
          console.log("중복 텍스트 스킵:", trimmedText)
          return
        }
        lastProcessedTextRef.current = trimmedText
        
        // 버퍼에 추가 (공백으로 구분)
        if (sentenceBufferRef.current) {
          sentenceBufferRef.current += " " + trimmedText
        } else {
          // 첫 번째 텍스트 추가 시 시작 시간 캡처 (STT 결과가 처음 들어온 시점)
          sentenceBufferRef.current = trimmedText
          sentenceTimestampRef.current = new Date()
          console.log("⏰ 문장 시작 시간 캡처:", sentenceTimestampRef.current.toLocaleTimeString())
        }
        
        console.log("📝 버퍼 누적:", sentenceBufferRef.current)
        
        // 문장 종결 감지 - 즉시 번역
        if (isSentenceComplete(trimmedText)) {
          console.log("✅ 문장 종결 감지 - 즉시 번역")
          if (!processingRef.current) {
            processingRef.current = true
            try {
              await flushSentenceBuffer()
            } finally {
              processingRef.current = false
            }
          }
          setCurrentTranscript("")
        } else {
          // 문장이 아직 완성되지 않음 - 침묵 타이머 리셋
          resetSilenceTimer()
        }
      }
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)
      if (event.error === "not-allowed") {
        setError("마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요.")
        isListeningRef.current = false
        setIsListening(false)
      } else if (event.error === "no-speech") {
        // 음성이 감지되지 않음 - 자동 재시작
        console.log("No speech detected, continuing...")
      } else if (event.error === "aborted") {
        // 사용자가 중지함 - 무시
      } else {
        setError(`음성 인식 오류: ${event.error}`)
      }
    }

    recognition.onend = () => {
      // stale closure 방지를 위해 ref 사용
      if (isListeningRef.current) {
        try {
          recognition.start()
        } catch (e) {
          console.log("Recognition restart error:", e)
          // 재시작 실패 시 약간의 딜레이 후 재시도
          setTimeout(() => {
            if (isListeningRef.current) {
              try {
                recognition.start()
              } catch (e2) {
                console.error("Recognition restart failed:", e2)
              }
            }
          }, 100)
        }
      }
    }

    return recognition
  }

  // 회의 진행 시간 타이머 시작
  const startSessionTimer = () => {
    // 이미 타이머가 돌고 있으면 중지하지 않음 (이어서 작업)
    if (timerIntervalRef.current) return
    
    // 새 세션이면 시작 시간과 경과 시간 초기화
    if (!sessionStartTime) {
      setSessionStartTime(new Date())
      setElapsedSeconds(0)
    }
    
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)
  }
  
  // 회의 진행 시간 타이머 일시정지 (세션 유지)
  const pauseSessionTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }
  
  // 회의 진행 시간 타이머 완전 중지 및 초기화
  const stopSessionTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    // 시작 시간은 유지 (최종 저장용), 타이머만 중지
  }
  
  // 경과 시간 포맷팅 (HH:MM:SS)
  const formatElapsedTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 녹음 시작/중지
  const toggleListening = async () => {
    if (isListening) {
      // 중지 - 세션은 유지 (종료하지 않음)
      isListeningRef.current = false
      
      // 진행 시간 타이머 일시정지
      pauseSessionTimer()
      
      // 타이머 클리어
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      
      // 버퍼에 남은 내용 처리
      if (sentenceBufferRef.current.trim()) {
        console.log("🛑 마이크 중지 - 버퍼 플러시")
        await flushSentenceBuffer()
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
      setCurrentTranscript("")
      
      // ⚠️ 세션 종료하지 않음 - 이어서 작업 가능하도록 유지
      console.log("⏸️ 마이크 중지 - 세션 유지:", sessionId)
    } else {
      // 시작
      setError(null)
      setCurrentTranscript("")
      
      // 🔑 핵심: 기존 세션이 있으면 이어서 작업, 없으면 새 세션 생성
      if (saveToDb && userId) {
        if (sessionId) {
          // 기존 세션 이어서 사용
          console.log("▶️ 기존 세션에 이어서 작업:", sessionId)
          sessionIdRef.current = sessionId
        } else {
          // 새 세션 생성 + 타이머 시작 시간 초기화
          setSessionStartTime(new Date())
          setElapsedSeconds(0)
          const newSessionId = await createSession()
          setSessionId(newSessionId)
          sessionIdRef.current = newSessionId
          console.log("🆕 새 세션 생성:", newSessionId)
        }
      }
      
      // 타이머 시작
      startSessionTimer()
      
      // 기존 인스턴스 정리 후 새로 생성
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // 무시
        }
      }
      
      const recognition = initRecognition()
      if (!recognition) return
      
      recognitionRef.current = recognition
      
      try {
        recognition.start()
        isListeningRef.current = true
        setIsListening(true)
      } catch (e) {
        console.error("Recognition start error:", e)
        setError("음성 인식 시작에 실패했습니다. 다시 시도해주세요.")
      }
    }
  }

  // 언어 스왑
  const swapLanguages = () => {
    setSourceLanguage(targetLanguage)
    setTargetLanguage(sourceLanguage)
  }

  // 소스 언어 변경 시 타겟 언어와 같으면 자동 변경
  const handleSourceLanguageChange = (newSource: string) => {
    setSourceLanguage(newSource)
    setDetectedLanguage(null) // 감지 결과 초기화
    // auto가 아니고 타겟과 같으면 타겟 변경
    if (newSource !== "auto" && newSource === targetLanguage) {
      // 영어가 아니면 영어로, 영어면 한국어로
      const newTarget = newSource === "en" ? "ko" : "en"
      setTargetLanguage(newTarget)
    }
  }

  // 타겟 언어 변경 시 소스 언어와 같으면 자동 변경
  const handleTargetLanguageChange = (newTarget: string) => {
    setTargetLanguage(newTarget)
    // 소스가 auto가 아니고 같으면 소스 변경
    if (sourceLanguage !== "auto" && newTarget === sourceLanguage) {
      // 영어가 아니면 영어로, 영어면 한국어로
      const newSource = newTarget === "en" ? "ko" : "en"
      setSourceLanguage(newSource)
    }
  }

  const getLanguageInfo = (code: string) => {
    return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0]
  }

  // ============ 문서 정리 (회의록 생성) ============
  
  // 문서 정리 프롬프트 생성 (상세 회의록) - 언어별 분리
  const getDocumentPrompt = (langCode: string, langName: string) => {
    // 영어 프롬프트
    if (langCode === "en") {
      return `You are a professional meeting minutes writer. Convert the speech recognition text into ${langName} meeting minutes.
IMPORTANT: Your ENTIRE response MUST be in English. Do not use any other language.

## 📋 Meeting Minutes Rules

### 1. Use Markdown Format
- Use bullet points (-, *) to organize content
- Use **## Bold headings** for main categories
- Use **bold** for important words and keywords
- Add blank lines between paragraphs for readability

### 2. Document Structure
For each main topic:
- **Topic Title** (bold)
- Summary of the topic (1-2 sentences)
- Detailed discussion points (bullet points)

### 3. Writing Style (Required)
- Do NOT use colloquial language
- Use clear, logical, formal writing
- Use formal endings and expressions
- Examples:
  - ❌ "So we gotta do this thing"
  - ✅ "This task needs to be completed"
  - ❌ "Maybe we could try something like this"
  - ✅ "The following approach is recommended"

### 4. Exclude
- Meaningless fillers: "um..", "uh..", "well..", "hmm.."
- Habitual expressions: "you know", "like", "basically"
- **Off-topic conversations** (jokes, small talk, etc.)

### 5. Include (Must Record)
- All discussed business matters
- Specific **numbers**, **dates**, **responsible persons**, **deadlines**
- **Decisions made** and **pending items**
- **Action items** (follow-up tasks)

## 📝 Output Format

**## [Topic 1: Category Name]**

Summary of the key points for this topic (1-2 sentences)

- Detailed discussion point 1
- Detailed discussion point 2
  - Sub-details if applicable
- Detailed discussion point 3

**## [Topic 2: Category Name]**

...

---

**## 📌 Summary**

- **Key Discussion Points**: Summary of main agenda
- **Decisions Made**: Agreed items
- **Action Items**: Follow-up tasks and responsible persons

---

Follow this format to write the meeting minutes. Faithfully reflect the original content in a structured format.`
    }
    
    // 일본어 프롬프트
    if (langCode === "ja") {
      return `あなたはプロの議事録作成者です。音声認識テキストを${langName}の議事録に変換してください。
重要：回答は必ず日本語で行ってください。

## 📋 議事録作成ルール

### 1. マークダウン形式を使用
- 箇条書き(-, *)で内容を整理
- 主要カテゴリは**## 太字見出し**で区分
- 重要な単語とキーワードは**太字**で表示
- 段落間に空行を入れて読みやすく

### 2. 文書構造
各主要トピックごとに以下の構造に従う：
- **トピックタイトル**（太字）
- そのトピックの要約（1-2文）
- 詳細な議論内容（箇条書き）

### 3. 記述方式（必須）
- 口語体使用**禁止**
- 明確で論理的な文語体を使用
- 例：
  - ❌ 「それでこれをやらないといけないんですけど」
  - ✅ 「該当業務の遂行が必要である」

### 4. 除外対象
- 無意味な間投詞：「えーと」「あの」「うーん」
- 習慣的表現：「なんか」「とりあえず」
- **会議と無関係な会話**（冗談、雑談等）

### 5. 含める対象（必ず記録）
- 議論された全ての業務内容
- 具体的な**数字**、**日付**、**担当者**、**期限**
- **決定事項**と**未決事項**
- **アクションアイテム**

## 📝 出力形式に従って議事録を作成してください。`
    }
    
    // 중국어 프롬프트
    if (langCode === "zh") {
      return `您是专业的会议纪要撰写者。请将语音识别文本转换为${langName}会议纪要。
重要：您的回复必须完全用中文。

## 📋 会议纪要规则

### 1. 使用Markdown格式
- 使用要点符号(-, *)整理内容
- 使用**## 粗体标题**区分主要类别
- 重要词汇和关键词用**粗体**标注
- 段落之间添加空行以提高可读性

### 2. 文档结构
每个主要主题遵循以下结构：
- **主题标题**（粗体）
- 主题摘要（1-2句）
- 详细讨论内容（要点列表）

### 3. 写作风格（必须）
- **禁止**使用口语
- 使用清晰、逻辑性强的书面语

### 4. 排除内容
- 无意义的语气词
- **与会议无关的对话**

### 5. 必须包含
- 所有讨论的业务内容
- 具体的**数字**、**日期**、**负责人**、**截止日期**
- **决定事项**和**待定事项**
- **行动项目**

请按照此格式撰写会议纪要。`
    }
    
    // 한국어 (기본) 프롬프트
    return `당신은 전문 회의록 작성 비서입니다. 음성 인식 텍스트를 ${langName} 회의록으로 변환합니다.
중요: 반드시 한국어로 작성해주세요.

## 📋 회의록 작성 규칙

### 1. 마크다운 형식 사용
- 글머리표(-, *)를 사용하여 내용 정리
- 주요 카테고리는 **## 볼드 제목**으로 구분
- 중요 단어와 핵심 키워드는 **굵게** 표시
- 단락 사이에 빈 줄을 넣어 가독성 확보

### 2. 문서 구조
각 주요 주제별로 다음 구조를 따름:
- **주제 제목** (볼드)
- 해당 주제의 핵심 요약 (1-2문장)
- 세부 논의 내용 (글머리표로 정리)

### 3. 서술 방식 (필수)
- 구어체 사용 **금지**
- 명확하고 논리적인 문어체 사용
- 어미: '~함', '~임', '~됨', '~예정임', '~필요함' 등 사용
- 예시:
  - ❌ "그래서 이걸 해야 되는데요"
  - ✅ "해당 업무 수행이 필요함"
  - ❌ "뭐 이런 식으로 하면 될 것 같아요"
  - ✅ "다음과 같은 방식으로 진행하는 것이 적절함"

### 4. 제외 대상
- 무의미한 추임새: "음..", "어..", "그..", "아..", "흠.."
- 습관적 표현: "네네", "그러니까", "저기", "이제", "뭐"
- **회의와 무관한 대화** (농담, 잡담 등)

### 5. 포함 대상 (반드시 기록)
- 논의된 모든 업무 내용
- 구체적인 **숫자**, **날짜**, **담당자**, **기한**
- **결정 사항**과 **미결 사항**
- **액션 아이템** (후속 조치)

## 📝 출력 형식

**## [주제 1: 카테고리명]**

해당 주제의 핵심 내용 요약 (1-2문장)

- 세부 논의 내용 1
- 세부 논의 내용 2
  - 상세 내용이 있으면 들여쓰기
- 세부 논의 내용 3

**## [주제 2: 카테고리명]**

...

---

**## 📌 요약 정리**

- **핵심 논의 사항**: 주요 안건 요약
- **결정 사항**: 합의된 내용
- **액션 아이템**: 후속 조치 및 담당자

---

위 형식에 맞춰 회의록을 작성하세요. 원본 내용을 충실히 반영하되, 구조화된 형식으로 정리합니다.`
  }

  // 세션 ID로 문서 정리하기 (목록에서 클릭 시)
  const generateDocumentForSession = async (targetSessionId: string) => {
    setIsDocumenting(true)
    setDocumentTextOriginal("")
    setDocumentTextTranslated("")
    
    try {
      // 세션의 발화 데이터 가져오기
      const { data: utterances, error } = await supabase
        .from("utterances")
        .select(`
          id,
          original_text,
          original_language,
          created_at,
          translations (
            translated_text,
            target_language
          )
        `)
        .eq("session_id", targetSessionId)
        .order("created_at", { ascending: true })
      
      if (error || !utterances || utterances.length === 0) {
        setError("통역 내용이 없습니다.")
        return
      }
      
      // 세션 정보 가져오기
      const { data: sessionData } = await supabase
        .from("translation_sessions")
        .select("source_language, target_languages")
        .eq("id", targetSessionId)
        .single()
      
      const srcLang = sessionData?.source_language || "ko"
      const tgtLang = sessionData?.target_languages?.[0] || "en"
      const srcLangName = getLanguageInfo(srcLang).name
      const tgtLangName = getLanguageInfo(tgtLang).name
      
      // 원어 텍스트만 추출
      const originalTexts = utterances
        .map((u: { original_text: string }) => u.original_text)
        .join("\n")
      
      // 번역 텍스트만 추출
      const translatedTexts = utterances
        .map((u: { translations: Array<{ translated_text: string }> }) => u.translations?.[0]?.translated_text || "")
        .filter((t: string) => t)
        .join("\n")
      
      // 원어와 번역어가 같으면 하나만 정리
      if (srcLang === tgtLang || !translatedTexts) {
        const response = await fetch("/api/gemini/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalTexts,
            targetLanguage: srcLang,
            customPrompt: `${getDocumentPrompt(srcLang, srcLangName)}\n\n원본 텍스트:\n${originalTexts}`,
          }),
        })
        
        const result = await response.json()
        if (!result.success) throw new Error(result.error || "문서 정리 실패")
        
        setDocumentTextOriginal(result.summary)
        setDocumentTextTranslated("") // 번역어 회의록 없음
        
        // DB 저장 (targetSessionId 사용)
        await supabase
          .from("translation_sessions")
          .update({
            document_original_md: result.summary,
            document_translated_md: null,
            document_updated_at: new Date().toISOString(),
          })
          .eq("id", targetSessionId)
      } else {
        // 원어와 번역어 각각 정리 (병렬 처리)
        const [originalResponse, translatedResponse] = await Promise.all([
          fetch("/api/gemini/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: originalTexts,
              targetLanguage: srcLang,
              customPrompt: `${getDocumentPrompt(srcLang, srcLangName)}\n\n원본 텍스트:\n${originalTexts}`,
            }),
          }),
          fetch("/api/gemini/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: translatedTexts,
              targetLanguage: tgtLang,
              customPrompt: `${getDocumentPrompt(tgtLang, tgtLangName)}\n\n원본 텍스트:\n${translatedTexts}`,
            }),
          }),
        ])
        
        const [originalResult, translatedResult] = await Promise.all([
          originalResponse.json(),
          translatedResponse.json(),
        ])
        
        if (!originalResult.success) throw new Error(originalResult.error || "원어 문서 정리 실패")
        if (!translatedResult.success) throw new Error(translatedResult.error || "번역어 문서 정리 실패")
        
        setDocumentTextOriginal(originalResult.summary)
        setDocumentTextTranslated(translatedResult.summary)
        
        // DB 저장 (targetSessionId 사용)
        await supabase
          .from("translation_sessions")
          .update({
            document_original_md: originalResult.summary,
            document_translated_md: translatedResult.summary,
            document_updated_at: new Date().toISOString(),
          })
          .eq("id", targetSessionId)
      }
      
      setDocumentViewTab("original")
      setShowDocumentInPanel(true)
      
    } catch (err) {
      console.error("문서 정리 오류:", err)
      setError(err instanceof Error ? err.message : "문서 정리 중 오류가 발생했습니다.")
    } finally {
      setIsDocumenting(false)
    }
  }
  
  // 문서로 정리하기 (현재 세션)
  const generateDocument = async () => {
    if (transcripts.length === 0) {
      setError("정리할 내용이 없습니다.")
      return
    }
    
    setIsDocumenting(true)
    setDocumentTextOriginal("")
    setDocumentTextTranslated("")
    
    try {
      const srcLangName = getLanguageInfo(sourceLanguage).name
      const tgtLangName = getLanguageInfo(targetLanguage).name
      
      // 원어 텍스트만 추출
      const originalTexts = transcripts.map(t => t.original).join("\n")
      
      // 번역 텍스트만 추출 (번역이 있는 경우만)
      const translatedTexts = transcripts
        .filter(t => t.translated && t.targetLanguage !== "none")
        .map(t => t.translated)
        .join("\n")
      
      // 원어와 번역어가 같거나 번역이 없으면 원어만 정리
      if (sourceLanguage === targetLanguage || targetLanguage === "none" || !translatedTexts) {
        const response = await fetch("/api/gemini/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalTexts,
            targetLanguage: sourceLanguage,
            customPrompt: `${getDocumentPrompt(sourceLanguage, srcLangName)}\n\n원본 텍스트:\n${originalTexts}`,
          }),
        })
        
        const result = await response.json()
        if (!result.success) throw new Error(result.error || "문서 정리 실패")
        
        setDocumentTextOriginal(result.summary)
        setDocumentTextTranslated("")
        
        // DB 저장
        await saveDocumentToDb(result.summary, "")
      } else {
        // 원어와 번역어 각각 정리 (병렬 처리)
        const [originalResponse, translatedResponse] = await Promise.all([
          fetch("/api/gemini/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: originalTexts,
              targetLanguage: sourceLanguage,
              customPrompt: `${getDocumentPrompt(sourceLanguage, srcLangName)}\n\n원본 텍스트:\n${originalTexts}`,
            }),
          }),
          fetch("/api/gemini/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: translatedTexts,
              targetLanguage: targetLanguage,
              customPrompt: `${getDocumentPrompt(targetLanguage, tgtLangName)}\n\n원본 텍스트:\n${translatedTexts}`,
            }),
          }),
        ])
        
        const [originalResult, translatedResult] = await Promise.all([
          originalResponse.json(),
          translatedResponse.json(),
        ])
        
        if (!originalResult.success) throw new Error(originalResult.error || "원어 문서 정리 실패")
        if (!translatedResult.success) throw new Error(translatedResult.error || "번역어 문서 정리 실패")
        
        setDocumentTextOriginal(originalResult.summary)
        setDocumentTextTranslated(translatedResult.summary)
        
        // DB 저장
        await saveDocumentToDb(originalResult.summary, translatedResult.summary)
      }
      
      setDocumentViewTab("original")
      setShowDocumentInPanel(true)
      
    } catch (err) {
      console.error("문서 정리 오류:", err)
      setError(err instanceof Error ? err.message : "문서 정리 중 오류가 발생했습니다.")
    } finally {
      setIsDocumenting(false)
    }
  }

  // ============ 회의기록 저장/편집 ============
  
  // DB에 회의록 저장
  const saveDocumentToDb = async (originalMd: string, translatedMd: string) => {
    if (!sessionId) return false
    
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from("translation_sessions")
        .update({
          document_original_md: originalMd,
          document_translated_md: translatedMd || null,
          document_updated_at: now,
          document_created_at: documentTextOriginal ? undefined : now, // 최초 생성 시에만
        })
        .eq("id", sessionId)
      
      if (error) throw error
      return true
    } catch (err) {
      console.error("회의록 저장 오류:", err)
      setError("회의록 저장에 실패했습니다.")
      return false
    }
  }

  // 회의기록 패널에서 보기
  const showDocumentInResultPanel = () => {
    setShowDocumentInPanel(true)
    setShowDocumentModal(false)
  }

  // 편집 모드 시작
  const startEditingDocument = () => {
    const currentText = documentViewTab === "original" ? documentTextOriginal : documentTextTranslated
    setEditDocumentText(currentText)
    setIsEditingDocument(true)
  }

  // 편집 취소
  const cancelEditingDocument = () => {
    setIsEditingDocument(false)
    setEditDocumentText("")
  }

  // 편집 저장 (부분 번역 포함)
  const saveEditedDocument = async () => {
    if (!editDocumentText.trim()) return
    
    setIsSavingDocument(true)
    try {
      const isEditingOriginal = documentViewTab === "original"
      const oldText = isEditingOriginal ? documentTextOriginal : documentTextTranslated
      
      // 변경된 문단 찾기
      const oldParagraphs = oldText.split("\n\n")
      const newParagraphs = editDocumentText.split("\n\n")
      
      // 변경된 부분만 번역
      const changedIndices: number[] = []
      newParagraphs.forEach((para, idx) => {
        if (idx >= oldParagraphs.length || para !== oldParagraphs[idx]) {
          changedIndices.push(idx)
        }
      })
      
      let translatedText = isEditingOriginal ? documentTextTranslated : documentTextOriginal
      
      if (changedIndices.length > 0 && translatedText) {
        // 변경된 문단만 번역
        const targetLang = isEditingOriginal ? targetLanguage : sourceLanguage
        const translatedParagraphs = translatedText.split("\n\n")
        
        for (const idx of changedIndices) {
          if (newParagraphs[idx]?.trim()) {
            try {
              const response = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: newParagraphs[idx],
                  targetLanguage: targetLang,
                }),
              })
              const result = await response.json()
              if (result.success && result.translatedText) {
                translatedParagraphs[idx] = result.translatedText
              }
            } catch (e) {
              console.error(`문단 ${idx} 번역 실패:`, e)
            }
          }
        }
        
        translatedText = translatedParagraphs.join("\n\n")
      }
      
      // 상태 업데이트
      if (isEditingOriginal) {
        setDocumentTextOriginal(editDocumentText)
        if (translatedText) setDocumentTextTranslated(translatedText)
      } else {
        setDocumentTextTranslated(editDocumentText)
        if (translatedText) setDocumentTextOriginal(translatedText)
      }
      
      // DB 저장
      const originalToSave = isEditingOriginal ? editDocumentText : translatedText
      const translatedToSave = isEditingOriginal ? translatedText : editDocumentText
      await saveDocumentToDb(originalToSave, translatedToSave)
      
      setIsEditingDocument(false)
      setEditDocumentText("")
      
    } catch (err) {
      console.error("편집 저장 오류:", err)
      setError("편집 내용 저장에 실패했습니다.")
    } finally {
      setIsSavingDocument(false)
    }
  }

  // 프린트 기능
  const printDocument = () => {
    const printContent = documentViewTab === "original" ? documentTextOriginal : documentTextTranslated
    const langName = documentViewTab === "original" 
      ? getLanguageInfo(sourceLanguage).name 
      : getLanguageInfo(targetLanguage).name
    
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>회의기록 - ${langName}</title>
        <style>
          body { 
            font-family: 'Malgun Gothic', sans-serif; 
            line-height: 1.8; 
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1, h2, h3 { color: #0d9488; margin-top: 1.5em; }
          h1 { font-size: 1.8em; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
          h2 { font-size: 1.4em; }
          h3 { font-size: 1.2em; }
          p { margin: 1em 0; }
          ul, ol { padding-left: 2em; }
          li { margin: 0.5em 0; }
          table { border-collapse: collapse; width: 100%; margin: 1em 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f0fdfa; }
          blockquote { border-left: 4px solid #0d9488; padding-left: 1em; margin: 1em 0; color: #666; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
          pre { background: #f5f5f5; padding: 1em; border-radius: 8px; overflow-x: auto; }
          strong { color: #0d9488; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div id="content"></div>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <script>
          document.getElementById('content').innerHTML = marked.parse(\`${printContent.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`);
          window.print();
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  // .md 파일 다운로드
  const downloadMarkdown = () => {
    const text = documentViewTab === "original" ? documentTextOriginal : documentTextTranslated
    const langName = documentViewTab === "original" 
      ? getLanguageInfo(sourceLanguage).name 
      : getLanguageInfo(targetLanguage).name
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `회의기록_${langName}_${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ============ 시스템 오디오 캡처 (PC 소리 인식) ============
  
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
        setError("⚠️ 오디오가 캡처되지 않았습니다!\n\n화면 공유 팝업에서:\n1. 'Chrome 탭' 선택\n2. 오디오가 재생되는 탭 선택\n3. '오디오 공유' 체크 ✅\n4. '공유' 클릭")
        stream.getTracks().forEach(track => track.stop())
        return
      }

      console.log("[System Audio] 오디오 트랙 캡처 성공:", audioTracks[0].label)
      
      // 비디오 트랙은 필요 없으므로 중지 (오디오만 사용)
      stream.getVideoTracks().forEach(track => track.stop())
      
      systemAudioStreamRef.current = stream
      setIsCapturingSystemAudio(true)
      setIsSystemAudioMode(true)
      setTranscripts([])
      
      // 새 세션이면 타이머 초기화 및 시작
      if (!sessionId) {
        setSessionStartTime(new Date())
        setElapsedSeconds(0)
      }
      startSessionTimer()
      
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

  // Deepgram 스트리밍 시작 (시스템 오디오용)
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
      const deepgramLang = sourceLanguage === "ko" ? "ko" : sourceLanguage === "ja" ? "ja" : sourceLanguage === "zh" ? "zh" : sourceLanguage === "es" ? "es" : sourceLanguage === "fr" ? "fr" : sourceLanguage === "de" ? "de" : "en"
      
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
        // 하울링 방지를 위해 GainNode를 0으로 설정
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 0 // 소리 출력 안함
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
              // 번역 및 저장
              await addTranscriptItem(transcript.trim())
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
    
    // 타이머 일시정지
    pauseSessionTimer()
    
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

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
      {/* 오프라인/대기열 상태 배너 */}
      {(!isOnline || pendingQueue.length > 0) && (
        <div className={`shrink-0 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium ${
          !isOnline 
            ? "bg-red-500 text-white" 
            : "bg-amber-500 text-white"
        }`}>
          {!isOnline ? (
            <>
              <span className="animate-pulse">📴</span>
              오프라인 상태 - 인터넷 연결을 확인하세요. 새 데이터는 로컬에 저장됩니다.
            </>
          ) : (
            <>
              <span className="animate-spin">🔄</span>
              {isProcessingQueue 
                ? `저장 중... (${pendingQueue.length}개 남음)` 
                : `대기 중인 항목 ${pendingQueue.length}개 - 곧 자동 저장됩니다`}
            </>
          )}
        </div>
      )}
      
      {/* 메인 콘텐츠 - 전체 배경 흰색 */}

      {/* Session List Panel - YouTube와 동일한 슬라이드 패널 */}
      {showSessionList && (
        <div className="fixed inset-0 z-50 flex">
          {/* 오버레이 - 클릭하면 닫힘 */}
          <div 
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowSessionList(false)}
          />
          {/* 사이드 패널 */}
          <div className="w-full max-w-[500px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-screen animate-slide-in-right">
            {/* 고정 헤더 - YouTube 스타일 민트색 */}
            <div className="shrink-0 p-4 border-b border-teal-200" style={{ backgroundColor: '#CCFBF1' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 text-teal-800">
                  <List className="h-5 w-5" />
                  통역 기록
                </h2>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowSessionList(false)}
                  className="hover:bg-teal-200"
                >
                  <X className="h-5 w-5 text-teal-700" />
                </Button>
              </div>
              <p className="text-sm text-teal-600 mt-1">저장된 통역 세션 목록</p>
            </div>

            {/* 스크롤 영역 - YouTube 스타일 */}
            <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 100px)' }}>
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Mic className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>저장된 기록이 없습니다.</p>
                  <p className="text-sm mt-1">통역 후 자동으로 저장됩니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        sessionId === session.id 
                          ? "border-teal-400 bg-teal-50 dark:bg-teal-900/30" 
                          : "border-teal-200 dark:border-slate-700"
                      }`}
                      style={{ backgroundColor: sessionId === session.id ? '#CCFBF1' : 'white' }}
                      onMouseEnter={(e) => {
                        if (sessionId !== session.id) e.currentTarget.style.backgroundColor = '#CCFBF1'
                      }}
                      onMouseLeave={(e) => {
                        if (sessionId !== session.id) e.currentTarget.style.backgroundColor = 'white'
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {editingSessionId === session.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingSessionTitle}
                                onChange={(e) => setEditingSessionTitle(e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateSessionTitle(session.id, editingSessionTitle)
                                  } else if (e.key === "Escape") {
                                    setEditingSessionId(null)
                                    setEditingSessionTitle("")
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateSessionTitle(session.id, editingSessionTitle)}
                              >
                                <Check className="h-4 w-4 text-teal-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingSessionId(null)
                                  setEditingSessionTitle("")
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer"
                              onClick={() => loadSessionData(session)}
                            >
                              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                {session.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(session.created_at).toLocaleDateString("ko-KR", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </span>
                              </div>
                              {/* 원어 → 번역어 표시 */}
                              <div className="flex items-center gap-1 mt-1.5">
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                  {getLanguageInfo(session.source_language).flag} {getLanguageInfo(session.source_language).name}
                                </span>
                                <span className="text-slate-400 text-xs">→</span>
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                                  {session.target_languages.map(t => `${getLanguageInfo(t).flag} ${getLanguageInfo(t).name}`).join(", ")}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {editingSessionId !== session.id && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingSessionId(session.id)
                                setEditingSessionTitle(session.title)
                              }}
                              title="제목 수정"
                            >
                              <Edit3 className="h-4 w-4 text-slate-500" />
                            </Button>
                            {/* 회의록보기 버튼 */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async (e) => {
                                e.stopPropagation()
                                await loadSessionData(session)
                                setShowDocumentInPanel(true)
                              }}
                              title="회의록보기"
                            >
                              <FileText className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <div className="relative">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  summarizeSession(session.id)
                                }}
                                onMouseEnter={() => loadSummaryPreview(session.id)}
                                onMouseLeave={() => setPreviewSummary(null)}
                                title="요약 보기"
                              >
                                <Sparkles className="h-4 w-4 text-amber-500" />
                              </Button>
                              {/* 요약 미리보기 말풍선 */}
                              {previewSummary?.sessionId === session.id && (
                                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-50">
                                  <div className="font-semibold text-amber-400 mb-1 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" /> 요약
                                  </div>
                                  <div className="line-clamp-4 whitespace-pre-wrap">
                                    {previewSummary.text}
                                  </div>
                                  <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteSession(session.id)
                              }}
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                onClick={startNewSession}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600"
              >
                <Mic className="h-4 w-4 mr-2" />
                새 통역 시작
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 확인 모달 */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConfirmModal(false)
              setConfirmModalCallback(null)
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* 헤더 - 민트색 */}
            <div className="p-4" style={{ backgroundColor: '#00BBAE' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Trash2 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">삭제 확인</h3>
              </div>
            </div>
            
            {/* 메시지 */}
            <div className="p-6">
              <p className="text-slate-700 dark:text-slate-300 text-center">
                {confirmModalMessage}
              </p>
            </div>
            
            {/* 버튼 */}
            <div className="flex border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setConfirmModalCallback(null)
                }}
                className="flex-1 py-3 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  if (confirmModalCallback) {
                    confirmModalCallback()
                  }
                  setConfirmModalCallback(null)
                }}
                className="flex-1 py-3 font-medium transition-colors border-l border-slate-200 dark:border-slate-700"
                style={{ backgroundColor: '#00BBAE', color: 'white' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummaryModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            // 배경 클릭 시 닫기
            if (e.target === e.currentTarget) {
              setShowSummaryModal(false)
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            {/* 타이틀 영역 - 바탕색 #00BBAE */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700" style={{ backgroundColor: '#00BBAE' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">요약</h2>
                    <p className="text-sm text-white/80">AI가 생성한 내용 요약</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowSummaryModal(false)} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* 요약 언어 선택 */}
            <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm text-slate-600 dark:text-slate-400">요약 언어:</label>
                <select
                  value={summaryLanguage}
                  onChange={(e) => loadOrGenerateSummaryForLanguage(e.target.value)}
                  disabled={isSummarizing}
                  className={`px-3 py-1 rounded-lg border text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    savedSummaries[summaryLanguage]
                      ? "border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-600"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  }`}
                >
                  {TARGET_LANGUAGES.filter(l => l.code !== "none").map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name} {savedSummaries[lang.code] ? "✓" : ""}
                    </option>
                  ))}
                </select>
                
                {/* 저장된 요약 언어 버튼들 */}
                {Object.keys(savedSummaries).length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 mr-1">저장됨:</span>
                    {Object.keys(savedSummaries).map(code => {
                      const lang = LANGUAGES.find(l => l.code === code)
                      return (
                        <button
                          key={code}
                          onClick={() => loadOrGenerateSummaryForLanguage(code)}
                          className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                            summaryLanguage === code
                              ? "bg-teal-500 text-white"
                              : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                          }`}
                        >
                          {lang?.flag || code}
                        </button>
                      )
                    })}
                  </div>
                )}
                
                {!isSummarizing && summaryText && summarySessionId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSavedSummaries(prev => {
                        const newSummaries = { ...prev }
                        delete newSummaries[summaryLanguage]
                        return newSummaries
                      })
                      loadOrGenerateSummaryForLanguage(summaryLanguage)
                    }}
                    className="ml-auto"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    다시 요약
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isSummarizing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">AI가 요약을 생성하고 있습니다...</p>
                </div>
              ) : (
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                    {summaryText}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Modal - 회의기록 보기/편집 */}
      {showDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700" style={{ backgroundColor: '#CCFBF1' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-teal-500">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-teal-800">회의기록</h2>
                    <p className="text-sm text-teal-600">
                      {isEditingDocument ? "마크다운 편집 모드" : "AI가 정리한 문서"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 편집 버튼 */}
                  {!isEditingDocument && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={startEditingDocument}
                      className="border-teal-400 text-teal-700 hover:bg-teal-100"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      편집
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => { setShowDocumentModal(false); setIsEditingDocument(false); }} className="hover:bg-teal-200">
                    <X className="h-5 w-5 text-teal-700" />
                  </Button>
                </div>
              </div>
              
              {/* 언어 탭 */}
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => { setDocumentViewTab("original"); if (isEditingDocument) setEditDocumentText(documentTextOriginal); }}
                  variant={documentViewTab === "original" ? "default" : "outline"}
                  size="sm"
                  className={documentViewTab === "original" 
                    ? "bg-teal-600 text-white hover:bg-teal-700" 
                    : "border-teal-400 text-teal-700 hover:bg-teal-100"}
                >
                  {getLanguageInfo(sourceLanguage).flag} {getLanguageInfo(sourceLanguage).name}
                </Button>
                {documentTextTranslated && (
                  <Button
                    onClick={() => { setDocumentViewTab("translated"); if (isEditingDocument) setEditDocumentText(documentTextTranslated); }}
                    variant={documentViewTab === "translated" ? "default" : "outline"}
                    size="sm"
                    className={documentViewTab === "translated" 
                      ? "bg-teal-600 text-white hover:bg-teal-700" 
                      : "border-teal-400 text-teal-700 hover:bg-teal-100"}
                  >
                    {getLanguageInfo(targetLanguage).flag} {getLanguageInfo(targetLanguage).name}
                  </Button>
                )}
              </div>
            </div>

            {/* 본문 - 마크다운 렌더링 또는 편집 */}
            <div className="flex-1 overflow-y-auto p-6">
              {isEditingDocument ? (
                // 편집 모드: 마크다운 원본 편집
                <textarea
                  value={editDocumentText}
                  onChange={(e) => setEditDocumentText(e.target.value)}
                  className="w-full h-full min-h-[400px] p-4 font-mono text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="마크다운 형식으로 편집하세요..."
                />
              ) : (
                // 보기 모드: 마크다운 시각화 (깔끔한 문서 스타일)
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                  <div className="document-view prose prose-lg prose-slate dark:prose-invert max-w-none
                    prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-slate-100
                    prose-h1:text-2xl prose-h1:border-b-2 prose-h1:border-slate-300 prose-h1:pb-3 prose-h1:mb-6
                    prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-slate-700 dark:prose-h2:text-slate-200
                    prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                    prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                    prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-semibold
                    prose-ul:my-4 prose-ul:space-y-2
                    prose-ol:my-4 prose-ol:space-y-2
                    prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-li:leading-relaxed
                    prose-li:marker:text-slate-500
                    [&_ul]:list-disc [&_ul]:pl-6
                    [&_ul_ul]:list-[circle] [&_ul_ul]:pl-6 [&_ul_ul]:mt-2
                    [&_ul_ul_ul]:list-[square] [&_ul_ul_ul]:pl-6 [&_ul_ul_ul]:mt-2
                    prose-blockquote:border-l-4 prose-blockquote:border-teal-500 prose-blockquote:bg-teal-50 dark:prose-blockquote:bg-teal-900/20 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:italic
                    prose-hr:my-8 prose-hr:border-slate-300
                    prose-code:bg-slate-100 dark:prose-code:bg-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                    prose-table:border-collapse prose-table:w-full
                    prose-th:bg-slate-100 dark:prose-th:bg-slate-700 prose-th:border prose-th:border-slate-300 prose-th:p-3 prose-th:text-left
                    prose-td:border prose-td:border-slate-300 prose-td:p-3
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {documentViewTab === "original" ? documentTextOriginal : documentTextTranslated}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {/* 하단 버튼 */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 flex-wrap">
              {isEditingDocument ? (
                // 편집 모드 버튼
                <>
                  <Button
                    onClick={saveEditedDocument}
                    disabled={isSavingDocument}
                    className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white"
                  >
                    {isSavingDocument ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />저장 중...</>
                    ) : (
                      <><Save className="h-4 w-4 mr-2" />저장 (자동 번역)</>
                    )}
                  </Button>
                  <Button
                    onClick={cancelEditingDocument}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    취소
                  </Button>
                </>
              ) : (
                // 보기 모드 버튼
                <>
                  <Button
                    onClick={async () => {
                      const text = documentViewTab === "original" ? documentTextOriginal : documentTextTranslated
                      await navigator.clipboard.writeText(text)
                      alert("클립보드에 복사되었습니다!")
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    복사
                  </Button>
                  <Button
                    onClick={downloadMarkdown}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    .md
                  </Button>
                  <Button
                    onClick={printDocument}
                    variant="outline"
                    size="sm"
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    프린트
                  </Button>
                  <Button
                    onClick={async () => {
                      await saveDocumentToDb(documentTextOriginal, documentTextTranslated)
                      alert("DB에 저장되었습니다!")
                    }}
                    variant="outline"
                    size="sm"
                    className="border-green-400 text-green-600 hover:bg-green-50"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    저장
                  </Button>
                  <div className="flex-1" />
                  <Button
                    onClick={() => setShowDocumentModal(false)}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
                  >
                    닫기
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            {/* 설정 모달 헤더 */}
            <div className="p-4 rounded-t-2xl" style={{ backgroundColor: '#00BBAE' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">실시간 통역 설정</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 pb-8 overflow-y-auto max-h-[calc(90vh-80px)]">

              <div className="space-y-4">
                {/* 음성 식별 (TTS 성별) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-3">🎤 음성 식별</h3>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    TTS 음성 성별
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAudioSettings(prev => ({ ...prev, ttsGender: "male" }))}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                        audioSettings.ttsGender === "male"
                          ? "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      👨 남성
                    </button>
                    <button
                      onClick={() => setAudioSettings(prev => ({ ...prev, ttsGender: "female" }))}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                        audioSettings.ttsGender === "female"
                          ? "border-pink-400 bg-pink-50 text-pink-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      👩 여성
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Google Cloud TTS (Neural2 고품질 음성)</p>
                </div>

                {/* 기록 저장 */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      💾 기록 저장
                    </label>
                    <p className="text-xs text-slate-500">통역 내용을 DB에 저장</p>
                  </div>
                  <button
                    onClick={() => setSaveToDb(!saveToDb)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      saveToDb ? "bg-teal-500" : "bg-slate-300"
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      saveToDb ? "translate-x-6" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>

                {/* 회의록 자동작성 */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      📝 회의록 자동작성
                    </label>
                    <p className="text-xs text-slate-500">종료 시 자동으로 문서 정리 및 저장</p>
                  </div>
                  <button
                    onClick={() => setAudioSettings(prev => ({ ...prev, realtimeSummary: !prev.realtimeSummary }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      audioSettings.realtimeSummary ? "bg-teal-500" : "bg-slate-300"
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      audioSettings.realtimeSummary ? "translate-x-6" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>

                {/* 회의 참석자 관리 */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-3">👥 회의 참석자 관리</h3>
                  
                  {/* 공개 설정 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      회의 공개 범위
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAudioSettings(prev => ({ ...prev, meetingAccessType: "public" }))}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          audioSettings.meetingAccessType === "public"
                            ? "bg-teal-500 text-white"
                            : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200"
                        }`}
                      >
                        🌐 모두 공개
                      </button>
                      <button
                        onClick={() => setAudioSettings(prev => ({ ...prev, meetingAccessType: "private" }))}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          audioSettings.meetingAccessType === "private"
                            ? "bg-teal-500 text-white"
                            : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200"
                        }`}
                      >
                        🔒 초대된 사용자만
                      </button>
                    </div>
                  </div>

                  {/* 이메일 초대 (비공개일 때만) */}
                  {audioSettings.meetingAccessType === "private" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        참석자 이메일 (쉼표로 구분)
                      </label>
                      <textarea
                        value={audioSettings.allowedEmails.join(", ")}
                        onChange={(e) => {
                          const emails = e.target.value.split(",").map(email => email.trim()).filter(email => email)
                          setAudioSettings(prev => ({ ...prev, allowedEmails: emails }))
                        }}
                        placeholder="user1@example.com, user2@example.com"
                        className="w-full h-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {audioSettings.allowedEmails.length}명의 참석자가 등록됨
                      </p>
                    </div>
                  )}
                </div>

                {/* 음성 테스트 버튼 */}
                <Button
                  onClick={() => speakText("안녕하세요, 음성 테스트입니다.", "ko")}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  음성 테스트
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-2 space-y-2">
          {/* 1. 상단 타이틀바 - YouTube 스타일 */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg">
            <div className="px-4 py-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">실시간 음성 통역</h1>
                <p className="text-sm text-white/80">마이크로 말하면 실시간으로 번역됩니다</p>
              </div>
              {/* 우측 버튼들 */}
              <div className="flex items-center gap-2">
                {/* 요약 버튼 */}
                {transcripts.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      summarizeCurrentSession()
                    }}
                    disabled={isSummarizing}
                    title="현재 세션 요약"
                    className="text-white hover:bg-white/20"
                  >
                    {isSummarizing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                  </Button>
                )}
                {/* 기록 목록 버튼 */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setShowSessionList(true)
                    loadSessions()
                  }}
                  className="text-white hover:bg-white/20 relative"
                  title="통역 기록 목록"
                >
                  <List className="h-5 w-5" />
                  {sessions.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-white text-teal-600 text-[10px] rounded-full flex items-center justify-center font-bold">
                      {sessions.length > 9 ? '9+' : sessions.length}
                    </span>
                  )}
                </Button>
                {/* 설정 버튼 */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowSettings(true)}
                  className="text-white hover:bg-white/20"
                  title="설정"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* 2. 통역 패널 - YouTube 스타일 */}
          <Card className="border-2 border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-900 shadow-lg">
            <CardContent className="p-5">
              {/* 세션 타이틀 행 */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-teal-100 dark:border-teal-800">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isEditingCurrentTitle || (!sessionId && !currentSessionTitle) ? (
                      <input
                        type="text"
                        value={editCurrentTitleText}
                        onChange={(e) => setEditCurrentTitleText(e.target.value)}
                        placeholder="통역 세션 제목을 입력하세요..."
                        className="flex-1 h-10 px-3 rounded-lg border border-teal-300 dark:border-teal-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && sessionId) {
                            updateCurrentSessionTitle()
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {currentSessionTitle || "새 통역 세션"}
                      </h2>
                    )}
                    
                    {/* 저장/수정 버튼 */}
                    {isEditingCurrentTitle || (!sessionId && !currentSessionTitle) ? (
                      sessionId && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={updateCurrentSessionTitle}
                            className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            저장
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsEditingCurrentTitle(false)
                              setEditCurrentTitleText("")
                            }}
                            className="rounded-lg"
                          >
                            취소
                          </Button>
                        </div>
                      )
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsEditingCurrentTitle(true)
                          setEditCurrentTitleText(currentSessionTitle)
                        }}
                        className="text-teal-600 hover:text-teal-700 hover:bg-teal-100 dark:hover:bg-teal-800/30 rounded-lg"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        수정
                      </Button>
                    )}
                  </div>
                  
                  {/* 생성일시 + 진행시간 */}
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      📅 {currentSessionCreatedAt && !isNaN(currentSessionCreatedAt.getTime())
                        ? currentSessionCreatedAt.toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : sessionId ? "생성 중..." : "마이크 시작 시 생성됩니다"
                      }
                    </p>
                    {/* 진행 시간 표시 */}
                    {sessionId && (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-mono ${
                        isListening || isCapturingSystemAudio
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}>
                        <span className={isListening || isCapturingSystemAudio ? "animate-pulse" : ""}>⏱️</span>
                        <span>{formatElapsedTime(elapsedSeconds)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 언어 선택 행 */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-teal-50/50 dark:bg-slate-800/60 rounded-xl">
              {/* Source Language */}
              <div className="flex-1">
                <label className="block text-xs text-teal-700 dark:text-teal-300 mb-1 font-medium">음성 언어</label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => handleSourceLanguageChange(e.target.value)}
                  disabled={isListening}
                  className="w-full h-11 px-3 rounded-lg border border-teal-300 dark:border-teal-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                {/* 자동 감지 기능 제거됨 */}
              </div>

              <ArrowRight className="h-5 w-5 text-teal-500 mt-5" />

              {/* Target Language */}
              <div className="flex-1">
                <label className="block text-xs text-teal-700 dark:text-teal-300 mb-1 font-medium">번역 언어</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => handleTargetLanguageChange(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-teal-300 dark:border-teal-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {TARGET_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} disabled={lang.code !== "none" && lang.code === sourceLanguage}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 설정 버튼 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
                className="mt-5 text-teal-600 hover:bg-teal-100 dark:hover:bg-teal-800/30"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
            
            {/* 언어 안내 문구 */}
            <p className="text-xs text-teal-600 dark:text-teal-400 mb-3 -mt-2 px-1">
              * 음성언어와 번역언어가 동일하게 선택되면 해당 언어로만 문서정리를 해줍니다
            </p>

            {/* 컨트롤 버튼 (한 줄 정렬) */}
            <div className="flex items-center justify-center flex-wrap gap-2 pt-3 border-t border-teal-200 dark:border-teal-700">
              {/* 목록 버튼 - 민트색 배경 */}
              <Button
                onClick={() => {
                  // 타이머 중지 및 초기화
                  stopSessionTimer()
                  setSessionStartTime(null)
                  setElapsedSeconds(0)
                  
                  setSessionId(null)
                  setTranscripts([])
                  setCurrentSessionTitle("")
                  setCurrentSessionCreatedAt(null)
                  setDocumentTextOriginal("")
                  setDocumentTextTranslated("")
                  setHasMoreUtterances(false)
                  setTotalUtteranceCount(0)
                  loadSessions()
                }}
                size="sm"
                className="h-10 px-4 rounded-full bg-teal-100 text-teal-700 hover:bg-teal-200 hover:text-teal-800 border border-teal-300"
                title="통역 기록 목록으로 이동"
              >
                <List className="h-4 w-4 mr-1" />
                목록
              </Button>
              
              {/* TTS 중지 버튼 */}
              {isSpeaking && (
                <Button
                  onClick={stopSpeaking}
                  size="sm"
                  variant="outline"
                  className="h-10 px-3 rounded-full border-teal-400"
                >
                  <VolumeX className="h-4 w-4 mr-1" />
                  중지
                </Button>
              )}
              
              {/* 마이크 버튼 */}
                <Button
                  onClick={toggleListening}
                  disabled={isCapturingSystemAudio}
                  className={`h-12 px-5 rounded-full shadow-lg transition-all ${
                    isListening && !isSystemAudioMode
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : isCapturingSystemAudio
                        ? "bg-slate-300 cursor-not-allowed"
                        : "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                  }`}
                  title="마이크로 음성 인식"
                >
                  {isListening && !isSystemAudioMode ? (
                    <>
                      <MicOff className="h-5 w-5 mr-1" />
                      <span className="font-bold">중지</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5 mr-1" />
                      <span className="font-bold">마이크</span>
                    </>
                  )}
                </Button>
                
                {/* PC 소리 버튼 */}
                <Button
                  onClick={toggleSystemAudioCapture}
                  disabled={isListening && !isSystemAudioMode}
                  className={`h-12 px-5 rounded-full shadow-lg transition-all ${
                    isCapturingSystemAudio
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : isListening && !isSystemAudioMode
                        ? "bg-slate-300 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  }`}
                  title="PC에서 재생되는 소리 인식 (영상, 음악 등)"
                >
                  {isCapturingSystemAudio ? (
                    <>
                      <VolumeX className="h-5 w-5 mr-1" />
                      <span className="font-bold">중지</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-5 w-5 mr-1" />
                      <span className="font-bold">PC소리</span>
                    </>
                  )}
                </Button>
                
                {/* 회의 종료 버튼 - 회의기록 저장 후 회색 표시 */}
                {sessionId && (
                  <Button
                    onClick={finalizeSession}
                    size="sm"
                    variant="outline"
                    className={`h-10 px-3 rounded-full border-2 ${
                      documentTextOriginal
                        ? "border-slate-300 text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-500"
                        : "border-orange-400 text-orange-600 hover:bg-orange-100 hover:border-orange-500 hover:text-orange-700 dark:hover:bg-orange-900/30 dark:hover:text-orange-400"
                    }`}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    종료
                  </Button>
                )}
                
                {/* 문장 재정리 버튼들 (내용이 있을 때만 표시) */}
                {transcripts.length >= 2 && !isListening && (
                  <>
                    <Button
                      onClick={reorganizeSentences}
                      disabled={isReorganizing}
                      size="sm"
                      variant="outline"
                      className={`h-10 px-3 rounded-full border-2 ${
                        documentTextOriginal
                          ? "border-slate-300 text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-500"
                          : "border-purple-400 text-purple-600 hover:bg-purple-100 hover:border-purple-500 hover:text-purple-700 dark:hover:bg-purple-900/30"
                      }`}
                      title="AI가 끊어진 문장을 자동으로 합쳐서 재번역합니다"
                    >
                      {isReorganizing ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      AI 재정리
                    </Button>
                    
                    {!mergeMode ? (
                      <Button
                        onClick={() => setMergeMode(true)}
                        size="sm"
                        variant="outline"
                        className={`h-10 px-3 rounded-full border-2 ${
                          documentTextOriginal
                            ? "border-slate-300 text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-500"
                            : "border-blue-400 text-blue-600 hover:bg-blue-100 hover:border-blue-500 hover:text-blue-700 dark:hover:bg-blue-900/30"
                        }`}
                        title="문장을 직접 선택하여 합칩니다"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        수동 병합
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={mergeSelectedSentences}
                          disabled={selectedForMerge.size < 2 || isReTranslating}
                          size="sm"
                          className="h-10 px-3 rounded-full bg-blue-500 text-white hover:bg-blue-600"
                        >
                          {isReTranslating ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          합치기 ({selectedForMerge.size})
                        </Button>
                        <Button
                          onClick={cancelMergeMode}
                          size="sm"
                          variant="outline"
                          className="h-10 px-3 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    {/* 문서로 정리 버튼 - 회의기록 저장 후 회색 표시 */}
                    <Button
                      onClick={generateDocument}
                      disabled={isDocumenting}
                      size="sm"
                      variant="outline"
                      className={`h-10 px-3 rounded-full border-2 ${
                        documentTextOriginal
                          ? "border-slate-300 text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-500"
                          : "border-green-400 text-green-600 hover:bg-green-100 hover:border-green-500 hover:text-green-700 dark:hover:bg-green-900/30"
                      }`}
                      title="통역 내용을 문서로 정리합니다"
                    >
                      {isDocumenting ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-1" />
                      )}
                      문서 정리
                    </Button>
                    
                    {/* 회의기록보기 버튼 (문서가 생성된 경우에만) */}
                    {documentTextOriginal && (
                      <Button
                        onClick={() => setShowDocumentInPanel(true)}
                        size="sm"
                        variant="outline"
                        className="h-10 px-3 rounded-full border-2 border-emerald-400 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-500 hover:text-emerald-700 dark:hover:bg-emerald-900/30"
                        title="정리된 문서 보기"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        회의기록
                      </Button>
                    )}
                    
                    {/* 요약본 버튼 (문서가 생성된 경우에만) */}
                    {documentTextOriginal && (
                      <Button
                        onClick={() => summarizeCurrentSession()}
                        disabled={isSummarizing}
                        size="sm"
                        variant="outline"
                        className="h-10 px-3 rounded-full border-2 border-amber-400 text-amber-600 hover:bg-amber-100 hover:border-amber-500 hover:text-amber-700 dark:hover:bg-amber-900/30"
                        title="회의 내용 요약"
                      >
                        {isSummarizing ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-1" />
                        )}
                        요약본
                      </Button>
                    )}
                  </>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 3. 기록 목록 (통역이 시작되지 않았을 때 메인에 표시) */}
        {!sessionId && transcripts.length === 0 && (
          <Card className="border-teal-200 dark:border-teal-800 overflow-hidden" style={{ backgroundColor: '#CCFBF1' }}>
            <CardHeader className="pb-2 pt-4" style={{ backgroundColor: '#CCFBF1' }}>
              <CardTitle className="text-lg flex items-center gap-2 text-teal-800">
                <List className="h-5 w-5" />
                통역 기록
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-white dark:bg-slate-900">
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Mic className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>저장된 기록이 없습니다.</p>
                  <p className="text-sm mt-1">마이크 버튼을 눌러 통역을 시작해보세요.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        sessionId === session.id 
                          ? "border-teal-400 bg-teal-50" 
                          : "border-teal-200"
                      }`}
                      style={{ backgroundColor: 'white' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CCFBF1'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      onClick={() => loadSessionData(session)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {session.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(session.created_at).toLocaleDateString("ko-KR", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                          {/* 원어 → 번역어 표시 */}
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700">
                              {getLanguageInfo(session.source_language).flag} {getLanguageInfo(session.source_language).name}
                            </span>
                            <span className="text-slate-400 text-xs">→</span>
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700">
                              {session.target_languages.map(t => `${getLanguageInfo(t).flag} ${getLanguageInfo(t).name}`).join(", ")}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async (e) => {
                              e.stopPropagation()
                              await loadSessionData(session)
                              setShowDocumentInPanel(true)
                            }}
                            title="회의록 보기"
                          >
                            <FileText className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              summarizeSession(session.id)
                            }}
                            title="요약 보기"
                          >
                            <Sparkles className="h-4 w-4 text-amber-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSession(session.id)
                            }}
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4. 통역 결과 또는 회의기록 보기 */}
        {(sessionId || transcripts.length > 0 || showDocumentInPanel) && (
        <Card className="mb-4 overflow-hidden border-0 shadow-md">
          <CardHeader className="pb-2" style={{ backgroundColor: '#CCFBF1' }}>
            <CardTitle className="text-lg flex items-center gap-2">
              {showDocumentInPanel ? (
                <>
                  <FileText className="h-5 w-5 text-green-500" />
                  회의기록
                  {/* 언어 전환 탭 */}
                  <div className="flex gap-1 ml-4">
                    <Button
                      onClick={() => { setDocumentViewTab("original"); if (isEditingDocument) setEditDocumentText(documentTextOriginal); }}
                      variant={documentViewTab === "original" ? "default" : "ghost"}
                      size="sm"
                      className={`h-7 px-2 text-xs ${documentViewTab === "original" ? "bg-teal-500 text-white" : ""}`}
                    >
                      {getLanguageInfo(sourceLanguage).flag} 원문
                    </Button>
                    {documentTextTranslated && (
                      <Button
                        onClick={() => { setDocumentViewTab("translated"); if (isEditingDocument) setEditDocumentText(documentTextTranslated); }}
                        variant={documentViewTab === "translated" ? "default" : "ghost"}
                        size="sm"
                        className={`h-7 px-2 text-xs ${documentViewTab === "translated" ? "bg-teal-500 text-white" : ""}`}
                      >
                        {getLanguageInfo(targetLanguage).flag} 번역
                      </Button>
                    )}
                  </div>
                  {/* 편집/저장 버튼 */}
                  <div className="flex gap-1 ml-auto">
                    {isEditingDocument ? (
                      <>
                        <Button
                          onClick={saveEditedDocument}
                          disabled={isSavingDocument}
                          size="sm"
                          className="h-7 px-2 text-xs bg-green-500 hover:bg-green-600 text-white"
                        >
                          {isSavingDocument ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                          저장
                        </Button>
                        <Button
                          onClick={cancelEditingDocument}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={startEditingDocument}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          title="마크다운 편집"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          편집
                        </Button>
                        <Button
                          onClick={printDocument}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          title="프린트"
                        >
                          <Printer className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={downloadMarkdown}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          title=".md 다운로드"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => setShowDocumentInPanel(false)}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-slate-500"
                          title="통역 결과로 돌아가기"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Globe className="h-5 w-5 text-teal-500" />
                  통역 결과
                  {isSpeaking && (
                    <span className="text-xs text-teal-500 animate-pulse ml-2">🔊 재생 중...</span>
                  )}
                  {/* 회의기록 보기 버튼 */}
                  {documentTextOriginal && (
                    <Button
                      onClick={() => setShowDocumentInPanel(true)}
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs ml-auto text-green-600 hover:text-green-700"
                      title="회의기록 보기"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      회의기록
                    </Button>
                  )}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 회의기록 보기 모드 */}
            {showDocumentInPanel ? (
              <div className="min-h-[300px]">
                {isEditingDocument ? (
                  // 편집 모드
                  <textarea
                    value={editDocumentText}
                    onChange={(e) => setEditDocumentText(e.target.value)}
                    className="w-full min-h-[400px] p-4 font-mono text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="마크다운 형식으로 편집하세요..."
                  />
                ) : (
                  // 마크다운 렌더링 (깔끔한 문서 스타일)
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-6 min-h-[400px] overflow-auto">
                    <div className="document-view prose prose-lg prose-slate dark:prose-invert max-w-none
                      prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-slate-100
                      prose-h1:text-2xl prose-h1:border-b-2 prose-h1:border-slate-300 prose-h1:pb-3 prose-h1:mb-6
                      prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-slate-700 dark:prose-h2:text-slate-200
                      prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                      prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                      prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-semibold
                      prose-ul:my-4 prose-ul:space-y-2
                      prose-ol:my-4 prose-ol:space-y-2
                      prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-li:leading-relaxed
                      prose-li:marker:text-slate-500
                      [&_ul]:list-disc [&_ul]:pl-6
                      [&_ul_ul]:list-[circle] [&_ul_ul]:pl-6 [&_ul_ul]:mt-2
                      [&_ul_ul_ul]:list-[square] [&_ul_ul_ul]:pl-6 [&_ul_ul_ul]:mt-2
                      prose-blockquote:border-l-4 prose-blockquote:border-teal-500 prose-blockquote:bg-teal-50 dark:prose-blockquote:bg-teal-900/20 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:italic
                      prose-hr:my-8 prose-hr:border-slate-300
                      prose-code:bg-slate-100 dark:prose-code:bg-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                      prose-table:border-collapse prose-table:w-full
                      prose-th:bg-slate-100 dark:prose-th:bg-slate-700 prose-th:border prose-th:border-slate-300 prose-th:p-3 prose-th:text-left
                      prose-td:border prose-td:border-slate-300 prose-td:p-3
                    ">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {documentViewTab === "original" ? documentTextOriginal : documentTextTranslated}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 병합 모드 안내 */}
                {mergeMode && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      <strong>수동 병합 모드</strong>: 합칠 문장을 클릭하여 선택하세요 (2개 이상)
                    </p>
                  </div>
                )}

                {/* AI 재정리 중 안내 */}
                {isReorganizing && (
                  <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI가 끊어진 문장을 분석하고 재구성 중입니다...
                    </p>
                  </div>
                )}

                <div
                  ref={transcriptContainerRef}
                  className="space-y-4 p-2"
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

                  {/* 현재 인식 중인 텍스트 (상단 고정) */}
                  {currentTranscript && (
                    <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border-2 border-teal-300 dark:border-teal-700 shadow-md sticky top-0 z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-medium text-teal-700 dark:text-teal-300">실시간 인식 중...</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{getLanguageInfo(sourceLanguage).flag}</span>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{currentTranscript}</p>
                      </div>
                    </div>
                  )}

                  {/* 번역 중 표시 */}
                  {isTranslating && (
                    <div className="flex items-center justify-center gap-2 text-teal-500 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">번역 중...</span>
                    </div>
                  )}

              {transcripts.map((item) => (
                <div
                  key={item.id}
                  className={`bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2 transition-all ${
                    mergeMode && selectedForMerge.has(item.id)
                      ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : ""
                  } ${mergeMode ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" : ""}`}
                  onClick={() => mergeMode && toggleSelectForMerge(item.id)}
                >
                  {/* 원문 영역 */}
                  <div className="flex items-start gap-2">
                    {/* 병합 모드 체크박스 */}
                    {mergeMode && (
                      <div className="flex-shrink-0 mt-1">
                        <input
                          type="checkbox"
                          checked={selectedForMerge.has(item.id)}
                          onChange={() => toggleSelectForMerge(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 rounded border-blue-400 text-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    <span className="text-lg">{getLanguageInfo(item.sourceLanguage).flag}</span>
                    
                    {editingId === item.id ? (
                      <div className="flex-1 space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => updateUtterance(item.id, editText)}
                            disabled={isReTranslating || !editText.trim()}
                            className="bg-teal-500 hover:bg-teal-600 text-white"
                          >
                            {isReTranslating ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Check className="h-4 w-4 mr-1" />
                            )}
                            저장
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditingId(null); setEditText(""); }}
                            disabled={isReTranslating}
                          >
                            <X className="h-4 w-4 mr-1" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-700 dark:text-slate-300 flex-1">{item.original}</p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 shrink-0"
                          onClick={() => { setEditingId(item.id); setEditText(item.original); }}
                          title="원문 수정"
                        >
                          <Edit3 className="h-4 w-4 text-slate-500 hover:text-teal-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 shrink-0"
                          onClick={() => deleteTranscriptItem(item)}
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 shrink-0"
                          onClick={() => speakText(item.original, item.sourceLanguage)}
                          title="원문 재생"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {/* 번역 영역 - 번역이 있을 때만 표시 */}
                  {item.targetLanguage !== "none" && item.translated && (
                    <div className="flex items-start gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-lg">{getLanguageInfo(item.targetLanguage).flag}</span>
                      <p className="text-teal-600 dark:text-teal-400 font-medium flex-1">
                        {editingId === item.id && isReTranslating ? (
                          <span className="flex items-center gap-2 text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            번역 중...
                          </span>
                        ) : item.translated}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 shrink-0"
                        onClick={() => speakText(item.translated, item.targetLanguage)}
                        title="번역문 재생"
                        disabled={editingId === item.id && isReTranslating}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {/* 원문만 기록 모드 표시 */}
                  {item.targetLanguage === "none" && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        📝 원문만 기록 (번역 없음)
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 text-right">
                    {item.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              ))}

              {/* 더 보기 버튼 */}
              {hasMoreUtterances && (
                <div className="flex justify-center py-4">
                  <Button
                    onClick={loadMoreUtterances}
                    disabled={isLoadingMore}
                    variant="outline"
                    className="px-6 py-2 text-teal-600 border-teal-300 hover:bg-teal-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        로딩 중...
                      </>
                    ) : (
                      <>
                        더 보기 ({transcripts.length}/{totalUtteranceCount})
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* 실시간 인식 텍스트와 번역 중 표시는 상단으로 이동됨 */}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        )}
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
