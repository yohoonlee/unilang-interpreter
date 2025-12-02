import axios, { AxiosError } from 'axios'
import type { 
  Meeting, 
  Participant, 
  Utterance, 
  Summary, 
  ApiResponse,
  LanguageCode,
  Platform,
} from '@/types'

// API 클라이언트 생성
const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 에러 핸들링
api.interceptors.response.use(
  response => response,
  (error: AxiosError<{ message?: string }>) => {
    const message = error.response?.data?.message || error.message || '오류가 발생했습니다.'
    console.error('API Error:', message)
    return Promise.reject(new Error(message))
  }
)

// ==================== Meetings API ====================

export const meetingsApi = {
  // 회의 목록 조회
  list: async (userId: string, page = 1, pageSize = 20): Promise<Meeting[]> => {
    const { data } = await api.get<ApiResponse<Meeting[]>>('/meetings', {
      params: { user_id: userId, page, page_size: pageSize }
    })
    return data.data || []
  },
  
  // 회의 상세 조회
  get: async (meetingId: string): Promise<Meeting> => {
    const { data } = await api.get<ApiResponse<Meeting>>(`/meetings/${meetingId}`)
    if (!data.data) throw new Error('회의를 찾을 수 없습니다.')
    return data.data
  },
  
  // 회의 생성
  create: async (meetingData: {
    title: string
    description?: string
    platform: Platform
    platformMeetingId?: string
    platformMeetingUrl?: string
    scheduledStart?: string
    scheduledEnd?: string
    settings?: Partial<Meeting['settings']>
  }): Promise<Meeting> => {
    const { data } = await api.post<ApiResponse<Meeting>>('/meetings', meetingData)
    if (!data.data) throw new Error('회의 생성에 실패했습니다.')
    return data.data
  },
  
  // 회의 수정
  update: async (meetingId: string, updateData: Partial<Meeting>): Promise<Meeting> => {
    const { data } = await api.patch<ApiResponse<Meeting>>(`/meetings/${meetingId}`, updateData)
    if (!data.data) throw new Error('회의 수정에 실패했습니다.')
    return data.data
  },
  
  // 회의 시작
  start: async (meetingId: string, platformMeetingId?: string, platformMeetingUrl?: string): Promise<Meeting> => {
    const { data } = await api.post<ApiResponse<Meeting>>(`/meetings/${meetingId}/start`, {
      platform_meeting_id: platformMeetingId,
      platform_meeting_url: platformMeetingUrl,
    })
    if (!data.data) throw new Error('회의 시작에 실패했습니다.')
    return data.data
  },
  
  // 회의 종료
  end: async (meetingId: string, generateSummary = true, summaryLanguages = ['ko', 'en']): Promise<Meeting> => {
    const { data } = await api.post<ApiResponse<Meeting>>(`/meetings/${meetingId}/end`, {
      generate_summary: generateSummary,
      summary_languages: summaryLanguages,
    })
    if (!data.data) throw new Error('회의 종료에 실패했습니다.')
    return data.data
  },
  
  // 회의 기록 조회
  getTranscript: async (meetingId: string, language?: LanguageCode, page = 1, pageSize = 100): Promise<Utterance[]> => {
    const { data } = await api.get<ApiResponse<Utterance[]>>(`/meetings/${meetingId}/transcript`, {
      params: { language, page, page_size: pageSize }
    })
    return data.data || []
  },
}

// ==================== Participants API ====================

