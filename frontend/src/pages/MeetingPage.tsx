import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SubtitleOverlay, SubtitleItem } from '@/components/meeting/SubtitleOverlay'
import { MeetingControls } from '@/components/meeting/MeetingControls'
import { LanguageSelector } from '@/components/meeting/LanguageSelector'
import { toast } from '@/components/ui/Toaster'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useMeetingStore } from '@/store/meetingStore'
import { meetingsApi, participantsApi } from '@/lib/api'
import { cn, formatTime, getLanguageFlag } from '@/lib/utils'
import { LANGUAGE_NAMES, PLATFORM_INFO } from '@/types'
import type { LanguageCode, SubtitleMessage } from '@/types'
import { 
  Users, 
  MessageSquare, 
  FileText, 
  ExternalLink,
  Clock,
  Loader2,
} from 'lucide-react'

export default function MeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  
  // Store
  const {
    currentMeeting,
    setCurrentMeeting,
    participants,
    setParticipants,
    removeParticipant,
    currentParticipant,
    setCurrentParticipant,
    preferredLanguage,
    setPreferredLanguage,
    subtitles,
    addSubtitle,
    isConnected,
    setIsConnected,
    isRecording,
    setIsRecording,
    reset,
  } = useMeetingStore()

  // Local State
  const [isLoading, setIsLoading] = useState(true)
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [activeTab, setActiveTab] = useState<'participants' | 'transcript'>('participants')

  // WebSocket 연결
  const { sendAudio, changeLanguage, disconnect } = useWebSocket({
    meetingId: meetingId!,
    participantId: currentParticipant?.id || 'temp-user',
    preferredLanguage,
    onSubtitle: (subtitle: SubtitleMessage) => {
      addSubtitle(subtitle)
    },
    onParticipantJoined: (data) => {
      toast.info('새 참여자', `${data.participantId}님이 입장했습니다.`)
      // 참여자 목록 새로고침
      loadParticipants()
    },
    onParticipantLeft: (data) => {
      removeParticipant(data.participantId)
    },
    onMeetingEnded: () => {
      toast.info('회의 종료', '호스트가 회의를 종료했습니다.')
      navigate('/meetings')
    },
    onConnect: () => {
      setIsConnected(true)
      toast.success('연결됨', '회의에 연결되었습니다.')
    },
    onDisconnect: () => {
      setIsConnected(false)
    },
    onError: () => {
      toast.error('연결 오류', '회의 연결에 실패했습니다.')
    },
  })

  // 오디오 녹음
  const { isRecording: isAudioRecording, toggleRecording, error: audioError } = useAudioRecorder({
    onAudioData: (base64Data) => {
      sendAudio(base64Data)
    },
  })

  // 회의 정보 로드
  const loadMeeting = useCallback(async () => {
    if (!meetingId) return

    try {
      const meeting = await meetingsApi.get(meetingId)
      setCurrentMeeting(meeting)
    } catch (error) {
      toast.error('오류', '회의 정보를 불러올 수 없습니다.')
      navigate('/meetings')
    }
  }, [meetingId, setCurrentMeeting, navigate])

  // 참여자 목록 로드
  const loadParticipants = useCallback(async () => {
    if (!meetingId) return

    try {
      const participantList = await participantsApi.getByMeeting(meetingId, true)
      setParticipants(participantList)
    } catch (error) {
      console.error('Failed to load participants:', error)
    }
  }, [meetingId, setParticipants])

  // 회의 참여
  const joinMeeting = useCallback(async () => {
    if (!meetingId) return

    try {
      // 임시 사용자로 참여 (실제로는 인증된 사용자 정보 사용)
      const participant = await participantsApi.join(
        meetingId,
        '사용자', // TODO: 실제 사용자 이름
        preferredLanguage
      )
      setCurrentParticipant(participant)
    } catch (error) {
      console.error('Failed to join meeting:', error)
    }
  }, [meetingId, preferredLanguage, setCurrentParticipant])

  // 초기 로드
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await loadMeeting()
      await loadParticipants()
      await joinMeeting()
      setIsLoading(false)
    }

    init()

    return () => {
      reset()
      disconnect()
    }
  }, [meetingId])

  // 녹음 상태 동기화
  useEffect(() => {
    setIsRecording(isAudioRecording)
  }, [isAudioRecording, setIsRecording])

  // 오디오 에러 처리
  useEffect(() => {
    if (audioError) {
      toast.error('마이크 오류', audioError)
    }
  }, [audioError])

  // 언어 변경 핸들러
  const handleLanguageChange = (language: LanguageCode) => {
    setPreferredLanguage(language)
    changeLanguage(language)
    
    // 서버에 언어 변경 알림
    if (currentParticipant) {
      participantsApi.updateLanguage(currentParticipant.id, language)
    }
  }

  // 회의 종료 핸들러
  const handleEndMeeting = async () => {
    if (!meetingId) return

    try {
      await meetingsApi.end(meetingId, true, [preferredLanguage, 'en'])
      toast.success('회의 종료', '회의가 종료되었습니다.')
      navigate(`/history/${meetingId}`)
    } catch (error) {
      toast.error('오류', '회의 종료에 실패했습니다.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">회의에 연결 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-32">
      {/* 회의 정보 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    `platform-${currentMeeting?.platform}`
                  )}>
                    {currentMeeting && PLATFORM_INFO[currentMeeting.platform]?.name}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    {currentMeeting?.actualStart && formatTime(currentMeeting.actualStart)}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {currentMeeting?.title}
                </h1>
                {currentMeeting?.description && (
                  <p className="text-slate-600 mt-1">{currentMeeting.description}</p>
                )}
              </div>

              {currentMeeting?.platformMeetingUrl && (
                <a
                  href={currentMeeting.platformMeetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" rightIcon={<ExternalLink className="w-4 h-4" />}>
                    화상회의 열기
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 메인 컨텐츠 영역 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* 좌측: 실시간 스크립트 */}
        <div className="lg:col-span-2">
          <Card className="h-[500px] flex flex-col">
            <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-500" />
                실시간 자막
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  {subtitles.length}개의 발화
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {subtitles.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>아직 발화가 없습니다</p>
                    <p className="text-sm mt-1">마이크를 켜고 말씀해 주세요</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {subtitles.map((subtitle, index) => (
                    <SubtitleItem
                      key={`${subtitle.timestamp}-${index}`}
                      subtitle={subtitle}
                      compact
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 우측: 참여자 / 요약 탭 */}
        <div className="lg:col-span-1">
          <Card className="h-[500px] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('participants')}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                    activeTab === 'participants'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  참여자 ({participants.length})
                </button>
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                    activeTab === 'transcript'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  정보
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {activeTab === 'participants' ? (
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-medium">
                        {participant.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {participant.name}
                          {participant.id === currentParticipant?.id && (
                            <span className="ml-2 text-xs text-primary-600">(나)</span>
                          )}
                        </p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          {getLanguageFlag(participant.preferredLanguage)}
                          {LANGUAGE_NAMES[participant.preferredLanguage]}
                        </p>
                      </div>
                      {participant.isActive && (
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">회의 정보</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">플랫폼</span>
                        <span className="font-medium">
                          {currentMeeting && PLATFORM_INFO[currentMeeting.platform]?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">참여자</span>
                        <span className="font-medium">{participants.length}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">발화 수</span>
                        <span className="font-medium">{subtitles.length}개</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">내 언어 설정</h4>
                    <LanguageSelector
                      value={preferredLanguage}
                      onChange={handleLanguageChange}
                      size="sm"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 자막 오버레이 */}
      {showSubtitles && (
        <SubtitleOverlay
          subtitles={subtitles}
          maxVisible={2}
          showOriginal={preferredLanguage !== subtitles[subtitles.length - 1]?.originalLanguage}
          fontSize="lg"
          theme="gradient"
        />
      )}

      {/* 하단 컨트롤 바 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-4xl mx-auto">
          <MeetingControls
            isRecording={isRecording}
            isConnected={isConnected}
            preferredLanguage={preferredLanguage}
            showSubtitles={showSubtitles}
            participantCount={participants.length}
            onToggleRecording={toggleRecording}
            onChangeLanguage={handleLanguageChange}
            onToggleSubtitles={() => setShowSubtitles(!showSubtitles)}
            onEndMeeting={handleEndMeeting}
            onOpenParticipants={() => setActiveTab('participants')}
            onOpenSettings={() => setActiveTab('transcript')}
          />
        </div>
      </div>
    </div>
  )
}

