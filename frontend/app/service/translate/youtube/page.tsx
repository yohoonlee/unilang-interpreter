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
  Star,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

// 지원 언어 목록
const LANGUAGES = [
  // 원본 언어 (자동 감지)
  { code: "auto", name: "자동 감지", flag: "🌐" },
  // 주요 5개 언어 (상단 배치)
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "영어", flag: "🇺🇸" },
  { code: "zh", name: "중국어", flag: "🇨🇳" },
  { code: "ja", name: "일본어", flag: "🇯🇵" },
  { code: "es", name: "스페인어", flag: "🇪🇸" },
  // 나머지 언어 (알파벳순)
  { code: "ar", name: "아랍어", flag: "🇸🇦" },
  { code: "de", name: "독일어", flag: "🇩🇪" },
  { code: "fr", name: "프랑스어", flag: "🇫🇷" },
  { code: "hi", name: "힌디어", flag: "🇮🇳" },
  { code: "id", name: "인도네시아어", flag: "🇮🇩" },
  { code: "it", name: "이탈리아어", flag: "🇮🇹" },
  { code: "ms", name: "말레이어", flag: "🇲🇾" },
  { code: "nl", name: "네덜란드어", flag: "🇳🇱" },
  { code: "pl", name: "폴란드어", flag: "🇵🇱" },
  { code: "pt", name: "포르투갈어", flag: "🇧🇷" },
  { code: "ru", name: "러시아어", flag: "🇷🇺" },
  { code: "th", name: "태국어", flag: "🇹🇭" },
  { code: "tr", name: "터키어", flag: "🇹🇷" },
  { code: "vi", name: "베트남어", flag: "🇻🇳" },
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

// 사용자 시청 기록 인터페이스 (user_video_history 테이블)
interface UserVideoHistory {
  id: string
  user_id: string
  video_id: string
  target_lang: string
  is_starred: boolean
  viewed_at: string
  created_at: string
}

// YouTube 캐시 데이터 인터페이스 (video_subtitles_cache 테이블)
interface VideoCache {
  id: string
  video_id: string
  video_title: string | null
  original_lang: string
  subtitles: unknown
  translations: Record<string, unknown>
  summaries: Record<string, string>
  video_duration: number | null
  last_text_time: number | null
  created_at: string
  updated_at: string
}

// 통합 YouTube 세션 (history + cache JOIN)
interface YouTubeSession {
  // user_video_history 필드
  history_id: string
  user_id: string
  target_lang: string
  is_starred: boolean
  viewed_at: string
  // video_subtitles_cache 필드
  cache_id: string
  video_id: string
  video_title: string | null
  original_lang: string
  subtitles: unknown
  translations: Record<string, unknown>
  summaries: Record<string, string>
  video_duration: number | null
  last_text_time: number | null
  // UI용 필드
  displayLang?: string
  key?: string
}

// 저장된 세션 데이터 (LocalStorage)
interface SavedUtterance {
  id: string
  original: string
  translated: string
  timestamp: Date | string
  startTime: number
}

interface SavedSession {
  videoId: string
  sourceLang: string
  targetLang: string
  utterances: SavedUtterance[]
  savedAt: string
  summary?: string
  isReorganized?: boolean
  videoDuration?: number
  lastTextTime?: number
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
  
