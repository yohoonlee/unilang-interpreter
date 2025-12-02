import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MultiLanguageSelector } from '@/components/meeting/LanguageSelector'
import { toast } from '@/components/ui/Toaster'
import { meetingsApi } from '@/lib/api'
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils'
import { PLATFORM_INFO } from '@/types'
import type { Meeting, Platform, LanguageCode } from '@/types'
import {
  Plus,
  Video,
  Calendar,
  Users,
  Clock,
  Play,
  MoreVertical,
  History,
  X,
  Loader2,
} from 'lucide-react'

// 임시 사용자 ID (실제로는 인증 시스템에서 가져옴)
const TEMP_USER_ID = 'temp-user-123'

export default function MeetingListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [showCreateModal, setShowCreateModal] = useState(false)

  // 회의 목록 조회
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings', TEMP_USER_ID],
    queryFn: () => meetingsApi.list(TEMP_USER_ID),
  })

  // 회의 생성 mutation
  const createMutation = useMutation({
    mutationFn: meetingsApi.create,
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      toast.success('회의 생성', '새 회의가 생성되었습니다.')
      setShowCreateModal(false)
      navigate(`/meeting/${meeting.id}`)
    },
    onError: () => {
      toast.error('오류', '회의 생성에 실패했습니다.')
    },
  })

  // 상태별 회의 분류
  const activeMeetings = meetings.filter(m => m.status === 'active')
  const scheduledMeetings = meetings.filter(m => m.status === 'scheduled')
  const pastMeetings = meetings.filter(m => m.status === 'ended')

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">회의</h1>
          <p className="text-slate-600 mt-1">회의를 생성하고 관리하세요</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-5 h-5" />}
        >
          새 회의 만들기
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* 진행 중인 회의 */}
          {activeMeetings.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                진행 중인 회의
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {activeMeetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} isActive />
                ))}
              </div>
            </section>
          )}

          {/* 예정된 회의 */}
          {scheduledMeetings.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                예정된 회의
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {scheduledMeetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            </section>
          )}

          {/* 지난 회의 */}
          {pastMeetings.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" />
                지난 회의
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastMeetings.slice(0, 6).map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} isPast />
                ))}
              </div>
              {pastMeetings.length > 6 && (
                <div className="text-center mt-4">
                  <Link to="/history">
                    <Button variant="outline">모든 기록 보기</Button>
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* 빈 상태 */}
          {meetings.length === 0 && (
            <Card className="py-16">
              <CardContent className="text-center">
                <Video className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  아직 회의가 없습니다
                </h3>
                <p className="text-slate-600 mb-6">
                  새 회의를 만들어 실시간 통역을 시작하세요
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  leftIcon={<Plus className="w-5 h-5" />}
                >
                  첫 회의 만들기
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 회의 생성 모달 */}
      {showCreateModal && (
        <CreateMeetingModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  )
}


// 회의 카드 컴포넌트
function MeetingCard({ 
  meeting, 
  isActive = false,
  isPast = false,
}: { 
  meeting: Meeting
  isActive?: boolean
  isPast?: boolean
}) {
  const navigate = useNavigate()
  const platform = PLATFORM_INFO[meeting.platform]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(
        'hover:shadow-lg transition-shadow cursor-pointer',
        isActive && 'ring-2 ring-emerald-500'
      )}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">
                {meeting.title}
              </h3>
              {meeting.description && (
                <p className="text-sm text-slate-500 truncate mt-1">
                  {meeting.description}
                </p>
              )}
            </div>
            <span className={cn(
              'px-2 py-1 rounded-lg text-xs font-medium',
              `bg-${platform.color}-100 text-${platform.color}-700`
            )}>
              {platform.name}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
            {meeting.scheduledStart && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {isPast 
                  ? formatRelativeTime(meeting.scheduledStart)
                  : formatDateTime(meeting.scheduledStart)
                }
              </span>
            )}
            {meeting.participants && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {meeting.participants.length}명
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {isActive ? (
              <Button
                className="flex-1"
                onClick={() => navigate(`/meeting/${meeting.id}`)}
                leftIcon={<Play className="w-4 h-4" />}
              >
                참여하기
              </Button>
            ) : isPast ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/history/${meeting.id}`)}
                leftIcon={<History className="w-4 h-4" />}
              >
                기록 보기
              </Button>
            ) : (
              <>
                <Button
                  className="flex-1"
                  onClick={() => navigate(`/meeting/${meeting.id}`)}
                  leftIcon={<Play className="w-4 h-4" />}
                >
                  시작하기
                </Button>
                <Button variant="outline" size="md">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}


// 회의 생성 모달
function CreateMeetingModal({
  onClose,
  onCreate,
  isLoading,
}: {
  onClose: () => void
  onCreate: (data: any) => void
  isLoading: boolean
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState<Platform>('zoom')
  const [platformUrl, setPlatformUrl] = useState('')
  const [targetLanguages, setTargetLanguages] = useState<LanguageCode[]>(['ko', 'en'])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast.error('오류', '회의 제목을 입력해주세요.')
      return
    }

    onCreate({
      title,
      description,
      platform,
      platformMeetingUrl: platformUrl || undefined,
      settings: {
        enableTranscription: true,
        enableTranslation: true,
        enableAutoSummary: true,
        targetLanguages,
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 백드롭 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">새 회의 만들기</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              회의 제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 주간 팀 미팅"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="회의 내용을 간단히 설명해주세요"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          {/* 플랫폼 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              화상회의 플랫폼
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(PLATFORM_INFO) as [Platform, typeof PLATFORM_INFO[Platform]][]).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPlatform(key)}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    platform === key
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <span className="font-medium text-slate-900">{info.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 플랫폼 URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              회의 링크 (선택)
            </label>
            <input
              type="url"
              value={platformUrl}
              onChange={(e) => setPlatformUrl(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* 대상 언어 */}
          <MultiLanguageSelector
            label="번역 대상 언어"
            value={targetLanguages}
            onChange={setTargetLanguages}
            maxSelection={5}
          />

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={isLoading}
            >
              회의 만들기
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

