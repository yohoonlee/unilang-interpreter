import { NextRequest, NextResponse } from "next/server"

// Google Cloud TTS API
export async function POST(request: NextRequest) {
  try {
    const { text, languageCode, voiceName, speed, gender } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 }
      )
    }

    // 언어 코드 매핑
    const langMap: Record<string, string> = {
      ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN",
      es: "es-ES", de: "de-DE", fr: "fr-FR", it: "it-IT",
      pt: "pt-BR", ru: "ru-RU", ar: "ar-XA", hi: "hi-IN",
      th: "th-TH", vi: "vi-VN", id: "id-ID", tr: "tr-TR"
    }
    
    const targetLangCode = langMap[languageCode] || languageCode || "ko-KR"
    
    // 성별에 따른 음성 선택 (Neural2 우선 사용)
    const femaleVoices: Record<string, string> = {
      "ko-KR": "ko-KR-Neural2-A",  // 여성
      "en-US": "en-US-Neural2-F",  // 여성
      "ja-JP": "ja-JP-Neural2-B",  // 여성
      "zh-CN": "zh-CN-Neural2-A",  // 여성
      "es-ES": "es-ES-Neural2-A",  // 여성
      "de-DE": "de-DE-Neural2-A",  // 여성
      "fr-FR": "fr-FR-Neural2-A",  // 여성
      "it-IT": "it-IT-Neural2-A",  // 여성
      "pt-BR": "pt-BR-Neural2-A",  // 여성
      "ru-RU": "ru-RU-Standard-A", // 여성 (Neural2 없음)
      "ar-XA": "ar-XA-Standard-A", // 여성
      "hi-IN": "hi-IN-Neural2-A",  // 여성
      "th-TH": "th-TH-Standard-A", // 여성
      "vi-VN": "vi-VN-Neural2-A",  // 여성
      "id-ID": "id-ID-Standard-A", // 여성
      "tr-TR": "tr-TR-Standard-A", // 여성
    }
    
    const maleVoices: Record<string, string> = {
      "ko-KR": "ko-KR-Neural2-C",  // 남성
      "en-US": "en-US-Neural2-D",  // 남성
      "ja-JP": "ja-JP-Neural2-C",  // 남성
      "zh-CN": "zh-CN-Neural2-B",  // 남성
      "es-ES": "es-ES-Neural2-B",  // 남성
      "de-DE": "de-DE-Neural2-B",  // 남성
      "fr-FR": "fr-FR-Neural2-B",  // 남성
      "it-IT": "it-IT-Neural2-C",  // 남성
      "pt-BR": "pt-BR-Neural2-B",  // 남성
      "ru-RU": "ru-RU-Standard-B", // 남성 (Neural2 없음)
      "ar-XA": "ar-XA-Standard-B", // 남성
      "hi-IN": "hi-IN-Neural2-B",  // 남성
      "th-TH": "th-TH-Standard-A", // (남성 없음, 여성 사용)
      "vi-VN": "vi-VN-Neural2-D",  // 남성
      "id-ID": "id-ID-Standard-B", // 남성
      "tr-TR": "tr-TR-Standard-B", // 남성
    }
    
    // 음성 선택: voiceName > gender 기반 > 기본 여성
    let voice: string
    if (voiceName) {
      voice = voiceName
    } else if (gender === "male") {
      voice = maleVoices[targetLangCode] || `${targetLangCode}-Standard-B`
    } else {
      voice = femaleVoices[targetLangCode] || `${targetLangCode}-Standard-A`
    }

    // SSML로 앞에 무음 구간 추가 (잘림 방지)
    const ssmlText = `<speak><break time="300ms"/>${text}</speak>`
    
    // Google Cloud TTS API 호출 (SSML 사용)
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { ssml: ssmlText },
          voice: {
            languageCode: targetLangCode,
            name: voice,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: speed || 1.0,  // 0.25 ~ 4.0
            pitch: 0,  // -20 ~ 20
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Google TTS API 오류:", errorText)
      return NextResponse.json(
        { error: `TTS API failed: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    if (!data.audioContent) {
      return NextResponse.json(
        { error: "No audio content returned" },
        { status: 500 }
      )
    }

    // Base64 인코딩된 오디오 반환
    return NextResponse.json({
      success: true,
      audioContent: data.audioContent,  // Base64 MP3
      voice: voice,
    })

  } catch (error) {
    console.error("TTS 오류:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TTS failed" },
      { status: 500 }
    )
  }
}

// 사용 가능한 음성 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const languageCode = searchParams.get("lang") || "ko-KR"

    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 }
      )
    }

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}&languageCode=${languageCode}`,
      { method: "GET" }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch voices: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      voices: data.voices || [],
    })

  } catch (error) {
    console.error("음성 목록 조회 오류:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch voices" },
      { status: 500 }
    )
  }
}

