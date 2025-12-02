import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, getLanguageFlag } from '@/lib/utils'
import { LANGUAGE_NAMES } from '@/types'
import type { SubtitleMessage, LanguageCode } from '@/types'

interface SubtitleOverlayProps {
  subtitles: SubtitleMessage[]
  maxVisible?: number
  showOriginal?: boolean
  fontSize?: 'sm' | 'md' | 'lg' | 'xl'
  position?: 'bottom' | 'top'
  theme?: 'dark' | 'light' | 'gradient'
}

export function SubtitleOverlay({
  subtitles,
  maxVisible = 3,
  showOriginal = false,
  fontSize = 'lg',
  position = 'bottom',
  theme = 'gradient',
}: SubtitleOverlayProps) {
  // 최근 자막만 표시
  const visibleSubtitles = useMemo(() => {
    return subtitles.slice(-maxVisible)
  }, [subtitles, maxVisible])

  const fontSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }

  const themes = {
    dark: 'bg-black/80 text-white',
    light: 'bg-white/90 text-slate-900 shadow-xl',
    gradient: 'bg-gradient-to-r from-primary-600/95 to-accent-600/90 text-white',
  }

  const positionClasses = {
    bottom: 'bottom-8',
    top: 'top-24',
  }

  if (visibleSubtitles.length === 0) return null

  return (
    <div
      className={cn(
        'fixed left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-40',
        positionClasses[position]
      )}
    >
      <AnimatePresence mode="popLayout">
        {visibleSubtitles.map((subtitle, index) => (
          <motion.div
            key={`${subtitle.timestamp}-${index}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="mb-2 last:mb-0"
          >
            <div
              className={cn(
                'rounded-2xl backdrop-blur-lg shadow-2xl overflow-hidden',
                themes[theme]
              )}
            >
              {/* 화자 정보 */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
                <span className="text-lg">
                  {getLanguageFlag(subtitle.originalLanguage)}
                </span>
                <span className="font-medium text-sm opacity-90">
                  {subtitle.speakerName}
                </span>
                {subtitle.originalLanguage !== subtitle.targetLanguage && (
                  <>
                    <span className="text-xs opacity-50">→</span>
                    <span className="text-lg">
                      {getLanguageFlag(subtitle.targetLanguage)}
                    </span>
                  </>
                )}
                
                {/* 타이핑 인디케이터 */}
                {!subtitle.isFinal && (
                  <div className="ml-auto typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>

              {/* 자막 텍스트 */}
              <div className="px-5 py-4">
                {/* 번역된 텍스트 */}
                <p className={cn('font-medium', fontSizes[fontSize])}>
                  {subtitle.translatedText}
                </p>

                {/* 원본 텍스트 (선택적) */}
                {showOriginal && subtitle.originalLanguage !== subtitle.targetLanguage && (
                  <p className={cn(
                    'mt-2 opacity-60',
                    fontSize === 'xl' ? 'text-base' : 'text-sm'
                  )}>
                    {subtitle.originalText}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}


// 개별 자막 아이템 (기록 보기용)
interface SubtitleItemProps {
  subtitle: SubtitleMessage
  showTimestamp?: boolean
  compact?: boolean
}

export function SubtitleItem({ 
  subtitle, 
  showTimestamp = true,
  compact = false,
}: SubtitleItemProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className={cn(
      'flex gap-3',
      compact ? 'py-2' : 'py-3'
    )}>
      {/* 타임스탬프 */}
      {showTimestamp && (
        <div className="flex-shrink-0 w-20 text-xs text-slate-400 font-mono pt-1">
          {formatTime(subtitle.timestamp)}
        </div>
      )}

      {/* 컨텐츠 */}
      <div className="flex-1 min-w-0">
        {/* 화자 */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">
            {getLanguageFlag(subtitle.originalLanguage)}
          </span>
          <span className="font-medium text-sm text-slate-700">
            {subtitle.speakerName}
          </span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-xs',
            `lang-badge lang-badge-${subtitle.originalLanguage}`
          )}>
            {LANGUAGE_NAMES[subtitle.originalLanguage as LanguageCode]}
          </span>
        </div>

        {/* 원문 */}
        <p className="text-slate-600 text-sm">
          {subtitle.originalText}
        </p>

        {/* 번역 (다른 언어인 경우) */}
        {subtitle.originalLanguage !== subtitle.targetLanguage && (
          <div className="mt-2 pl-3 border-l-2 border-primary-200">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs">
                {getLanguageFlag(subtitle.targetLanguage)}
              </span>
              <span className="text-xs text-slate-400">
                {LANGUAGE_NAMES[subtitle.targetLanguage as LanguageCode]}
              </span>
            </div>
            <p className="text-slate-800 text-sm font-medium">
              {subtitle.translatedText}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

