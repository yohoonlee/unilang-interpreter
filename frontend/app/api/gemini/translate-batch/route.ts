import { NextRequest, NextResponse } from "next/server"

// Google Cloud Translation API - 배치 번역
const LANGUAGE_CODES: Record<string, string> = {
  ko: "ko",
  en: "en",
  ja: "ja",
  zh: "zh-CN",
  "zh-TW": "zh-TW",
  es: "es",
  fr: "fr",
  de: "de",
  th: "th",
  vi: "vi",
  ru: "ru",
  pt: "pt",
  ar: "ar",
  tr: "tr",  // 터키어
  it: "it",  // 이탈리아어
  nl: "nl",  // 네덜란드어
  pl: "pl",  // 폴란드어
  id: "id",  // 인도네시아어
  hi: "hi",  // 힌디어
  bn: "bn",  // 벵골어
  ms: "ms",  // 말레이어
  tl: "tl",  // 필리핀어 (타갈로그)
}

// Google Cloud Translation API는 한 번에 최대 128개 텍스트 지원
const BATCH_SIZE = 100

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY not configured" },
        { status: 500 }
      )
    }

    const { texts, sourceLang, targetLang } = await request.json()

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: "texts array is required" },
        { status: 400 }
      )
    }

    if (!targetLang) {
      return NextResponse.json(
        { error: "targetLang is required" },
        { status: 400 }
      )
    }

    // 같은 언어면 그대로 반환
    if (sourceLang === targetLang) {
      return NextResponse.json({ translatedTexts: texts })
    }

    console.log(`🌐 배치 번역 시작: ${texts.length}개 텍스트, ${sourceLang} → ${targetLang}`)
    const startTime = Date.now()

    const targetCode = LANGUAGE_CODES[targetLang] || targetLang
    const sourceCode = sourceLang ? (LANGUAGE_CODES[sourceLang] || sourceLang) : undefined
    const translateUrl = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`

    const results: string[] = []

    // 배치 단위로 번역
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE)
      
      const requestBody: {
        q: string[]
        target: string
        format: string
        source?: string
      } = {
        q: batch,
        target: targetCode,
        format: "text",
      }
      
      if (sourceCode) {
        requestBody.source = sourceCode
      }

      try {
        const response = await fetch(translateUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ 번역 API 오류 (배치 ${Math.floor(i/BATCH_SIZE)+1}):`, response.status, errorText)
          // 실패 시 원본 텍스트 사용
          results.push(...batch)
          continue
        }

        const data = await response.json()
        const translations = data.data?.translations || []
        
        for (let j = 0; j < batch.length; j++) {
          results.push(translations[j]?.translatedText || batch[j])
        }

      } catch (err) {
        console.error(`❌ 배치 ${Math.floor(i/BATCH_SIZE)+1} 번역 실패:`, err)
        results.push(...batch)
      }

      // 배치 간 짧은 딜레이 (API 제한 방지)
      if (i + BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`✅ 배치 번역 완료: ${texts.length}개, ${elapsed}ms (${(elapsed/texts.length).toFixed(1)}ms/개)`)

    return NextResponse.json({ 
      translatedTexts: results,
      stats: {
        total: texts.length,
        elapsedMs: elapsed,
        avgMs: elapsed / texts.length
      }
    })

  } catch (error) {
    console.error("❌ 배치 번역 오류:", error)
    return NextResponse.json(
      { error: "Batch translation failed" },
      { status: 500 }
    )
  }
}

