import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 화자 매칭 정보 저장/조회 API
// 전사 후 자동으로 구분된 화자(A, B, C...)를 실제 참석자와 매칭

export interface SpeakerMapping {
  sessionId: string
  speakerId: string      // A, B, C 등 AssemblyAI가 부여한 ID
  participantId?: string // 실제 참석자 ID (auth.users)
  participantName: string // 표시 이름
  participantEmail?: string
  color?: string         // UI 표시 색상
  createdAt: string
  updatedAt: string
}

// 화자 색상 팔레트
const SPEAKER_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
]

// 화자 매칭 정보 저장
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      sessionId,
      mappings,  // Array of { speakerId, participantName, participantEmail?, participantId? }
    } = body

    if (!sessionId || !mappings || !Array.isArray(mappings)) {
      return NextResponse.json(
        { error: "sessionId and mappings array are required" },
        { status: 400 }
      )
    }

    console.log("[Speakers] Saving speaker mappings:", {
      sessionId,
      mappingCount: mappings.length,
    })

    // 기존 매핑 삭제
    await supabase
      .from("speaker_mappings")
      .delete()
      .eq("session_id", sessionId)

    // 새 매핑 저장
    const insertData = mappings.map((m: { speakerId: string; participantName: string; participantEmail?: string; participantId?: string }, index: number) => ({
      session_id: sessionId,
      speaker_id: m.speakerId,
      participant_id: m.participantId || null,
      participant_name: m.participantName,
      participant_email: m.participantEmail || null,
      color: SPEAKER_COLORS[index % SPEAKER_COLORS.length],
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from("speaker_mappings")
      .insert(insertData)
      .select()

    if (error) {
      console.error("[Speakers] Save error:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sessionId,
      mappings: data,
    })

  } catch (error) {
    console.error("[Speakers] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// 화자 매칭 정보 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("speaker_mappings")
      .select("*")
      .eq("session_id", sessionId)
      .order("speaker_id", { ascending: true })

    if (error) {
      console.error("[Speakers] Fetch error:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // 데이터 변환
    const mappings: SpeakerMapping[] = (data || []).map((d) => ({
      sessionId: d.session_id,
      speakerId: d.speaker_id,
      participantId: d.participant_id,
      participantName: d.participant_name,
      participantEmail: d.participant_email,
      color: d.color,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))

    return NextResponse.json({
      success: true,
      sessionId,
      mappings,
      colors: SPEAKER_COLORS,
    })

  } catch (error) {
    console.error("[Speakers] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// 개별 화자 매칭 업데이트
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      sessionId,
      speakerId,
      participantName,
      participantEmail,
      participantId,
      color,
    } = body

    if (!sessionId || !speakerId) {
      return NextResponse.json(
        { error: "sessionId and speakerId are required" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (participantName !== undefined) updateData.participant_name = participantName
    if (participantEmail !== undefined) updateData.participant_email = participantEmail
    if (participantId !== undefined) updateData.participant_id = participantId
    if (color !== undefined) updateData.color = color

    const { data, error } = await supabase
      .from("speaker_mappings")
      .update(updateData)
      .eq("session_id", sessionId)
      .eq("speaker_id", speakerId)
      .select()
      .single()

    if (error) {
      console.error("[Speakers] Update error:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      mapping: data,
    })

  } catch (error) {
    console.error("[Speakers] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}








