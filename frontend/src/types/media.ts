/**
 * 미디어 소스 관련 타입 정의
 */

export type MediaSourceType =
  // 화상회의 플랫폼
  | 'zoom'
  | 'teams'
  | 'meet'
  | 'webex'
  // 영상 플랫폼
  | 'youtube'
  | 'youtube_live'
  | 'twitch'
  | 'vimeo'
  // 로컬 미디어
  | 'local_video'
  | 'local_audio'
  | 'screen_capture'
  // 영상통화
  | 'facetime'
  | 'skype'
  | 'discord'
  | 'kakaotalk'
  | 'line'
  // 기타
  | 'browser_tab'
  | 'system_audio'
  | 'microphone'

export interface MediaSourceInfo {
  type: MediaSourceType
  name: string
  icon: string
  supportsRealtime: boolean
  supportsUpload: boolean
  description: string
}

export interface MediaSourceCategory {
  name: string
  icon: string
  sources: MediaSourceType[]
}

export const MEDIA_SOURCE_CATEGORIES: Record<string, MediaSourceCategory> = {
  video_conference: {
    name: '화상회의',
    icon: '📹',
    sources: ['zoom', 'teams', 'meet', 'webex'],
  },
  video_platform: {
    name: '영상 플랫폼',
    icon: '📺',
    sources: ['youtube', 'youtube_live', 'twitch', 'vimeo'],
  },
  local_media: {
    name: '로컬 미디어',
    icon: '📁',
    sources: ['local_video', 'local_audio', 'screen_capture'],
  },
  video_call: {
    name: '영상통화',
    icon: '📱',
    sources: ['facetime', 'skype', 'discord', 'kakaotalk', 'line'],
  },
  other: {
    name: '기타',
    icon: '🔊',
    sources: ['browser_tab', 'system_audio', 'microphone'],
  },
}

export const MEDIA_SOURCE_INFO: Record<MediaSourceType, MediaSourceInfo> = {
  zoom: {
    type: 'zoom',
    name: 'Zoom',
    icon: '🎥',
    supportsRealtime: true,
    supportsUpload: false,
    description: 'Zoom 화상회의 실시간 통역',
  },
  teams: {
    type: 'teams',
    name: 'MS Teams',
    icon: '💬',
    supportsRealtime: true,
    supportsUpload: false,
    description: 'Microsoft Teams 화상회의 실시간 통역',
  },
  meet: {
    type: 'meet',
    name: 'Google Meet',
    icon: '📹',
    supportsRealtime: true,
    supportsUpload: false,
    description: 'Google Meet 화상회의 실시간 통역',
  },
  webex: {
    type: 'webex',
    name: 'Webex',
    icon: '🖥️',
    supportsRealtime: true,
    supportsUpload: false,
    description: 'Cisco Webex 화상회의 실시간 통역',
  },
  youtube: {
    type: 'youtube',
    name: 'YouTube',
    icon: '📺',
    supportsRealtime: false,
    supportsUpload: false,
    description: 'YouTube 영상 URL 자막 번역',
  },
  youtube_live: {
    type: 'youtube_live',
    name: 'YouTube Live',
    icon: '🔴',
    supportsRealtime: true,
    supportsUpload: false,
    description: 'YouTube 라이브 스트리밍 실시간 번역',
  },
  twitch: {
    type: 'twitch',
    name: 'Twitch',
    icon: '🎮',
    supportsRealtime: true,
    supportsUpload: false,
    description: 'Twitch 스트리밍 실시간 번역',
  },
  vimeo: {
    type: 'vimeo',
    name: 'Vimeo',
    icon: '🎬',
    supportsRealtime: false,
    supportsUpload: false,
    description: 'Vimeo 영상 자막 번역',
  },
  local_video: {
    type: 'local_video',
    name: '영상 파일',
    icon: '🎬',
    supportsRealtime: false,
    supportsUpload: true,
    description: '로컬 영상 파일 업로드 번역',
  },
  local_audio: {
    type: 'local_audio',
    name: '오디오 파일',
    icon: '🎵',
    supportsRealtime: false,
    supportsUpload: true,
    description: '로컬 오디오 파일 업로드 번역',
  },
  screen_capture: {
    type: 'screen_capture',
    name: '화면 캡처',
    icon: '🖥️',
    supportsRealtime: true,
    supportsUpload: false,
    description: '화면 및 시스템 오디오 캡처',
  },
  facetime: {
    type: 'facetime',
    name: 'FaceTime',
    icon: '📱',
    supportsRealtime: true,
    supportsUpload: false,
    description: 'FaceTime 영상통화 번역',
  },
  skype: {
    type: 'skype',
    name: 'Skype',
    icon: '💠',
    supportsRealtime: true,
    supportsUpload: false,
    description: 'Skype 영상통화 번역',
  },
  discord: {
    type: 'discord',
    name: 'Discord',
    icon: '💬',
    supportsRealtime: true,
    supportsUpload: false,
    description: 'Discord 음성/영상 통화 번역',
  },
  kakaotalk: {
    type: 'kakaotalk',
    name: '카카오톡',
    icon: '💛',
    supportsRealtime: true,
    supportsUpload: false,
    description: '카카오톡 영상통화 번역',
  },
  line: {
    type: 'line',
    name: 'LINE',
    icon: '💚',
    supportsRealtime: true,
    supportsUpload: false,
    description: 'LINE 영상통화 번역',
  },
  browser_tab: {
    type: 'browser_tab',
    name: '브라우저 탭',
    icon: '🌐',
    supportsRealtime: true,
    supportsUpload: false,
    description: '브라우저 탭 오디오 캡처',
  },
  system_audio: {
    type: 'system_audio',
    name: '시스템 오디오',
    icon: '🔊',
    supportsRealtime: true,
    supportsUpload: false,
    description: '시스템 오디오 출력 캡처',
  },
  microphone: {
    type: 'microphone',
    name: '마이크',
    icon: '🎤',
    supportsRealtime: true,
    supportsUpload: false,
    description: '마이크 입력 번역',
  },
}

// 미디어 세션
export interface MediaSession {
  id: string
  userId: string
  sourceType: MediaSourceType
  sourceUrl?: string
  sourceTitle?: string
  sourceMetadata: Record<string, any>
  startedAt: string
  endedAt?: string
  durationSeconds: number
  sttSeconds: number
  translationCharacters: number
  translationCount: number
  targetLanguages: string[]
  status: 'active' | 'ended' | 'error'
  isBilled: boolean
  billedAmount: number
}

// 번역 표시 설정
export interface TranslationDisplaySettings {
  showOriginal: boolean
  originalLanguage?: string
  targetLanguages: string[]
  primaryDisplayLanguage: string
  subtitlePosition: 'top' | 'bottom' | 'left' | 'right'
  fontSize: 'small' | 'medium' | 'large' | 'xlarge'
  showSpeakerName: boolean
  showTimestamp: boolean
}

