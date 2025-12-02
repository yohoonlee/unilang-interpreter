import { NextRequest, NextResponse } from "next/server"

// Google Generative AI API를 사용한 문장 재정리
export async function POST(request: NextRequest) {
  try {
    const { utterances, targetLanguage } = await request.json()

    if (!utterances || utterances.length === 0) {
      return NextResponse.json(
        { success: false, error: "발화 데이터가 없습니다." },
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

    // 발화 데이터를 텍스트로 변환
    const utteranceText = utterances
      .map((u: { id: number; text: string; translated?: string }) => 
        `[${u.id}] ${u.translated || u.text}`
      )
      .join("\n")

    const langName = targetLanguage === "ko" ? "한국어" : 
                     targetLanguage === "en" ? "영어" :
                     targetLanguage === "ja" ? "일본어" :
                     targetLanguage === "zh" ? "중국어" : "한국어"

    const prompt = `당신은 실시간 통역 텍스트를 재정리하는 전문가입니다.

아래는 실시간 통역으로 생성된 문장들입니다. 각 문장은 [번호] 형식으로 시작합니다.
불완전하거나 연결된 문장들을 자연스러운 문장으로 재정리해주세요.

규칙:
1. 의미가 연결되는 문장들은 하나로 합칠 수 있습니다
2. 문법적으로 올바른 ${langName} 문장으로 만들어주세요
3. 원래 의미를 유지하되 자연스럽게 다듬어주세요
4. 반드시 JSON 배열 형식으로만 응답하세요

입력:
${utteranceText}

응답 형식 (JSON 배열만):
[
  {"merged_from": [1, 2], "text": "합쳐진 문장"},
  {"merged_from": [3], "text": "단독 문장"},
  ...
]`

    // Gemini API 호출 - 사용 가능한 모델 시도
    const modelConfigs = [
      { model: "gemini-2.0-flash", version: "v1beta" },
      { model: "gemini-2.5-flash", version: "v1beta" },
      { model: "gemini-2.0-flash-lite", version: "v1beta" },
    ]

    let lastError = null
    
    for (const { model, version } of modelConfigs) {
      try {
        console.log(`[Gemini] Trying model: ${model} with API ${version}`)
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 4096,
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
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!resultText) {
          console.error(`[Gemini] Model ${model} returned no text`)
          lastError = `${model}: 응답 텍스트 없음`
          continue
        }

        // JSON 파싱
        const jsonMatch = resultText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          try {
            const reorganized = JSON.parse(jsonMatch[0])
            console.log(`[Gemini] Success with model: ${model}`)
            return NextResponse.json({
              success: true,
              data: reorganized,
              model: model,
            })
          } catch (parseError) {
            console.error(`[Gemini] JSON parse error for ${model}:`, parseError)
            lastError = `${model}: JSON 파싱 실패`
            continue
          }
        }
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
        error: `AI 재정리 실패. Google Cloud Console에서 Generative Language API가 활성화되어 있는지 확인하세요. 마지막 오류: ${lastError}` 
      },
      { status: 500 }
    )

  } catch (error) {
    console.error("[Gemini] Reorganize error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 }
    )
  }
}



