import { NextRequest, NextResponse } from "next/server"

// Google Generative AI API를 사용한 요약/문서정리
export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, customPrompt } = await request.json()

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

    // customPrompt가 있으면 사용 (회의기록 생성용), 없으면 요약 프롬프트 사용
    const prompt = customPrompt || `당신은 전문 회의 요약 전문가입니다. 다음 회의 내용을 ${langName}로 요약해주세요.

📋 **요약 형식:**

## 회의 개요
- 주요 논의 주제를 1-2문장으로 요약

## 핵심 논의 사항
- 논의된 주요 안건들을 불릿 포인트로 정리
- 각 안건별 주요 내용 포함

## 결정 사항
- 회의에서 결정된 사항들
- 합의된 내용들

## 후속 조치 (Action Items)
- 향후 진행해야 할 업무
- 담당자나 기한이 언급됐다면 포함

## 한줄 요약
- 전체 회의를 한 문장으로 요약

---
회의 내용:
${text}`

    // Gemini API 호출 - 사용 가능한 모델 시도
    const modelConfigs = [
      { model: "gemini-2.0-flash", version: "v1beta" },
      { model: "gemini-1.5-flash", version: "v1beta" },
      { model: "gemini-1.5-pro", version: "v1beta" },
    ]

    let lastError = null
    
    for (const { model, version } of modelConfigs) {
      try {
        console.log(`[Gemini] Trying model: ${model}`)
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 8192, // 긴 회의록 지원
              },
            }),
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Gemini] Model ${model} failed: ${response.status}`, errorText)
          lastError = `${model}: ${response.status} - ${errorText}`
          continue
        }

        const data = await response.json()
        const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!summaryText) {
          console.error(`[Gemini] Model ${model} returned no text`)
          lastError = `${model}: 응답 텍스트 없음`
          continue
        }

        console.log(`[Gemini] Success with model: ${model}`)
        return NextResponse.json({
          success: true,
          summary: summaryText,
          model: model,
        })

      } catch (error) {
        console.error(`[Gemini] Error with model ${model}:`, error)
        lastError = `${model}: ${error instanceof Error ? error.message : "Unknown error"}`
        continue
      }
    }

    // 모든 모델 실패
    return NextResponse.json(
      { 
        success: false, 
        error: `생성 실패. Google Cloud Console에서 Generative Language API가 활성화되어 있는지 확인하세요. 마지막 오류: ${lastError}` 
      },
      { status: 500 }
    )

  } catch (error) {
    console.error("[Gemini] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 }
    )
  }
}
