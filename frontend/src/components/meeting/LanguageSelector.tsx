import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, getLanguageFlag } from '@/lib/utils'
import { ChevronDown, Check, Globe } from 'lucide-react'
import { LANGUAGE_NAMES } from '@/types'
import type { LanguageCode } from '@/types'

interface LanguageSelectorProps {
  value: LanguageCode
  onChange: (language: LanguageCode) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const LANGUAGES: LanguageCode[] = [
  'ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'ru', 'vi', 'th', 'id'
]

export function LanguageSelector({
  value,
  onChange,
  label,
  disabled = false,
  size = 'md',
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}

      {/* 선택 버튼 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200',
          'bg-white hover:bg-slate-50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizes[size]
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getLanguageFlag(value)}</span>
          <span className="font-medium text-slate-700">
            {LANGUAGE_NAMES[value]}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* 드롭다운 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 백드롭 */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* 메뉴 */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute z-50 w-full mt-2 py-2 rounded-xl',
                'bg-white border border-slate-200 shadow-xl',
                'max-h-64 overflow-y-auto'
              )}
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    onChange(lang)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-4 py-2.5',
                    'hover:bg-slate-50 transition-colors text-left',
                    value === lang && 'bg-primary-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getLanguageFlag(lang)}</span>
                    <span
                      className={cn(
                        'font-medium',
                        value === lang ? 'text-primary-700' : 'text-slate-700'
                      )}
                    >
                      {LANGUAGE_NAMES[lang]}
                    </span>
                  </div>
                  {value === lang && (
                    <Check className="w-4 h-4 text-primary-600" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}


// 다중 언어 선택기
interface MultiLanguageSelectorProps {
  value: LanguageCode[]
  onChange: (languages: LanguageCode[]) => void
  label?: string
  maxSelection?: number
}

export function MultiLanguageSelector({
  value,
  onChange,
  label,
  maxSelection = 5,
}: MultiLanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleLanguage = (lang: LanguageCode) => {
    if (value.includes(lang)) {
      onChange(value.filter((l) => l !== lang))
    } else if (value.length < maxSelection) {
      onChange([...value, lang])
    }
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}

      {/* 선택 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl',
          'border border-slate-200 bg-white hover:bg-slate-50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500'
        )}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {value.length > 0 ? (
            value.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm"
              >
                {getLanguageFlag(lang)} {LANGUAGE_NAMES[lang]}
              </span>
            ))
          ) : (
            <span className="text-slate-400 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              언어 선택
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 transition-transform flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* 드롭다운 */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'absolute z-50 w-full mt-2 py-2 rounded-xl',
                'bg-white border border-slate-200 shadow-xl',
                'max-h-64 overflow-y-auto'
              )}
            >
              <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-100">
                최대 {maxSelection}개 선택 가능 ({value.length}/{maxSelection})
              </div>
              {LANGUAGES.map((lang) => {
                const isSelected = value.includes(lang)
                const isDisabled = !isSelected && value.length >= maxSelection

                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => !isDisabled && toggleLanguage(lang)}
                    disabled={isDisabled}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-4 py-2.5',
                      'hover:bg-slate-50 transition-colors text-left',
                      isSelected && 'bg-primary-50',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getLanguageFlag(lang)}</span>
                      <span
                        className={cn(
                          'font-medium',
                          isSelected ? 'text-primary-700' : 'text-slate-700'
                        )}
                      >
                        {LANGUAGE_NAMES[lang]}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary-600" />
                    )}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

