import { NextRequest, NextResponse } from "next/server"

// 실시간 전사를 위한 토큰 발급 API
// 클라이언트에서 WebSocket 연결 시 사용

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
      sampleRate = 16000,  // 샘플 레이트 (기본: 16kHz)
      wordBoost = [],      // 강조할 단어 목록
      encoding = "pcm_s16le", // 오디오 인코딩
    } = body

    console.log("[AssemblyAI] Creating realtime session:", {
      sampleRate,
      encoding,
      wordBoostCount: wordBoost.length,
    })

    // 실시간 전사 세션 생성을 위한 임시 토큰 요청
    const response = await fetch("https://api.assemblyai.com/v2/realtime/token", {
      method: "POST",
      headers: {
        "Authorization": process.env.ASSEMBLYAI_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_in: 3600, // 1시간 유효
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create realtime token")
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      token: data.token,
      expiresAt: Date.now() + 3600 * 1000, // 1시간 후
      websocketUrl: `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${sampleRate}&encoding=${encoding}${wordBoost.length > 0 ? `&word_boost=${encodeURIComponent(JSON.stringify(wordBoost))}` : ""}`,
      config: {
        sampleRate,
        encoding,
        wordBoost,
      },
    })

  } catch (error) {
    console.error("[AssemblyAI] Realtime token error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create realtime session" },
      { status: 500 }
    )
  }
}

// 실시간 전사 사용법 안내
export async function GET() {
  return NextResponse.json({
    description: "AssemblyAI 실시간 전사 API",
    usage: {
      step1: "POST /api/assemblyai/realtime 으로 토큰 발급",
      step2: "응답의 websocketUrl로 WebSocket 연결",
      step3: "오디오 데이터를 WebSocket으로 전송",
      step4: "실시간 전사 결과 수신",
    },
    audioRequirements: {
      format: "PCM (pcm_s16le, pcm_mulaw)",
      sampleRate: "8000 ~ 48000 Hz (권장: 16000)",
      channels: "Mono",
      bitDepth: "16-bit",
    },
    websocketMessages: {
      send: {
        audioData: "base64 인코딩된 오디오 데이터",
        terminateSession: '{"terminate_session": true}',
      },
      receive: {
        partialTranscript: "중간 전사 결과 (수정 가능)",
        finalTranscript: "최종 전사 결과",
        sessionBegins: "세션 시작 확인",
        sessionTerminated: "세션 종료 확인",
      },
    },
    example: {
      request: {
        sampleRate: 16000,
        encoding: "pcm_s16le",
        wordBoost: ["UniLang", "통역"],
      },
      response: {
        token: "xxx...",
        websocketUrl: "wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000",
      },
    },
  })
}

