import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { language_code } = await request.json()
    
    const apiKey = process.env.ASSEMBLYAI_API_KEY
    console.log("[AssemblyAI] API Key exists:", !!apiKey)
    console.log("[AssemblyAI] API Key length:", apiKey?.length)
    console.log("[AssemblyAI] API Key prefix:", apiKey?.substring(0, 8))
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "AssemblyAI API 키가 설정되지 않았습니다. Vercel 환경변수를 확인하세요." },
        { status: 500 }
      )
    }

    // AssemblyAI 실시간 토큰 발급
    // 참고: https://www.assemblyai.com/docs/api-reference/streaming
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
    
    console.log("[AssemblyAI] Request headers - Authorization:", apiKey?.substring(0, 10) + "...")
    
    console.log("[AssemblyAI] Token response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[AssemblyAI] 토큰 발급 실패:", response.status, errorText)
      
      // 상세 에러 메시지
      let errorMsg = `토큰 발급 실패 (${response.status})`
      if (response.status === 401) {
        errorMsg = "API 키가 유효하지 않습니다. AssemblyAI 대시보드에서 키를 확인하세요."
      } else if (response.status === 403) {
        errorMsg = "API 접근 권한이 없습니다. 계정 상태를 확인하세요."
      } else if (response.status === 402) {
        errorMsg = "크레딧이 부족합니다. AssemblyAI 계정을 확인하세요."
      }
      
      return NextResponse.json(
        { error: errorMsg, details: errorText },
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
