import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)

// Google Cloud Translation API
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY

const LANGUAGE_CODES: Record<string, string> = {
  ko: "ko",
  en: "en",
  ja: "ja",
  zh: "zh-CN",
  th: "th",
  vi: "vi",
}

// 백그라운드 번역 대상 언어 (우선순위 순)
const BACKGROUND_LANGUAGES = ["zh", "th", "ja", "vi"]

interface Utterance {
  id: string
  original: string
  translated: string
  timestamp: string
  startTime: number
}

// 텍스트 번역 함수
async function translateText(text: string, targetLang: string): Promise<string> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY not configured")
  }

  const targetCode = LANGUAGE_CODES[targetLang] || targetLang
  const translateUrl = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`

  const response = await fetch(translateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      target: targetCode,
      format: "text",
    }),
  })

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`)
  }

  const data = await response.json()
  return data.data?.translations?.[0]?.translatedText || text
}

// 배치 번역 (여러 텍스트를 한 번에)
async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY not configured")
  }

  const targetCode = LANGUAGE_CODES[targetLang] || targetLang
  const translateUrl = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`

  // Google Translate API는 한 번에 최대 128개의 텍스트 지원
  const BATCH_SIZE = 100
  const results: string[] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    
    const response = await fetch(translateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: batch,
        target: targetCode,
        format: "text",
      }),
    })

    if (!response.ok) {
      // 실패 시 원본 반환
      results.push(...batch)
      continue
    }

    const data = await response.json()
    const translations = data.data?.translations || []
    
    for (let j = 0; j < batch.length; j++) {
      results.push(translations[j]?.translatedText || batch[j])
    }

    // API 제한 방지 (배치 간 딜레이)
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return results
}

// POST: 백그라운드 멀티 번역 시작
export async function POST(request: NextRequest) {
  try {
    const { videoId, originalLang, excludeLang } = await request.json()

    if (!videoId || !originalLang) {
      return NextResponse.json(
        { error: "videoId and originalLang are required" },
        { status: 400 }
      )
    }

    console.log(`🔄 백그라운드 번역 시작: ${videoId}`)

    // 캐시에서 원본 자막 가져오기
    const { data: cache, error } = await supabase
      .from("video_subtitles_cache")
      .select("subtitles, translations")
      .eq("video_id", videoId)
      .single()

    if (error || !cache) {
      return NextResponse.json(
        { error: "Cache not found" },
        { status: 404 }
      )
    }

    const subtitles: Utterance[] = cache.subtitles
    const existingTranslations = cache.translations || {}

    // 번역할 언어 목록 (이미 있는 언어 제외)
    const langsToTranslate = BACKGROUND_LANGUAGES.filter(
      lang => lang !== originalLang && 
              lang !== excludeLang && 
              !existingTranslations[lang]
    )

    if (langsToTranslate.length === 0) {
      console.log("✅ 모든 언어 번역 완료됨")
      return NextResponse.json({ 
        success: true, 
        message: "All languages already translated",
        translatedLanguages: [] 
      })
    }

    console.log(`📝 번역 대상 언어: ${langsToTranslate.join(", ")}`)

    // 원본 텍스트 추출
    const originalTexts = subtitles.map(u => u.original)
    const translatedLanguages: string[] = []

    // 각 언어에 대해 번역 수행
    for (const targetLang of langsToTranslate) {
      try {
        console.log(`🌐 번역 중: ${targetLang}...`)
        
        // 배치 번역
        const translatedTexts = await translateBatch(originalTexts, targetLang)
        
        // Utterance 배열 생성
        const translatedUtterances: Utterance[] = subtitles.map((u, i) => ({
          ...u,
          translated: translatedTexts[i] || u.original,
        }))

        // Supabase에 저장
        const updatedTranslations = {
          ...existingTranslations,
          [targetLang]: translatedUtterances,
        }

        await supabase
          .from("video_subtitles_cache")
          .update({ translations: updatedTranslations })
          .eq("video_id", videoId)

        translatedLanguages.push(targetLang)
        console.log(`✅ 번역 완료: ${targetLang}`)

        // API 제한 방지 (언어 간 딜레이)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (err) {
        console.error(`❌ 번역 실패: ${targetLang}`, err)
        // 실패해도 계속 진행
      }
    }

    console.log(`✅ 백그라운드 번역 완료: ${translatedLanguages.join(", ")}`)
    
    return NextResponse.json({
      success: true,
      translatedLanguages,
      message: `Translated to: ${translatedLanguages.join(", ")}`,
    })

  } catch (error) {
    console.error("❌ 백그라운드 번역 오류:", error)
    return NextResponse.json(
      { error: "Background translation failed" },
      { status: 500 }
    )
  }
}

