"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Mic,
  MicOff,
  Square,
  Loader2,
  Users,
  Clock,
  Volume2,
  Languages,
  FileAudio,
  Upload,
  Link as LinkIcon,
} from "lucide-react"
import { useAssemblyAI, formatDuration, AssemblyAIResult, AssemblyAIUtterance } from "@/hooks/useAssemblyAI"

// 화자 색상 팔레트
const SPEAKER_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300" },
  { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", border: "border-green-300" },
  { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300" },
  { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", border: "border-red-300" },
  { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300" },
  { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-700 dark:text-pink-300", border: "border-pink-300" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-300" },
  { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-300" },
]

interface AssemblyRecorderProps {
  onResult?: (result: AssemblyAIResult) => void
  onTranslate?: (text: string, targetLang: string) => Promise<string>
  languageCode?: string
  targetLanguage?: string
  className?: string
}

export function AssemblyRecorder({
  onResult,
  onTranslate,
  languageCode = "auto",
  targetLanguage = "en",
  className = "",
}: AssemblyRecorderProps) {
  const [mode, setMode] = useState<"idle" | "recording" | "url">("idle")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<AssemblyAIResult | null>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({})

  const {
    isRecording,
    isProcessing,
    recordingDuration,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    transcribeFromUrl,
  } = useAssemblyAI({
    languageCode,
    speakerLabels: true,
    onTranscriptReady: async (res) => {
      setResult(res)
      onResult?.(res)
      
      // 번역 실행
      if (onTranslate && res.utterances.length > 0) {
        setIsTranslating(true)
        const newTranslations: Record<string, string> = {}
        
        for (const utterance of res.utterances) {
          try {
            const key = `${utterance.speaker}-${utterance.start}`
            newTranslations[key] = await onTranslate(utterance.text, targetLanguage)
          } catch (err) {
            console.error("Translation error:", err)
          }
        }
        
        setTranslations(newTranslations)
        setIsTranslating(false)
      }
    },
    onError: (err) => setError(err),
    onUploadProgress: setUploadProgress,
    onProcessingStart: () => {
      setError(null)
      setUploadProgress(0)
    },
  })

  // 녹음 시작
  const handleStartRecording = async () => {
    setError(null)
    setResult(null)
    setTranslations({})
    setMode("recording")
    await startRecording()
  }

  // 녹음 중지
  const handleStopRecording = async () => {
    setMode("idle")
    await stopRecording()
  }

  // 녹음 취소
  const handleCancelRecording = () => {
    setMode("idle")
    cancelRecording()
  }

  // URL 전사
  const handleUrlTranscribe = async () => {
    if (!audioUrl.trim()) {
      setError("Please enter a valid URL")
      return
    }
    
    setError(null)
    setResult(null)
    setTranslations({})
    await transcribeFromUrl(audioUrl)
  }

  // 화자 이름 가져오기
  const getSpeakerName = (speaker: string) => {
    return speakerNames[speaker] || `화자 ${speaker}`
  }

  // 화자 색상 가져오기
  const getSpeakerColor = (speaker: string) => {
    const index = speaker.charCodeAt(0) - 65 // A=0, B=1, ...
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length]
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 컨트롤 패널 */}
      <Card className="border-teal-200 dark:border-teal-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileAudio className="h-5 w-5 text-teal-500" />
            AssemblyAI 음성 녹음
            <span className="text-xs font-normal text-slate-500 ml-2">
              (화자 구분 지원)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 녹음 모드 선택 */}
          {mode === "idle" && !isProcessing && (
            <div className="flex gap-2">
              <Button
                onClick={handleStartRecording}
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
              >
                <Mic className="h-4 w-4 mr-2" />
                마이크 녹음
              </Button>
              <Button
                variant="outline"
                onClick={() => setMode("url")}
                className="flex-1"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                URL 입력
              </Button>
            </div>
          )}

          {/* URL 입력 모드 */}
          {mode === "url" && !isProcessing && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="오디오/비디오 URL 입력..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
                <Button onClick={handleUrlTranscribe}>
                  <Upload className="h-4 w-4 mr-2" />
                  전사
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("idle")}
              >
                취소
              </Button>
            </div>
          )}

          {/* 녹음 중 */}
          {isRecording && (
            <div className="space-y-4">
              {/* 오디오 레벨 시각화 */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-full bg-red-500 animate-pulse flex items-center justify-center"
                    style={{
                      transform: `scale(${1 + audioLevel * 0.3})`,
                      transition: "transform 0.1s",
                    }}
                  >
                    <Mic className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-mono font-bold text-red-500">
                    {formatDuration(recordingDuration)}
                  </div>
                  <div className="text-sm text-slate-500">녹음 중...</div>
                </div>
              </div>

              {/* 녹음 컨트롤 */}
              <div className="flex gap-2">
                <Button
                  onClick={handleStopRecording}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  <Square className="h-4 w-4 mr-2" />
                  녹음 종료 및 전사
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelRecording}
                >
                  취소
                </Button>
              </div>
            </div>
          )}

          {/* 처리 중 */}
          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
                <div>
                  <div className="font-medium">음성 처리 중...</div>
                  <div className="text-sm text-slate-500">
                    {uploadProgress < 50 ? "업로드 중..." : "전사 중..."}
                  </div>
                </div>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 전사 결과 */}
      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Languages className="h-5 w-5 text-teal-500" />
                전사 결과
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.round(result.duration)}초
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {Object.keys(result.speakerStats).length}명
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 화자 통계 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(result.speakerStats).map(([speaker, stats]) => {
                const color = getSpeakerColor(speaker)
                return (
                  <div
                    key={speaker}
                    className={`px-3 py-1.5 rounded-full text-sm ${color.bg} ${color.text} border ${color.border}`}
                  >
                    <input
                      type="text"
                      value={speakerNames[speaker] || ""}
                      onChange={(e) => setSpeakerNames(prev => ({ ...prev, [speaker]: e.target.value }))}
                      placeholder={`화자 ${speaker}`}
                      className="bg-transparent border-none outline-none w-20 text-center placeholder:text-current placeholder:opacity-70"
                    />
                    <span className="ml-1 opacity-70">({stats.count}회)</span>
                  </div>
                )
              })}
            </div>

            {/* 발화 목록 */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {result.utterances.map((utterance, index) => {
                const color = getSpeakerColor(utterance.speaker)
                const translationKey = `${utterance.speaker}-${utterance.start}`
                
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${color.border} ${color.bg}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${color.text}`}>
                        {getSpeakerName(utterance.speaker)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTimestamp(utterance.start)} - {formatTimestamp(utterance.end)}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      {utterance.text}
                    </p>
                    {translations[translationKey] && (
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 border-t pt-2 border-slate-200 dark:border-slate-700">
                        🌐 {translations[translationKey]}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 번역 중 표시 */}
            {isTranslating && (
              <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                번역 중...
              </div>
            )}

            {/* 전체 텍스트 */}
            {result.utterances.length === 0 && result.text && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-slate-700 dark:text-slate-300">{result.text}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 타임스탬프 포맷 (밀리초 -> MM:SS)
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}