  // body 스크롤 제어 - 이 페이지에서만 body 스크롤 비활성화
  useEffect(() => {
    // body와 html의 overflow를 hidden으로 설정
    const originalBodyStyle = document.body.style.overflow
    const originalHtmlStyle = document.documentElement.style.overflow
    
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      // 페이지 떠날 때 원래대로 복원
      document.body.style.overflow = originalBodyStyle
      document.documentElement.style.overflow = originalHtmlStyle
    }
  }, [])
  
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
  
  // 무한스크롤 상태
  const [historyPage, setHistoryPage] = useState(1)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const historyEndRef = useRef<HTMLDivElement>(null)
  const HISTORY_PAGE_SIZE = 20
  
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

  // YouTube 통역 기록 불러오기 (user_video_history + video_subtitles_cache JOIN)
  const loadYoutubeHistory = async (reset: boolean = true) => {
    console.log("📋 loadYoutubeHistory 호출", { reset })
    
    if (reset) {
      setIsLoadingHistory(true)
      setHistoryPage(1)
      setHasMoreHistory(true)
    } else {
      setIsLoadingMore(true)
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log("📋 현재 사용자:", user?.id || "없음")
      
      if (!user) {
        console.log("⚠️ 로그인 필요 - 세션 로드 스킵")
        setIsLoadingHistory(false)
        setIsLoadingMore(false)
        return
      }

      const currentPage = reset ? 1 : historyPage
      const offset = (currentPage - 1) * HISTORY_PAGE_SIZE

      // 1. user_video_history에서 본인 기록 조회 (별표 우선, 최신순)
      const { data: historyData, error: historyError } = await supabase
        .from("user_video_history")
        .select("*")
        .eq("user_id", user.id)
        .order("is_starred", { ascending: false })
        .order("viewed_at", { ascending: false })
        .range(offset, offset + HISTORY_PAGE_SIZE - 1)

      if (historyError) {
        console.error("기록 로드 실패:", historyError)
        setIsLoadingHistory(false)
        setIsLoadingMore(false)
        return
      }

      if (!historyData || historyData.length === 0) {
        console.log("📋 시청 기록 없음 또는 더 이상 없음")
        if (reset) {
          setYoutubeSessions([])
        }
        setHasMoreHistory(false)
        setIsLoadingHistory(false)
        setIsLoadingMore(false)
        return
      }

      // 더 불러올 데이터가 있는지 확인
      if (historyData.length < HISTORY_PAGE_SIZE) {
        setHasMoreHistory(false)
      }

      // 2. 해당 video_id들의 캐시 데이터 가져오기
      const videoIds = [...new Set(historyData.map(h => h.video_id))]
      const { data: cacheData, error: cacheError } = await supabase
        .from("video_subtitles_cache")
        .select("*")
        .in("video_id", videoIds)

      if (cacheError) {
        console.error("캐시 로드 실패:", cacheError)
      }

      // 3. history와 cache 데이터 합치기
      const cacheMap = new Map<string, VideoCache>()
      cacheData?.forEach(cache => cacheMap.set(cache.video_id, cache))

      const newSessions: YouTubeSession[] = historyData
        .filter(history => cacheMap.has(history.video_id))
        .map(history => {
          const cache = cacheMap.get(history.video_id)!
          return {
            history_id: history.id,
            user_id: history.user_id,
            target_lang: history.target_lang,
            is_starred: history.is_starred,
            viewed_at: history.viewed_at,
            cache_id: cache.id,
            video_id: cache.video_id,
            video_title: cache.video_title,
            original_lang: cache.original_lang,
            subtitles: cache.subtitles,
            translations: cache.translations || {},
            summaries: cache.summaries || {},
            video_duration: cache.video_duration,
            last_text_time: cache.last_text_time,
            displayLang: history.target_lang,
            key: history.id,
          }
        })

      console.log("📋 YouTube 기록 결과:", { count: newSessions.length, page: currentPage })
      
      if (reset) {
        setYoutubeSessions(newSessions)
      } else {
        setYoutubeSessions(prev => [...prev, ...newSessions])
        setHistoryPage(currentPage + 1)
      }
    } catch (err) {
      console.error("오류:", err)
    } finally {
      setIsLoadingHistory(false)
      setIsLoadingMore(false)
    }
  }
  
  // 더 불러오기
  const loadMoreHistory = () => {
    if (!isLoadingMore && hasMoreHistory) {
      loadYoutubeHistory(false)
    }
  }
  
  // 시청 기록 저장/업데이트 (user_video_history에 upsert)
  const updateViewedAt = async (videoId: string, targetLang: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log("⚠️ 로그인 필요 - 시청 기록 저장 스킵")
        return
      }

      // upsert: 있으면 업데이트, 없으면 생성
      const { error } = await supabase
        .from("user_video_history")
        .upsert({
          user_id: user.id,
          video_id: videoId,
          target_lang: targetLang,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,video_id,target_lang"
        })

      if (error) {
        console.error("시청 기록 저장 실패:", error)
      } else {
        console.log("✅ 시청 기록 저장:", videoId, targetLang)
      }
    } catch (err) {
      console.error("시청 기록 저장 오류:", err)
    }
  }

  // 별표 토글
  const toggleStarred = async (historyId: string, currentStarred: boolean) => {
    try {
      const { error } = await supabase
        .from("user_video_history")
        .update({ is_starred: !currentStarred })
        .eq("id", historyId)

      if (error) {
        console.error("별표 토글 실패:", error)
        return
      }

      // UI 업데이트
      setYoutubeSessions(prev => prev.map(s => 
        s.history_id === historyId 
          ? { ...s, is_starred: !currentStarred }
          : s
      ))
      console.log("✅ 별표 토글:", historyId, !currentStarred)
    } catch (err) {
      console.error("별표 토글 오류:", err)
    }
  }

  // 기록 삭제 (user_video_history + localStorage + 캐시 완전 삭제)
  const deleteSession = async (e: React.MouseEvent, historyId: string, videoId?: string, targetLang?: string, originalLang?: string) => {
    e.stopPropagation() // 부모 요소의 onClick 이벤트 전파 방지
    
    const deleteCache = confirm(
      "이 시청 기록을 삭제하시겠습니까?\n\n" +
      "[확인] = 기록 + 캐시 완전 삭제 (YouTube에서 새로 다운로드)\n" +
      "[취소] = 삭제 안함"
    )
    
    if (!deleteCache) return

    try {
      // 1. user_video_history 삭제
      const { error } = await supabase
        .from("user_video_history")
        .delete()
        .eq("id", historyId)

      if (error) {
        console.error("삭제 실패:", error)
        alert("삭제에 실패했습니다.")
        return
      }
      
      // 2. localStorage 캐시 모두 삭제 (해당 videoId 관련)
      if (videoId) {
        // 모든 언어 조합의 localStorage 삭제
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.includes(`unilang_youtube_${videoId}`)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => {
          localStorage.removeItem(key)
          console.log("✅ localStorage 삭제:", key)
        })
      }
      
      // 3. 서버 캐시 완전 삭제 (video_subtitles_cache에서 해당 영상 삭제)
      if (videoId) {
        try {
          await supabase
            .from("video_subtitles_cache")
            .delete()
            .eq("video_id", videoId)
          
          console.log("✅ 서버 캐시 완전 삭제:", videoId)
        } catch (cacheErr) {
          console.error("캐시 삭제 실패:", cacheErr)
        }
      }

      setYoutubeSessions(prev => prev.filter(s => s.history_id !== historyId))
      console.log("✅ 기록 완전 삭제:", historyId)
    } catch (err) {
      console.error("오류:", err)
    }
  }

  // 기록에서 다시보기
  const playFromHistory = (session: YouTubeSession) => {
    // 이미 target_lang이 지정되어 있음
    playFromHistoryWithLang(session, session.target_lang)
  }

  // 기록에서 특정 언어로 다시보기
  const playFromHistoryWithLang = (session: YouTubeSession & { displayLang?: string }, targetLang: string) => {
    // 시청 기록 저장/업데이트
    updateViewedAt(session.video_id, targetLang)
    
    // 캐시된 데이터를 localStorage에 저장 (새 창에서 사용)
    const storageKey = `unilang_youtube_${session.video_id}_${session.original_lang}_${targetLang}`
    const translatedUtterances = session.translations?.[targetLang] as Array<{
      id: string
      original: string
      translated: string
      startTime: number
    }> || []
    
    // 번역본이 없으면 원본 자막 사용
    const utterances = translatedUtterances.length > 0 
      ? translatedUtterances 
      : (session.subtitles as Array<{original?: string, text?: string, startTime?: number}>)?.map((s, i) => ({
          id: `subtitle-${i}`,
          original: s.original || s.text || "",
          translated: s.original || s.text || "",
          startTime: s.startTime || 0,
        })) || []
    
    const sessionData = {
      videoId: session.video_id,
      sourceLang: session.original_lang,
      targetLang: targetLang,
      utterances: utterances,
      savedAt: session.updated_at || session.created_at,
      summary: session.summaries?.[targetLang] || "",
      isReorganized: true,
      videoDuration: session.video_duration || 0,
      lastTextTime: session.last_text_time || 0,
    }
    
    localStorage.setItem(storageKey, JSON.stringify(sessionData))
    console.log("📦 캐시 데이터 저장:", storageKey, { utterances: utterances.length })
    
    const liveUrl = `/service/translate/youtube/live?v=${session.video_id}&source=${session.original_lang}&target=${targetLang}&loadSaved=true&autostart=true`
    
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
    // 이미 target_lang이 지정되어 있음
    viewSummaryFromHistoryWithLang(session, session.target_lang)
  }
  
  // 특정 언어의 요약 보기
  const viewSummaryFromHistoryWithLang = async (session: YouTubeSession & { displayLang?: string }, targetLang: string) => {
    setIsLoadingSummary(true)
    try {
      // 해당 언어의 요약 확인
      const summaryText = session.summaries?.[targetLang]
      
      if (summaryText) {
        setViewingSummary({
          title: session.video_title || session.video_id,
          summary: summaryText
        })
        setIsLoadingSummary(false)
        return
      }
      
      // 요약이 없으면 자막 데이터로 새로 생성
      // 해당 언어의 번역본 사용
      const utterances = session.translations?.[targetLang] as Array<{original?: string, translated?: string, text?: string}> 
        || session.subtitles as Array<{original?: string, text?: string}>
      
      if (!Array.isArray(utterances) || utterances.length === 0) {
        alert("이 세션에 저장된 내용이 없습니다.")
        setIsLoadingSummary(false)
        return
      }
      
      // AI 요약 생성 (번역된 텍스트 사용)
      const textToSummarize = utterances
        .map(s => s.translated || s.original || s.text || "")
        .join("\n")
      
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSummarize,
          targetLanguage: targetLang,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setViewingSummary({
          title: session.video_title || session.video_id,
          summary: result.summary
        })
        
        // 요약 저장 (video_subtitles_cache 업데이트)
        const updatedSummaries = { ...session.summaries, [targetLang]: result.summary }
        await supabase
          .from("video_subtitles_cache")
          .update({ summaries: updatedSummaries })
          .eq("video_id", session.video_id)
      } else {
        alert("요약 생성에 실패했습니다.")
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
      loadYoutubeHistory(true)
    }
  }, [showHistory])
  
  // 페이지 로드 시 기록 자동 로드
  useEffect(() => {
    loadYoutubeHistory(true)
  }, [])
  
  // Supabase 실시간 구독 (user_video_history 테이블 변경 감지)
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log("⚠️ 실시간 구독: 로그인 필요")
        return
      }
      
      console.log("📡 실시간 구독 설정 중...")
      
      channel = supabase
        .channel(`user_video_history_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_video_history',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📡 실시간: INSERT 감지', payload)
            loadYoutubeHistory(true)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'user_video_history',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📡 실시간: DELETE 감지', payload)
            loadYoutubeHistory(true)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_video_history',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📡 실시간: UPDATE 감지', payload)
            loadYoutubeHistory(true)
          }
        )
        .subscribe((status) => {
          console.log('📡 실시간 구독 상태:', status)
        })
    }
    
    setupRealtimeSubscription()
    
    return () => {
      if (channel) {
        console.log("📡 실시간 구독 해제")
        supabase.removeChannel(channel)
      }
    }
  }, [])

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

  // 저장된 데이터 키 생성
  const getStorageKey = (vid: string) => `unilang_youtube_${vid}_${sourceLanguage}_${targetLanguage}`
  
  // 기존 저장 데이터 확인 및 완성도 체크
  const checkExistingSavedData = (vid: string): { exists: boolean; coverage: number; data: SavedSession | null } => {
    try {
      const key = getStorageKey(vid)
      const saved = localStorage.getItem(key)
      if (!saved) return { exists: false, coverage: 0, data: null }
      
      const data: SavedSession = JSON.parse(saved)
      if (!data.utterances || data.utterances.length === 0) {
        return { exists: false, coverage: 0, data: null }
      }
      
      // 완성도 계산: 마지막 자막 시간 / 영상 총 시간
      const lastTextTime = data.lastTextTime || 0
      const videoDuration = data.videoDuration || 0
      
      if (videoDuration > 0 && lastTextTime > 0) {
        const coverage = (lastTextTime / videoDuration) * 100
        return { exists: true, coverage, data }
      }
      
      // 영상 길이 정보가 없으면 자막 개수로 판단 (100개 이상이면 완성으로 간주)
      if (data.utterances.length >= 100) {
        return { exists: true, coverage: 100, data }
      }
      
      return { exists: true, coverage: 50, data } // 기본값
    } catch (err) {
      console.error("저장 데이터 확인 오류:", err)
      return { exists: false, coverage: 0, data: null }
    }
  }

  // 단일 번역 함수 (실시간 용)
  const translateTextForWorkflow = async (text: string, from: string, to: string): Promise<string> => {
    if (from === to || to === "none") {
      console.log("⏭️ 번역 건너뜀 (같은 언어):", from, to)
      return text
    }
    try {
      const response = await fetch("/api/gemini/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang: from, targetLang: to }),
      })
      if (!response.ok) {
        console.error("번역 API 실패:", response.status)
        return text
      }
      const data = await response.json()
      const result = data.translatedText || text
      console.log("🌐 번역:", text.substring(0, 30), "→", result.substring(0, 30))
      return result
    } catch (err) {
      console.error("번역 오류:", err)
      return text
    }
  }

  // 배치 번역 함수 (자막 일괄 번역용 - 훨씬 빠름!)
  const translateBatchForWorkflow = async (
    texts: string[], 
    sourceLang: string, 
    targetLang: string
  ): Promise<string[]> => {
    if (sourceLang === targetLang || targetLang === "none") {
      console.log("⏭️ 배치 번역 건너뜀 (같은 언어):", sourceLang, targetLang)
      return texts
    }
    try {
      console.log(`🚀 배치 번역 시작: ${texts.length}개 텍스트, ${sourceLang} → ${targetLang}`)
      const startTime = Date.now()
      
      const response = await fetch("/api/gemini/translate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, sourceLang, targetLang }),
      })
      
      if (!response.ok) {
        console.error("배치 번역 API 실패:", response.status)
        return texts // 실패 시 원본 반환
      }
      
      const data = await response.json()
      const elapsed = Date.now() - startTime
      
      console.log(`✅ 배치 번역 완료: ${texts.length}개, ${elapsed}ms (${(elapsed/texts.length).toFixed(1)}ms/개)`)
      
      return data.translatedTexts || texts
    } catch (err) {
      console.error("배치 번역 오류:", err)
      return texts
    }
  }

  // AI 재처리 함수
  const reorganizeTextForWorkflow = async (text: string, language: string): Promise<string> => {
    try {
      console.log("🔄 AI 재처리 시작:", { textLength: text.length, language })
      const response = await fetch("/api/gemini/reorganize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      })
      if (!response.ok) {
        console.error("재처리 API 실패:", response.status)
        return text
      }
      const data = await response.json()
      console.log("✅ AI 재처리 완료")
      return data.reorganizedText || text
    } catch (err) {
      console.error("재처리 오류:", err)
      return text
    }
  }

  // 요약 생성 함수
  const summarizeTextForWorkflow = async (text: string, language: string): Promise<string> => {
    try {
      console.log("📝 요약 생성 시작:", { textLength: text.length, language })
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      })
      if (!response.ok) {
        console.error("요약 API 실패:", response.status)
        return ""
      }
      const data = await response.json()
      console.log("✅ 요약 생성 완료:", data.summary?.substring(0, 100))
      return data.summary || ""
    } catch (err) {
      console.error("요약 생성 오류:", err)
      return ""
    }
  }

  // 통합 실시간 통역 시작 - 자막 있으면 추출 후 플레이, 없으면 실시간 통역
  const startIntegratedLiveMode = async () => {
    if (!videoId) {
      setError("YouTube URL을 먼저 입력해주세요")
      return
    }

    setError(null)
    setIsProcessing(true)
    setProgress(0)
    setProgressText("캐시 확인 중...")

    // 팝업 창 설정
    const width = Math.floor(window.screen.width * 0.9)
    const height = Math.floor(window.screen.height * 0.9)
    const left = Math.floor((window.screen.width - width) / 2)
    const top = Math.floor((window.screen.height - height) / 2)

    // 팝업 열기 헬퍼 함수 (저장된 세션으로 재생)
    const openLivePlayer = () => {
      // 저장 완료 확인 후 새 창 열기
      const storageKey = getStorageKey(videoId)
      console.log("🔑 저장 키 확인:", storageKey)
      console.log("💾 저장된 데이터 확인:", localStorage.getItem(storageKey) ? "있음" : "없음")
      
      // 저장 완료를 보장하기 위해 약간의 지연 후 새 창 열기
      setTimeout(() => {
        const liveUrl = `/service/translate/youtube/live?v=${videoId}&source=${sourceLanguage}&target=${targetLanguage}&loadSaved=true&autostart=true`
        console.log("🚀 새 창 열기:", liveUrl)
        
        const liveWindow = window.open(
          liveUrl,
          "unilang_live",
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        )
        if (!liveWindow) {
          window.open(liveUrl, "_blank")
        }
      }, 100)
    }

    try {
      // ========================================
      // 0단계: 서버 캐시(Supabase) 확인
      // ========================================
      setProgress(3)
      setProgressText("서버 캐시 확인 중...")
      
      let cachedOriginalSubtitles: SavedUtterance[] | null = null
      let cachedOriginalLang: string | null = null
      let cachedVideoDuration: number | null = null
      let cachedLastTextTime: number | null = null
      let cachedVideoTitle: string | null = null  // 캐시된 제목
      
      try {
        // 먼저 해당 언어 번역이 있는지 확인
        const cacheResponse = await fetch(`/api/cache/subtitle?videoId=${videoId}&lang=${targetLanguage}`)
        const cacheData = await cacheResponse.json()
        
        if (cacheData.exists && cacheData.cached && cacheData.utterances) {
          // ✅ 해당 언어 번역이 캐시에 있음 → 바로 재생!
          console.log("🎯 서버 캐시 적중! (번역본)", cacheData)
          setProgress(100)
          setProgressText(`캐시 발견! (${cacheData.isOriginal ? '원본' : '번역'}) 바로 재생합니다...`)
          
          const cachedSession: SavedSession = {
            videoId: videoId,
            sourceLang: cacheData.isOriginal ? targetLanguage : sourceLanguage,
            targetLang: targetLanguage,
            utterances: cacheData.utterances,
            savedAt: cacheData.cachedAt,
            summary: cacheData.summary || "",
            isReorganized: true,
            videoDuration: cacheData.videoDuration,
            lastTextTime: cacheData.lastTextTime,
          }
          
          localStorage.setItem(getStorageKey(videoId), JSON.stringify(cachedSession))
          // 시청 기록 저장
          updateViewedAt(videoId, targetLanguage)
          openLivePlayer()
          return
        }
        
        // 번역본은 없지만 원본이 있는지 확인
        if (cacheData.exists && cacheData.hasOriginal) {
          console.log("📦 서버 캐시: 원본 자막 발견! (번역본 없음)")
          
          // 원본 자막 가져오기
          const originalResponse = await fetch(`/api/cache/subtitle?videoId=${videoId}`)
          const originalData = await originalResponse.json()
          
          if (originalData.exists) {
            // 원본 자막을 캐시에서 로드 (YouTube 다운로드 스킵!)
            const originalLangResponse = await fetch(`/api/cache/subtitle?videoId=${videoId}&lang=${originalData.originalLang}`)
            const originalLangData = await originalLangResponse.json()
            
            if (originalLangData.cached && originalLangData.utterances) {
              console.log("✅ 원본 자막 캐시에서 로드 (YouTube 다운로드 스킵!)")
              cachedOriginalSubtitles = originalLangData.utterances
              cachedOriginalLang = originalData.originalLang
              cachedVideoDuration = originalLangData.videoDuration
              cachedLastTextTime = originalLangData.lastTextTime
              cachedVideoTitle = originalLangData.videoTitle || originalData.videoTitle || null  // 제목
              console.log("📺 캐시된 YouTube 제목:", cachedVideoTitle)
            }
          }
        }
        
        if (!cachedOriginalSubtitles) {
          console.log("📦 서버 캐시: 없음")
        }
      } catch (err) {
        console.log("⚠️ 서버 캐시 확인 실패, 계속 진행:", err)
      }
      
      // ========================================
      // 1단계: LocalStorage 확인 (98% 이상이면 바로 재생)
      // ========================================
      setProgress(5)
      setProgressText("로컬 데이터 확인 중...")
      
      const { exists, coverage, data: savedData } = checkExistingSavedData(videoId)
      
      if (exists && coverage >= 98 && savedData) {
        setProgress(100)
        setProgressText(`로컬 데이터 발견! (${coverage.toFixed(1)}% 완성) 바로 재생합니다...`)
        // 시청 기록 저장
        updateViewedAt(videoId, targetLanguage)
        openLivePlayer()
        return
      }
      
      // ========================================
      // 2단계: 원본 자막 확보 (캐시 또는 YouTube)
      // ========================================
      let convertedUtterances: SavedUtterance[]
      let detectedLang: string
      let videoDuration: number
      let lastTextTime: number
      let videoTitle: string | null = null
      
      if (cachedOriginalSubtitles && cachedOriginalLang) {
        // ✅ 캐시에서 원본 자막 사용 (YouTube 다운로드 스킵!)
        setProgress(15)
        setProgressText("캐시된 원본 자막 사용 중...")
        console.log("🚀 캐시된 원본 자막 사용 - YouTube 다운로드 스킵!")
        
        convertedUtterances = cachedOriginalSubtitles.map((item, index) => ({
          id: `subtitle-${index}`,
          original: item.original || item.translated,
          translated: "",
          timestamp: new Date().toISOString(),
          startTime: item.startTime || 0,
        }))
        detectedLang = cachedOriginalLang
        videoDuration = cachedVideoDuration || 0
        lastTextTime = cachedLastTextTime || 0
        
        // 캐시에서 가져온 제목 사용, 없으면 YouTube에서 가져오기
        if (cachedVideoTitle) {
          videoTitle = cachedVideoTitle
        } else {
          // YouTube oEmbed API로 제목 가져오기
          try {
            const titleResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
            if (titleResponse.ok) {
              const titleData = await titleResponse.json()
              videoTitle = titleData.title || null
              console.log("📺 YouTube oEmbed 제목:", videoTitle)
              
              // 캐시에 제목 업데이트
              if (videoTitle) {
                fetch("/api/cache/subtitle", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    videoId: videoId,
                    videoTitle: videoTitle,
                  }),
                }).catch(err => console.log("제목 캐시 업데이트 실패:", err))
              }
            }
          } catch {
            console.log("⚠️ YouTube 제목 가져오기 실패")
          }
        }
        
      } else {
        // YouTube에서 자막 다운로드
        setProgress(10)
        setProgressText("YouTube 자막 추출 시도 중...")
        
        const response = await fetch("/api/youtube/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            youtubeUrl,
            targetLanguage: targetLanguage !== "none" ? targetLanguage : null,
          }),
        })

        const data = await response.json()
        
        if (!data.success || !data.utterances?.length) {
          // 자막 없음 → 실시간 통역 모드
          setProgress(50)
          setProgressText("자막 없음 - 실시간 통역 모드로 전환...")
          
          const liveUrl = `/service/translate/youtube/live?v=${videoId}&source=${sourceLanguage}&target=${targetLanguage}&autostart=true&realtimeMode=true`
          const liveWindow = window.open(
            liveUrl,
            "unilang_live",
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
          )
          if (!liveWindow) {
            window.open(liveUrl, "_blank")
          }
          setProgress(100)
          setProgressText("실시간 통역 모드 시작!")
          return
        }
        
        // 자막 변환
        setProgress(20)
        setProgressText("자막 변환 중...")
        
        convertedUtterances = data.utterances.map((item: { start: number; text: string }, index: number) => ({
          id: `subtitle-${index}`,
          original: item.text,
          translated: "",
          timestamp: new Date().toISOString(),
          startTime: Math.floor(item.start),
        }))
        detectedLang = data.language || sourceLanguage
        videoTitle = data.videoTitle || null
        console.log("📺 YouTube 제목:", videoTitle)
        videoDuration = data.duration ? data.duration * 1000 : 0
        lastTextTime = convertedUtterances.length > 0 
          ? convertedUtterances[convertedUtterances.length - 1].startTime 
          : 0
      }
      
      // ========================================
      // 3단계: AI 재정리 (원문을 문장 단위로 정리)
      // ========================================
      setProgress(30)
      setProgressText("AI 원문 재정리 중...")
      console.log("🔄 AI 원문 재정리 시작:", convertedUtterances.length, "개 자막")
      
      try {
        // 원문 자막을 API 형식으로 변환
        const utterancesForApi = convertedUtterances.map((u, idx) => ({
          id: idx + 1,
          text: u.original,
          startTime: u.startTime,
        }))
        
        const reorganizeResponse = await fetch("/api/gemini/reorganize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            utterances: utterancesForApi,
            targetLanguage: detectedLang, // 원문 언어로 재정리
          }),
        })
        
        if (reorganizeResponse.ok) {
          const reorganizeData = await reorganizeResponse.json()
          
          if (reorganizeData.success && reorganizeData.data) {
            console.log("📝 AI 재정리 결과:", reorganizeData.data.length, "개 문장")
            
            // 재정리된 결과로 convertedUtterances 업데이트
            const newUtterances: typeof convertedUtterances = []
            
            reorganizeData.data.forEach((item: { merged_from: number[]; text: string }, newIdx: number) => {
              // merged_from의 첫 번째 원본 자막의 startTime 사용
              const firstOriginalIdx = item.merged_from[0] - 1 // 1-based to 0-based
              const originalUtterance = convertedUtterances[firstOriginalIdx]
              
              if (originalUtterance) {
                newUtterances.push({
                  id: `subtitle-reorganized-${newIdx}`,
                  original: item.text,
                  translated: "",
                  timestamp: originalUtterance.timestamp,
                  startTime: originalUtterance.startTime,
                })
              }
            })
            
            if (newUtterances.length > 0) {
              convertedUtterances = newUtterances
              console.log("✅ AI 원문 재정리 적용:", convertedUtterances.length, "개 문장")
            }
          }
        } else {
          console.log("⚠️ AI 재정리 API 실패, 원본 유지")
        }
      } catch (err) {
        console.error("AI 재정리 오류, 원본 유지:", err)
      }
      
      setProgress(45)
      setProgressText("원문 재정리 완료!")
      
      // ========================================
      // 4단계: 배치 번역 수행 (재정리된 원문 번역)
      // ========================================
      if (targetLanguage !== "none" && targetLanguage !== detectedLang) {
        setProgress(50)
        setProgressText(`번역 준비 중... (${convertedUtterances.length}개 문장)`)
        
        // 재정리된 원본 텍스트를 배열로 추출
        const originalTexts = convertedUtterances.map(u => u.original)
        
        // 배치 번역 수행 (한 번에 모든 텍스트 번역)
        setProgress(60)
        setProgressText(`배치 번역 중... (${convertedUtterances.length}개)`)
        
        const translatedTexts = await translateBatchForWorkflow(
          originalTexts,
          detectedLang,
          targetLanguage
        )
        
        // 번역 결과를 utterances에 적용
        translatedTexts.forEach((translated, index) => {
          if (convertedUtterances[index]) {
            convertedUtterances[index].translated = translated
          }
        })
        
        setProgress(70)
        setProgressText("번역 완료!")
        console.log(`✅ ${convertedUtterances.length}개 문장 번역 완료`)
      } else {
        // 번역이 필요없으면 원본을 translated에도 복사
        convertedUtterances.forEach(u => { u.translated = u.original })
      }
      
      // ========================================
      // 5단계: 요약 생성
      // ========================================
      setProgress(75)
      setProgressText("요약 생성 중...")
      
      const textToSummarize = convertedUtterances.map(u => u.translated).join("\n")
      const summary = await summarizeTextForWorkflow(textToSummarize, targetLanguage)
      
      // ========================================
      // 6단계: 저장
      // ========================================
      setProgress(90)
      setProgressText("저장 중...")
      
      // videoDuration, lastTextTime은 이미 위에서 설정됨
      
      const sessionData: SavedSession = {
        videoId: videoId,
        sourceLang: sourceLanguage,
        targetLang: targetLanguage,
        utterances: convertedUtterances,
        savedAt: new Date().toISOString(),
        summary: summary,
        isReorganized: true,
        videoDuration: videoDuration,
        lastTextTime: lastTextTime,
      }
      
      // 디버그: 저장 전 데이터 확인
      console.log("💾 저장할 데이터:")
      console.log("- utterances 수:", convertedUtterances.length)
      console.log("- 첫 번째:", convertedUtterances[0])
      console.log("- summary 길이:", summary?.length || 0)
      console.log("- translated 샘플:", convertedUtterances.slice(0, 3).map(u => ({
        original: u.original?.substring(0, 30),
        translated: u.translated?.substring(0, 30)
      })))
      
      // LocalStorage에 저장
      localStorage.setItem(getStorageKey(videoId), JSON.stringify(sessionData))
      
      // 서버 캐시(Supabase)에 저장 - 백그라운드로 처리
      setProgressText("서버 캐시 저장 중...")
      try {
        // 원본 자막 + 번역 저장
        const originalUtterances = convertedUtterances.map(u => ({
          id: u.id,
          original: u.original,
          translated: u.original, // 원본용
          timestamp: u.timestamp,
          startTime: u.startTime,
        }))
        
        // detectedLang 사용 (캐시에서 로드한 경우에도 올바른 값)
        const originalLang = detectedLang
        
        await fetch("/api/cache/subtitle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: videoId,
            videoTitle: videoTitle,  // YouTube 제목 추가!
            originalLang: originalLang,
            subtitles: originalUtterances,
            translations: targetLanguage !== originalLang ? {
              [targetLanguage]: convertedUtterances
            } : {},
            summaries: summary ? { [targetLanguage]: summary } : {},
            videoDuration: videoDuration,
            lastTextTime: lastTextTime,
          }),
        })
        console.log("✅ 서버 캐시 저장 완료")
        
        // 백그라운드 멀티 번역 시작 (비동기 - 응답 대기 안함)
        fetch("/api/cache/background-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: videoId,
            originalLang: originalLang,
            excludeLang: targetLanguage,
          }),
        }).then(() => {
          console.log("🔄 백그라운드 멀티 번역 요청됨")
        }).catch(err => {
          console.log("⚠️ 백그라운드 번역 요청 실패 (무시):", err)
        })
      } catch (err) {
        console.error("⚠️ 서버 캐시 저장 실패 (무시):", err)
      }
      
      // ========================================
      // 7단계: 플레이어 열기
      // ========================================
      setProgress(95)
      setProgressText("플레이어 열기...")
      
      // 시청 기록 저장
      updateViewedAt(videoId, targetLanguage)
      openLivePlayer()
      
      setProgress(100)
      setProgressText("완료!")
      
    } catch (err) {
      console.error("통합 워크플로우 오류:", err)
      // 에러 발생 시에도 실시간 통역 모드로 전환
      setProgressText("자막 추출 실패 - 실시간 통역 모드로 전환...")
      
      const liveUrl = `/service/translate/youtube/live?v=${videoId}&source=${sourceLanguage}&target=${targetLanguage}&autostart=true&realtimeMode=true`
      
      const liveWindow = window.open(
        liveUrl,
        "unilang_live",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      )
      
      if (!liveWindow) {
        window.open(liveUrl, "_blank")
      }
    } finally {
      setTimeout(() => {
        setIsProcessing(false)
        setProgress(0)
        setProgressText("")
      }, 1000)
    }
  }

  // 기존 원클릭 함수 (호환성 유지)
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
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
      {/* 메인 콘텐츠 - 전체 배경 흰색 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-2 space-y-2">
          {/* 1. 상단 타이틀바 - 컨텐츠 안에 포함 (스크롤과 함께 움직임) */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg">
            <div className="px-4 py-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Youtube className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">YouTube 실시간 통역</h1>
                <p className="text-sm text-white/80">YouTube를 언어에 상관없이 마음껏 감상해 보세요</p>
              </div>
            </div>
          </div>
        {/* 기록 목록 (슬라이드 패널) */}
        {showHistory && (
          <div className="fixed inset-0 z-50 flex">
            {/* 오버레이 */}
            <div 
              className="flex-1 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowHistory(false)}
            />
            {/* 사이드 패널 - 스크롤바 1개만 */}
            <div className="w-full max-w-[500px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-screen animate-slide-in-right">
              {/* 고정 헤더 */}
              <div className="shrink-0 p-4 border-b border-teal-200" style={{ backgroundColor: '#CCFBF1' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-teal-800">
                    <List className="h-5 w-5" />
                    YouTube 통역 기록
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowHistory(false)}
                    className="hover:bg-teal-200"
                  >
                    <X className="h-5 w-5 text-teal-700" />
                  </Button>
                </div>
                {/* 자막 업로드 버튼 */}
                <Link href="/service/translate/youtube/upload" className="block mt-3">
                  <Button 
                    variant="outline" 
                    className="w-full border-teal-400 text-teal-700 hover:bg-teal-100"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    자막 파일 업로드
                  </Button>
                </Link>
              </div>
              
              {/* 스크롤 영역 - 내부 스크롤바 1개만 */}
              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 140px)' }}>
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                  </div>
                ) : youtubeSessions.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <Youtube className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>저장된 기록이 없습니다.</p>
                    <p className="text-sm mt-1">통역 후 자동으로 저장됩니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 사용자별 시청 기록 (이미 target_lang별로 분리됨) */}
                    {youtubeSessions.map((item) => (
                      <div
                        key={item.key || item.history_id}
                        className={`p-3 rounded-lg border transition-colors ${
                          item.is_starred 
                            ? "border-teal-300 bg-white dark:bg-slate-800 dark:border-teal-600" 
                            : "border-teal-200 dark:border-slate-700"
                        }`}
                        style={{ backgroundColor: 'white' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CCFBF1'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        {/* 썸네일 + 정보 */}
                        <div className="flex gap-3">
                          {/* 썸네일 - 테두리 추가 */}
                          <div 
                            className="relative w-28 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-200 cursor-pointer group border-2 border-slate-300 dark:border-slate-600"
                            onClick={() => playFromHistoryWithLang(item, item.target_lang)}
                          >
                            <img 
                              src={`https://img.youtube.com/vi/${item.video_id}/mqdefault.jpg`}
                              alt="썸네일"
                              className="w-full h-full object-cover"
                            />
                            {/* 영상 시간 표시 */}
                            {item.video_duration && item.video_duration > 0 && (
                              <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-white text-[10px] rounded">
                                {Math.floor(item.video_duration / 60000)}:{String(Math.floor((item.video_duration % 60000) / 1000)).padStart(2, '0')}
                              </div>
                            )}
                            {/* 별표 표시 */}
                            {item.is_starred && (
                              <div className="absolute top-1 left-1">
                                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                              </div>
                            )}
                            {/* 재생 오버레이 */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="h-8 w-8 text-white" fill="white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* 제목: video_title이 없으면 첫 번째 자막 텍스트 사용 */}
                            <h4 className="font-medium text-sm line-clamp-2">
                              {item.video_title || 
                               (Array.isArray(item.subtitles) && item.subtitles.length > 0 
                                 ? ((item.subtitles[0] as {original?: string, text?: string})?.original || 
                                    (item.subtitles[0] as {original?: string, text?: string})?.text || 
                                    item.video_id)?.substring(0, 50) + "..."
                                 : item.video_id)}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <Calendar className="h-3 w-3" />
                              {/* 시청 시각을 로컬 시간으로 표시 */}
                              {new Date(item.viewed_at).toLocaleString("ko-KR", {
                                year: "numeric",
                                month: "2-digit", 
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                              <span>•</span>
                              <span>
                                {item.video_duration && item.video_duration > 0 
                                  ? `${Math.floor(item.video_duration / 60000)}:${String(Math.floor((item.video_duration % 60000) / 1000)).padStart(2, '0')}`
                                  : "시간정보 없음"
                                }
                              </span>
                            </div>
                            {/* 원어 → 번역어 표시 */}
                            <div className="flex items-center gap-1 mt-1.5">
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                {LANGUAGES.find(l => l.code === item.original_lang)?.name || item.original_lang || '자동'}
                              </span>
                              <span className="text-slate-400 text-xs">→</span>
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                                {LANGUAGES.find(l => l.code === item.target_lang)?.name || item.target_lang || '원본'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 액션 버튼 - 배경색 추가 */}
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {/* 별표 토글 버튼 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStarred(item.history_id, item.is_starred)}
                            className={`h-8 px-2 ${item.is_starred ? "text-yellow-500 hover:text-yellow-600" : "text-slate-400 hover:text-yellow-500"}`}
                            title={item.is_starred ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                          >
                            <Star className={`h-4 w-4 ${item.is_starred ? "fill-yellow-400" : ""}`} />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => playFromHistoryWithLang(item, item.target_lang)}
                            className="flex-1 bg-teal-500 hover:bg-teal-600 text-white text-xs h-8"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            다시보기
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => viewSummaryFromHistoryWithLang(item, item.target_lang)}
                            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-8"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            요약보기
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => deleteSession(e, item.history_id, item.video_id, item.target_lang, item.original_lang)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {/* 2. URL 입력 카드 - 컨트롤바 (배경색 #CCFBF1) */}
        <Card className="border-teal-200 dark:border-teal-800 relative" style={{ backgroundColor: '#CCFBF1' }}>
          {/* 우상단 햄버거 메뉴 버튼 */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setShowHistory(!showHistory)
              loadYoutubeHistory(true)
            }}
            className="absolute top-3 right-3 z-10 hover:bg-teal-100 dark:hover:bg-teal-900/50"
            title="통역 기록 목록"
          >
            <Menu className="h-5 w-5 text-teal-600" />
            {youtubeSessions.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-teal-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {youtubeSessions.length > 9 ? '9+' : youtubeSessions.length}
              </span>
            )}
          </Button>
          
          <CardContent className="p-4 space-y-4">
            {/* URL 입력 */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                YouTube URL
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-500" />
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={isProcessing || isLiveMode}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                  {/* URL 지우기 X 버튼 */}
                  {youtubeUrl && !isProcessing && !isLiveMode && (
                    <button
                      onClick={() => setYoutubeUrl("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      title="URL 지우기"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {!isLiveMode ? (
                  <Button
                    onClick={startIntegratedLiveMode}
                    disabled={!videoId || isProcessing}
                    className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 px-6 py-3 text-lg font-bold shadow-lg"
                    title="자막 있으면 자동 추출, 없으면 실시간 통역"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        {progressText || "처리 중..."}
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        실시간 통역
                      </>
                    )}
                  </Button>
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

        {/* 요약 모달 - 밝은 배경 */}
        {showSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-white/60" 
              onClick={() => setShowSummary(false)}
            />
            <Card className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto border-2 border-teal-300 shadow-2xl bg-white">
              <CardHeader style={{ backgroundColor: '#CCFBF1' }}>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-teal-800">
                    <Sparkles className="h-5 w-5" />
                    AI 요약
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowSummary(false)}
                    className="text-teal-700 hover:bg-teal-200"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                  {summary}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 기록에서 요약보기 모달 - 밝은 배경 */}
        {viewingSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-white/60" 
              onClick={() => setViewingSummary(null)}
            />
            <Card className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto border-2 border-teal-300 shadow-2xl bg-white">
              <CardHeader style={{ backgroundColor: '#CCFBF1' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-teal-800">
                      <FileText className="h-5 w-5" />
                      요약
                    </CardTitle>
                    <p className="text-sm text-teal-600 mt-1">{viewingSummary.title}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setViewingSummary(null)}
                    className="text-teal-700 hover:bg-teal-200"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                  {viewingSummary.summary}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 요약 로딩 중 */}
        {isLoadingSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60">
            <div className="bg-white rounded-xl p-6 flex items-center gap-3 shadow-xl border-2 border-teal-300">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
              <span className="text-teal-700">요약을 불러오는 중...</span>
            </div>
          </div>
        )}

        {/* YouTube 사용기록 (하단 테이블) - 테이블 바디는 흰색 배경 */}
        <Card className="border-2 overflow-hidden p-0 bg-white" style={{ borderColor: '#14B8A6' }}>
          {/* 3. 목록 상단 배경색 - 타이틀과 테이블 헤더 통합 (Card 패딩 제거) */}
          <div style={{ backgroundColor: '#CCFBF1' }}>
            {/* 타이틀 - 상단 여백 없음 */}
            <div className="px-4 pt-3 pb-2">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-teal-800">
                <List className="h-5 w-5" />
                YouTube 사용기록(목록)
              </h3>
            </div>
            {/* 테이블 헤더 - 배경색 연결 (빈공간 없음) */}
            {youtubeSessions.length > 0 && (
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-sm font-medium text-white border-b border-teal-300" style={{ backgroundColor: '#14B8A6' }}>
                <div className="col-span-1 text-center">⭐</div>
                <div className="col-span-1">썸네일</div>
                <div className="col-span-4">제목</div>
                <div className="col-span-2 text-center">언어</div>
                <div className="col-span-2 text-center">시청일시</div>
                <div className="col-span-2 text-center">작업</div>
              </div>
            )}
          </div>
          {/* 테이블 바디 - 배경색 div 바로 아래 (빈공간 없음) */}
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
            </div>
          ) : youtubeSessions.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Youtube className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>저장된 기록이 없습니다.</p>
              <p className="text-sm mt-1">통역 후 자동으로 저장됩니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {youtubeSessions.map((item) => (
                    <div 
                      key={item.key || item.history_id}
                      className="grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors cursor-pointer"
                      style={{ backgroundColor: item.is_starred ? '#FFFBEB' : 'white' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CCFBF1'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = item.is_starred ? '#FFFBEB' : 'white'}
                      onClick={() => playFromHistoryWithLang(item, item.target_lang)}
                    >
                      {/* 별표 */}
                      <div className="col-span-1 text-center">
                        <button
                          onClick={() => toggleStarred(item.history_id, item.is_starred)}
                          className={`p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors ${
                            item.is_starred ? "text-yellow-500" : "text-slate-300 hover:text-yellow-400"
                          }`}
                        >
                          <Star className={`h-4 w-4 ${item.is_starred ? "fill-yellow-400" : ""}`} />
                        </button>
                      </div>
                      
                      {/* 썸네일 */}
                      <div className="col-span-1">
                        <div 
                          className="relative w-16 h-10 rounded overflow-hidden bg-slate-200 cursor-pointer group"
                          onClick={() => playFromHistoryWithLang(item, item.target_lang)}
                        >
                          <img 
                            src={`https://img.youtube.com/vi/${item.video_id}/default.jpg`}
                            alt="썸네일"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-4 w-4 text-white" fill="white" />
                          </div>
                        </div>
                      </div>
                      
                      {/* 제목 */}
                      <div className="col-span-4">
                        <p 
                          className="text-sm font-medium truncate cursor-pointer hover:text-teal-600 transition-colors"
                          onClick={() => playFromHistoryWithLang(item, item.target_lang)}
                          title={item.video_title || (Array.isArray(item.subtitles) && item.subtitles.length > 0 
                            ? ((item.subtitles[0] as {original?: string, text?: string})?.original || 
                               (item.subtitles[0] as {original?: string, text?: string})?.text || item.video_id)
                            : item.video_id)}
                        >
                          {item.video_title || 
                           (Array.isArray(item.subtitles) && item.subtitles.length > 0 
                             ? ((item.subtitles[0] as {original?: string, text?: string})?.original || 
                                (item.subtitles[0] as {original?: string, text?: string})?.text || 
                                item.video_id)?.substring(0, 50) + "..."
                             : item.video_id)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.video_duration && item.video_duration > 0 
                            ? `${Math.floor(item.video_duration / 60000)}:${String(Math.floor((item.video_duration % 60000) / 1000)).padStart(2, '0')}`
                            : "-"
                          }
                        </p>
                      </div>
                      
                      {/* 언어 */}
                      <div className="col-span-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            {LANGUAGES.find(l => l.code === item.original_lang)?.name || item.original_lang}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            {LANGUAGES.find(l => l.code === item.target_lang)?.name || item.target_lang}
                          </span>
                        </div>
                      </div>
                      
                      {/* 시청일시 */}
                      <div className="col-span-2 text-center text-xs text-slate-500">
                        {new Date(item.viewed_at).toLocaleString("ko-KR", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                      
                      {/* 작업 버튼 */}
                      <div className="col-span-2 flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          onClick={() => playFromHistoryWithLang(item, item.target_lang)}
                          className="bg-teal-500 hover:bg-teal-600 text-white text-xs h-7 px-2"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => viewSummaryFromHistoryWithLang(item, item.target_lang)}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-7 px-2"
                        >
                          <Sparkles className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => deleteSession(e, item.history_id, item.video_id, item.target_lang, item.original_lang)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 px-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* 더 불러오기 트리거 */}
                  <div ref={historyEndRef} className="py-4 text-center">
                    {isLoadingMore ? (
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">불러오는 중...</span>
                      </div>
                    ) : hasMoreHistory ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={loadMoreHistory}
                        className="text-teal-600 hover:text-teal-700"
                      >
                        더 불러오기 ↓
                      </Button>
                    ) : youtubeSessions.length > 0 ? (
                      <span className="text-xs text-slate-400">모든 기록을 불러왔습니다</span>
                    ) : null}
                  </div>
                </div>
            )}
        </Card>
        </div>
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

