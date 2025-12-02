"use client"

import { useState, useRef, useCallback, useEffect } from "react"

// AssemblyAI 전사 결과 타입
export interface AssemblyAIUtterance {
  speaker: string
  text: string
  start: number
  end: number
  confidence: number
}

export interface AssemblyAIResult {
  transcriptId: string
  text: string
  language: string
  languageName: string
  duration: number
  utterances: AssemblyAIUtterance[]
  speakerStats: Record<string, { count: number; duration: number }>
  confidence: number
}

// 훅 옵션
interface UseAssemblyAIOptions {
  sampleRate?: number
  onTranscriptReady?: (result: AssemblyAIResult) => void
  onError?: (error: string) => void
  onUploadProgress?: (progress: number) => void
  onProcessingStart?: () => void
  speakerLabels?: boolean
  languageCode?: string
}

export function useAssemblyAI(options: UseAssemblyAIOptions = {}) {
  const {
    sampleRate = 16000,
    onTranscriptReady,
    onError,
    onUploadProgress,
    onProcessingStart,
    speakerLabels = true,
    languageCode = "auto",
  } = options

  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recordingStartTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 오디오 레벨 업데이트
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
    setAudioLevel(average / 255)

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }, [])

  // 녹음 시작
  const startRecording = useCallback(async (deviceId?: string) => {
    try {
      // 기존 리소스 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      // 마이크 스트림 가져오기
      const constraints: MediaStreamConstraints = {
        audio: deviceId 
          ? { deviceId: { exact: deviceId }, sampleRate, channelCount: 1 }
          : { sampleRate, channelCount: 1 },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      // 오디오 레벨 분석기 설정
      const audioContext = new AudioContext({ sampleRate })
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // MediaRecorder 설정
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4"

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(1000) // 1초마다 데이터 수집
      recordingStartTimeRef.current = Date.now()
      setIsRecording(true)
      setRecordingDuration(0)

      // 녹음 시간 업데이트
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000))
      }, 1000)

      // 오디오 레벨 업데이트 시작
      updateAudioLevel()

      console.log("[AssemblyAI Hook] Recording started")

    } catch (error) {
      console.error("[AssemblyAI Hook] Error starting recording:", error)
      onError?.(error instanceof Error ? error.message : "Failed to start recording")
    }
  }, [sampleRate, onError, updateAudioLevel])

  // 녹음 중지 및 전사 요청
  const stopRecording = useCallback(async (): Promise<AssemblyAIResult | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        resolve(null)
        return
      }

      // 타이머 정리
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }

      // 애니메이션 프레임 정리
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false)
        setAudioLevel(0)

        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        // 오디오 데이터가 없으면 종료
        if (audioChunksRef.current.length === 0) {
          onError?.("No audio recorded")
          resolve(null)
          return
        }

        // Blob 생성
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        console.log("[AssemblyAI Hook] Audio recorded:", {
          size: audioBlob.size,
          duration: recordingDuration,
        })

        // 최소 길이 체크 (1초 이상)
        if (recordingDuration < 1) {
          onError?.("Recording too short (minimum 1 second)")
          resolve(null)
          return
        }

        try {
          setIsProcessing(true)
          onProcessingStart?.()

          // 1. 파일 업로드
          onUploadProgress?.(10)
          const formData = new FormData()
          formData.append("file", audioBlob, "recording.webm")

          const uploadResponse = await fetch("/api/assemblyai/upload", {
            method: "POST",
            body: formData,
          })

          if (!uploadResponse.ok) {
            const error = await uploadResponse.json()
            throw new Error(error.error || "Upload failed")
          }

          const uploadData = await uploadResponse.json()
          onUploadProgress?.(50)
          console.log("[AssemblyAI Hook] File uploaded:", uploadData.uploadUrl)

          // 2. 전사 요청
          const transcribeResponse = await fetch("/api/assemblyai/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioUrl: uploadData.uploadUrl,
              languageCode,
              speakerLabels,
            }),
          })

          if (!transcribeResponse.ok) {
            const error = await transcribeResponse.json()
            throw new Error(error.error || "Transcription failed")
          }

          onUploadProgress?.(100)
          const result: AssemblyAIResult = await transcribeResponse.json()
          console.log("[AssemblyAI Hook] Transcription complete:", result)

          setIsProcessing(false)
          onTranscriptReady?.(result)
          resolve(result)

        } catch (error) {
          console.error("[AssemblyAI Hook] Processing error:", error)
          setIsProcessing(false)
          onError?.(error instanceof Error ? error.message : "Processing failed")
          resolve(null)
        }
      }

      mediaRecorderRef.current.stop()
    })
  }, [recordingDuration, languageCode, speakerLabels, onError, onProcessingStart, onUploadProgress, onTranscriptReady])

  // 녹음 취소
  const cancelRecording = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    audioChunksRef.current = []
    setIsRecording(false)
    setIsProcessing(false)
    setRecordingDuration(0)
    setAudioLevel(0)

    console.log("[AssemblyAI Hook] Recording cancelled")
  }, [])

  // URL에서 직접 전사 (YouTube 등)
  const transcribeFromUrl = useCallback(async (url: string): Promise<AssemblyAIResult | null> => {
    try {
      setIsProcessing(true)
      onProcessingStart?.()

      const response = await fetch("/api/assemblyai/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: url,
          languageCode,
          speakerLabels,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Transcription failed")
      }

      const result: AssemblyAIResult = await response.json()
      setIsProcessing(false)
      onTranscriptReady?.(result)
      return result

    } catch (error) {
      console.error("[AssemblyAI Hook] URL transcription error:", error)
      setIsProcessing(false)
      onError?.(error instanceof Error ? error.message : "Transcription failed")
      return null
    }
  }, [languageCode, speakerLabels, onError, onProcessingStart, onTranscriptReady])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cancelRecording()
    }
  }, [cancelRecording])

  return {
    // 상태
    isRecording,
    isProcessing,
    recordingDuration,
    audioLevel,
    
    // 메서드
    startRecording,
    stopRecording,
    cancelRecording,
    transcribeFromUrl,
  }
}

// 시간 포맷 유틸리티
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

