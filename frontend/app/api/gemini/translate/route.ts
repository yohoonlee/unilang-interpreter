import { NextRequest, NextResponse } from "next/server"

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
}

export async function POST(request: NextRequest) {
  try {
    // Google Cloud Translation API 키 확인
    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) {
      console.error("❌ GOOGLE_API_KEY 환경 변수가 설정되지 않음")
      return NextResponse.json(
        { error: "GOOGLE_API_KEY not configured", translatedText: "" },
        { status: 500 }
      )
    }

    const { text, sourceLang, targetLang } = await request.json()
    console.log("🌐 번역 요청:", { 
      textLength: text?.length, 
      sourceLang, 
      targetLang 
    })

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // 같은 언어면 그대로 반환
    if (sourceLang === targetLang) {
      console.log("⏭️ 같은 언어 - 스킵")
      return NextResponse.json({ translatedText: text })
    }

    // Google Cloud Translation API 호출
    const targetCode = LANGUAGE_CODES[targetLang] || targetLang
    const sourceCode = sourceLang ? (LANGUAGE_CODES[sourceLang] || sourceLang) : undefined

    const translateUrl = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`
    
    const requestBody: {
      q: string
      target: string
      format: string
      source?: string
    } = {
      q: text,
      target: targetCode,
      format: "text",
    }
    
    // source가 있으면 추가 (없으면 자동 감지)
    if (sourceCode) {
      requestBody.source = sourceCode
    }

    const response = await fetch(translateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("❌ Google Translation API 오류:", response.status, errorData)
      return NextResponse.json(
        { error: `Translation API error: ${response.status}`, translatedText: text },
        { status: 500 }
      )
    }

    const data = await response.json()
    const translatedText = data.data?.translations?.[0]?.translatedText || text

    console.log("✅ 번역 완료:", { 
      original: text.substring(0, 50), 
      translated: translatedText.substring(0, 50) 
    })

    return NextResponse.json({ translatedText })
  } catch (error) {
    console.error("❌ Translation error:", error)
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { 
        error: "Translation failed", 
        details: errorMessage,
        translatedText: "" 
      },
      { status: 500 }
    )
  }
}
