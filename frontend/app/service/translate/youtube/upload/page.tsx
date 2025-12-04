"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Youtube,
  Upload,
  FileText,
  Loader2,
  ArrowLeft,
  X,
  Languages,
  Sparkles,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Clock,
  List,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"

// 지원 언어 목록
const LANGUAGES = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "영어", flag: "🇺🇸" },
  { code: "ja", name: "일본어", flag: "🇯🇵" },
  { code: "zh", name: "중국어", flag: "🇨🇳" },
  { code: "es", name: "스페인어", flag: "🇪🇸" },
  { code: "fr", name: "프랑스어", flag: "🇫🇷" },
  { code: "de", name: "독일어", flag: "🇩🇪" },
]

interface SubtitleItem {
  index: number
  start: number // 밀리초
  end: number
  text: string
  translated?: string
}

export default function YouTubeUploadPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [videoId, setVideoId] = useState<string | null>(null)
  const [subtitleFiles, setSubtitleFiles] = useState<File[]>([])
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([])
  const [targetLanguage, setTargetLanguage] = useState("ko")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // AI 처리 상태
  const [reorganizedText, setReorganizedText] = useState("")
  const [summary, setSummary] = useState("")
  const [isReorganizing, setIsReorganizing] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  
  // 플레이어 상태
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleItem | null>(null)
  const [showAllSubtitles, setShowAllSubtitles] = useState(false)
  
  const playerRef = useRef<YT.Player | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // YouTube IFrame API 로드
  useEffect(() => {
    if (typeof window !== "undefined" && !window.YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }
  }, [])

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

  // 자막 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(f => 
      f.name.endsWith(".srt") || 
      f.name.endsWith(".vtt") || 
      f.name.endsWith(".txt")
    )
    
    if (validFiles.length === 0) {
      setError("지원되는 형식: .srt, .vtt, .txt")
      return
    }
    
    setSubtitleFiles(validFiles)
    setError(null)
  }

  // SRT 파싱
  const parseSRT = (content: string): SubtitleItem[] => {
    const items: SubtitleItem[] = []
    const blocks = content.trim().split(/\n\n+/)
    
    for (const block of blocks) {
      const lines = block.split("\n")
      if (lines.length < 3) continue
      
      const index = parseInt(lines[0])
      if (isNaN(index)) continue
      
      const timeMatch = lines[1].match(
        /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
      )
      if (!timeMatch) continue
      
      const start = 
        parseInt(timeMatch[1]) * 3600000 +
        parseInt(timeMatch[2]) * 60000 +
        parseInt(timeMatch[3]) * 1000 +
        parseInt(timeMatch[4])
      
      const end = 
        parseInt(timeMatch[5]) * 3600000 +
        parseInt(timeMatch[6]) * 60000 +
        parseInt(timeMatch[7]) * 1000 +
        parseInt(timeMatch[8])
      
      const text = lines.slice(2).join(" ").replace(/<[^>]+>/g, "").trim()
      
      items.push({ index, start, end, text })
    }
    
    return items
  }

  // VTT 파싱
  const parseVTT = (content: string): SubtitleItem[] => {
    const items: SubtitleItem[] = []
    const lines = content.split("\n")
    
    let index = 0
    let i = 0
    
    // WEBVTT 헤더 스킵
    while (i < lines.length && !lines[i].includes("-->")) {
      i++
    }
    
    while (i < lines.length) {
      const line = lines[i].trim()
      
      if (line.includes("-->")) {
        const timeMatch = line.match(
          /(\d{2}):(\d{2}):(\d{2})[.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.](\d{3})/
        ) || line.match(
          /(\d{2}):(\d{2})[.](\d{3})\s*-->\s*(\d{2}):(\d{2})[.](\d{3})/
        )
        
        if (timeMatch) {
          let start, end
          
          if (timeMatch.length === 9) {
            start = 
              parseInt(timeMatch[1]) * 3600000 +
              parseInt(timeMatch[2]) * 60000 +
              parseInt(timeMatch[3]) * 1000 +
              parseInt(timeMatch[4])
            end = 
              parseInt(timeMatch[5]) * 3600000 +
              parseInt(timeMatch[6]) * 60000 +
              parseInt(timeMatch[7]) * 1000 +
              parseInt(timeMatch[8])
          } else {
            start = 
              parseInt(timeMatch[1]) * 60000 +
              parseInt(timeMatch[2]) * 1000 +
              parseInt(timeMatch[3])
            end = 
              parseInt(timeMatch[4]) * 60000 +
              parseInt(timeMatch[5]) * 1000 +
              parseInt(timeMatch[6])
          }
          
          // 텍스트 수집
          i++
          const textLines: string[] = []
          while (i < lines.length && lines[i].trim() && !lines[i].includes("-->")) {
            textLines.push(lines[i].trim())
            i++
          }
          
          const text = textLines.join(" ").replace(/<[^>]+>/g, "").trim()
          if (text) {
            items.push({ index: ++index, start, end, text })
          }
          continue
        }
      }
      i++
    }
    
    return items
  }

  // 자막 파일 처리
  const processSubtitles = async () => {
    if (subtitleFiles.length === 0) {
      setError("자막 파일을 선택해주세요")
      return
    }
    
    setIsProcessing(true)
    setError(null)
    
    try {
      const allSubtitles: SubtitleItem[] = []
      
      for (const file of subtitleFiles) {
        const content = await file.text()
        
        let parsed: SubtitleItem[] = []
        if (file.name.endsWith(".srt")) {
          parsed = parseSRT(content)
        } else if (file.name.endsWith(".vtt")) {
          parsed = parseVTT(content)
        } else {
          // 일반 텍스트: 줄 단위로 처리
          const lines = content.split("\n").filter(l => l.trim())
          parsed = lines.map((text, i) => ({
            index: i + 1,
            start: i * 5000,
            end: (i + 1) * 5000,
            text: text.trim()
          }))
        }
        
        allSubtitles.push(...parsed)
      }
      
      // 시간순 정렬
      allSubtitles.sort((a, b) => a.start - b.start)
      
      // 인덱스 재할당
      allSubtitles.forEach((item, i) => {
        item.index = i + 1
      })
      
      setSubtitles(allSubtitles)
      
      // 번역
      if (targetLanguage !== "none") {
        await translateSubtitles(allSubtitles)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "자막 처리 중 오류 발생")
    } finally {
      setIsProcessing(false)
    }
  }

  // 자막 번역
  const translateSubtitles = async (items: SubtitleItem[]) => {
    setIsTranslating(true)
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
      const batchSize = 50
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        const texts = batch.map(s => s.text)
        
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              q: texts,
              target: targetLanguage,
              format: "text",
            }),
          }
        )
        
        const data = await response.json()
        const translations = data.data?.translations || []
        
        batch.forEach((item, idx) => {
          item.translated = translations[idx]?.translatedText || ""
        })
      }
      
      setSubtitles([...items])
    } catch (err) {
      console.error("번역 오류:", err)
    } finally {
      setIsTranslating(false)
    }
  }

  // AI 재정리
  const reorganizeWithAI = async () => {
    if (subtitles.length === 0) return
    
    setIsReorganizing(true)
    try {
      const fullText = subtitles.map(s => s.translated || s.text).join("\n")
      
      const response = await fetch("/api/gemini/reorganize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fullText,
          targetLanguage,
        }),
      })
      
      const result = await response.json()
      if (result.success) {
        setReorganizedText(result.reorganized)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 재정리 실패")
    } finally {
      setIsReorganizing(false)
    }
  }

  // AI 요약
  const generateSummary = async () => {
    if (subtitles.length === 0) return
    
    setIsSummarizing(true)
    try {
      const fullText = subtitles.map(s => s.translated || s.text).join("\n")
      
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fullText,
          targetLanguage,
        }),
      })
      
      const result = await response.json()
      if (result.success) {
        setSummary(result.summary)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "요약 생성 실패")
    } finally {
      setIsSummarizing(false)
    }
  }

  // YouTube 플레이어 초기화
  const initPlayer = () => {
    if (!videoId || !window.YT) return
    
    // 기존 플레이어 정리
    if (playerRef.current) {
      playerRef.current.destroy()
    }
    
    playerRef.current = new window.YT.Player("youtube-player", {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
      },
      events: {
        onStateChange: (event: YT.OnStateChangeEvent) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING)
        },
      },
    })
  }

  // 비디오 ID 변경 시 플레이어 재초기화
  useEffect(() => {
    if (videoId && typeof window !== "undefined" && window.YT) {
      // YT API 로드 완료 대기
      if (window.YT.Player) {
        initPlayer()
      } else {
        window.onYouTubeIframeAPIReady = initPlayer
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [videoId])

  // 현재 재생 시간 추적
  useEffect(() => {
    if (isPlaying && playerRef.current) {
      intervalRef.current = setInterval(() => {
        const time = playerRef.current?.getCurrentTime() || 0
        setCurrentTime(time * 1000) // 밀리초로 변환
        
        // 현재 자막 찾기
        const current = subtitles.find(
          s => s.start <= time * 1000 && s.end >= time * 1000
        )
        setCurrentSubtitle(current || null)
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, subtitles])

  // 특정 시간으로 이동
  const seekTo = (ms: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(ms / 1000, true)
    }
  }

  // 복사
  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // SRT 다운로드
  const downloadSRT = () => {
    let srt = ""
    subtitles.forEach((s, i) => {
      srt += `${i + 1}\n`
      srt += `${formatSRTTime(s.start)} --> ${formatSRTTime(s.end)}\n`
      srt += `${s.translated || s.text}\n\n`
    })
    
    const blob = new Blob([srt], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${videoId || "subtitles"}_translated.srt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 시간 포맷
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const formatSRTTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const milliseconds = ms % 1000
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")},${milliseconds.toString().padStart(3, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/service/translate/youtube" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              📁 자막 업로드 & AI 처리
            </h1>
          </div>
          <a 
            href="https://downsub.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            자막 다운로드 사이트 <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        {/* 안내 */}
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">사용 방법</h3>
                <ol className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                  <li>1️⃣ <a href="https://downsub.com" target="_blank" className="underline">DownSub.com</a>에서 YouTube 자막 다운로드 (.srt/.vtt)</li>
                  <li>2️⃣ 아래에 YouTube URL 입력 + 자막 파일 업로드</li>
                  <li>3️⃣ AI가 자막을 번역/재정리/요약</li>
                  <li>4️⃣ 영상과 자막이 동기화되어 재생!</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 좌측: 입력 */}
          <div className="space-y-4">
            {/* YouTube URL 입력 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-red-500" />
                  YouTube URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                
                {videoId && (
                  <div className="mt-3 aspect-video bg-black rounded-lg overflow-hidden">
                    <div id="youtube-player" className="w-full h-full" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 자막 파일 업로드 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-5 w-5 text-orange-500" />
                  자막 파일 업로드
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    클릭하여 파일 선택 또는 드래그 앤 드롭
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    지원 형식: .srt, .vtt, .txt
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".srt,.vtt,.txt"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {subtitleFiles.length > 0 && (
                  <div className="space-y-2">
                    {subtitleFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <FileText className="h-4 w-4 text-orange-500" />
                        <span className="text-sm flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-slate-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          onClick={() => setSubtitleFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 번역 언어 */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">번역 언어</label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* 처리 버튼 */}
                <Button
                  onClick={processSubtitles}
                  disabled={subtitleFiles.length === 0 || isProcessing}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-5 w-5 mr-2" />
                  )}
                  {isProcessing ? "처리 중..." : "자막 처리 시작"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 우측: 결과 */}
          <div className="space-y-4">
            {/* 현재 자막 (동기화) */}
            {subtitles.length > 0 && (
              <Card className="border-green-300 dark:border-green-700 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Languages className="h-5 w-5 text-green-500" />
                      실시간 자막
                    </CardTitle>
                    <span className="text-xs text-slate-500">
                      {formatTime(currentTime)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[100px] flex items-center justify-center">
                    {currentSubtitle ? (
                      <div className="text-center space-y-2">
                        <p className="text-lg text-slate-700 dark:text-slate-300">
                          {currentSubtitle.text}
                        </p>
                        {currentSubtitle.translated && (
                          <p className="text-xl font-medium text-green-600 dark:text-green-400">
                            🌐 {currentSubtitle.translated}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400">
                        {isPlaying ? "자막 대기 중..." : "▶️ 영상을 재생하세요"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI 처리 버튼 */}
            {subtitles.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={reorganizeWithAI}
                  disabled={isReorganizing}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {isReorganizing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  AI 재정리
                </Button>
                <Button
                  onClick={generateSummary}
                  disabled={isSummarizing}
                  variant="outline"
                  className="flex-1"
                >
                  {isSummarizing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  AI 요약
                </Button>
                <Button onClick={downloadSRT} variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => copyText(subtitles.map(s => s.translated || s.text).join("\n"))} 
                  variant="outline"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* AI 재정리 결과 */}
            {reorganizedText && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI 재정리 결과
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none text-sm max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                    {reorganizedText}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI 요약 결과 */}
            {summary && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-pink-500" />
                    AI 요약
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none text-sm max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                    {summary}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 전체 자막 목록 */}
            {subtitles.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowAllSubtitles(!showAllSubtitles)}
                  >
                    <CardTitle className="text-base flex items-center gap-2">
                      <List className="h-5 w-5 text-slate-500" />
                      전체 자막 ({subtitles.length}개)
                      {isTranslating && (
                        <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                          번역 중...
                        </span>
                      )}
                    </CardTitle>
                    {showAllSubtitles ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </CardHeader>
                {showAllSubtitles && (
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {subtitles.map((s) => (
                        <div
                          key={s.index}
                          onClick={() => seekTo(s.start)}
                          className={`p-2 rounded-lg cursor-pointer transition-colors ${
                            currentSubtitle?.index === s.index
                              ? "bg-green-100 dark:bg-green-900/30 border border-green-300"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(s.start)}
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            {s.text}
                          </p>
                          {s.translated && (
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                              🌐 {s.translated}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600">
            {error}
          </div>
        )}
      </main>
    </div>
  )
}

// YouTube IFrame API 타입
declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: () => void
  }
}

