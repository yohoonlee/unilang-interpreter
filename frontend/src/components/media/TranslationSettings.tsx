import { cn, getLanguageFlag } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { MultiLanguageSelector } from '@/components/meeting/LanguageSelector'
import { LANGUAGE_NAMES, type LanguageCode } from '@/types'
import type { TranslationDisplaySettings } from '@/types/media'
import { Eye, EyeOff, Type, Clock, User } from 'lucide-react'

interface TranslationSettingsProps {
  settings: TranslationDisplaySettings
  onChange: (settings: Partial<TranslationDisplaySettings>) => void
}

export function TranslationSettings({
  settings,
  onChange,
}: TranslationSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">번역 표시 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 원본 표시 토글 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.showOriginal ? (
              <Eye className="w-5 h-5 text-primary-500" />
            ) : (
              <EyeOff className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <p className="font-medium text-slate-900">원본 텍스트 표시</p>
              <p className="text-sm text-slate-500">
                번역과 함께 원본 텍스트도 표시합니다
              </p>
            </div>
          </div>
          <button
            onClick={() => onChange({ showOriginal: !settings.showOriginal })}
            className={cn(
              'w-12 h-7 rounded-full transition-colors relative',
              settings.showOriginal ? 'bg-primary-500' : 'bg-slate-200'
            )}
          >
            <span
              className={cn(
                'absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
                settings.showOriginal ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {/* 대상 언어 선택 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            번역 언어 선택
          </label>
          <MultiLanguageSelector
            value={settings.targetLanguages as LanguageCode[]}
            onChange={(languages) =>
              onChange({ targetLanguages: languages })
            }
            maxSelection={5}
          />
          <p className="text-xs text-slate-500 mt-2">
            선택한 언어들로 동시에 번역됩니다. 기록 보기에서 언어별로 확인할 수
            있습니다.
          </p>
        </div>

        {/* 주 표시 언어 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            주 표시 언어
          </label>
          <div className="flex flex-wrap gap-2">
            {settings.targetLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => onChange({ primaryDisplayLanguage: lang })}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all',
                  settings.primaryDisplayLanguage === lang
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <span>{getLanguageFlag(lang)}</span>
                <span className="text-sm font-medium">
                  {LANGUAGE_NAMES[lang as LanguageCode]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 자막 위치 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            자막 위치
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['top', 'bottom', 'left', 'right'] as const).map((position) => (
              <button
                key={position}
                onClick={() => onChange({ subtitlePosition: position })}
                className={cn(
                  'py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
                  settings.subtitlePosition === position
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {position === 'top' && '상단'}
                {position === 'bottom' && '하단'}
                {position === 'left' && '좌측'}
                {position === 'right' && '우측'}
              </button>
            ))}
          </div>
        </div>

        {/* 글자 크기 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <Type className="w-4 h-4" />
            글자 크기
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
              <button
                key={size}
                onClick={() => onChange({ fontSize: size })}
                className={cn(
                  'py-2 px-3 rounded-lg border-2 transition-all',
                  settings.fontSize === size
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300',
                  size === 'small' && 'text-sm',
                  size === 'medium' && 'text-base',
                  size === 'large' && 'text-lg',
                  size === 'xlarge' && 'text-xl'
                )}
              >
                {size === 'small' && '작게'}
                {size === 'medium' && '보통'}
                {size === 'large' && '크게'}
                {size === 'xlarge' && '매우 크게'}
              </button>
            ))}
          </div>
        </div>

        {/* 추가 옵션 */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-700">화자 이름 표시</span>
            </div>
            <button
              onClick={() =>
                onChange({ showSpeakerName: !settings.showSpeakerName })
              }
              className={cn(
                'w-10 h-6 rounded-full transition-colors relative',
                settings.showSpeakerName ? 'bg-primary-500' : 'bg-slate-200'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
                  settings.showSpeakerName ? 'translate-x-5' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-700">타임스탬프 표시</span>
            </div>
            <button
              onClick={() =>
                onChange({ showTimestamp: !settings.showTimestamp })
              }
              className={cn(
                'w-10 h-6 rounded-full transition-colors relative',
                settings.showTimestamp ? 'bg-primary-500' : 'bg-slate-200'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
                  settings.showTimestamp ? 'translate-x-5' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 간단한 설정 바 (회의/세션 중 사용)
export function TranslationSettingsBar({
  settings,
  onChange,
}: TranslationSettingsProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-xl">
      {/* 원본 표시 토글 */}
      <button
        onClick={() => onChange({ showOriginal: !settings.showOriginal })}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
          settings.showOriginal
            ? 'bg-primary-100 text-primary-700'
            : 'bg-white text-slate-600 hover:bg-slate-100'
        )}
      >
        {settings.showOriginal ? (
          <Eye className="w-4 h-4" />
        ) : (
          <EyeOff className="w-4 h-4" />
        )}
        원본
      </button>

      {/* 언어 선택 */}
      <div className="flex items-center gap-1">
        {settings.targetLanguages.slice(0, 3).map((lang) => (
          <button
            key={lang}
            onClick={() => onChange({ primaryDisplayLanguage: lang })}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all',
              settings.primaryDisplayLanguage === lang
                ? 'bg-primary-100 ring-2 ring-primary-500'
                : 'bg-white hover:bg-slate-100'
            )}
            title={LANGUAGE_NAMES[lang as LanguageCode]}
          >
            {getLanguageFlag(lang)}
          </button>
        ))}
      </div>

      {/* 글자 크기 */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => {
            const sizes = ['small', 'medium', 'large', 'xlarge'] as const
            const currentIndex = sizes.indexOf(settings.fontSize)
            const newIndex = Math.max(0, currentIndex - 1)
            onChange({ fontSize: sizes[newIndex] })
          }}
          className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600"
          disabled={settings.fontSize === 'small'}
        >
          <Type className="w-3 h-3" />
        </button>
        <button
          onClick={() => {
            const sizes = ['small', 'medium', 'large', 'xlarge'] as const
            const currentIndex = sizes.indexOf(settings.fontSize)
            const newIndex = Math.min(sizes.length - 1, currentIndex + 1)
            onChange({ fontSize: sizes[newIndex] })
          }}
          className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600"
          disabled={settings.fontSize === 'xlarge'}
        >
          <Type className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

