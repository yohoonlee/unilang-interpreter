import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { LanguageSelector } from './LanguageSelector'
import { 
  Mic, 
  MicOff, 
  Phone, 
  Settings, 
  Users,
  Subtitles,
  MoreVertical,
} from 'lucide-react'
import type { LanguageCode } from '@/types'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MeetingControlsProps {
  isRecording: boolean
  isConnected: boolean
  preferredLanguage: LanguageCode
  showSubtitles: boolean
  participantCount: number
  onToggleRecording: () => void
  onChangeLanguage: (language: LanguageCode) => void
  onToggleSubtitles: () => void
  onEndMeeting: () => void
  onOpenParticipants: () => void
  onOpenSettings: () => void
}

export function MeetingControls({
  isRecording,
  isConnected,
  preferredLanguage,
  showSubtitles,
  participantCount,
  onToggleRecording,
  onChangeLanguage,
  onToggleSubtitles,
  onEndMeeting,
  onOpenParticipants,
  onOpenSettings,
}: MeetingControlsProps) {
  const [showMore, setShowMore] = useState(false)

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* 왼쪽: 마이크 & 상태 */}
        <div className="flex items-center gap-4">
          {/* 녹음 버튼 */}
          <button
            onClick={onToggleRecording}
            disabled={!isConnected}
            className={cn(
              'relative w-14 h-14 rounded-full flex items-center justify-center transition-all',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-400',
              !isConnected && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isRecording ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}

            {/* 녹음 인디케이터 */}
            {isRecording && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse">
                <span className="absolute inset-0 bg-red-400 rounded-full animate-ping" />
              </span>
            )}
          </button>

          {/* 연결 상태 */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-emerald-500' : 'bg-slate-300'
                )}
              />
              <span className="text-sm font-medium text-slate-700">
                {isConnected ? '연결됨' : '연결 중...'}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {isRecording ? '음성 인식 중' : '대기 중'}
            </span>
          </div>
        </div>

        {/* 중앙: 언어 선택 */}
        <div className="flex-1 max-w-xs">
          <LanguageSelector
            value={preferredLanguage}
            onChange={onChangeLanguage}
            size="md"
          />
        </div>

        {/* 오른쪽: 컨트롤 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 자막 토글 */}
          <button
            onClick={onToggleSubtitles}
            className={cn(
              'p-3 rounded-xl transition-all',
              showSubtitles
                ? 'bg-primary-100 text-primary-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
            title={showSubtitles ? '자막 숨기기' : '자막 표시'}
          >
            <Subtitles className="w-5 h-5" />
          </button>

          {/* 참여자 */}
          <button
            onClick={onOpenParticipants}
            className="relative p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
            title="참여자"
          >
            <Users className="w-5 h-5" />
            {participantCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                {participantCount}
              </span>
            )}
          </button>

          {/* 설정 */}
          <button
            onClick={onOpenSettings}
            className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
            title="설정"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* 더보기 (모바일) */}
          <div className="relative md:hidden">
            <button
              onClick={() => setShowMore(!showMore)}
              className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showMore && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMore(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 bottom-full mb-2 w-48 py-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50"
                  >
                    <button
                      onClick={() => {
                        onOpenParticipants()
                        setShowMore(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                    >
                      <Users className="w-4 h-4" />
                      <span>참여자 ({participantCount})</span>
                    </button>
                    <button
                      onClick={() => {
                        onOpenSettings()
                        setShowMore(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                    >
                      <Settings className="w-4 h-4" />
                      <span>설정</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* 종료 버튼 */}
          <Button
            variant="danger"
            size="md"
            onClick={onEndMeeting}
            leftIcon={<Phone className="w-4 h-4 rotate-[135deg]" />}
          >
            <span className="hidden sm:inline">종료</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

