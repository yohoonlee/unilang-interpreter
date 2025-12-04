import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

const LANGUAGE_NAMES: Record<string, string> = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  zh: "Chinese",
  es: "Spanish",
  fr: "French",
  de: "German",
}

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLang, targetLang } = await request.json()

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // 같은 언어면 그대로 반환
    if (sourceLang === targetLang) {
      return NextResponse.json({ translatedText: text })
    }

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

    return NextResponse.json({ translatedText })
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json(
      { error: "Translation failed", translatedText: "" },
      { status: 500 }
    )
  }
}

