// 공통 타입 정의

export type Platform = 'zoom' | 'teams' | 'meet' | 'webex'

export type MeetingStatus = 'scheduled' | 'active' | 'ended' | 'cancelled'

export type ParticipantRole = 'host' | 'co_host' | 'participant' | 'interpreter'

export type LanguageCode = 
  | 'ko' | 'en' | 'ja' | 'zh' 
  | 'es' | 'fr' | 'de' | 'pt' 
  | 'ru' | 'ar' | 'hi' | 'vi' 
  | 'th' | 'id'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  preferredLanguage: LanguageCode
}

export interface Meeting {
  id: string
  title: string
  description?: string
  platform: Platform
  platformMeetingId?: string
  platformMeetingUrl?: string
  status: MeetingStatus
  createdBy?: string
  scheduledStart?: string
  scheduledEnd?: string
  actualStart?: string
  actualEnd?: string
  settings: MeetingSettings
  participants: Participant[]
  createdAt: string
  updatedAt: string
}

export interface MeetingSettings {
  enableTranscription: boolean
  enableTranslation: boolean
  enableAutoSummary: boolean
  defaultSourceLanguage?: LanguageCode
  targetLanguages: LanguageCode[]
  saveAudio: boolean
}

export interface Participant {
  id: string
  meetingId: string
  userId?: string
  name: string
  email?: string
  role: ParticipantRole
  preferredLanguage: LanguageCode
  platformParticipantId?: string
  joinedAt?: string
  leftAt?: string
  isActive: boolean
}

export interface Utterance {
  id: string
  meetingId: string
  participantId?: string
  speakerName?: string
  originalLanguage: LanguageCode
  originalText: string
  audioUrl?: string
  audioDurationMs?: number
  confidence?: number
  timestamp: string
  sequenceNumber?: number
  translations: Translation[]
}

export interface Translation {
  id: string
  utteranceId: string
  targetLanguage: LanguageCode
  translatedText: string
  translationEngine: string
  confidence?: number
}

export interface Summary {
  id: string
  meetingId: string
  language: LanguageCode
  summaryText: string
  keyPoints: string[]
  actionItems: string[]
  decisions: string[]
  aiModel: string
  createdAt: string
  updatedAt: string
}

// WebSocket 메시지 타입
export interface WsMessage {
  type: 'subtitle' | 'participant_joined' | 'participant_left' | 'meeting_ended' | 'pong' | 'language_changed'
  data: any
}

export interface SubtitleMessage {
  speakerName: string
  originalLanguage: LanguageCode
  originalText: string
  translatedText: string
  targetLanguage: LanguageCode
  timestamp: string
  isFinal: boolean
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 언어 이름 매핑
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
  ar: 'العربية',
  hi: 'हिन्दी',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
}

// 플랫폼 정보
export const PLATFORM_INFO: Record<Platform, { name: string; color: string }> = {
  zoom: { name: 'Zoom', color: 'blue' },
  teams: { name: 'Microsoft Teams', color: 'indigo' },
  meet: { name: 'Google Meet', color: 'green' },
  webex: { name: 'Cisco Webex', color: 'red' },
}

