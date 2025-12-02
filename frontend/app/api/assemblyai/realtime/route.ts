import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { language_code } = await request.json()
    
    const apiKey = process.env.ASSEMBLYAI_API_KEY
    console.log("[AssemblyAI] API Key exists:", !!apiKey)
    console.log("[AssemblyAI] API Key length:", apiKey?.length)
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "AssemblyAI API 키가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    // AssemblyAI 실시간 토큰 발급
    const response = await fetch("https://api.assemblyai.com/v2/realtime/token", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_in: 3600, // 1시간
      }),
    })
    
    console.log("[AssemblyAI] Token response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[AssemblyAI] 토큰 발급 실패:", response.status, errorText)
      return NextResponse.json(
        { error: `토큰 발급 실패: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log("[AssemblyAI] 토큰 발급 성공")
    
    return NextResponse.json({
      token: data.token,
      language_code: language_code || "en",
    })

  } catch (error) {
    console.error("[AssemblyAI] 토큰 API 오류:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 }
    )
  }
}
