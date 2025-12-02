import { useEffect, useRef, useCallback, useState } from 'react'
import type { WsMessage, SubtitleMessage, LanguageCode } from '@/types'

interface UseWebSocketOptions {
  meetingId: string
  participantId: string
  preferredLanguage: LanguageCode
  onSubtitle?: (subtitle: SubtitleMessage) => void
  onParticipantJoined?: (data: { participantId: string; preferredLanguage: string }) => void
  onParticipantLeft?: (data: { participantId: string }) => void
  onMeetingEnded?: () => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

interface UseWebSocketReturn {
  isConnected: boolean
  sendAudio: (audioData: string) => void
  changeLanguage: (language: LanguageCode) => void
  disconnect: () => void
}

export function useWebSocket({
  meetingId,
  participantId,
  preferredLanguage,
  onSubtitle,
  onParticipantJoined,
  onParticipantLeft,
  onMeetingEnded,
  onConnect,
  onDisconnect,
  onError,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const pingIntervalRef = useRef<ReturnType<typeof setInterval>>()

  // WebSocket 연결
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/meeting/${meetingId}?participant_id=${participantId}&preferred_language=${preferredLanguage}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      onConnect?.()

      // Ping 인터벌 시작 (30초마다)
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
      onDisconnect?.()

      // Ping 인터벌 정리
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }

      // 자동 재연결 (5초 후)
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...')
        connect()
      }, 5000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      onError?.(error)
    }

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data)

        switch (message.type) {
          case 'subtitle':
            onSubtitle?.(message.data as SubtitleMessage)
            break

          case 'participant_joined':
            onParticipantJoined?.(message.data)
            break

          case 'participant_left':
            onParticipantLeft?.(message.data)
            break

          case 'meeting_ended':
            onMeetingEnded?.()
            break

          case 'pong':
            // Pong 응답, 연결 유지 확인
            break

          case 'language_changed':
            console.log('Language changed:', message.data)
            break

          default:
            console.log('Unknown message type:', message.type)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
  }, [
    meetingId,
    participantId,
    preferredLanguage,
    onSubtitle,
    onParticipantJoined,
    onParticipantLeft,
    onMeetingEnded,
    onConnect,
    onDisconnect,
    onError,
  ])

  // 오디오 데이터 전송
  const sendAudio = useCallback((audioData: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'audio',
        data: audioData,
      }))
    }
  }, [])

  // 언어 변경
  const changeLanguage = useCallback((language: LanguageCode) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'language_change',
        language,
      }))
    }
  }, [])

  // 연결 해제
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  // 컴포넌트 마운트 시 연결, 언마운트 시 해제
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    isConnected,
    sendAudio,
    changeLanguage,
    disconnect,
  }
}

