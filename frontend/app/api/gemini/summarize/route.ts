import { NextRequest, NextResponse } from "next/server"

// Google Generative AI API를 사용한 요약
export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "요약할 텍스트가 없습니다." },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Google API 키가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    const langName = targetLanguage === "ko" ? "한국어" : 
                     targetLanguage === "en" ? "영어" :
                     targetLanguage === "ja" ? "일본어" :
                     targetLanguage === "zh" ? "중국어" : "한국어"

    const prompt = `다음 텍스트의 핵심 내용을 ${langName}로 요약해주세요.
주요 포인트를 불릿 포인트로 정리하고, 마지막에 한 문장 요약을 추가해주세요.

텍스트:
${text}

요약:`

    // Gemini API 호출 - 여러 모델과 API 버전 시도
    const modelConfigs = [
      { model: "gemini-1.5-flash", version: "v1" },
      { model: "gemini-1.5-flash-latest", version: "v1beta" },
      { model: "gemini-1.5-pro", version: "v1" },
      { model: "gemini-pro", version: "v1" },
    ]

    let lastError = null
    
    for (const { model, version } of modelConfigs) {
      try {
        console.log(`[Gemini Summary] Trying model: ${model} with API ${version}`)
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
              },
            }),
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Gemini Summary] Model ${model} failed: ${response.status}`, errorText)
          lastError = `${model}: ${response.status} - ${errorText}`
          continue
        }

        const data = await response.json()
        const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!summaryText) {
          console.error(`[Gemini Summary] Model ${model} returned no text`)
          lastError = `${model}: 응답 텍스트 없음`
          continue
        }

        console.log(`[Gemini Summary] Success with model: ${model}`)
        return NextResponse.json({
          success: true,
          summary: summaryText,
          model: model,
        })

      } catch (error) {
        console.error(`[Gemini Summary] Error with model ${model}:`, error)
        lastError = `${model}: ${error instanceof Error ? error.message : "Unknown error"}`
        continue
      }
    }

    // 모든 모델 실패
    return NextResponse.json(
      { 
        success: false, 
        error: `요약 생성 실패. Google Cloud Console에서 Generative Language API가 활성화되어 있는지 확인하세요. 마지막 오류: ${lastError}` 
      },
      { status: 500 }
    )

  } catch (error) {
    console.error("[Gemini Summary] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 }
    )
  }
}



