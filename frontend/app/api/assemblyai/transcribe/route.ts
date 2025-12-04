import { NextRequest, NextResponse } from "next/server"
import { AssemblyAI } from "assemblyai"

// AssemblyAI 클라이언트 초기화
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "",
})

// 지원 언어 목록
const SUPPORTED_LANGUAGES = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  ru: "Русский",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  vi: "Tiếng Việt",
  th: "ไทย",
}

export async function POST(request: NextRequest) {
  try {
    // API 키 확인
    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: "AssemblyAI API key not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { 
      audioUrl,        // 오디오 URL (필수)
      languageCode,    // 언어 코드 (선택, 기본: auto)
      speakerLabels,   // 화자 구분 활성화 (선택, 기본: true)
      speakersExpected // 예상 화자 수 (선택)
    } = body

    if (!audioUrl) {
      return NextResponse.json(
        { error: "audioUrl is required" },
        { status: 400 }
      )
    }

    // 전사 요청 파라미터 설정
    const transcriptParams: {
      audio: string
      speaker_labels?: boolean
      speakers_expected?: number
      language_code?: string
      language_detection?: boolean
    } = {
      audio: audioUrl,
      speaker_labels: speakerLabels !== false, // 기본 활성화
    }

    // 언어 설정
    if (languageCode && languageCode !== "auto") {
      transcriptParams.language_code = languageCode
    } else {
      // 자동 언어 감지
      transcriptParams.language_detection = true
    }

    // 예상 화자 수 설정 (선택)
    if (speakersExpected && speakersExpected > 0) {
      transcriptParams.speakers_expected = speakersExpected
    }

    console.log("[AssemblyAI] Starting transcription:", transcriptParams)

    // 전사 실행
    const transcript = await client.transcripts.transcribe(transcriptParams)

    console.log("[AssemblyAI] Transcription completed:", {
      id: transcript.id,
      status: transcript.status,
      language: transcript.language_code,
      speakerCount: transcript.utterances?.length || 0,
    })

    // 에러 체크
    if (transcript.status === "error") {
      return NextResponse.json(
        { error: transcript.error || "Transcription failed" },
        { status: 500 }
      )
    }

    // 화자별 발언 정리
    const utterances = transcript.utterances?.map((u) => ({
      speaker: u.speaker,
      text: u.text,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
    })) || []

    // 화자 통계
    const speakerStats: Record<string, { count: number; duration: number }> = {}
    utterances.forEach((u) => {
      if (!speakerStats[u.speaker]) {
        speakerStats[u.speaker] = { count: 0, duration: 0 }
      }
      speakerStats[u.speaker].count++
      speakerStats[u.speaker].duration += (u.end - u.start)
    })

    return NextResponse.json({
      success: true,
      transcriptId: transcript.id,
      text: transcript.text,
      language: transcript.language_code,
      languageName: SUPPORTED_LANGUAGES[transcript.language_code as keyof typeof SUPPORTED_LANGUAGES] || transcript.language_code,
      duration: transcript.audio_duration,
      utterances,
      speakerStats,
      confidence: transcript.confidence,
    })

  } catch (error) {
    console.error("[AssemblyAI] Transcription error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// GET: 전사 상태 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transcriptId = searchParams.get("id")

    if (!transcriptId) {
      return NextResponse.json(
        { error: "Transcript ID is required" },
        { status: 400 }
      )
    }

    const transcript = await client.transcripts.get(transcriptId)

    return NextResponse.json({
      id: transcript.id,
      status: transcript.status,
      text: transcript.text,
      language: transcript.language_code,
      error: transcript.error,
    })

  } catch (error) {
    console.error("[AssemblyAI] Get transcript error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}









