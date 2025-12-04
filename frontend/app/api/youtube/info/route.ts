import { NextRequest, NextResponse } from "next/server"

// YouTube oEmbed API를 사용하여 비디오 정보 가져오기 (API 키 불필요)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const videoId = searchParams.get("v")

    if (!videoId) {
      return NextResponse.json({ 
        success: false, 
        error: "비디오 ID가 필요합니다" 
      }, { status: 400 })
    }

    // YouTube oEmbed API 사용 (API 키 불필요)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    
    const response = await fetch(oembedUrl)
    
    if (!response.ok) {
      throw new Error("YouTube 정보를 가져올 수 없습니다")
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      videoId,
      title: data.title || "제목 없음",
      author: data.author_name || "알 수 없음",
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    })

  } catch (error) {
    console.error("YouTube 정보 오류:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "YouTube 정보를 가져올 수 없습니다" 
    }, { status: 500 })
  }
}



