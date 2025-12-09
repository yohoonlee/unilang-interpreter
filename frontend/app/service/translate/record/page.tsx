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
  Settings,
  X,
  Save,
  Edit3,
  Check,
  List,
  Trash2,
  Calendar,
  FileText,
  Sparkles,
  Languages,
  Play,
  Eye,
  Copy,
  Download,
  Printer,
  Pencil,
  FileAudio,
  Link as LinkIcon,
  Upload,
  Square,
  Clock,
  Users,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useAssemblyAI, formatDuration, AssemblyAIResult, AssemblyAIUtterance } from "@/hooks/useAssemblyAI"

// 지원 언어 목록
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

// 소스 언어 목록 (자동감지 추가)
const SOURCE_LANGUAGES = [
  { code: "auto", name: "자동 감지", flag: "🌐", ttsCode: "" },
  ...LANGUAGES
]

// 화자 색상
const SPEAKER_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
  { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300" },
]

interface TranscriptItem {
  id: string
  speaker: string
  speakerName: string
  original: string
  translated: string
  sourceLanguage: string
  targetLanguage: string
  timestamp: Date
  start: number
  end: number
  utteranceId?: string
}

interface SessionItem {
  id: string
  title: string
  created_at: string
  source_language: string
  target_languages: string[]
  total_utterances?: number
}

// 언어 정보 가져오기
const getLanguageInfo = (code: string) => {
  return LANGUAGES.find(l => l.code === code) || { code, name: code, flag: "🌐", ttsCode: code }
}

export default function RecordTranslatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <RecordTranslatePageContent />
    </Suspense>
  )
}

