"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export interface CaptureState {
  isCapturing: boolean
  hasPermission: boolean
  error: string | null
  audioLevel: number
}

interface UseSystemAudioCaptureOptions {
  onAudioData?: (audioData: Blob) => void
  onError?: (error: string) => void
  sampleRate?: number
  chunkInterval?: number // ms
}

/**
 * 시스템 오디오 캡처 훅
 * 화면 공유 + 시스템 오디오를 캡처하여 녹음
 * Zoom, Teams, Meet 등 모든 화상회의에서 작동
 */
export function useSystemAudioCapture(options: UseSystemAudioCaptureOptions = {}) {
  const {
    onAudioData,
    onError,
    sampleRate = 16000,
    chunkInterval = 1000, // 1초마다 오디오 청크 전송
  } = options

  const [state, setState] = useState<CaptureState>({
    isCapturing: false,
    hasPermission: false,
    error: null,
    audioLevel: 0,
  })

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // 오디오 레벨 업데이트
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
    setState(prev => ({ ...prev, audioLevel: average / 255 }))

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }, [])

  // 시스템 오디오 캡처 시작
  const startCapture = useCallback(async (captureVideo: boolean = false) => {
    try {
      setState(prev => ({ ...prev, error: null }))

      // 화면 공유 + 시스템 오디오 요청
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: captureVideo ? { cursor: "always" } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate,
        },
      }

      console.log("[SystemAudio] Requesting display media...")
      
      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
      
      // 오디오 트랙 확인
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        throw new Error("시스템 오디오를 캡처할 수 없습니다. 화면 공유 시 '시스템 오디오 공유'를 선택해주세요.")
      }

      console.log("[SystemAudio] Audio tracks:", audioTracks.length)
      mediaStreamRef.current = stream

      // 오디오 분석기 설정
      const audioContext = new AudioContext({ sampleRate })
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioContextRef.current = audioContext
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
          onAudioData?.(event.data)
        }
      }

      // 화면 공유 중지 감지
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        console.log("[SystemAudio] Screen share ended by user")
        stopCapture()
      })

      // 오디오 트랙 중지 감지
      audioTracks[0].addEventListener("ended", () => {
        console.log("[SystemAudio] Audio track ended")
        stopCapture()
      })

      mediaRecorder.start(chunkInterval)
      
      setState({
        isCapturing: true,
        hasPermission: true,
        error: null,
        audioLevel: 0,
      })

      // 오디오 레벨 모니터링 시작
      updateAudioLevel()

      console.log("[SystemAudio] Capture started successfully")

    } catch (error) {
      console.error("[SystemAudio] Capture error:", error)
      const errorMessage = error instanceof Error ? error.message : "캡처 시작 실패"
      setState(prev => ({ ...prev, error: errorMessage, isCapturing: false }))
      onError?.(errorMessage)
    }
  }, [sampleRate, chunkInterval, onAudioData, onError, updateAudioLevel])

  // 캡처 중지
  const stopCapture = useCallback(() => {
    console.log("[SystemAudio] Stopping capture...")

    // 애니메이션 프레임 정리
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // MediaRecorder 정리
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    // MediaStream 정리
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // AudioContext 정리
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null

    setState(prev => ({
      ...prev,
      isCapturing: false,
      audioLevel: 0,
    }))

    console.log("[SystemAudio] Capture stopped")
  }, [])

  // 녹음된 전체 오디오 가져오기
  const getRecordedAudio = useCallback((): Blob | null => {
    if (audioChunksRef.current.length === 0) return null
    return new Blob(audioChunksRef.current, { type: "audio/webm" })
  }, [])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [stopCapture])

  return {
    // 상태
    ...state,
    
    // 메서드
    startCapture,
    stopCapture,
    getRecordedAudio,
  }
}

// 브라우저 지원 여부 확인
export function isSystemAudioCaptureSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getDisplayMedia
  )
}










