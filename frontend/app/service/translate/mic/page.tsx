"use client"

import { useState, useRef, useEffect, Suspense } from "react"
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
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

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
  
  // 언어 자동 감지 기능 제거됨 (Web Speech API 호환성 문제)
  
  // 요약 관련
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryText, setSummaryText] = useState("")
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summarySessionId, setSummarySessionId] = useState<string | null>(null)
  const [summaryLanguage, setSummaryLanguage] = useState("ko")
  const [savedSummaries, setSavedSummaries] = useState<Record<string, string>>({}) // 언어별 저장된 요약
  const [hasExistingSummary, setHasExistingSummary] = useState(false)
  const [previewSummary, setPreviewSummary] = useState<{sessionId: string, text: string} | null>(null) // 목록 말풍선 요약
  
  // 문장 재정리 관련
  const [isReorganizing, setIsReorganizing] = useState(false) // AI 재정리 중
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set()) // 수동 병합용 선택된 항목
  const [mergeMode, setMergeMode] = useState(false) // 수동 병합 모드
  
  const supabase = createClient()
  
  // 오디오 설정 (로컬 스토리지에서 불러오기)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("unilang_audio_settings")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // 파싱 실패 시 기본값 사용
        }
      }
    }
    return {
      autoPlayTTS: false,
      ttsVolume: 1,
      ttsRate: 1,
      selectedMicDevice: "",
      selectedSpeakerDevice: "",
      realtimeSummary: false,
      meetingAccessType: "private" as const,
      allowedEmails: [],
    }
  })

  // 오디오 설정 변경 시 자동 저장 및 ref 업데이트
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("unilang_audio_settings", JSON.stringify(audioSettings))
    }
    // stale closure 방지를 위해 ref도 업데이트
    audioSettingsRef.current = audioSettings
  }, [audioSettings])
  
  // 세션 ID 변경 시 ref 업데이트 (비동기 문제 해결)
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])
  
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
      
      // 버퍼 정리
      sentenceBufferRef.current = ""
      
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

  // TTS 재생
  const speakText = (text: string, languageCode: string) => {
    if (!("speechSynthesis" in window)) {
      setError("이 브라우저는 음성 합성을 지원하지 않습니다.")
      return
    }

    // 현재 재생 중이면 중지
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = getTTSLanguageCode(languageCode)
    utterance.volume = audioSettings.ttsVolume
    utterance.rate = audioSettings.ttsRate

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  // TTS 중지
  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
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
        
        const sessionNumber = (count || 0) + 1
        titleToUse = `통역 ${sessionNumber}`
      }
      
      const { data, error } = await supabase
        .from("translation_sessions")
        .insert({
          user_id: userId,
          title: titleToUse,
          session_type: "mic",
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

  // 발화 및 번역 저장
  const saveUtterance = async (
    sessionId: string,
    originalText: string,
    originalLang: string,
    translatedText: string,
    targetLang: string
  ): Promise<{ utteranceId?: string; translationId?: string }> => {
    if (!userId || !saveToDb) return {}
    
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
        console.error("발화 저장 실패:", utteranceError)
        return {}
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
      console.error("저장 오류:", err)
      return {}
    }
  }

  // 발화 삭제
  const deleteTranscriptItem = async (item: TranscriptItem) => {
    if (!confirm("이 발화를 삭제하시겠습니까?")) return
    
    // 로컬 상태에서 제거
    setTranscripts(prev => prev.filter(t => t.id !== item.id))
    
    // DB에서도 삭제
    if (item.utteranceId && saveToDb) {
      try {
        await supabase
          .from("utterances")
          .delete()
          .eq("id", item.utteranceId)
      } catch (err) {
        console.error("발화 삭제 오류:", err)
      }
    }
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
    if (!confirm("이 통역 기록을 삭제하시겠습니까?")) return
    
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
  }

  // 세션 불러오기 (과거 기록 보기)
  const loadSessionData = async (sessionToLoad: SessionItem) => {
    setIsLoadingSessions(true)
    try {
      console.log("세션 로드 시작:", sessionToLoad.id)
      
      // 발화 데이터 로드 (조인 없이)
      const { data: utterances, error: utteranceError } = await supabase
        .from("utterances")
        .select("id, original_text, original_language, created_at")
        .eq("session_id", sessionToLoad.id)
        .order("created_at", { ascending: false })
      
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

  // 회의 최종 종료 (저장 + 요약 생성)
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
    
    try {
      // 세션 상태를 완료로 변경
      await supabase
        .from("translation_sessions")
        .update({
          ended_at: new Date().toISOString(),
          status: "completed",
          total_utterances: transcripts.length
        })
        .eq("id", sessionId)
      
      // 내용이 있으면 자동 요약 생성
      if (transcripts.length > 0) {
        await summarizeCurrentSession()
      } else {
        // 내용이 없으면 세션 목록으로
        setSessionId(null)
        setCurrentSessionTitle("")
        setCurrentSessionCreatedAt(null)
        setShowSessionList(true)
        loadSessions()
      }
      
    } catch (err) {
      console.error("세션 종료 오류:", err)
      setError("회의 종료 중 오류가 발생했습니다.")
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

    // 선택된 항목들을 시간순으로 정렬
    const selectedItems = transcripts
      .filter(t => selectedForMerge.has(t.id))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // 원본 텍스트 합치기
    const mergedOriginal = selectedItems.map(t => t.original).join(" ")
    
    setIsReTranslating(true)

    try {
      // 합친 텍스트 번역
      let mergedTranslated = mergedOriginal
      if (targetLanguage !== "none" && sourceLanguage !== targetLanguage) {
        mergedTranslated = await translateText(mergedOriginal, sourceLanguage, targetLanguage)
      }

      // 새 항목 생성
      const newId = `merged_${Date.now()}`
      const newItem: TranscriptItem = {
        id: newId,
        original: mergedOriginal,
        translated: targetLanguage === "none" ? "" : mergedTranslated,
        sourceLanguage,
        targetLanguage,
        timestamp: selectedItems[0].timestamp, // 가장 빠른 시간 사용
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
    
    // 저장된 요약이 있으면 바로 표시
    if (savedSummaries[language]) {
      setSummaryText(savedSummaries[language])
      return
    }
    
    // 없으면 새로 생성
    setIsSummarizing(true)
    setSummaryText("")
    
    try {
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
    
    console.log("🔄 버퍼 플러시 (문장 완성):", bufferedText)
    
    // 버퍼 초기화
    sentenceBufferRef.current = ""
    
    // 타이머 클리어
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    
    // 번역 실행
    await translateAndAdd(bufferedText)
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

  // 번역 후 목록에 추가
  const translateAndAdd = async (text: string) => {
    if (!text.trim()) return

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
        timestamp: new Date(),
        utteranceId,
        translationId,
      }

      // 새 항목을 맨 앞에 추가 (최신이 위에)
      setTranscripts((prev) => [newItem, ...prev])
      
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
          sentenceBufferRef.current = trimmedText
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

  // 녹음 시작/중지
  const toggleListening = async () => {
    if (isListening) {
      // 중지
      isListeningRef.current = false
      
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
      
      // 세션 종료
      if (sessionId) {
        await endSession()
      }
    } else {
      // 시작 - 항상 새로 초기화
      setError(null)
      setCurrentTranscript("")
      
      // 새 세션 생성
      if (saveToDb && userId) {
        const newSessionId = await createSession()
        setSessionId(newSessionId)
        sessionIdRef.current = newSessionId // ref도 즉시 업데이트
      }
      
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

  return (
    <div className={`min-h-screen ${isEmbedded ? "bg-slate-50" : "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950"}`}>
      {/* Header - embedded 모드에서는 숨김 */}
      {!isEmbedded && (
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
                {/* 헤더 타이틀 고정 - 편집 모드 제거 */}
                {false && isEditingCurrentTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editCurrentTitleText}
                      onChange={(e) => setEditCurrentTitleText(e.target.value)}
                      className="px-2 py-1 text-sm font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateCurrentSessionTitle()
                        else if (e.key === "Escape") {
                          setIsEditingCurrentTitle(false)
                          setEditCurrentTitleText("")
                        }
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={updateCurrentSessionTitle}>
                      <Check className="h-4 w-4 text-teal-500" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setIsEditingCurrentTitle(false)
                      setEditCurrentTitleText("")
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <h1 className="font-bold text-slate-900 dark:text-white">
                      실시간 음성 통역
                    </h1>
                    {/* 헤더 타이틀은 고정 - 세션 제목은 아래 패널에서 관리 */}
                    {false && sessionId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setIsEditingCurrentTitle(true)
                          setEditCurrentTitleText(currentSessionTitle)
                        }}
                        title="제목 수정"
                      >
                        <Edit3 className="h-3 w-3 text-slate-400 hover:text-teal-500" />
                      </Button>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  {currentSessionCreatedAt && !isNaN(currentSessionCreatedAt.getTime())
                    ? currentSessionCreatedAt.toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : sessionId 
                      ? `기록 중 (${transcripts.length}개 발화)` 
                      : "마이크로 말하면 실시간 번역"
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 요약 버튼 - 현재 세션에 내용이 있을 때만 표시 */}
            {transcripts.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={summarizeCurrentSession}
                disabled={isSummarizing}
                title="현재 세션 요약"
              >
                {isSummarizing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5 text-amber-500" />
                )}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setShowSessionList(true)
                loadSessions()
              }}
              className="relative"
              title="통역 기록 목록"
            >
              <Menu className="h-5 w-5" />
              {sessions.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {sessions.length > 9 ? '9+' : sessions.length}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowSettings(true)}
              className="relative"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      )}

      {/* Session List Panel - YouTube와 동일한 슬라이드 패널 */}
      {showSessionList && (
        <div className="fixed inset-0 z-50 flex">
          {/* 오버레이 - 클릭하면 닫힘 */}
          <div 
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowSessionList(false)}
          />
          {/* 사이드 패널 */}
          <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
              {/* 돌아가기 버튼 */}
              <Button 
                variant="ghost" 
                onClick={() => setShowSessionList(false)}
                className="mb-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                돌아가기
              </Button>
              
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <List className="h-5 w-5 text-teal-500" />
                  통역 기록
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowSessionList(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-sm text-slate-500 mt-1">저장된 통역 세션 목록</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>저장된 통역 기록이 없습니다</p>
                  <p className="text-sm mt-2">마이크 통역을 시작하면 자동으로 저장됩니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`bg-slate-50 dark:bg-slate-800 rounded-xl p-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                        sessionId === session.id ? "ring-2 ring-teal-500" : ""
                      }`}
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

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">요약</h2>
                    <p className="text-sm text-slate-500">AI가 생성한 내용 요약</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowSummaryModal(false)}>
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
                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {TARGET_LANGUAGES.filter(l => l.code !== "none").map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name} {savedSummaries[lang.code] ? "✓" : ""}
                    </option>
                  ))}
                </select>
                
                {/* 저장된 요약 표시 */}
                {Object.keys(savedSummaries).length > 0 && (
                  <span className="text-xs text-teal-600 dark:text-teal-400">
                    저장됨: {Object.keys(savedSummaries).map(code => 
                      LANGUAGES.find(l => l.code === code)?.flag || code
                    ).join(" ")}
                  </span>
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

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <Button
                onClick={() => {
                  setShowSummaryModal(false)
                  // 요약 후 새 세션 시작 가능하도록 초기화
                  setSessionId(null)
                  setTranscripts([])
                  setCurrentSessionTitle("")
                  setCurrentSessionCreatedAt(null)
                  setDetectedLanguage(null)
                }}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600"
              >
                완료 - 새 통역 시작
              </Button>
              <Button
                onClick={() => {
                  setShowSummaryModal(false)
                  setShowSessionList(true)
                  loadSessions()
                }}
                className="w-full"
                variant="outline"
              >
                기록 목록 보기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">오디오 설정</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* 언어 설정 섹션 */}
                <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-4">🌐 언어 설정</h3>
                  
                  {/* 기본 번역 언어 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      기본 번역 언어
                    </label>
                    <p className="text-xs text-slate-500 mb-2">자동 감지 시 이 언어로 번역됩니다</p>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    >
                      {TARGET_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 오디오 설정 섹션 */}
                <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-4">🎧 오디오 장치</h3>
                  
                  {/* 마이크 선택 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      🎤 마이크 선택
                    </label>
                    <select
                      value={audioSettings.selectedMicDevice}
                      onChange={(e) => setAudioSettings(prev => ({ ...prev, selectedMicDevice: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="">기본 마이크</option>
                      {audioDevices.microphones.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `마이크 ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 스피커 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      🔊 스피커 선택
                    </label>
                    <select
                      value={audioSettings.selectedSpeakerDevice}
                      onChange={(e) => setAudioSettings(prev => ({ ...prev, selectedSpeakerDevice: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="">기본 스피커</option>
                      {audioDevices.speakers.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `스피커 ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* TTS 설정 섹션 */}
                <div>
                  <h3 className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-4">🔊 음성 재생 (TTS)</h3>
                  
                  {/* 자동 TTS 재생 */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        자동 음성 재생
                      </label>
                      <p className="text-xs text-slate-500">번역 완료 시 TTS로 자동 방송</p>
                    </div>
                    <button
                      onClick={() => setAudioSettings(prev => ({ ...prev, autoPlayTTS: !prev.autoPlayTTS }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        audioSettings.autoPlayTTS ? "bg-teal-500" : "bg-slate-300"
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        audioSettings.autoPlayTTS ? "translate-x-6" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                  
                  {audioSettings.autoPlayTTS && (
                    <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-xs text-teal-700 dark:text-teal-300 mb-4">
                      ✅ 번역이 완료되면 자동으로 TTS 음성이 재생됩니다
                    </div>
                  )}
                </div>

                {/* TTS 볼륨 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    음성 볼륨: {Math.round(audioSettings.ttsVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={audioSettings.ttsVolume}
                    onChange={(e) => setAudioSettings(prev => ({ ...prev, ttsVolume: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                </div>

                {/* TTS 속도 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    음성 속도: {audioSettings.ttsRate}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={audioSettings.ttsRate}
                    onChange={(e) => setAudioSettings(prev => ({ ...prev, ttsRate: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                </div>

                {/* DB 저장 설정 */}
                <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
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

                {/* 실시간 요약 설정 */}
                <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      ✨ 실시간 요약
                    </label>
                    <p className="text-xs text-slate-500">회의 종료 시 자동 요약 생성</p>
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

                {/* 회의 참석자 관리 섹션 */}
                <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-4">👥 회의 참석자 관리</h3>
                  
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
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        🌐 모두 공개
                      </button>
                      <button
                        onClick={() => setAudioSettings(prev => ({ ...prev, meetingAccessType: "private" }))}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          audioSettings.meetingAccessType === "private"
                            ? "bg-teal-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
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
                        className="w-full h-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {audioSettings.allowedEmails.length}명의 참석자가 등록됨
                      </p>
                    </div>
                  )}
                </div>

                {/* 테스트 버튼 */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  <Button
                    onClick={() => speakText("안녕하세요, 음성 테스트입니다.", "ko")}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-500"
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    음성 테스트
                  </Button>
                  
                  {/* 기록 보기 링크 */}
                  <Link href="/service/history">
                    <Button variant="outline" className="w-full">
                      <History className="h-4 w-4 mr-2" />
                      통역 기록 보기
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {/* 통합 컨트롤 패널 (민트색) */}
        <Card className="mb-4 border-2 border-teal-300 dark:border-teal-700 bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-50 dark:from-teal-900/30 dark:via-cyan-900/20 dark:to-teal-900/30 shadow-lg relative">
          {/* 우상단 목록 버튼 */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setShowSessionList(true)
              loadSessions()
            }}
            className="absolute top-3 right-3 z-10 hover:bg-teal-100 dark:hover:bg-teal-900/50"
            title="통역 기록 목록"
          >
            <Menu className="h-5 w-5 text-teal-600" />
            {sessions.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-teal-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {sessions.length > 9 ? '9+' : sessions.length}
              </span>
            )}
          </Button>
          
          <CardContent className="p-5">
            {/* 타이틀 행 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isEditingCurrentTitle || (!sessionId && !currentSessionTitle) ? (
                    <input
                      type="text"
                      value={editCurrentTitleText}
                      onChange={(e) => setEditCurrentTitleText(e.target.value)}
                      placeholder="통역 세션 제목을 입력하세요..."
                      className="flex-1 h-12 px-4 rounded-xl border-2 border-teal-300 dark:border-teal-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg font-bold focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && sessionId) {
                          updateCurrentSessionTitle()
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
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
                
                {/* 생성일시 */}
                <p className="text-sm text-teal-700 dark:text-teal-300 mt-1">
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
              </div>
            </div>

            {/* 언어 선택 행 */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl">
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

            {/* 컨트롤 버튼 + 상태 (한 줄 레이아웃) */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-teal-200 dark:border-teal-700">
              {/* 왼쪽: 상태 표시 */}
              <div className="flex items-center gap-2 text-sm min-w-[120px]">
                <div className={`h-2.5 w-2.5 rounded-full ${isListening ? "bg-green-500 animate-pulse" : sessionId ? "bg-yellow-500" : "bg-slate-300"}`} />
                <span className="text-teal-700 dark:text-teal-300 font-medium">
                  {isListening ? "녹음 중" : sessionId ? "일시정지" : "대기 중"}
                </span>
                {sessionId && (
                  <span className="text-teal-500 text-xs">
                    ({transcripts.length}개)
                  </span>
                )}
              </div>
              
              {/* 중앙: 버튼들 */}
              <div className="flex items-center gap-2">
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
                  className={`h-12 px-6 rounded-full shadow-lg transition-all ${
                    isListening
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-5 w-5 mr-1" />
                      <span className="font-bold">중지</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5 mr-1" />
                      <span className="font-bold">시작</span>
                    </>
                  )}
                </Button>
                
                {/* 회의 종료 버튼 */}
                {sessionId && (
                  <Button
                    onClick={finalizeSession}
                    size="sm"
                    variant="outline"
                    className="h-10 px-3 rounded-full border-2 border-orange-400 text-orange-600 hover:bg-orange-100 hover:border-orange-500 hover:text-orange-700 dark:hover:bg-orange-900/30 dark:hover:text-orange-400"
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
                      className="h-10 px-3 rounded-full border-2 border-purple-400 text-purple-600 hover:bg-purple-100 hover:border-purple-500 hover:text-purple-700 dark:hover:bg-purple-900/30"
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
                        className="h-10 px-3 rounded-full border-2 border-blue-400 text-blue-600 hover:bg-blue-100 hover:border-blue-500 hover:text-blue-700 dark:hover:bg-blue-900/30"
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
                  </>
                )}
              </div>
              
              {/* 오른쪽: TTS 표시 */}
              <div className="flex items-center gap-2 text-sm justify-end">
                {audioSettings.autoPlayTTS && (
                  <span className="text-teal-600 dark:text-teal-400 flex items-center gap-1">
                    <Volume2 className="h-3 w-3" /> TTS
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 통역 결과 */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-teal-500" />
              통역 결과
              {isSpeaking && (
                <span className="text-xs text-teal-500 animate-pulse ml-2">🔊 재생 중...</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
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

              {/* 실시간 인식 텍스트와 번역 중 표시는 상단으로 이동됨 */}
            </div>
          </CardContent>
        </Card>
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