function RecordTranslatePageContent() {
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.get("embedded") === "true"
  
  // 기본 상태
  const [userId, setUserId] = useState<string | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [targetLanguage, setTargetLanguage] = useState("none") // 기본값: 번역 안함 (원문만 기록)
  const [error, setError] = useState<string | null>(null)
  
  // 세션 관련
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentSessionTitle, setCurrentSessionTitle] = useState("")
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [showSessionList, setShowSessionList] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  
  // 녹음 모드: idle, recording, url, file
  const [recordMode, setRecordMode] = useState<"idle" | "recording" | "url" | "file">("idle")
  const [audioUrl, setAudioUrl] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // 전사 결과
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([])
  const [assemblyResult, setAssemblyResult] = useState<AssemblyAIResult | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({})
  
  // 문서/요약 관련
  const [documentTextOriginal, setDocumentTextOriginal] = useState("")
  const [documentTextTranslated, setDocumentTextTranslated] = useState("")
  const [isDocumenting, setIsDocumenting] = useState(false)
  const [showDocumentInPanel, setShowDocumentInPanel] = useState(false)
  const [documentViewTab, setDocumentViewTab] = useState<"original" | "translated">("original")
  const [isEditingDocument, setIsEditingDocument] = useState(false)
  const [editDocumentText, setEditDocumentText] = useState("")
  const [isSavingDocument, setIsSavingDocument] = useState(false)
  
  // 요약 관련
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryText, setSummaryText] = useState("")
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryLanguage, setSummaryLanguage] = useState("ko")
  const [savedSummaries, setSavedSummaries] = useState<Record<string, string>>({})
  
  // AI 재정리 관련
  const [isReorganizing, setIsReorganizing] = useState(false)
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set())
  const [mergeMode, setMergeMode] = useState(false)
  const [isReTranslating, setIsReTranslating] = useState(false)
  
  // 확인 모달
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalMessage, setConfirmModalMessage] = useState("")
  const [confirmModalCallback, setConfirmModalCallback] = useState<(() => void) | null>(null)
  
  // 제목 편집
  const [isEditingCurrentTitle, setIsEditingCurrentTitle] = useState(false)
  const [editCurrentTitleText, setEditCurrentTitleText] = useState("")
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionTitle, setEditingSessionTitle] = useState("")
  
  // 파일 업로드
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [processingStatus, setProcessingStatus] = useState("")
  
  // TTS 관련
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  
  // 항목 편집 관련
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingOriginal, setEditingOriginal] = useState("")
  const [editingTranslated, setEditingTranslated] = useState("")
  
  const supabase = createClient()
  
  // AssemblyAI 훅
  const {
    isRecording,
    isProcessing,
    recordingDuration,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    transcribeFromUrl,
    transcribeFromFile,
  } = useAssemblyAI({
    languageCode: sourceLanguage === "auto" ? undefined : sourceLanguage,
    speakerLabels: true,
    onTranscriptReady: handleTranscriptReady,
    onError: (err) => setError(err),
    onUploadProgress: setUploadProgress,
  })
  
  // 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    loadUser()
  }, [supabase])
  
  // userId 변경 시 세션 목록 로드
  useEffect(() => {
    if (userId) {
      loadSessions()
    }
  }, [userId])
  
  // 세션 목록 로드
  const loadSessions = async () => {
    if (!userId) return
    
    setIsLoadingSessions(true)
    try {
      const { data, error } = await supabase
        .from("translation_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("session_type", "record")
        .order("created_at", { ascending: false })
      
      if (error) {
        console.error("세션 목록 로드 실패:", error)
        return
      }
      
      setSessions(data || [])
    } catch (err) {
      console.error("세션 목록 로드 오류:", err)
    } finally {
      setIsLoadingSessions(false)
    }
  }
  
  // 전사 완료 처리
  async function handleTranscriptReady(res: AssemblyAIResult) {
    setAssemblyResult(res)
    setRecordMode("idle")
    setProcessingStatus("음성 인식 완료! 데이터 처리 중...")
    
    // 세션 생성
    let newSessionId: string | null = null
    if (userId) {
      const session = await createSession(res)
      if (session) {
        newSessionId = session.id
        setSessionId(session.id)
        setCurrentSessionTitle(session.title)
      }
    }
    
    // 번역 및 변환
    setProcessingStatus("번역 중...")
    let processedItems: TranscriptItem[] = []
    
    if (targetLanguage !== "none" && res.utterances.length > 0) {
      processedItems = await translateAndConvertUtterances(res, newSessionId)
    } else {
      // 번역 없이 변환만
      processedItems = res.utterances.map((u, idx) => ({
        id: `utterance-${idx}`,
        speaker: u.speaker,
        speakerName: `화자 ${u.speaker}`,
        original: u.text,
        translated: "",
        sourceLanguage: res.language || sourceLanguage,
        targetLanguage: "none",
        timestamp: new Date(),
        start: u.start,
        end: u.end,
      }))
      setTranscripts(processedItems)
      
      // DB 저장
      if (newSessionId) {
        await saveUtterancesToDb(processedItems, newSessionId)
      }
    }
    
    // 자동 AI 처리 (녹음 종료 시)
    if (newSessionId && processedItems.length > 0) {
      await autoProcessAfterRecording(newSessionId, processedItems)
    }
    
    // 세션 목록 새로고침
    await loadSessions()
    
    setProcessingStatus("")
    setUploadedFile(null)
  }
  
  // 세션 생성
  async function createSession(res: AssemblyAIResult) {
    if (!userId) return null
    
    try {
      // 기존 세션 개수 확인
      const { count } = await supabase
        .from("translation_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("session_type", "record")
      
      const sessionNumber = (count || 0) + 1
      const title = `녹음 ${sessionNumber}`
      
      const { data, error } = await supabase
        .from("translation_sessions")
        .insert({
          user_id: userId,
          title,
          session_type: "record",
          source_language: res.language || sourceLanguage,
          target_languages: targetLanguage === "none" ? [] : [targetLanguage],
          status: "completed",
          total_utterances: res.utterances.length,
          metadata: {
            transcriptId: res.transcriptId,
            duration: res.duration,
            confidence: res.confidence,
            speakerCount: Object.keys(res.speakerStats).length,
          },
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error("Session creation error:", err)
      return null
    }
  }
  
  // 번역 및 변환
  async function translateAndConvertUtterances(res: AssemblyAIResult, sessId: string | null): Promise<TranscriptItem[]> {
    setIsTranslating(true)
    const items: TranscriptItem[] = []
    
    for (let idx = 0; idx < res.utterances.length; idx++) {
      const u = res.utterances[idx]
      let translated = ""
      
      try {
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              q: u.text,
              target: targetLanguage,
              format: "text",
            }),
          }
        )
        
        const data = await response.json()
        translated = data.data?.translations?.[0]?.translatedText || ""
      } catch (err) {
        console.error("번역 오류:", err)
      }
      
      items.push({
        id: `utterance-${idx}`,
        speaker: u.speaker,
        speakerName: `화자 ${u.speaker}`,
        original: u.text,
        translated,
        sourceLanguage: res.language || sourceLanguage,
        targetLanguage,
        timestamp: new Date(),
        start: u.start,
        end: u.end,
      })
    }
    
    setTranscripts(items)
    setIsTranslating(false)
    
    // DB 저장
    if (sessId) {
      await saveUtterancesToDb(items, sessId)
    }
    
    return items
  }
  
  // 발화 DB 저장
  async function saveUtterancesToDb(items: TranscriptItem[], sessId: string) {
    if (!userId) return
    
    for (const item of items) {
      try {
        const { data: utterance, error: uError } = await supabase
          .from("utterances")
          .insert({
            session_id: sessId,
            user_id: userId,
            speaker_name: item.speakerName,
            original_text: item.original,
            original_language: item.sourceLanguage,
            metadata: { start: item.start, end: item.end, speaker: item.speaker },
          })
          .select()
          .single()

        if (uError) throw uError

        // 번역 저장
        if (item.translated && utterance) {
          await supabase
            .from("translations")
            .insert({
              utterance_id: utterance.id,
              translated_text: item.translated,
              target_language: item.targetLanguage,
              translation_provider: "google",
            })
        }
      } catch (err) {
        console.error("발화 저장 오류:", err)
      }
    }
  }
  
  // 녹음 종료 후 자동 AI 처리
  async function autoProcessAfterRecording(sessId: string, items: TranscriptItem[]) {
    try {
      // 1. AI 재정리 (items가 2개 이상일 때만)
      if (items.length >= 2) {
        setError("🔄 AI 재정리 중...")
        await reorganizeSentences()
      }
      
      // 2. 문서 정리
      setError("📝 녹음기록 작성 중...")
      await generateDocument()
      
      // 3. 요약 생성
      setError("✨ 요약본 생성 중...")
      await generateSummaryForSession(sessId, items)
      
      setError(null)
    } catch (err) {
      console.error("자동 처리 오류:", err)
      setError(null)
    }
  }
  
  // AI 재정리
  const reorganizeSentences = async () => {
    if (transcripts.length < 2) return
    
    setIsReorganizing(true)
    try {
      const originalTexts = transcripts.map((t, idx) => ({
        index: idx,
        text: t.original,
        speaker: t.speakerName,
      }))

      const response = await fetch("/api/gemini/reorganize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utterances: originalTexts }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "AI 재정리 실패")
      }

      const reorganized = result.data as { merged_from: number[]; text: string }[]
      
      if (!Array.isArray(reorganized) || reorganized.length === 0) {
        throw new Error("AI 응답 형식이 올바르지 않습니다.")
      }

      // 새로운 transcript 목록 생성 및 번역
      const newTranscripts: TranscriptItem[] = []
      
      for (const item of reorganized) {
        let translated = item.text
        if (targetLanguage !== "none" && sourceLanguage !== targetLanguage) {
          translated = await translateText(item.text, sourceLanguage, targetLanguage)
        }
        
        const baseItem = transcripts[item.merged_from[0]] || transcripts[0]
        
        newTranscripts.push({
          id: `reorganized-${Date.now()}-${Math.random()}`,
          speaker: baseItem.speaker,
          speakerName: baseItem.speakerName,
          original: item.text,
          translated,
          sourceLanguage: baseItem.sourceLanguage,
          targetLanguage: baseItem.targetLanguage,
          timestamp: baseItem.timestamp,
          start: baseItem.start,
          end: baseItem.end,
        })
      }

      setTranscripts(newTranscripts)
      
    } catch (err) {
      console.error("AI 재정리 오류:", err)
      setError(err instanceof Error ? err.message : "AI 재정리에 실패했습니다.")
    } finally {
      setIsReorganizing(false)
    }
  }
  
  // 텍스트 번역
  const translateText = async (text: string, from: string, to: string): Promise<string> => {
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, source: from === "auto" ? undefined : from, target: to, format: "text" }),
        }
      )
      const data = await response.json()
      return data.data?.translations?.[0]?.translatedText || text
    } catch {
      return text
    }
  }
  
  // 문서 정리
  const generateDocument = async () => {
    if (transcripts.length === 0) return
    
    setIsDocumenting(true)
    setDocumentTextOriginal("")
    setDocumentTextTranslated("")
    
    try {
      const srcLangName = getLanguageInfo(sourceLanguage === "auto" ? "ko" : sourceLanguage).name
      const tgtLangName = getLanguageInfo(targetLanguage).name
      
      const originalTexts = transcripts.map(t => `[${t.speakerName}] ${t.original}`).join("\n")
      const translatedTexts = transcripts
        .filter(t => t.translated)
        .map(t => `[${t.speakerName}] ${t.translated}`)
        .join("\n")
      
      if (targetLanguage === "none" || !translatedTexts) {
        const response = await fetch("/api/gemini/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalTexts,
            targetLanguage: sourceLanguage === "auto" ? "ko" : sourceLanguage,
            customPrompt: getDocumentPrompt(sourceLanguage === "auto" ? "ko" : sourceLanguage, srcLangName) + "\n\n원본 텍스트:\n" + originalTexts,
          }),
        })
        
        const result = await response.json()
        if (!result.success) throw new Error(result.error || "문서 정리 실패")
        
        setDocumentTextOriginal(result.summary)
        setDocumentTextTranslated("")
        
        await saveDocumentToDb(result.summary, "")
      } else {
        const [originalResponse, translatedResponse] = await Promise.all([
          fetch("/api/gemini/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: originalTexts,
              targetLanguage: sourceLanguage === "auto" ? "ko" : sourceLanguage,
              customPrompt: getDocumentPrompt(sourceLanguage === "auto" ? "ko" : sourceLanguage, srcLangName) + "\n\n원본 텍스트:\n" + originalTexts,
            }),
          }),
          fetch("/api/gemini/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: translatedTexts,
              targetLanguage: targetLanguage,
              customPrompt: getDocumentPrompt(targetLanguage, tgtLangName) + "\n\n원본 텍스트:\n" + translatedTexts,
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
        
        await saveDocumentToDb(originalResult.summary, translatedResult.summary)
      }
      
      setDocumentViewTab("original")
      setIsEditingDocument(false)
      setShowDocumentInPanel(true)
      
      // 문서 정리 완료 후 요약본 자동 생성
      if (sessionId) {
        setError("✨ 요약본 생성 중...")
        await generateSummaryForSession(sessionId)
        setError(null)
      }
      
    } catch (err) {
      console.error("문서 정리 오류:", err)
      setError(err instanceof Error ? err.message : "문서 정리 중 오류가 발생했습니다.")
    } finally {
      setIsDocumenting(false)
    }
  }
  
  // 문서 프롬프트 - 화자별 글머리표 형식
  const getDocumentPrompt = (langCode: string, langName: string) => {
    if (langCode === "en") {
      return `You are a professional recording transcript writer. Convert the speech recognition text into ${langName} organized transcript.
IMPORTANT: Your ENTIRE response MUST be in English. Do not use any other language.

## Recording Transcript Format Rules
Write in markdown format with bullet points for each speaker's statement:

- **[Speaker A]** What Speaker A said (converted to written form)
- **[Speaker B]** What Speaker B said (converted to written form)
- **[Speaker A]** Next statement from Speaker A
...

## Additional Rules:
1. Each statement starts with a bullet point (-)
2. Speaker name in bold brackets: **[Speaker A]**, **[Speaker B]**, etc.
3. Convert spoken language to clear written form
4. Remove filler words (um, uh, like, etc.)
5. Keep the chronological order of statements
6. **Bold** important keywords within statements

Please write the transcript following this exact format.`
    }
    
    return `당신은 전문 녹음기록 작성 비서입니다. 음성 인식 텍스트를 ${langName} 녹음기록으로 변환합니다.
중요: 반드시 ${langName}로 작성해주세요.

## 녹음기록 작성 형식
화자별로 글머리표를 사용하여 마크다운 형식으로 작성합니다:

- **[화자 A]** 화자 A가 말한 내용 (문어체로 변환)
- **[화자 B]** 화자 B가 말한 내용 (문어체로 변환)
- **[화자 A]** 화자 A의 다음 발언
...

## 추가 규칙:
1. 각 발언은 글머리표(-)로 시작
2. 화자명은 굵은 대괄호로 표시: **[화자 A]**, **[화자 B]** 등
3. 구어체를 명확한 문어체로 변환
4. 음, 어, 그.. 등 불필요한 말 제거
5. 발언 순서(시간순) 유지
6. 발언 내 **중요 키워드**는 굵게 표시

위 형식에 맞춰 녹음기록을 작성하세요.`
  }
  
  // DB에 녹음기록 저장
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
        })
        .eq("id", sessionId)
      
      if (error) throw error
      return true
    } catch (err) {
      console.error("녹음기록 저장 오류:", err)
      return false
    }
  }
  
  // 요약 생성
  const generateSummaryForSession = async (sessId: string, transcriptItems?: TranscriptItem[]) => {
    const items = transcriptItems || transcripts
    if (items.length === 0) {
      console.log("[요약] transcripts가 비어있음")
      return
    }
    
    setIsSummarizing(true)
    try {
      const texts = items.map(t => t.original)
      const combinedText = texts.join("\n")
      
      console.log("[요약] 요약 생성 시작:", { sessId, textLength: combinedText.length })
      
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: combinedText,
          targetLanguage: summaryLanguage,
        }),
      })
      
      const result = await response.json()
      console.log("[요약] API 응답:", { success: result.success, hasError: !!result.error })
      
      if (result.success && result.summary) {
        setSummaryText(result.summary)
        setSavedSummaries({ [summaryLanguage]: result.summary })
        
        // DB 저장 - 기존 요약 확인 후 업데이트 또는 생성
        const { data: existing } = await supabase
          .from("session_summaries")
          .select("id")
          .eq("session_id", sessId)
          .eq("language", summaryLanguage)
          .single()
        
        if (existing) {
          await supabase
            .from("session_summaries")
            .update({ summary_text: result.summary, updated_at: new Date().toISOString() })
            .eq("id", existing.id)
        } else {
          await supabase
            .from("session_summaries")
            .insert({
              session_id: sessId,
              language: summaryLanguage,
              summary_text: result.summary,
              user_id: userId,
            })
        }
        console.log("[요약] DB 저장 완료")
      } else {
        console.error("[요약] API 응답 실패:", result.error)
      }
    } catch (err) {
      console.error("[요약] 요약 생성 오류:", err)
    } finally {
      setIsSummarizing(false)
    }
  }
  
  // 커스텀 확인 모달
  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModalMessage(message)
    setConfirmModalCallback(() => onConfirm)
    setShowConfirmModal(true)
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
      
      // 세션 목록 업데이트
      setSessions(prev => prev.map(s => 
        s.id === sessionIdToUpdate ? { ...s, title: newTitle } : s
      ))
      
      // 현재 세션이면 제목도 업데이트
      if (sessionId === sessionIdToUpdate) {
        setCurrentSessionTitle(newTitle)
      }
    } catch (err) {
      console.error("세션 제목 업데이트 오류:", err)
    }
  }
  
  // 현재 세션 제목 업데이트
  const updateCurrentSessionTitle = async () => {
    if (!sessionId || !editCurrentTitleText.trim()) {
      setIsEditingCurrentTitle(false)
      return
    }
    
    await updateSessionTitle(sessionId, editCurrentTitleText.trim())
    setIsEditingCurrentTitle(false)
  }
  
  // 세션 삭제
  const deleteSession = async (sessionIdToDelete: string) => {
    showConfirm("이 녹음 기록을 삭제하시겠습니까?", async () => {
      try {
        const { error } = await supabase
          .from("translation_sessions")
          .delete()
          .eq("id", sessionIdToDelete)
        
        if (error) {
          console.error("세션 삭제 실패:", error)
          return
        }
        
        setSessions(prev => prev.filter(s => s.id !== sessionIdToDelete))
        
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
  
  // 세션 로드
  const loadSessionData = async (session: SessionItem) => {
    setIsLoadingSessions(true)
    try {
      setSessionId(session.id)
      setCurrentSessionTitle(session.title)
      setSourceLanguage(session.source_language || "auto")
      setTargetLanguage(session.target_languages?.[0] || "none")
      setShowSessionList(false)
      setShowDocumentInPanel(false)
      
      // 발화 데이터 로드
      const { data: utterances, error } = await supabase
        .from("utterances")
        .select(`
          id,
          speaker_name,
          original_text,
          original_language,
          metadata,
          created_at,
          translations (
            translated_text,
            target_language
          )
        `)
        .eq("session_id", session.id)
        .order("created_at", { ascending: true })
      
      if (error) throw error
      
      const items: TranscriptItem[] = (utterances || []).map((u: any, idx: number) => ({
        id: u.id,
        speaker: u.metadata?.speaker || "A",
        speakerName: u.speaker_name || `화자 ${idx + 1}`,
        original: u.original_text,
        translated: u.translations?.[0]?.translated_text || "",
        sourceLanguage: u.original_language,
        targetLanguage: u.translations?.[0]?.target_language || "none",
        timestamp: new Date(u.created_at),
        start: u.metadata?.start || 0,
        end: u.metadata?.end || 0,
        utteranceId: u.id,
      }))
      
      setTranscripts(items)
      
      // 녹음기록 데이터 로드
      const { data: sessionDoc } = await supabase
        .from("translation_sessions")
        .select("document_original_md, document_translated_md")
        .eq("id", session.id)
        .single()
      
      if (sessionDoc) {
        setDocumentTextOriginal(sessionDoc.document_original_md || "")
        setDocumentTextTranslated(sessionDoc.document_translated_md || "")
      }
      
      // 요약본 로드
      const { data: summaryData } = await supabase
        .from("session_summaries")
        .select("summary_text, language")
        .eq("session_id", session.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
      
      if (summaryData) {
        setSummaryText(summaryData.summary_text || "")
        setSavedSummaries({ [summaryData.language]: summaryData.summary_text })
      } else {
        setSummaryText("")
        setSavedSummaries({})
      }
      
    } catch (err) {
      console.error("세션 로드 오류:", err)
    } finally {
      setIsLoadingSessions(false)
    }
  }
  
  // 화자 색상
  const getSpeakerColor = (speaker: string) => {
    const index = speaker.charCodeAt(0) - 65
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length]
  }
  
  // 타임스탬프 포맷
  const formatTimestamp = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }
  
  // TTS 재생
  const playTTS = async (text: string, langCode: string, itemId: string) => {
    if (!text.trim()) return
    
    // 이미 재생 중이면 중지
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause()
      ttsAudioRef.current = null
    }
    
    if (speakingId === itemId) {
      setIsSpeaking(false)
      setSpeakingId(null)
      return
    }
    
    try {
      setIsSpeaking(true)
      setSpeakingId(itemId)
      
      const ttsLangCode = LANGUAGES.find(l => l.code === langCode)?.ttsCode || "ko-KR"
      
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          languageCode: ttsLangCode,
          gender: "MALE",
        }),
      })
      
      if (!response.ok) throw new Error("TTS 요청 실패")
      
      const data = await response.json()
      
      // Base64 오디오 재생
      const audioContent = data.audioContent
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`)
      ttsAudioRef.current = audio
      
      audio.onended = () => {
        setIsSpeaking(false)
        setSpeakingId(null)
        ttsAudioRef.current = null
      }
      
      audio.onerror = () => {
        setIsSpeaking(false)
        setSpeakingId(null)
        ttsAudioRef.current = null
      }
      
      await audio.play()
    } catch (err) {
      console.error("TTS 오류:", err)
      setIsSpeaking(false)
      setSpeakingId(null)
    }
  }
  
  // TTS 중지
  const stopTTS = () => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause()
      ttsAudioRef.current = null
    }
    setIsSpeaking(false)
    setSpeakingId(null)
  }
  
  // 항목 편집 시작
  const startEditItem = (item: TranscriptItem) => {
    setEditingItemId(item.id)
    setEditingOriginal(item.original)
    setEditingTranslated(item.translated)
  }
  
  // 항목 편집 저장
  const saveEditItem = (itemId: string) => {
    setTranscripts(prev => prev.map(t => {
      if (t.id === itemId) {
        return {
          ...t,
          original: editingOriginal,
          translated: editingTranslated,
        }
      }
      return t
    }))
    setEditingItemId(null)
    setEditingOriginal("")
    setEditingTranslated("")
  }
  
  // 항목 편집 취소
  const cancelEditItem = () => {
    setEditingItemId(null)
    setEditingOriginal("")
    setEditingTranslated("")
  }
  
  // 항목 삭제
  const deleteTranscriptItem = (itemId: string) => {
    setConfirmModalMessage("이 항목을 삭제하시겠습니까?")
    setConfirmModalCallback(() => () => {
      setTranscripts(prev => prev.filter(t => t.id !== itemId))
    })
    setShowConfirmModal(true)
  }
  
  // 수동 병합 선택 토글
  const toggleMergeSelection = (itemId: string) => {
    setSelectedForMerge(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }
  
  // 선택 항목 병합
  const mergeSelectedItems = async () => {
    if (selectedForMerge.size < 2) {
      setError("병합할 항목을 2개 이상 선택하세요.")
      return
    }
    
    const selectedItems = transcripts
      .filter(t => selectedForMerge.has(t.id))
      .sort((a, b) => a.start - b.start)
    
    const mergedOriginal = selectedItems.map(t => t.original).join(" ")
    const mergedTranslated = selectedItems.map(t => t.translated).filter(Boolean).join(" ")
    
    const firstItem = selectedItems[0]
    const lastItem = selectedItems[selectedItems.length - 1]
    
    const newItem: TranscriptItem = {
      id: `merged-${Date.now()}`,
      speaker: firstItem.speaker,
      speakerName: firstItem.speakerName,
      original: mergedOriginal,
      translated: mergedTranslated,
      sourceLanguage: firstItem.sourceLanguage,
      targetLanguage: firstItem.targetLanguage,
      timestamp: firstItem.timestamp,
      start: firstItem.start,
      end: lastItem.end,
    }
    
    // 선택 항목 제거 후 새 항목 추가
    const otherItems = transcripts.filter(t => !selectedForMerge.has(t.id))
    const insertIndex = transcripts.findIndex(t => t.id === firstItem.id)
    
    const newTranscripts = [
      ...otherItems.slice(0, insertIndex),
      newItem,
      ...otherItems.slice(insertIndex),
    ].sort((a, b) => a.start - b.start)
    
    setTranscripts(newTranscripts)
    setSelectedForMerge(new Set())
    setMergeMode(false)
  }
  
  // 녹음 시작
  const handleStartRecording = async () => {
    setError(null)
    setAssemblyResult(null)
    setTranscripts([])
    setDocumentTextOriginal("")
    setDocumentTextTranslated("")
    setRecordMode("recording")
    await startRecording()
  }
  
  // 녹음 중지
  const handleStopRecording = async () => {
    await stopRecording()
  }
  
  // YouTube URL 감지
  const isYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ]
    return patterns.some(pattern => pattern.test(url))
  }

  // URL 전사
  const handleUrlTranscribe = async () => {
    if (!audioUrl.trim()) {
      setError("URL을 입력해주세요")
      return
    }
    setError(null)
    setAssemblyResult(null)
    setTranscripts([])
    setDocumentTextOriginal("")
    setDocumentTextTranslated("")
    setRecordMode("url")
    setUploadProgress(10)
    setProcessingStatus("URL 분석 중...")

    // YouTube URL인 경우 자막 API 사용
    if (isYouTubeUrl(audioUrl)) {
      try {
        setProcessingStatus("YouTube 자막 추출 중...")
        setUploadProgress(30)

        const response = await fetch("/api/youtube/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            youtubeUrl: audioUrl,
            targetLanguage: targetLanguage !== "none" ? targetLanguage : undefined,
          }),
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "YouTube 자막을 가져올 수 없습니다")
        }

        setUploadProgress(70)
        setProcessingStatus("데이터 변환 중...")

        // 세션 생성
        let newSessionId: string | null = null
        if (userId) {
          const { count } = await supabase
            .from("translation_sessions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("session_type", "record")
          
          const sessionNumber = (count || 0) + 1
          const title = data.videoTitle || `YouTube 녹음 ${sessionNumber}`
          
          const { data: session, error } = await supabase
            .from("translation_sessions")
            .insert({
              user_id: userId,
              title,
              session_type: "record",
              source_language: data.language || sourceLanguage,
              target_languages: targetLanguage === "none" ? [] : [targetLanguage],
              status: "completed",
              total_utterances: data.utterances?.length || 0,
              metadata: {
                youtubeVideoId: data.videoId,
                youtubeTitle: data.videoTitle,
                duration: data.duration,
              },
            })
            .select()
            .single()

          if (!error && session) {
            newSessionId = session.id
            setSessionId(session.id)
            setCurrentSessionTitle(session.title)
          }
        }

        // 발화 변환
        const items: TranscriptItem[] = (data.utterances || []).map((u: any, idx: number) => ({
          id: `youtube-${idx}`,
          speaker: u.speaker || "A",
          speakerName: "화자 A",
          original: u.text,
          translated: u.translated || "",
          sourceLanguage: data.language || sourceLanguage,
          targetLanguage: targetLanguage,
          timestamp: new Date(),
          start: u.start || 0,
          end: u.end || 0,
        }))

        setTranscripts(items)
        setUploadProgress(100)

        // DB 저장
        if (newSessionId) {
          await saveUtterancesToDb(items, newSessionId)
        }

        // 자동 AI 처리
        if (newSessionId && items.length > 0) {
          await autoProcessAfterRecording(newSessionId, items)
        }

        // 세션 목록 새로고침
        await loadSessions()

        setProcessingStatus("")
        setRecordMode("idle")
        setUploadProgress(0)
        setAudioUrl("")

      } catch (err) {
        console.error("YouTube 처리 오류:", err)
        setError(err instanceof Error ? err.message : "YouTube 처리 중 오류가 발생했습니다")
        setRecordMode("idle")
        setUploadProgress(0)
        setProcessingStatus("")
      }
    } else {
      // 일반 오디오 URL인 경우 AssemblyAI 사용
      setProcessingStatus("오디오 파일 분석 중...")
      await transcribeFromUrl(audioUrl)
      setRecordMode("idle")
      setUploadProgress(0)
      setAudioUrl("")
      // 세션 목록 새로고침 (AssemblyAI 콜백에서 처리됨)
    }
  }
  
  // 파일 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setError(null)
    setAssemblyResult(null)
    setTranscripts([])
    setDocumentTextOriginal("")
    setDocumentTextTranslated("")
    setRecordMode("file")
    setUploadedFile(file)
    setUploadProgress(0)
    setProcessingStatus("파일 업로드 중...")
    
    await transcribeFromFile(file)
    
    // 완료 후 파일 입력 초기화
    if (e.target) {
      e.target.value = ""
    }
  }
  
  // 파일 크기 포맷
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  
  // 세션 종료 및 AI 처리
  const finalizeSession = async () => {
    if (!sessionId || transcripts.length === 0) {
      // 내용이 없으면 그냥 초기화
      startNewRecording()
      return
    }
    
    try {
      // 1. AI 재정리
      setError("🔄 AI 재정리 중...")
      await reorganizeSentences()
      
      // 2. 문서 정리
      setError("📝 녹음기록 작성 중...")
      await generateDocument()
      
      // 3. 요약 생성
      setError("✨ 요약본 생성 중...")
      await generateSummaryForSession(sessionId)
      
      setError(null)
      
      // 세션 목록 새로고침
      await loadSessions()
      
    } catch (err) {
      console.error("세션 종료 처리 오류:", err)
      setError(null)
    }
  }
  
  // 새 녹음 시작 (초기화)
  const startNewRecording = () => {
    setSessionId(null)
    setCurrentSessionTitle("")
    setAssemblyResult(null)
    setTranscripts([])
    setDocumentTextOriginal("")
    setDocumentTextTranslated("")
    setShowDocumentInPanel(false)
    setRecordMode("idle")
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4" style={{ backgroundColor: '#00BBAE' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Trash2 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">삭제 확인</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 text-center">{confirmModalMessage}</p>
            </div>
            <div className="flex border-t border-slate-200">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setConfirmModalCallback(null)
                }}
                className="flex-1 py-3 text-slate-600 hover:bg-slate-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  if (confirmModalCallback) confirmModalCallback()
                  setConfirmModalCallback(null)
                }}
                className="flex-1 py-3 font-medium border-l border-slate-200"
                style={{ backgroundColor: '#00BBAE', color: 'white' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 세션 목록 패널 */}
      {showSessionList && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowSessionList(false)}
          />
          <div className="w-full max-w-[500px] bg-white shadow-2xl flex flex-col h-screen">
            <div className="shrink-0 p-4 border-b border-teal-200" style={{ backgroundColor: '#CCFBF1' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 text-teal-800">
                  <List className="h-5 w-5" />
                  녹음 기록
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
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <FileAudio className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>저장된 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        sessionId === session.id 
                          ? "border-teal-400 bg-teal-50" 
                          : "border-teal-200 hover:bg-teal-50"
                      }`}
                      onClick={() => loadSessionData(session)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {editingSessionId === session.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingSessionTitle}
                                onChange={(e) => setEditingSessionTitle(e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-teal-300 rounded bg-white"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateSessionTitle(session.id, editingSessionTitle)
                                    setEditingSessionId(null)
                                    setEditingSessionTitle("")
                                  } else if (e.key === "Escape") {
                                    setEditingSessionId(null)
                                    setEditingSessionTitle("")
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  updateSessionTitle(session.id, editingSessionTitle)
                                  setEditingSessionId(null)
                                  setEditingSessionTitle("")
                                }}
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
                                <X className="h-4 w-4 text-slate-500" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <h3 className="font-semibold text-slate-900 truncate">
                                {session.title}
                              </h3>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingSessionId(session.id)
                                  setEditingSessionTitle(session.title)
                                }}
                                className="opacity-0 group-hover:opacity-100"
                              >
                                <Edit3 className="h-3 w-3 text-teal-500" />
                              </Button>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.created_at).toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        </div>
                        
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
                            <Edit3 className="h-4 w-4 text-teal-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async (e) => {
                              e.stopPropagation()
                              await loadSessionData(session)
                              setIsEditingDocument(false)
                              setShowDocumentInPanel(true)
                            }}
                            title="녹음기록 보기"
                          >
                            <FileText className="h-4 w-4 text-emerald-600" />
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
            </div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-2 space-y-2">
          {/* 1. 상단 타이틀바 */}
          <div className="text-white rounded-lg" style={{ background: 'linear-gradient(to right, #00BBAE, #14B8A6)' }}>
            <div className="px-4 py-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <FileAudio className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">녹음 통역</h1>
                <p className="text-sm text-white/80">파일, 마이크, URL로 음성을 통역합니다</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={startNewRecording}
                  className="text-white hover:bg-white/20"
                  title="메인 화면으로"
                >
                  <List className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* 2. 녹음 패널 */}
          <Card className="border-2 border-teal-200 bg-white shadow-lg">
            <CardContent className="p-5">
              {/* 세션 타이틀 */}
              {(sessionId || transcripts.length > 0) && (
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-teal-100">
                  <div className="flex-1 flex items-center gap-2">
                    {isEditingCurrentTitle ? (
                      <>
                        <input
                          type="text"
                          value={editCurrentTitleText}
                          onChange={(e) => setEditCurrentTitleText(e.target.value)}
                          placeholder="녹음 세션 제목을 입력하세요..."
                          className="flex-1 h-10 px-3 rounded-lg border border-teal-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateCurrentSessionTitle()
                            } else if (e.key === "Escape") {
                              setIsEditingCurrentTitle(false)
                              setEditCurrentTitleText(currentSessionTitle)
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={updateCurrentSessionTitle}
                          className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIsEditingCurrentTitle(false)
                            setEditCurrentTitleText(currentSessionTitle)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-semibold text-teal-700">
                          📁 {currentSessionTitle || "새 녹음"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditCurrentTitleText(currentSessionTitle)
                            setIsEditingCurrentTitle(true)
                          }}
                          className="text-teal-600 hover:bg-teal-100"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 언어 선택 */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">음성 언어</label>
                  <select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    disabled={isRecording || isProcessing}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    {SOURCE_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 mt-5" />
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">번역 언어</label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    disabled={isRecording || isProcessing}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    {TARGET_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 녹음 방식 선택 (idle 상태) */}
              {recordMode === "idle" && !isProcessing && transcripts.length === 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="h-20 flex-col gap-2 border-2 border-teal-200 hover:bg-teal-50"
                  >
                    <Upload className="h-6 w-6 text-teal-500" />
                    <span className="text-teal-700">파일 업로드</span>
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={handleStartRecording}
                    className="h-20 flex-col gap-2"
                    style={{ background: 'linear-gradient(to right, #00BBAE, #14B8A6)' }}
                  >
                    <Mic className="h-6 w-6" />
                    <span>마이크 녹음</span>
                  </Button>
                  <Button
                    onClick={() => setRecordMode("url")}
                    variant="outline"
                    className="h-20 flex-col gap-2 border-2 border-teal-200 hover:bg-teal-50"
                  >
                    <LinkIcon className="h-6 w-6 text-teal-500" />
                    <span className="text-teal-700">URL 입력</span>
                  </Button>
                </div>
              )}

              {/* 파일 업로드/처리 중 상태 표시 */}
              {(recordMode === "file" || isProcessing) && (
                <div className="space-y-4 p-4 bg-teal-50 rounded-xl border border-teal-200">
                  {/* 파일 정보 */}
                  {uploadedFile && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                        <FileAudio className="h-6 w-6 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-700 truncate">{uploadedFile.name}</div>
                        <div className="text-sm text-slate-500">{formatFileSize(uploadedFile.size)}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* 진행률 바 */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">업로드 진행률</span>
                        <span className="font-medium text-teal-600">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* 처리 상태 메시지 */}
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-teal-600 animate-spin" />
                    <span className="text-teal-700 font-medium">
                      {processingStatus || (uploadProgress >= 50 ? "음성 인식 처리 중..." : "파일 업로드 중...")}
                    </span>
                  </div>
                  
                  {/* 취소 버튼 */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setRecordMode("idle")
                      setUploadedFile(null)
                      setUploadProgress(0)
                      setProcessingStatus("")
                    }}
                    className="border-teal-300 text-teal-700 hover:bg-teal-100"
                  >
                    취소
                  </Button>
                </div>
              )}

              {/* URL 입력 모드 - 입력 대기 */}
              {recordMode === "url" && !isProcessing && uploadProgress === 0 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      placeholder="오디오/비디오 URL 또는 YouTube URL 입력..."
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    />
                    <Button onClick={handleUrlTranscribe} style={{ backgroundColor: '#00BBAE' }} className="hover:opacity-90">
                      <Play className="h-4 w-4 mr-2" />
                      통역시작
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setRecordMode("idle")}>
                    취소
                  </Button>
                </div>
              )}

              {/* URL 처리 중 상태 */}
              {recordMode === "url" && (isProcessing || uploadProgress > 0) && (
                <div className="space-y-4 p-4 bg-teal-50 rounded-xl border border-teal-200">
                  {/* 상태 헤더 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                        <Globe className="h-6 w-6 text-teal-600 animate-pulse" />
                      </div>
                      <div>
                        <div className="font-medium text-teal-700">
                          {processingStatus || "URL 통역 중..."}
                        </div>
                        <div className="text-sm text-slate-500">
                          {audioUrl.length > 50 ? audioUrl.substring(0, 50) + "..." : audioUrl}
                        </div>
                      </div>
                    </div>
                    {/* 종료 버튼 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRecordMode("idle")
                        setUploadProgress(0)
                        setProcessingStatus("")
                        setAudioUrl("")
                      }}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      종료
                    </Button>
                  </div>
                  
                  {/* 진행률 바 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">진행률</span>
                      <span className="font-medium text-teal-600">{uploadProgress}%</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${uploadProgress}%`,
                          background: 'linear-gradient(to right, #00BBAE, #14B8A6)'
                        }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 text-center">
                      {uploadProgress < 30 && "URL 분석 중..."}
                      {uploadProgress >= 30 && uploadProgress < 70 && "자막/음성 추출 중..."}
                      {uploadProgress >= 70 && uploadProgress < 100 && "데이터 변환 중..."}
                      {uploadProgress >= 100 && "완료! AI 처리 중..."}
                    </div>
                  </div>
                </div>
              )}

              {/* 녹음 중 */}
              {isRecording && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full bg-red-500 animate-pulse flex items-center justify-center"
                      style={{
                        transform: `scale(${1 + audioLevel * 0.3})`,
                        transition: "transform 0.1s",
                      }}
                    >
                      <Mic className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <div className="text-3xl font-mono font-bold text-red-500">
                        {formatDuration(recordingDuration)}
                      </div>
                      <div className="text-sm text-slate-500">녹음 중...</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleStopRecording}
                      className="flex-1 bg-red-500 hover:bg-red-600"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      녹음 종료
                    </Button>
                    <Button variant="outline" onClick={cancelRecording}>
                      취소
                    </Button>
                  </div>
                </div>
              )}

              {/* 처리 중 (녹음, 파일, URL 모두) */}
              {isProcessing && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-12 w-12 text-teal-500 animate-spin" />
                    <div>
                      <div className="font-medium text-lg text-teal-700">
                        {uploadProgress < 30 ? "파일 업로드 중..." : uploadProgress < 70 ? "음성 분석 중..." : "전사 결과 처리 중..."}
                      </div>
                      <div className="text-sm text-slate-500">
                        {recordMode === "file" && "파일을 처리하고 있습니다. 파일 크기에 따라 시간이 걸릴 수 있습니다."}
                        {recordMode === "recording" && "녹음된 음성을 분석하고 있습니다."}
                        {recordMode === "url" && "URL에서 음성을 추출하고 분석하고 있습니다."}
                        {recordMode === "idle" && "음성을 처리하고 있습니다."}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${uploadProgress}%`,
                        background: 'linear-gradient(to right, #00BBAE, #14B8A6)'
                      }}
                    />
                  </div>
                  <div className="text-center text-sm text-slate-500">
                    {uploadProgress}% 완료
                  </div>
                </div>
              )}

              {/* 결과 있을 때 - 컨트롤 버튼들 */}
              {transcripts.length > 0 && !isProcessing && (
                <div className="flex items-center flex-wrap gap-2">
                  {/* 목록 버튼 - 메인 화면으로 이동 */}
                  <Button
                    onClick={startNewRecording}
                    size="sm"
                    variant="outline"
                    className="h-10 px-3 rounded-full bg-teal-100 border border-teal-300 text-teal-700 hover:bg-teal-200"
                  >
                    <List className="h-4 w-4 mr-1" />
                    목록
                  </Button>

                  {/* 종료 버튼 - AI 처리 후 저장 */}
                  <Button
                    onClick={finalizeSession}
                    size="sm"
                    variant="outline"
                    className={`h-10 px-3 rounded-full border-2 ${
                      documentTextOriginal
                        ? "border-slate-300 text-slate-400 bg-slate-50"
                        : "border-orange-400 text-orange-600 hover:bg-orange-100"
                    }`}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    종료
                  </Button>

                  {/* AI 재정리 */}
                  {transcripts.length >= 2 && (
                    <Button
                      onClick={reorganizeSentences}
                      disabled={isReorganizing}
                      size="sm"
                      variant="outline"
                      className={`h-10 px-3 rounded-full border-2 ${
                        documentTextOriginal
                          ? "border-slate-300 text-slate-400 bg-slate-50"
                          : "border-teal-400 text-teal-600 hover:bg-teal-100"
                      }`}
                    >
                      {isReorganizing ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      AI 재정리
                    </Button>
                  )}

                  {/* 수동 병합 */}
                  {transcripts.length >= 2 && (
                    <Button
                      onClick={() => setMergeMode(!mergeMode)}
                      size="sm"
                      variant="outline"
                      className={`h-10 px-3 rounded-full border-2 ${
                        documentTextOriginal
                          ? "border-slate-300 text-slate-400 bg-slate-50"
                          : "border-blue-400 text-blue-600 hover:bg-blue-100"
                      }`}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      수동 병합
                    </Button>
                  )}

                  {/* 문서 정리 */}
                  <Button
                    onClick={generateDocument}
                    disabled={isDocumenting}
                    size="sm"
                    variant="outline"
                    className={`h-10 px-3 rounded-full border-2 ${
                      documentTextOriginal
                        ? "border-slate-300 text-slate-400 bg-slate-50"
                        : "border-green-400 text-green-600 hover:bg-green-100"
                    }`}
                  >
                    {isDocumenting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-1" />
                    )}
                    문서 정리
                  </Button>

                  {/* 녹음기록 버튼 */}
                  {documentTextOriginal && (
                    <Button
                      onClick={() => {
                        setIsEditingDocument(false)
                        setShowDocumentInPanel(true)
                      }}
                      size="sm"
                      variant="outline"
                      className="h-10 px-3 rounded-full border-2 border-emerald-400 text-emerald-600 hover:bg-emerald-100"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      녹음기록
                    </Button>
                  )}

                  {/* 요약본 버튼 */}
                  {documentTextOriginal && (
                    <Button
                      onClick={() => setShowSummaryModal(true)}
                      size="sm"
                      variant="outline"
                      className="h-10 px-3 rounded-full border-2 border-amber-400 text-amber-600 hover:bg-amber-100"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      요약본
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {/* 3. 통역 결과 / 녹음기록 패널 */}
          {(transcripts.length > 0 || showDocumentInPanel) && (
            <Card className="border-2 shadow-lg overflow-hidden" style={{ borderColor: '#96F7E4', backgroundColor: '#CCFBF1' }}>
              <CardContent className="p-0 rounded-b-xl bg-white">
                {/* 녹음기록 보기 모드 */}
                {showDocumentInPanel && documentTextOriginal ? (
                  <div className="bg-white rounded-b-xl">
                    {/* 헤더 */}
                    <div className="p-4 border-b" style={{ backgroundColor: '#CCFBF1', borderColor: '#96F7E4' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-teal-700" />
                          <h3 className="font-bold text-teal-800">녹음기록</h3>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setDocumentViewTab("original")}
                              className={`px-3 py-1 text-sm rounded-full ${
                                documentViewTab === "original"
                                  ? "bg-teal-500 text-white"
                                  : "bg-teal-100 text-teal-700"
                              }`}
                            >
                              {getLanguageInfo(sourceLanguage === "auto" ? "ko" : sourceLanguage).flag} 원문
                            </button>
                            {documentTextTranslated && (
                              <button
                                onClick={() => setDocumentViewTab("translated")}
                                className={`px-3 py-1 text-sm rounded-full ${
                                  documentViewTab === "translated"
                                    ? "bg-teal-500 text-white"
                                    : "bg-teal-100 text-teal-700"
                                }`}
                              >
                                {getLanguageInfo(targetLanguage).flag} 번역
                              </button>
                            )}
                          </div>
                        </div>
                        {/* 액션 버튼들 */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsEditingDocument(!isEditingDocument)
                              if (!isEditingDocument) {
                                setEditDocumentText(documentViewTab === "original" ? documentTextOriginal : documentTextTranslated)
                              }
                            }}
                            className="text-slate-600 hover:text-teal-700"
                            title="편집"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const content = documentViewTab === "original" ? documentTextOriginal : documentTextTranslated
                              const printWindow = window.open("", "_blank")
                              if (printWindow) {
                                printWindow.document.write(`
                                  <html><head><title>녹음기록</title>
                                  <style>body{font-family:sans-serif;padding:20px;line-height:1.6}h1,h2,h3{color:#0f766e}ul,ol{margin-left:20px}</style>
                                  </head><body>${content.replace(/\n/g, "<br>")}</body></html>
                                `)
                                printWindow.document.close()
                                printWindow.print()
                              }
                            }}
                            className="text-slate-600 hover:text-teal-700"
                            title="인쇄"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const content = documentViewTab === "original" ? documentTextOriginal : documentTextTranslated
                              const langLabel = documentViewTab === "original" ? "원문" : "번역"
                              const blob = new Blob([content], { type: "text/markdown" })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement("a")
                              a.href = url
                              a.download = `녹음기록_${langLabel}_${new Date().toLocaleDateString()}.md`
                              a.click()
                              URL.revokeObjectURL(url)
                            }}
                            className="text-slate-600 hover:text-teal-700"
                            title="다운로드"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDocumentInPanel(false)}
                            className="text-slate-600 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* 본문 */}
                    <div className="p-6">
                      {isEditingDocument ? (
                        <div className="space-y-4">
                          {/* 화자명 일괄 변경 */}
                          <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg border border-teal-200">
                            <span className="text-sm text-teal-700 font-medium">화자명 변경:</span>
                            <input
                              type="text"
                              placeholder="찾을 화자명 (예: 화자 A)"
                              className="px-2 py-1 text-sm border border-teal-300 rounded"
                              id="findSpeaker"
                            />
                            <span className="text-teal-500">→</span>
                            <input
                              type="text"
                              placeholder="바꿀 이름 (예: 김철수)"
                              className="px-2 py-1 text-sm border border-teal-300 rounded"
                              id="replaceSpeaker"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const findInput = document.getElementById("findSpeaker") as HTMLInputElement
                                const replaceInput = document.getElementById("replaceSpeaker") as HTMLInputElement
                                if (findInput?.value && replaceInput?.value) {
                                  // **[화자 A]** 형태와 [화자 A] 형태 모두 지원
                                  const findText = findInput.value.trim()
                                  const replaceText = replaceInput.value.trim()
                                  
                                  // 볼드 + 대괄호 형태: **[화자 A]** → **[이요훈]**
                                  const boldRegex = new RegExp(`\\*\\*\\[${findText}\\]\\*\\*`, "g")
                                  // 대괄호만 형태: [화자 A] → [이요훈]
                                  const bracketRegex = new RegExp(`\\[${findText}\\]`, "g")
                                  
                                  // 1. 녹음기록 문서에서 변경
                                  setEditDocumentText(prev => {
                                    let result = prev.replace(boldRegex, `**[${replaceText}]**`)
                                    result = result.replace(bracketRegex, `[${replaceText}]`)
                                    return result
                                  })
                                  
                                  // 2. 통역기록(transcripts)에서도 화자명 변경
                                  setTranscripts(prev => prev.map(t => ({
                                    ...t,
                                    speakerName: t.speakerName === findText ? replaceText : t.speakerName
                                  })))
                                  
                                  findInput.value = ""
                                  replaceInput.value = ""
                                }
                              }}
                              className="bg-teal-500 text-white hover:bg-teal-600"
                            >
                              변경
                            </Button>
                          </div>
                          
                          <textarea
                            value={editDocumentText}
                            onChange={(e) => setEditDocumentText(e.target.value)}
                            className="w-full h-[400px] p-4 border border-teal-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-teal-500"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditingDocument(false)
                                setEditDocumentText("")
                              }}
                            >
                              취소
                            </Button>
                            <Button
                              onClick={async () => {
                                setIsSavingDocument(true)
                                // 현재 탭에 따라 원문 또는 번역문 업데이트
                                if (documentViewTab === "original") {
                                  setDocumentTextOriginal(editDocumentText)
                                  await saveDocumentToDb(editDocumentText, documentTextTranslated)
                                } else {
                                  setDocumentTextTranslated(editDocumentText)
                                  await saveDocumentToDb(documentTextOriginal, editDocumentText)
                                }
                                
                                // 화자명 변경사항도 DB에 저장 (utterances 테이블)
                                for (const item of transcripts) {
                                  if (item.utteranceId) {
                                    await supabase
                                      .from("utterances")
                                      .update({ speaker_name: item.speakerName })
                                      .eq("id", item.utteranceId)
                                  }
                                }
                                
                                setIsSavingDocument(false)
                                setIsEditingDocument(false)
                              }}
                              disabled={isSavingDocument}
                              className="bg-teal-500 text-white hover:bg-teal-600"
                            >
                              {isSavingDocument ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                              저장
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-slate max-w-none prose-headings:text-teal-800 prose-strong:text-teal-700 prose-li:marker:text-teal-500">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {documentViewTab === "original" ? documentTextOriginal : documentTextTranslated}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* 통역 결과 목록 */
                  <div className="bg-white rounded-b-xl">
                    <div className="p-4 border-b" style={{ backgroundColor: '#CCFBF1', borderColor: '#96F7E4' }}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-teal-800 flex items-center gap-2">
                          <Languages className="h-5 w-5" />
                          통역 결과
                          {assemblyResult?.language && (
                            <span className="text-sm font-normal text-slate-500">
                              ({LANGUAGES.find(l => l.code === assemblyResult.language)?.name || assemblyResult.language})
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-3">
                          {assemblyResult && (
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {Math.round(assemblyResult.duration)}초
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {Object.keys(assemblyResult.speakerStats).length}명
                              </span>
                            </div>
                          )}
                          {/* 녹음기록 버튼 */}
                          {documentTextOriginal && (
                            <Button
                              onClick={() => {
                                setIsEditingDocument(false)
                                setShowDocumentInPanel(true)
                              }}
                              size="sm"
                              className="h-8 px-3 rounded-lg text-white"
                              style={{ backgroundColor: '#00BAB7' }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              녹음기록
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 번역 중 표시 */}
                    {isTranslating && (
                      <div className="flex items-center gap-2 p-4 bg-teal-50">
                        <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
                        <span className="text-sm text-teal-700">번역 중...</span>
                      </div>
                    )}
                    
                    {/* 수동 병합 모드 안내 */}
                    {mergeMode && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 border-b border-blue-200">
                        <span className="text-sm text-blue-700">
                          🔗 병합할 항목을 선택하세요 ({selectedForMerge.size}개 선택됨)
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={mergeSelectedItems}
                            disabled={selectedForMerge.size < 2}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            병합하기
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMergeMode(false)
                              setSelectedForMerge(new Set())
                            }}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* 발화 목록 */}
                    <div className="p-4 space-y-3">
                      {transcripts.map((item) => {
                        const color = getSpeakerColor(item.speaker)
                        const isEditing = editingItemId === item.id
                        const isSelected = selectedForMerge.has(item.id)
                        const isThisSpeaking = speakingId === item.id
                        
                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border transition-all ${color.border} ${color.bg} ${
                              mergeMode ? "cursor-pointer" : ""
                            } ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                            onClick={() => mergeMode && toggleMergeSelection(item.id)}
                          >
                            {/* 헤더 */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {mergeMode && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleMergeSelection(item.id)}
                                    className="w-4 h-4 rounded text-blue-500"
                                  />
                                )}
                                <span className={`font-medium ${color.text}`}>
                                  {item.speakerName}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {formatTimestamp(item.start)} - {formatTimestamp(item.end)}
                                </span>
                              </div>
                              
                              {/* 액션 버튼들 */}
                              {!mergeMode && !isEditing && (
                                <div className="flex items-center gap-1">
                                  {/* 원본 TTS */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      playTTS(item.original, item.sourceLanguage, `${item.id}-original`)
                                    }}
                                    className={`p-1.5 rounded-full hover:bg-white/50 transition-colors ${
                                      speakingId === `${item.id}-original` ? "text-teal-600" : "text-slate-400"
                                    }`}
                                    title="원본 읽기"
                                  >
                                    <Volume2 className={`h-4 w-4 ${speakingId === `${item.id}-original` ? "animate-pulse" : ""}`} />
                                  </button>
                                  
                                  {/* 번역 TTS - 번역안함이 아니고, 번역 텍스트가 있고, 원문과 다를 때만 표시 */}
                                  {targetLanguage !== "none" && item.translated && item.translated !== item.original && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        playTTS(item.translated, item.targetLanguage, `${item.id}-translated`)
                                      }}
                                      className={`p-1.5 rounded-full hover:bg-white/50 transition-colors ${
                                        speakingId === `${item.id}-translated` ? "text-blue-600" : "text-slate-400"
                                      }`}
                                      title="번역 읽기"
                                    >
                                      <Globe className={`h-4 w-4 ${speakingId === `${item.id}-translated` ? "animate-pulse" : ""}`} />
                                    </button>
                                  )}
                                  
                                  {/* 편집 */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      startEditItem(item)
                                    }}
                                    className="p-1.5 rounded-full hover:bg-white/50 text-slate-400 hover:text-slate-600 transition-colors"
                                    title="편집"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  
                                  {/* 삭제 */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteTranscriptItem(item.id)
                                    }}
                                    className="p-1.5 rounded-full hover:bg-white/50 text-slate-400 hover:text-red-500 transition-colors"
                                    title="삭제"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {/* 본문 */}
                            {isEditing ? (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-xs text-slate-500 mb-1 block">원문</label>
                                  <textarea
                                    value={editingOriginal}
                                    onChange={(e) => setEditingOriginal(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm resize-none"
                                    rows={2}
                                  />
                                </div>
                                {/* 번역안함이 아니고, 번역 텍스트가 있고, 원문과 다를 때만 편집 필드 표시 */}
                                {targetLanguage !== "none" && item.translated && item.translated !== item.original && (
                                  <div>
                                    <label className="text-xs text-slate-500 mb-1 block">번역</label>
                                    <textarea
                                      value={editingTranslated}
                                      onChange={(e) => setEditingTranslated(e.target.value)}
                                      className="w-full p-2 border border-slate-300 rounded-lg text-sm resize-none"
                                      rows={2}
                                    />
                                  </div>
                                )}
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={cancelEditItem}>
                                    취소
                                  </Button>
                                  <Button size="sm" onClick={() => saveEditItem(item.id)} className="bg-teal-500 hover:bg-teal-600 text-white">
                                    저장
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-slate-700">{item.original}</p>
                                {/* 번역안함(none)이 아니고, 번역 텍스트가 있고, 원문과 다를 때만 표시 */}
                                {targetLanguage !== "none" && item.translated && item.translated !== item.original && (
                                  <p className="mt-2 text-sm text-slate-500 border-t pt-2 border-slate-200">
                                    🌐 {item.translated}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 4. 녹음 기록 목록 */}
          {sessions.length > 0 && !sessionId && transcripts.length === 0 && (
            <Card className="border-teal-200 overflow-hidden" style={{ backgroundColor: '#CCFBF1' }}>
              <CardHeader className="pb-2 pt-4" style={{ backgroundColor: '#CCFBF1' }}>
                <CardTitle className="text-lg flex items-center gap-2 text-teal-800">
                  <List className="h-5 w-5" />
                  녹음 기록
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 bg-white rounded-b-xl">
                {sessions.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <Headphones className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>저장된 기록이 없습니다.</p>
                  </div>
                ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 rounded-lg border transition-colors cursor-pointer border-teal-200 flex items-center justify-between"
                      style={{ backgroundColor: 'white' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CCFBF1'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      onClick={() => loadSessionData(session)}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">
                          {session.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.created_at).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                          {session.total_utterances && (
                            <span className="ml-2">• {session.total_utterances}개 발화</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await loadSessionData(session)
                            setIsEditingDocument(false)
                            setShowDocumentInPanel(true)
                          }}
                          title="녹음기록 보기"
                        >
                          <FileText className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowSummaryModal(true)
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
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </main>

      {/* 요약 모달 */}
      {showSummaryModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSummaryModal(false)
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200" style={{ backgroundColor: '#00BBAE' }}>
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

            <div className="flex-1 overflow-y-auto p-6">
              {isSummarizing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
                  <p className="text-slate-600">AI가 요약을 생성하고 있습니다...</p>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                    {summaryText || "요약 내용이 없습니다. 문서 정리 후 요약이 자동 생성됩니다."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
