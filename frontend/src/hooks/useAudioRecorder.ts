import { useState, useRef, useCallback, useEffect } from 'react'
import { encodeBase64 } from '@/lib/utils'

interface UseAudioRecorderOptions {
  onAudioData?: (base64Data: string) => void
  sampleRate?: number
  channelCount?: number
  chunkIntervalMs?: number
}

interface UseAudioRecorderReturn {
  isRecording: boolean
  isSupported: boolean
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  toggleRecording: () => Promise<void>
}

export function useAudioRecorder({
  onAudioData,
  sampleRate = 16000,
  channelCount = 1,
  chunkIntervalMs = 1000, // 1초마다 청크 전송
}: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  // 브라우저 지원 여부
  const isSupported = typeof navigator !== 'undefined' && 
    !!navigator.mediaDevices?.getUserMedia

  // PCM 데이터를 16-bit WAV로 변환
  const float32ToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return int16Array
  }

  // 청크 처리 및 전송
  const processChunks = useCallback(() => {
    if (chunksRef.current.length === 0) return

    // 모든 청크를 하나로 합치기
    const totalLength = chunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0)
    const combined = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of chunksRef.current) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    // Int16으로 변환
    const int16Data = float32ToInt16(combined)
    
    // Base64 인코딩
    const base64Data = encodeBase64(int16Data.buffer)
    
    // 콜백 호출
    onAudioData?.(base64Data)
    
    // 청크 초기화
    chunksRef.current = []
  }, [onAudioData])

  // 녹음 시작
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('오디오 녹음이 지원되지 않는 브라우저입니다.')
      return
    }

    try {
      setError(null)

      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream

      // AudioContext 생성
      const audioContext = new AudioContext({ sampleRate })
      audioContextRef.current = audioContext

      // MediaStreamSource 연결
      const source = audioContext.createMediaStreamSource(stream)

      // ScriptProcessor로 raw PCM 데이터 수집
      // 참고: ScriptProcessor는 deprecated되었지만 AudioWorklet보다 호환성이 좋음
      const processor = audioContext.createScriptProcessor(4096, channelCount, channelCount)
      processorRef.current = processor

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0)
        chunksRef.current.push(new Float32Array(inputData))
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      // 주기적으로 청크 처리
      intervalRef.current = setInterval(processChunks, chunkIntervalMs)

      setIsRecording(true)
      console.log('Recording started')
    } catch (err) {
      const message = err instanceof Error ? err.message : '녹음 시작에 실패했습니다.'
      setError(message)
      console.error('Recording error:', err)
    }
  }, [isSupported, sampleRate, channelCount, chunkIntervalMs, processChunks])

  // 녹음 중지
  const stopRecording = useCallback(() => {
    // 인터벌 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // 남은 청크 처리
    processChunks()

    // ScriptProcessor 정리
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    // AudioContext 정리
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // MediaStream 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
    console.log('Recording stopped')
  }, [processChunks])

  // 토글
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording()
      }
    }
  }, [isRecording, stopRecording])

  return {
    isRecording,
    isSupported,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
  }
}

