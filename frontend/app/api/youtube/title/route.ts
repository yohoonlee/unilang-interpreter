import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json()

    if (!videoId) {
      return NextResponse.json({ 
        success: false, 
        error: "videoId가 필요합니다" 
      }, { status: 400 })
    }

    // oEmbed API로 제목 가져오기 (서버에서 CORS 우회)
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        title: data.title,
        author: data.author_name,
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: "제목을 가져올 수 없습니다" 
    })

  } catch (error) {
    console.error("YouTube 제목 가져오기 오류:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "오류 발생" 
    }, { status: 500 })
  }
}

