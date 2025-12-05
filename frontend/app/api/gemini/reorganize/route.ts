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

    // 발화 데이터를 텍스트로 변환 (원문 사용)
    const utteranceText = utterances
      .map((u: { id: number; text: string; translated?: string }) => 
        `[${u.id}] ${u.text}`
      )
      .join("\n")

    // 원문 언어 감지 (첫 번째 발화 기준)
    const firstText = utterances[0]?.text || ""
    const isKorean = /[가-힣]/.test(firstText)
    const sourceLangName = isKorean ? "한국어" : "영어"

    const prompt = `You are an expert at reorganizing fragmented subtitle text into complete sentences.

Below are ${sourceLangName} subtitle segments. Each segment starts with [number].
Merge incomplete or related segments into natural, complete sentences.

**CRITICAL RULES:**
1. **DO NOT TRANSLATE.** Keep the EXACT same language as input.
2. If input is English, output MUST be English.
3. If input is Korean, output MUST be Korean.
4. Merge related segments that form incomplete sentences.
5. Keep the original order (sort by first number in merged_from).
6. Output ONLY a JSON array. No explanations.

Input (${sourceLangName}):
${utteranceText}

Output format (JSON array only):
[
  {"merged_from": [1, 2], "text": "merged sentence in ${sourceLangName}"},
  {"merged_from": [3], "text": "single sentence in ${sourceLangName}"},
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



