import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LanguageSelector } from '@/components/meeting/LanguageSelector'
import { SubtitleItem } from '@/components/meeting/SubtitleOverlay'
import { toast } from '@/components/ui/Toaster'
import { meetingsApi, summariesApi } from '@/lib/api'
import { cn, formatDateTime, formatDuration, getLanguageFlag } from '@/lib/utils'
import { LANGUAGE_NAMES, PLATFORM_INFO } from '@/types'
import type { LanguageCode, Summary, Utterance } from '@/types'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  FileText,
  MessageSquare,
  Download,
  RefreshCw,
  CheckCircle,
  Target,
  Lightbulb,
  Loader2,
} from 'lucide-react'

export default function MeetingHistoryPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('ko')
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('summary')

  // 회의 정보 조회
  const { data: meeting, isLoading: meetingLoading } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => meetingsApi.get(meetingId!),
    enabled: !!meetingId,
  })

  // 회의 기록 조회
  const { data: utterances = [], isLoading: utterancesLoading } = useQuery({
    queryKey: ['transcript', meetingId, selectedLanguage],
    queryFn: () => meetingsApi.getTranscript(meetingId!, selectedLanguage),
    enabled: !!meetingId,
  })

  // 요약 조회
  const { data: summaries = [], isLoading: summariesLoading } = useQuery({
    queryKey: ['summaries', meetingId],
    queryFn: () => summariesApi.getByMeeting(meetingId!),
    enabled: !!meetingId,
  })

  // 요약 재생성
  const regenerateMutation = useMutation({
    mutationFn: () => summariesApi.regenerate(meetingId!, [selectedLanguage, 'en']),
    onSuccess: () => {
      toast.success('요약 재생성', '요약이 다시 생성되었습니다.')
    },
    onError: () => {
      toast.error('오류', '요약 재생성에 실패했습니다.')
    },
  })

  // 현재 언어의 요약
  const currentSummary = summaries.find(s => s.language === selectedLanguage)

  const isLoading = meetingLoading || utterancesLoading || summariesLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          회의를 찾을 수 없습니다
        </h2>
        <Link to="/meetings">
          <Button variant="outline">회의 목록으로</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link to="/meetings">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            뒤로
          </Button>
        </Link>
      </div>

      {/* 회의 정보 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    `bg-${PLATFORM_INFO[meeting.platform].color}-100 text-${PLATFORM_INFO[meeting.platform].color}-700`
                  )}>
                    {PLATFORM_INFO[meeting.platform].name}
                  </span>
                  <span className="text-sm text-slate-500">
                    회의 종료됨
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">{meeting.title}</h1>
                {meeting.description && (
                  <p className="text-slate-600 mt-1">{meeting.description}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
                  내보내기
                </Button>
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">날짜</p>
                  <p className="font-medium text-slate-900">
                    {meeting.actualStart && formatDateTime(meeting.actualStart).split(' ')[0]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">소요 시간</p>
                  <p className="font-medium text-slate-900">
                    {meeting.actualStart && meeting.actualEnd
                      ? formatDuration(meeting.actualStart, meeting.actualEnd)
                      : '-'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">참여자</p>
                  <p className="font-medium text-slate-900">
                    {meeting.participants?.length || 0}명
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">발화 수</p>
                  <p className="font-medium text-slate-900">{utterances.length}개</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 언어 선택 & 탭 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              activeTab === 'summary'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            요약
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              activeTab === 'transcript'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            전체 기록
          </button>
        </div>

        <div className="w-48">
          <LanguageSelector
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            size="sm"
          />
        </div>
      </div>

      {/* 콘텐츠 */}
      {activeTab === 'summary' ? (
        <motion.div
          key="summary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid lg:grid-cols-3 gap-6"
        >
          {/* 요약 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>회의 요약</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => regenerateMutation.mutate()}
                  isLoading={regenerateMutation.isPending}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  재생성
                </Button>
              </CardHeader>
              <CardContent>
                {currentSummary ? (
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-700 leading-relaxed">
                      {currentSummary.summaryText}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>이 언어로 된 요약이 없습니다</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => regenerateMutation.mutate()}
                      isLoading={regenerateMutation.isPending}
                    >
                      요약 생성하기
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 핵심 포인트 & 액션 아이템 */}
          <div className="space-y-6">
            {/* 핵심 포인트 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  핵심 포인트
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentSummary?.keyPoints && currentSummary.keyPoints.length > 0 ? (
                  <ul className="space-y-2">
                    {currentSummary.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="text-slate-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">핵심 포인트가 없습니다</p>
                )}
              </CardContent>
            </Card>

            {/* 액션 아이템 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-5 h-5 text-emerald-500" />
                  액션 아이템
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentSummary?.actionItems && currentSummary.actionItems.length > 0 ? (
                  <ul className="space-y-2">
                    {currentSummary.actionItems.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">액션 아이템이 없습니다</p>
                )}
              </CardContent>
            </Card>

            {/* 결정 사항 */}
            {currentSummary?.decisions && currentSummary.decisions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    결정 사항
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {currentSummary.decisions.map((decision, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                        <span className="text-slate-700">{decision}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="transcript"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>전체 기록</CardTitle>
            </CardHeader>
            <CardContent>
              {utterances.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {utterances.map((utterance, index) => (
                    <SubtitleItem
                      key={utterance.id || index}
                      subtitle={{
                        speakerName: utterance.speakerName || 'Unknown',
                        originalLanguage: utterance.originalLanguage,
                        originalText: utterance.originalText,
                        translatedText: 
                          utterance.translations?.find(t => t.targetLanguage === selectedLanguage)?.translatedText 
                          || utterance.originalText,
                        targetLanguage: selectedLanguage,
                        timestamp: utterance.timestamp,
                        isFinal: true,
                      }}
                      showTimestamp
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>기록이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

