import { NextRequest, NextResponse } from "next/server"

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

// YouTube 자막 직접 가져오기 (innertube API 사용)
async function fetchYouTubeTranscript(videoId: string): Promise<{
  transcript: Array<{ text: string; offset: number; duration: number; lang?: string }>;
  availableLanguages: string[];
} | null> {
  try {
    // 1. 먼저 영상 페이지에서 자막 정보 가져오기
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    })
    
    const html = await response.text()
    
    // ytInitialPlayerResponse에서 자막 정보 추출
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/)
    if (!playerResponseMatch) {
      console.log("❌ ytInitialPlayerResponse를 찾을 수 없음")
      return null
    }
    
    let playerResponse
    try {
      playerResponse = JSON.parse(playerResponseMatch[1])
    } catch (e) {
      console.log("❌ playerResponse 파싱 실패")
      return null
    }
    
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    if (!captionTracks || captionTracks.length === 0) {
      console.log("❌ 자막 트랙이 없음")
      return null
    }
    
    console.log(`📋 사용 가능한 자막: ${captionTracks.map((t: any) => t.languageCode).join(', ')}`)
    
    // 언어 우선순위
    const languagePriority = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de']
    let selectedTrack = captionTracks[0] // 기본값: 첫 번째 자막
    
    // 우선순위에 따라 자막 선택
    for (const lang of languagePriority) {
      const track = captionTracks.find((t: any) => t.languageCode === lang)
      if (track) {
        selectedTrack = track
        break
      }
    }
    
    console.log(`🎯 선택된 자막: ${selectedTrack.languageCode} (${selectedTrack.name?.simpleText || 'unknown'})`)
    
    // 자막 URL에서 실제 자막 데이터 가져오기
    const captionUrl = selectedTrack.baseUrl
    const captionResponse = await fetch(captionUrl)
    const captionXml = await captionResponse.text()
    
    // XML 파싱
    const textMatches = captionXml.matchAll(/<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)
    const transcript: Array<{ text: string; offset: number; duration: number; lang?: string }> = []
    
    for (const match of textMatches) {
      const start = parseFloat(match[1]) * 1000 // 초 -> 밀리초
      const dur = parseFloat(match[2]) * 1000
      let text = match[3]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, '') // HTML 태그 제거
        .trim()
      
      if (text) {
        transcript.push({
          text,
          offset: start,
          duration: dur,
          lang: selectedTrack.languageCode
        })
      }
    }
    
    return {
      transcript,
      availableLanguages: captionTracks.map((t: any) => t.languageCode)
    }
  } catch (error) {
    console.error("자막 가져오기 오류:", error)
    return null
  }
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

    // 직접 YouTube에서 자막 가져오기
    const result = await fetchYouTubeTranscript(videoId)
    
    if (!result || result.transcript.length === 0) {
      console.error("YouTube 자막 가져오기 실패")
      return NextResponse.json({ 
        success: false, 
        error: "이 동영상에는 자막이 없거나 자막을 가져올 수 없습니다. 자막이 활성화된 동영상을 시도해주세요.",
        hint: "실시간 통역 모드로 영상을 재생하면서 음성을 번역할 수 있습니다."
      }, { status: 400 })
    }
    
    const transcript = result.transcript
    console.log(`✅ 자막 ${transcript.length}개 로드됨 (사용 가능: ${result.availableLanguages.join(', ')})`)

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