export const participantsApi = {
  // 회의 참여자 목록
  getByMeeting: async (meetingId: string, activeOnly = false): Promise<Participant[]> => {
    const { data } = await api.get<ApiResponse<Participant[]>>(`/participants/meeting/${meetingId}`, {
      params: { active_only: activeOnly }
    })
    return data.data || []
  },
  
  // 참여자 추가
  add: async (participantData: {
    meetingId: string
    name: string
    email?: string
    preferredLanguage: LanguageCode
    role?: Participant['role']
  }): Promise<Participant> => {
    const { data } = await api.post<ApiResponse<Participant>>('/participants', {
      meeting_id: participantData.meetingId,
      name: participantData.name,
      email: participantData.email,
      preferred_language: participantData.preferredLanguage,
      role: participantData.role || 'participant',
    })
    if (!data.data) throw new Error('참여자 추가에 실패했습니다.')
    return data.data
  },
  
  // 회의 참여
  join: async (meetingId: string, name: string, preferredLanguage: LanguageCode): Promise<Participant> => {
    const { data } = await api.post<ApiResponse<Participant>>(`/participants/meeting/${meetingId}/join`, {
      name,
      preferred_language: preferredLanguage,
    })
    if (!data.data) throw new Error('회의 참여에 실패했습니다.')
    return data.data
  },
  
  // 언어 변경
  updateLanguage: async (participantId: string, language: LanguageCode): Promise<Participant> => {
    const { data } = await api.patch<ApiResponse<Participant>>(`/participants/${participantId}/language`, {
      preferred_language: language,
    })
    if (!data.data) throw new Error('언어 변경에 실패했습니다.')
    return data.data
  },
  
  // 퇴장
  leave: async (participantId: string): Promise<void> => {
    await api.post(`/participants/${participantId}/leave`)
  },
}

// ==================== Translations API ====================

export const translationsApi = {
  // 텍스트 번역
  translate: async (text: string, sourceLanguage: LanguageCode, targetLanguage: LanguageCode): Promise<string> => {
    const { data } = await api.post<ApiResponse<{ translated_text: string }>>('/translations/translate', {
      text,
      source_language: sourceLanguage,
      target_language: targetLanguage,
    })
    return data.data?.translated_text || text
  },
  
  // 지원 언어 목록
  getLanguages: async (): Promise<Record<LanguageCode, string>> => {
    const { data } = await api.get<ApiResponse<{ languages: Record<LanguageCode, string> }>>('/translations/languages')
    return data.data?.languages || {} as Record<LanguageCode, string>
  },
  
  // 언어 감지
  detectLanguage: async (text: string): Promise<{ language: LanguageCode; confidence: number }> => {
    const { data } = await api.post<ApiResponse<{ detected_language: LanguageCode; confidence: number }>>('/translations/detect', null, {
      params: { text }
    })
    return {
      language: data.data?.detected_language || 'en',
      confidence: data.data?.confidence || 0,
    }
  },
}

// ==================== Summaries API ====================

export const summariesApi = {
  // 회의 요약 조회
  getByMeeting: async (meetingId: string, language?: LanguageCode): Promise<Summary[]> => {
    const { data } = await api.get<ApiResponse<Summary[]>>(`/summaries/meeting/${meetingId}`, {
      params: { language }
    })
    return data.data || []
  },
  
  // 요약 생성
  generate: async (meetingId: string, languages: LanguageCode[] = ['ko', 'en']): Promise<Summary[]> => {
    const { data } = await api.post<ApiResponse<{ summaries: Summary[] }>>('/summaries/generate', {
      meeting_id: meetingId,
      languages,
      include_key_points: true,
      include_action_items: true,
      include_decisions: true,
    })
    return data.data?.summaries || []
  },
  
  // 요약 재생성
  regenerate: async (meetingId: string, languages: LanguageCode[] = ['ko', 'en']): Promise<Summary[]> => {
    const { data } = await api.post<ApiResponse<{ summaries: Summary[] }>>(`/summaries/meeting/${meetingId}/regenerate`, null, {
      params: { languages }
    })
    return data.data?.summaries || []
  },
}

// ==================== Platforms API ====================

export const platformsApi = {
  // 플랫폼 연동 상태
  getStatus: async (): Promise<Record<Platform, { configured: boolean; name: string; features: string[] }>> => {
    const { data } = await api.get<ApiResponse<Record<Platform, any>>>('/platforms/status')
    return data.data || {} as Record<Platform, { configured: boolean; name: string; features: string[] }>
  },
  
  // OAuth 인증 URL
  getOAuthUrl: async (platform: Platform, userId: string, redirectUri: string): Promise<string> => {
    const response = await api.get(`/platforms/${platform}/oauth/authorize`, {
      params: { user_id: userId, redirect_uri: redirectUri },
      maxRedirects: 0,
      validateStatus: status => status === 302 || status === 200,
    })
    return response.headers.location || ''
  },
  
  // 플랫폼 연동 해제
  disconnect: async (platform: Platform, userId: string): Promise<void> => {
    await api.delete(`/platforms/${platform}/disconnect`, {
      params: { user_id: userId }
    })
  },
}

export default api

