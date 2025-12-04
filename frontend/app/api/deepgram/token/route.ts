import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY
    
    console.log("[Deepgram] API Key exists:", !!apiKey)
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Deepgram API 키가 설정되지 않았습니다. Vercel 환경변수를 확인하세요." },
        { status: 500 }
      )
    }

    // Deepgram은 API 키를 직접 사용하거나, 임시 키를 발급받을 수 있음
    // 보안을 위해 서버에서 API 키를 감싸서 전달
    // Deepgram WebSocket URL 생성에 필요한 정보 반환
    
    // API 키 유효성 확인
    const testResponse = await fetch("https://api.deepgram.com/v1/projects", {
      method: "GET",
      headers: {
        "Authorization": `Token ${apiKey}`,
      },
    })

    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      console.error("[Deepgram] API 키 검증 실패:", testResponse.status, errorText)
      return NextResponse.json(
        { error: "Deepgram API 키가 유효하지 않습니다." },
        { status: 401 }
      )
    }

    console.log("[Deepgram] API 키 검증 성공")

    // 클라이언트에서 사용할 수 있도록 API 키 반환
    // 주의: 프로덕션에서는 Deepgram의 임시 키 발급 API를 사용하는 것이 더 안전
    return NextResponse.json({
      apiKey: apiKey,
      websocketUrl: "wss://api.deepgram.com/v1/listen",
    })

  } catch (error) {
    console.error("[Deepgram] 토큰 API 오류:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 }
    )
  }
}



