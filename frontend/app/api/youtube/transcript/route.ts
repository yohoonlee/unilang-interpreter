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

// 외부 자막 API 서버 URL (Railway 등에 배포)
const SUBTITLE_API_URL = process.env.SUBTITLE_API_URL

// YouTube 자막 가져오기 (외부 API 서버 사용)
async function fetchYouTubeTranscript(videoId: string): Promise<{
  transcript: Array<{ text: string; offset: number; duration: number; lang?: string }>;
  availableLanguages: string[];
} | null> {
  console.log(`🎬 YouTube 전사 시작: ${videoId}`)
  
  // 외부 자막 API 서버가 설정되어 있으면 사용
  if (SUBTITLE_API_URL) {
    console.log(`🌐 외부 자막 API 서버 사용: ${SUBTITLE_API_URL}`)
    try {
      const response = await fetch(`${SUBTITLE_API_URL}/api/subtitles/${videoId}?lang=ko`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.subtitles) {
          console.log(`✅ 외부 API에서 자막 ${data.subtitles.length}개 가져옴`)
          return {
            transcript: data.subtitles.map((s: any) => ({
              text: s.text,
              offset: s.start * 1000,
              duration: s.duration * 1000,
              lang: data.language
            })),
            availableLanguages: data.available_languages || [data.language]
          }
        }
      } else {
        console.log(`❌ 외부 API 응답 실패: ${response.status}`)
      }
    } catch (err: any) {
      console.error(`❌ 외부 API 오류: ${err.message}`)
    }
  }
  
  // 외부 API가 없거나 실패하면 직접 시도 (대부분 실패함)
  console.log(`🔍 직접 YouTube 페이지 파싱 시도...`)
  
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
    const response = await fetch(watchUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    })
    
    if (!response.ok) {
      console.log(`❌ YouTube 페이지 요청 실패: ${response.status}`)
      return null
    }
    
    const html = await response.text()
    console.log(`📄 HTML 길이: ${html.length}`)
    
    // captionTracks 찾기
    const captionTracksMatch = html.match(/"captionTracks":\s*(\[[\s\S]*?\])/)
    if (!captionTracksMatch) {
      console.log("❌ captionTracks를 찾을 수 없음")
      console.log("captions 키워드 존재:", html.includes("captions"))
      console.log("captionTracks 키워드 존재:", html.includes("captionTracks"))
      return null
    }
    
    const captionTracks = JSON.parse(captionTracksMatch[1])
    if (!captionTracks || captionTracks.length === 0) {
      console.log("❌ 자막 트랙이 비어있음")
      return null
    }
    
    console.log(`📋 사용 가능한 자막: ${captionTracks.map((t: any) => t.languageCode).join(', ')}`)
    
    // 언어 우선순위에 따라 자막 선택
    const languagePriority = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de']
    let selectedTrack = captionTracks[0]
    
    for (const lang of languagePriority) {
      const track = captionTracks.find((t: any) => t.languageCode === lang)
      if (track) {
        selectedTrack = track
        break
      }
    }
    
    console.log(`🎯 선택된 자막: ${selectedTrack.languageCode}`)
    
    // 자막 URL에서 데이터 가져오기
    const captionUrl = selectedTrack.baseUrl
    const captionResponse = await fetch(captionUrl)
    if (!captionResponse.ok) {
      console.log(`❌ 자막 URL 요청 실패: ${captionResponse.status}`)
      return null
    }
    
    const captionXml = await captionResponse.text()
    
    // XML 파싱
    const textMatches = captionXml.matchAll(/<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)
    const transcript: Array<{ text: string; offset: number; duration: number; lang?: string }> = []
    
    for (const match of textMatches) {
      const start = parseFloat(match[1]) * 1000
      const dur = parseFloat(match[2]) * 1000
      let text = match[3]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/<[^>]+>/g, '')
        .trim()
      
      if (text) {
        transcript.push({ text, offset: start, duration: dur, lang: selectedTrack.languageCode })
      }
    }
    
    console.log(`✅ 자막 ${transcript.length}개 파싱 완료`)
    
    return {
      transcript,
      availableLanguages: captionTracks.map((t: any) => t.languageCode)
    }
  } catch (error: any) {
    console.error("❌ 자막 가져오기 오류:", error.message)
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
        error: "서버에서 자막을 가져올 수 없습니다. YouTube가 서버 요청을 차단하고 있습니다.",
        hint: "실시간 통역 모드로 영상을 재생하면서 음성을 번역할 수 있습니다.",
        useRealtimeMode: true
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









