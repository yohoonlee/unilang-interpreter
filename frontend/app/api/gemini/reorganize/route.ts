import { NextRequest, NextResponse } from "next/server"

// 청크 크기 (한 번에 처리할 발화 수)
const CHUNK_SIZE = 30

// 발화 청크 처리 함수
async function processChunk(
  utterances: { id: number; text: string }[],
  apiKey: string,
  sourceLangName: string
): Promise<{ merged_from: number[]; text: string }[]> {
  const utteranceText = utterances
    .map((u) => `[${u.id}] ${u.text}`)
    .join("\n")

  const prompt = `You are an expert at reorganizing fragmented speech text into complete sentences.

Below are ${sourceLangName} speech segments. Each segment starts with [number].
Reorganize them into natural, complete sentences.

**RULES:**
1. DO NOT TRANSLATE. Keep the EXACT same language as input.
2. Convert spoken language (구어체) to written language (문어체).
3. Remove filler words like "음", "어", "그", "저기", "um", "uh", "like", "you know".
4. Merge related incomplete segments into complete sentences.
5. Keep the original order (sort by first number in merged_from).

Input (${sourceLangName}):
${utteranceText}

Return ONLY a valid JSON array with this exact format:
[{"merged_from": [1, 2], "text": "완성된 문장"}, {"merged_from": [3], "text": "다른 문장"}]`

  // Gemini API 모델 목록 (우선순위)
  const modelConfigs = [
    { model: "gemini-2.0-flash", version: "v1beta" },
    { model: "gemini-1.5-flash", version: "v1beta" },
    { model: "gemini-1.5-pro", version: "v1beta" },
  ]

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
              temperature: 0.2,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Gemini] Model ${model} failed: ${response.status}`, errorText)
        continue
      }

      const data = await response.json()
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!resultText) {
        console.error(`[Gemini] Model ${model} returned no text`)
        continue
      }

      // JSON 파싱 시도
      try {
        // 직접 파싱 시도 (responseMimeType이 application/json인 경우)
        const parsed = JSON.parse(resultText)
        if (Array.isArray(parsed)) {
          console.log(`[Gemini] Success with model: ${model}`)
          return parsed
        }
      } catch {
        // 마크다운 코드 블록 또는 텍스트에서 JSON 추출
        const jsonMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                          resultText.match(/(\[[\s\S]*\])/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
            if (Array.isArray(parsed)) {
              console.log(`[Gemini] Success with model: ${model} (extracted from text)`)
              return parsed
            }
          } catch (e) {
            console.error(`[Gemini] JSON parse error:`, e)
          }
        }
      }
    } catch (error) {
      console.error(`[Gemini] Error with model ${model}:`, error)
    }
  }

  // 모든 모델 실패 시 원본 데이터 반환 (fallback)
  console.warn("[Gemini] All models failed, returning original data")
  return utterances.map((u) => ({
    merged_from: [u.id],
    text: u.text,
  }))
}

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

    // 원문 언어 감지
    const firstText = utterances[0]?.text || ""
    const isKorean = /[가-힣]/.test(firstText)
    const sourceLangName = isKorean ? "한국어" : "영어"

    console.log(`[Gemini] Processing ${utterances.length} utterances in ${sourceLangName}`)

    // 청크 분할 처리 (긴 입력 대응)
    const allResults: { merged_from: number[]; text: string }[] = []
    
    for (let i = 0; i < utterances.length; i += CHUNK_SIZE) {
      const chunk = utterances.slice(i, i + CHUNK_SIZE)
      console.log(`[Gemini] Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(utterances.length / CHUNK_SIZE)}`)
      
      const chunkResults = await processChunk(chunk, apiKey, sourceLangName)
      allResults.push(...chunkResults)
    }

    console.log(`[Gemini] Completed: ${allResults.length} reorganized items`)

    return NextResponse.json({
      success: true,
      data: allResults,
      processedCount: utterances.length,
    })

  } catch (error) {
    console.error("[Gemini] Reorganize error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 }
    )
  }
}
