import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase 클라이언트 (서버 사이드)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)

interface Utterance {
  id: string
  original: string
  translated: string
  timestamp: string
  startTime: number
}

interface CacheData {
  videoId: string
  videoTitle?: string
  originalLang: string
  subtitles: Utterance[]
  translations?: Record<string, Utterance[]>
  summaries?: Record<string, string>
  videoDuration?: number
  lastTextTime?: number
}

// GET: 캐시 확인
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get("videoId")
    const lang = searchParams.get("lang")

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      )
    }

    console.log(`🔍 캐시 확인: videoId=${videoId}, lang=${lang}`)

    // Supabase에서 캐시 조회
    const { data, error } = await supabase
      .from("video_subtitles_cache")
      .select("*")
      .eq("video_id", videoId)
      .single()

    if (error || !data) {
      console.log(`❌ 캐시 없음: ${videoId}`)
      return NextResponse.json({
        exists: false,
        cached: false,
        videoId,
      })
    }

    // 특정 언어 번역 확인
    if (lang) {
      const translations = data.translations || {}
      const summaries = data.summaries || {}
      
      // 원본 언어와 같으면 원본 자막 반환
      if (lang === data.original_lang) {
        console.log(`✅ 캐시 적중 (원본): ${videoId} - ${lang}`)
        return NextResponse.json({
          exists: true,
          cached: true,
          isOriginal: true,
          videoId,
          language: lang,
          utterances: data.subtitles,
          summary: summaries[lang] || null,
          videoDuration: data.video_duration,
          lastTextTime: data.last_text_time,
          cachedAt: data.updated_at,
        })
      }

      // 번역본 확인
      if (translations[lang]) {
        console.log(`✅ 캐시 적중 (번역): ${videoId} - ${lang}`)
        return NextResponse.json({
          exists: true,
          cached: true,
          isOriginal: false,
          videoId,
          language: lang,
          utterances: translations[lang],
          summary: summaries[lang] || null,
          videoDuration: data.video_duration,
          lastTextTime: data.last_text_time,
          cachedAt: data.updated_at,
        })
      }

      // 해당 언어 번역 없음 (원본은 있음)
      console.log(`⚠️ 캐시 부분 적중: ${videoId} - ${lang} 번역 없음`)
      return NextResponse.json({
        exists: true,
        cached: false,
        hasOriginal: true,
        videoId,
        originalLang: data.original_lang,
        availableLanguages: [data.original_lang, ...Object.keys(translations)],
      })
    }

    // 언어 미지정: 전체 캐시 정보 반환
    console.log(`✅ 캐시 정보 반환: ${videoId}`)
    return NextResponse.json({
      exists: true,
      videoId,
      originalLang: data.original_lang,
      videoTitle: data.video_title,
      availableLanguages: [data.original_lang, ...Object.keys(data.translations || {})],
      videoDuration: data.video_duration,
      cachedAt: data.updated_at,
    })

  } catch (error) {
    console.error("❌ 캐시 조회 오류:", error)
    return NextResponse.json(
      { error: "Cache lookup failed" },
      { status: 500 }
    )
  }
}

// POST: 캐시 저장
export async function POST(request: NextRequest) {
  try {
    const body: CacheData = await request.json()
    const { videoId, videoTitle, originalLang, subtitles, translations, summaries, videoDuration, lastTextTime } = body

    if (!videoId || !originalLang || !subtitles) {
      return NextResponse.json(
        { error: "videoId, originalLang, subtitles are required" },
        { status: 400 }
      )
    }

    console.log(`💾 캐시 저장: videoId=${videoId}, originalLang=${originalLang}`)

    // 기존 캐시 확인
    const { data: existing } = await supabase
      .from("video_subtitles_cache")
      .select("id, translations, summaries")
      .eq("video_id", videoId)
      .single()

    if (existing) {
      // 기존 캐시 업데이트 (번역 추가)
      const updatedTranslations = { ...(existing.translations || {}), ...(translations || {}) }
      const updatedSummaries = { ...(existing.summaries || {}), ...(summaries || {}) }

      const { error } = await supabase
        .from("video_subtitles_cache")
        .update({
          translations: updatedTranslations,
          summaries: updatedSummaries,
          video_duration: videoDuration,
          last_text_time: lastTextTime,
        })
        .eq("video_id", videoId)

      if (error) {
        console.error("❌ 캐시 업데이트 오류:", error)
        return NextResponse.json({ error: "Cache update failed" }, { status: 500 })
      }

      console.log(`✅ 캐시 업데이트 완료: ${videoId}`)
      return NextResponse.json({ success: true, action: "updated" })
    }

    // 새 캐시 생성
    const { error } = await supabase
      .from("video_subtitles_cache")
      .insert({
        video_id: videoId,
        video_title: videoTitle,
        original_lang: originalLang,
        subtitles,
        translations: translations || {},
        summaries: summaries || {},
        video_duration: videoDuration,
        last_text_time: lastTextTime,
      })

    if (error) {
      console.error("❌ 캐시 생성 오류:", error)
      return NextResponse.json({ error: "Cache creation failed" }, { status: 500 })
    }

    console.log(`✅ 캐시 생성 완료: ${videoId}`)
    return NextResponse.json({ success: true, action: "created" })

  } catch (error) {
    console.error("❌ 캐시 저장 오류:", error)
    return NextResponse.json(
      { error: "Cache save failed" },
      { status: 500 }
    )
  }
}

// PUT: 특정 언어 번역 추가
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoId, lang, utterances, summary } = body

    if (!videoId || !lang || !utterances) {
      return NextResponse.json(
        { error: "videoId, lang, utterances are required" },
        { status: 400 }
      )
    }

    console.log(`📝 번역 추가: videoId=${videoId}, lang=${lang}`)

    // 기존 캐시에서 translations, summaries 가져오기
    const { data: existing, error: fetchError } = await supabase
      .from("video_subtitles_cache")
      .select("translations, summaries")
      .eq("video_id", videoId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Cache not found for this video" },
        { status: 404 }
      )
    }

    // 번역 추가
    const updatedTranslations = { ...(existing.translations || {}), [lang]: utterances }
    const updatedSummaries = summary 
      ? { ...(existing.summaries || {}), [lang]: summary }
      : existing.summaries

    const { error } = await supabase
      .from("video_subtitles_cache")
      .update({
        translations: updatedTranslations,
        summaries: updatedSummaries,
      })
      .eq("video_id", videoId)

    if (error) {
      console.error("❌ 번역 추가 오류:", error)
      return NextResponse.json({ error: "Translation add failed" }, { status: 500 })
    }

    console.log(`✅ 번역 추가 완료: ${videoId} - ${lang}`)
    return NextResponse.json({ success: true, lang })

  } catch (error) {
    console.error("❌ 번역 추가 오류:", error)
    return NextResponse.json(
      { error: "Translation add failed" },
      { status: 500 }
    )
  }
}

