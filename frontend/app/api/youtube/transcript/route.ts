import { NextRequest, NextResponse } from "next/server"
import { YoutubeTranscript } from "youtube-transcript"

// YouTube 비디오 ID 추출
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { youtubeUrl, targetLanguage } = await request.json()

    if (!youtubeUrl) {
      return NextResponse.json({ 
        success: false, 
        error: "YouTube URL이 필요합니다" 
      }, { status: 400 })
    }

    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json({ 
        success: false, 
        error: "유효하지 않은 YouTube URL입니다" 
      }, { status: 400 })
    }

    console.log("🎬 YouTube 전사 시작:", videoId)

    // YouTube 자막 가져오기
    let transcript
    try {
      // 먼저 원본 자막 시도
      transcript = await YoutubeTranscript.fetchTranscript(videoId)
    } catch (err) {
      // 자막이 없는 경우 에러
      console.error("YouTube 자막 가져오기 실패:", err)
      return NextResponse.json({ 
        success: false, 
        error: "이 동영상에는 자막이 없거나 자막을 가져올 수 없습니다. 자막이 활성화된 동영상을 시도해주세요." 
      }, { status: 400 })
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "자막을 찾을 수 없습니다" 
      }, { status: 404 })
    }

    // 자막을 utterance 형태로 변환
    const utterances = transcript.map((item, index) => ({
      speaker: "A", // YouTube 자막은 화자 구분이 없음
      text: item.text,
      start: item.offset,
      end: item.offset + item.duration,
    }))

    // 전체 텍스트
    const fullText = transcript.map(item => item.text).join(" ")

    // 전체 시간 계산
    const lastItem = transcript[transcript.length - 1]
    const duration = (lastItem.offset + lastItem.duration) / 1000 // 초 단위

    // 번역 수행 (필요한 경우)
    let translatedUtterances = utterances
    if (targetLanguage && targetLanguage !== "none") {
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
      
      if (googleApiKey) {
        // 배치로 번역 (최대 100개씩)
        const batchSize = 50
        translatedUtterances = []
        
        for (let i = 0; i < utterances.length; i += batchSize) {
          const batch = utterances.slice(i, i + batchSize)
          const textsToTranslate = batch.map(u => u.text)
          
          try {
            const response = await fetch(
              `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  q: textsToTranslate,
                  target: targetLanguage,
                  format: "text",
                }),
              }
            )
            
            const data = await response.json()
            const translations = data.data?.translations || []
            
            batch.forEach((utterance, idx) => {
              translatedUtterances.push({
                ...utterance,
                translated: translations[idx]?.translatedText || "",
              })
            })
          } catch (err) {
            console.error("번역 에러:", err)
            batch.forEach(utterance => {
              translatedUtterances.push({ ...utterance, translated: "" })
            })
          }
        }
      }
    }

    // 감지된 언어 (YouTube 자막의 언어)
    const detectedLanguage = transcript[0]?.lang || "unknown"

    console.log(`✅ YouTube 전사 완료: ${utterances.length}개 자막, ${duration.toFixed(0)}초`)

    return NextResponse.json({
      success: true,
      videoId,
      text: fullText,
      language: detectedLanguage,
      duration,
      utterances: translatedUtterances,
      speakerStats: {
        "A": { count: utterances.length, duration: duration * 1000 }
      },
    })

  } catch (error) {
    console.error("YouTube 전사 오류:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "YouTube 전사 중 오류가 발생했습니다" 
    }, { status: 500 })
  }
}

