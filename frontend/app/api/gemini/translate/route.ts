import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const LANGUAGE_NAMES: Record<string, string> = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  zh: "Chinese",
  es: "Spanish",
  fr: "French",
  de: "German",
  th: "Thai",
  vi: "Vietnamese",
  ru: "Russian",
  pt: "Portuguese",
  ar: "Arabic",
}

export async function POST(request: NextRequest) {
  try {
    // API 키 확인
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY 환경 변수가 설정되지 않음")
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured", translatedText: "" },
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

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const sourceLanguageName = LANGUAGE_NAMES[sourceLang] || sourceLang || "auto-detect"
    const targetLanguageName = LANGUAGE_NAMES[targetLang] || targetLang

    const prompt = `Translate the following text from ${sourceLanguageName} to ${targetLanguageName}. 
Only return the translated text, nothing else. Do not add any explanations or notes.

Text to translate:
${text}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const translatedText = response.text().trim()

    console.log("✅ 번역 완료:", { 
      original: text.substring(0, 50), 
      translated: translatedText.substring(0, 50) 
    })

    return NextResponse.json({ translatedText })
  } catch (error) {
    console.error("❌ Translation error:", error)
    
    // 에러 타입에 따른 상세 메시지
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
