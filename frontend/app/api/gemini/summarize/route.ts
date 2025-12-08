import { NextRequest, NextResponse } from "next/server"

// Google Generative AI API를 사용한 요약/문서정리
export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, customPrompt } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "요약할 텍스트가 없습니다." },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Google API 키가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    // 언어별 프롬프트 설정
    const getPromptByLanguage = (lang: string, content: string) => {
      if (lang === "en") {
        return `You are a professional meeting summarizer. Summarize the following meeting content in English.
IMPORTANT: Your response MUST be entirely in English. Do not use any other language.

📋 **Summary Format:**

## Meeting Overview
- Summarize the main discussion topics in 1-2 sentences

## Key Discussion Points
- List the main agenda items in bullet points
- Include key details for each item

## Decisions Made
- List decisions made during the meeting
- Include agreed-upon items

## Action Items
- List tasks to be done
- Include responsible persons or deadlines if mentioned

## One-line Summary
- Summarize the entire meeting in one sentence

---
Meeting Content:
${content}`
      } else if (lang === "ja") {
        return `あなたはプロの会議要約専門家です。以下の会議内容を日本語で要約してください。
重要: 回答は必ず日本語で行ってください。

📋 **要約形式:**

## 会議概要
- 主な議論トピックを1-2文で要約

## 主要な議論事項
- 主なアジェンダを箇条書きで整理
- 各項目の主要内容を含む

## 決定事項
- 会議で決定された事項
- 合意された内容

## アクションアイテム
- 今後行うべき業務
- 担当者や期限があれば含む

## 一行要約
- 会議全体を一文で要約

---
会議内容:
${content}`
      } else if (lang === "zh") {
        return `您是专业的会议摘要专家。请用中文总结以下会议内容。
重要：您的回复必须完全用中文。

📋 **摘要格式:**

## 会议概述
- 用1-2句话概述主要讨论主题

## 核心讨论事项
- 用要点列出主要议程
- 包含每个议程的主要内容

## 决定事项
- 会议中做出的决定
- 达成的共识

## 后续行动
- 需要完成的任务
- 如有提及负责人或截止日期，请包含

## 一句话总结
- 用一句话总结整个会议

---
会议内容:
${content}`
      } else {
        // 한국어 (기본)
        return `당신은 전문 회의 요약 전문가입니다. 다음 회의 내용을 한국어로 요약해주세요.
중요: 반드시 한국어로 응답해주세요.

📋 **요약 형식:**

## 회의 개요
- 주요 논의 주제를 1-2문장으로 요약

## 핵심 논의 사항
- 논의된 주요 안건들을 불릿 포인트로 정리
- 각 안건별 주요 내용 포함

## 결정 사항
- 회의에서 결정된 사항들
- 합의된 내용들

## 후속 조치 (Action Items)
- 향후 진행해야 할 업무
- 담당자나 기한이 언급됐다면 포함

## 한줄 요약
- 전체 회의를 한 문장으로 요약

---
회의 내용:
${content}`
      }
    }

    // customPrompt가 있으면 사용 (회의기록 생성용), 없으면 요약 프롬프트 사용
    const prompt = customPrompt || getPromptByLanguage(targetLanguage, text)

    // Gemini API 호출 - 사용 가능한 모델 시도
    const modelConfigs = [
      { model: "gemini-2.0-flash", version: "v1beta" },
      { model: "gemini-1.5-flash", version: "v1beta" },
      { model: "gemini-1.5-pro", version: "v1beta" },
    ]

    let lastError = null
    
    for (const { model, version } of modelConfigs) {
      try {
        console.log(`[Gemini] Trying model: ${model}`)
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 8192, // 긴 회의록 지원
              },
            }),
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Gemini] Model ${model} failed: ${response.status}`, errorText)
          lastError = `${model}: ${response.status} - ${errorText}`
          continue
        }

        const data = await response.json()
        const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!summaryText) {
          console.error(`[Gemini] Model ${model} returned no text`)
          lastError = `${model}: 응답 텍스트 없음`
          continue
        }

        console.log(`[Gemini] Success with model: ${model}`)
        return NextResponse.json({
          success: true,
          summary: summaryText,
          model: model,
        })

      } catch (error) {
        console.error(`[Gemini] Error with model ${model}:`, error)
        lastError = `${model}: ${error instanceof Error ? error.message : "Unknown error"}`
        continue
      }
    }

    // 모든 모델 실패
    return NextResponse.json(
      { 
        success: false, 
        error: `생성 실패. Google Cloud Console에서 Generative Language API가 활성화되어 있는지 확인하세요. 마지막 오류: ${lastError}` 
      },
      { status: 500 }
    )

  } catch (error) {
    console.error("[Gemini] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 }
    )
  }
}
