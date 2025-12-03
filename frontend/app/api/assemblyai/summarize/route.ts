import { NextRequest, NextResponse } from "next/server"
import { AssemblyAI, LemurTaskResponse } from "assemblyai"

// AssemblyAI 클라이언트 초기화
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "",
})

// 요약 타입
type SummaryType = "general" | "meeting" | "key_points" | "action_items" | "custom"

// 요약 프롬프트 템플릿
const SUMMARY_PROMPTS: Record<SummaryType, string> = {
  general: `다음 내용을 간결하게 요약해 주세요:
- 주요 주제 및 논의 내용
- 핵심 결정 사항
- 중요한 정보`,
  
  meeting: `이 회의 내용을 다음 형식으로 요약해 주세요:
1. 회의 개요 (1-2문장)
2. 주요 논의 안건
3. 결정된 사항
4. 액션 아이템 및 담당자
5. 다음 단계`,
  
  key_points: `이 내용에서 가장 중요한 핵심 포인트 5-7개를 추출해 주세요.
각 포인트는 간결하게 1-2문장으로 작성해 주세요.`,
  
  action_items: `이 대화에서 언급된 모든 액션 아이템(할 일)을 추출해 주세요:
- 담당자 (가능한 경우)
- 할 일 내용
- 기한 (언급된 경우)`,
  
  custom: "", // 사용자 정의 프롬프트 사용
}

export async function POST(request: NextRequest) {
  try {
    // API 키 확인
    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: "AssemblyAI API key not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      transcriptId,      // 전사 ID (필수 - transcriptId 또는 transcriptIds 중 하나)
      transcriptIds,     // 전사 ID 배열 (여러 전사 요약)
      summaryType,       // 요약 타입 (general, meeting, key_points, action_items, custom)
      customPrompt,      // 사용자 정의 프롬프트 (summaryType이 custom일 때)
      language,          // 요약 언어 (ko, en, ja 등)
    } = body

    const ids = transcriptIds || (transcriptId ? [transcriptId] : null)

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: "transcriptId or transcriptIds is required" },
        { status: 400 }
      )
    }

    // 프롬프트 결정
    let prompt = SUMMARY_PROMPTS[summaryType as SummaryType] || SUMMARY_PROMPTS.general
    
    if (summaryType === "custom" && customPrompt) {
      prompt = customPrompt
    }

    // 언어 설정
    const languageInstruction = language 
      ? `\n\n응답은 반드시 ${getLanguageName(language)}로 작성해 주세요.`
      : ""

    console.log("[AssemblyAI] Generating summary:", {
      transcriptIds: ids,
      summaryType,
      language,
    })

    // LeMUR 요약 실행
    const response: LemurTaskResponse = await client.lemur.task({
      transcript_ids: ids,
      prompt: prompt + languageInstruction,
    })

    console.log("[AssemblyAI] Summary generated successfully")

    return NextResponse.json({
      success: true,
      summary: response.response,
      summaryType: summaryType || "general",
      language: language || "auto",
      usage: response.usage,
    })

  } catch (error) {
    console.error("[AssemblyAI] Summary error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Summary generation failed" },
      { status: 500 }
    )
  }
}

// 언어 코드를 언어 이름으로 변환
function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    ko: "한국어",
    en: "English",
    ja: "日本語",
    zh: "中文",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    pt: "Português",
    ru: "Русский",
    vi: "Tiếng Việt",
    th: "ไทย",
  }
  return languages[code] || code
}

// Q&A 기능
export async function PUT(request: NextRequest) {
  try {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: "AssemblyAI API key not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      transcriptId,
      transcriptIds,
      question,
      language,
    } = body

    const ids = transcriptIds || (transcriptId ? [transcriptId] : null)

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: "transcriptId is required" },
        { status: 400 }
      )
    }

    if (!question) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      )
    }

    const languageInstruction = language 
      ? `\n\n응답은 반드시 ${getLanguageName(language)}로 작성해 주세요.`
      : ""

    console.log("[AssemblyAI] Answering question:", { transcriptIds: ids, question })

    const response = await client.lemur.task({
      transcript_ids: ids,
      prompt: `다음 질문에 전사 내용을 기반으로 정확하게 답변해 주세요:\n\n질문: ${question}${languageInstruction}`,
    })

    return NextResponse.json({
      success: true,
      question,
      answer: response.response,
      language: language || "auto",
    })

  } catch (error) {
    console.error("[AssemblyAI] Q&A error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Q&A failed" },
      { status: 500 }
    )
  }
}








