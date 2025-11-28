import { create } from 'zustand'
import type { 
  Meeting, 
  Participant, 
  SubtitleMessage, 
  LanguageCode,
  Utterance,
  Summary,
} from '@/types'

interface MeetingState {
  // 현재 회의 정보
  currentMeeting: Meeting | null
  setCurrentMeeting: (meeting: Meeting | null) => void
  
  // 참여자 목록
  participants: Participant[]
  setParticipants: (participants: Participant[]) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (participantId: string) => void
  
  // 현재 사용자 정보
  currentParticipant: Participant | null
  setCurrentParticipant: (participant: Participant | null) => void
  
  // 선호 언어
  preferredLanguage: LanguageCode
  setPreferredLanguage: (language: LanguageCode) => void
  
  // 실시간 자막
  subtitles: SubtitleMessage[]
  addSubtitle: (subtitle: SubtitleMessage) => void
  clearSubtitles: () => void
  
  // 회의 기록
  utterances: Utterance[]
  setUtterances: (utterances: Utterance[]) => void
  addUtterance: (utterance: Utterance) => void
  
  // 요약
  summaries: Summary[]
  setSummaries: (summaries: Summary[]) => void
  
  // 연결 상태
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
  
  // 녹음 상태
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  
  // 초기화
  reset: () => void
}

const initialState = {
  currentMeeting: null,
  participants: [],
  currentParticipant: null,
  preferredLanguage: 'ko' as LanguageCode,
  subtitles: [],
  utterances: [],
  summaries: [],
  isConnected: false,
  isRecording: false,
}

export const useMeetingStore = create<MeetingState>((set) => ({
  ...initialState,
  
  setCurrentMeeting: (meeting) => set({ currentMeeting: meeting }),
  
  setParticipants: (participants) => set({ participants }),
  
  addParticipant: (participant) => set((state) => ({
    participants: [...state.participants.filter(p => p.id !== participant.id), participant]
  })),
  
  removeParticipant: (participantId) => set((state) => ({
    participants: state.participants.filter(p => p.id !== participantId)
  })),
  
  setCurrentParticipant: (participant) => set({ currentParticipant: participant }),
  
  setPreferredLanguage: (language) => set({ preferredLanguage: language }),
  
  addSubtitle: (subtitle) => set((state) => {
    // 최대 50개 자막 유지
    const newSubtitles = [...state.subtitles, subtitle].slice(-50)
    return { subtitles: newSubtitles }
  }),
  
  clearSubtitles: () => set({ subtitles: [] }),
  
  setUtterances: (utterances) => set({ utterances }),
  
  addUtterance: (utterance) => set((state) => ({
    utterances: [...state.utterances, utterance]
  })),
  
  setSummaries: (summaries) => set({ summaries }),
  
  setIsConnected: (connected) => set({ isConnected: connected }),
  
  setIsRecording: (recording) => set({ isRecording: recording }),
  
  reset: () => set(initialState),
}))

