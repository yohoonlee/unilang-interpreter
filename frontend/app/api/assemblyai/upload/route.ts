import { NextRequest, NextResponse } from "next/server"
import { AssemblyAI } from "assemblyai"

// AssemblyAI 클라이언트 초기화
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "",
})

// 최대 파일 크기: 5GB
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024

// 지원 오디오 형식
const SUPPORTED_FORMATS = [
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]

export async function POST(request: NextRequest) {
  try {
    // API 키 확인
    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: "AssemblyAI API key not configured" },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // 파일 크기 확인
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB` },
        { status: 400 }
      )
    }

    // 파일 형식 확인
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file format: ${file.type}. Supported formats: wav, mp3, mp4, m4a, ogg, webm, flac` },
        { status: 400 }
      )
    }

    console.log("[AssemblyAI] Uploading file:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // 파일을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // AssemblyAI에 파일 업로드
    const uploadUrl = await client.files.upload(buffer)

    console.log("[AssemblyAI] File uploaded successfully:", uploadUrl)

    return NextResponse.json({
      success: true,
      uploadUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })

  } catch (error) {
    console.error("[AssemblyAI] Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}

// 업로드 가능한 형식 조회
export async function GET() {
  return NextResponse.json({
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeReadable: "5GB",
    supportedFormats: SUPPORTED_FORMATS,
    supportedExtensions: [".wav", ".mp3", ".mp4", ".m4a", ".ogg", ".webm", ".flac", ".mov"],
  })
}








