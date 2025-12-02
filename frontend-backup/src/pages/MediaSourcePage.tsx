import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MediaSourceSelector } from '@/components/media/MediaSourceSelector'
import { TranslationSettings } from '@/components/media/TranslationSettings'
import { toast } from '@/components/ui/Toaster'
import { type MediaSourceType, MEDIA_SOURCE_INFO } from '@/types/media'
import type { TranslationDisplaySettings } from '@/types/media'
import { ArrowLeft, Play, Settings2 } from 'lucide-react'

export default function MediaSourcePage() {
  const navigate = useNavigate()
  
  const [selectedSource, setSelectedSource] = useState<MediaSourceType | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string>('')
  const [step, setStep] = useState<'select' | 'settings'>('select')
  
  const [displaySettings, setDisplaySettings] = useState<TranslationDisplaySettings>({
    showOriginal: true,
    originalLanguage: undefined,
    targetLanguages: ['ko', 'en'],
    primaryDisplayLanguage: 'ko',
    subtitlePosition: 'bottom',
    fontSize: 'medium',
    showSpeakerName: true,
    showTimestamp: false,
  })

  const handleSourceSelect = useCallback((sourceType: MediaSourceType, url?: string) => {
    setSelectedSource(sourceType)
    if (url) {
      setSourceUrl(url)
    }
  }, [])

  const handleSettingsChange = useCallback((newSettings: Partial<TranslationDisplaySettings>) => {
    setDisplaySettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const handleStartSession = async () => {
    if (!selectedSource) {
      toast.error('미디어 소스를 선택해주세요')
      return
    }

    try {
      // TODO: API 호출로 세션 생성
      toast.success('세션이 시작되었습니다')
      
      // 세션 페이지로 이동 (임시로 홈으로)
      navigate('/')
    } catch (error) {
      toast.error('세션 시작에 실패했습니다')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/30">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>뒤로</span>
            </button>
            
            <h1 className="text-xl font-bold text-slate-900">
              미디어 소스 선택
            </h1>
            
            <div className="w-20" /> {/* Spacer */}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 단계 표시 */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <StepIndicator
            step={1}
            label="소스 선택"
            active={step === 'select'}
            completed={step === 'settings'}
          />
          <div className="w-16 h-0.5 bg-slate-200" />
          <StepIndicator
            step={2}
            label="번역 설정"
            active={step === 'settings'}
            completed={false}
          />
        </div>

        {step === 'select' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* 소스 선택 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📡</span>
                  미디어 소스 선택
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MediaSourceSelector
                  selectedType={selectedSource || undefined}
                  onSelect={handleSourceSelect}
                />
              </CardContent>
            </Card>

            {/* 선택된 소스 정보 */}
            {selectedSource && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Card className="border-primary-200 bg-primary-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">
                          {MEDIA_SOURCE_INFO[selectedSource].icon}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {MEDIA_SOURCE_INFO[selectedSource].name}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {MEDIA_SOURCE_INFO[selectedSource].description}
                          </p>
                          {sourceUrl && (
                            <p className="text-xs text-primary-600 mt-1 truncate max-w-md">
                              {sourceUrl}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => setStep('settings')}
                        className="gap-2"
                      >
                        <Settings2 className="w-4 h-4" />
                        번역 설정
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* 번역 설정 */}
            <div className="grid lg:grid-cols-2 gap-6">
              <TranslationSettings
                settings={displaySettings}
                onChange={handleSettingsChange}
              />
              
              {/* 미리보기 */}
              <Card>
                <CardHeader>
                  <CardTitle>미리보기</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative bg-slate-900 rounded-xl aspect-video overflow-hidden">
                    {/* 비디오 플레이스홀더 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white/50">
                        <span className="text-6xl block mb-4">
                          {selectedSource && MEDIA_SOURCE_INFO[selectedSource].icon}
                        </span>
                        <p>미디어 미리보기</p>
                      </div>
                    </div>
                    
                    {/* 자막 미리보기 */}
                    <div 
                      className={`absolute left-0 right-0 p-4 ${
                        displaySettings.subtitlePosition === 'top' ? 'top-0' : 'bottom-0'
                      }`}
                    >
                      <div className="max-w-2xl mx-auto space-y-2">
                        {displaySettings.showOriginal && (
                          <div 
                            className={`text-center py-2 px-4 rounded-lg bg-black/60 text-white/80 ${
                              displaySettings.fontSize === 'small' ? 'text-sm' :
                              displaySettings.fontSize === 'large' ? 'text-xl' :
                              displaySettings.fontSize === 'xlarge' ? 'text-2xl' : 'text-base'
                            }`}
                          >
                            {displaySettings.showSpeakerName && (
                              <span className="text-primary-400 mr-2">화자:</span>
                            )}
                            This is a sample subtitle text.
                          </div>
                        )}
                        <div 
                          className={`text-center py-2 px-4 rounded-lg bg-primary-600/90 text-white ${
                            displaySettings.fontSize === 'small' ? 'text-sm' :
                            displaySettings.fontSize === 'large' ? 'text-xl' :
                            displaySettings.fontSize === 'xlarge' ? 'text-2xl' : 'text-base'
                          }`}
                        >
                          {displaySettings.showTimestamp && (
                            <span className="text-white/60 mr-2">[00:15]</span>
                          )}
                          이것은 샘플 자막 텍스트입니다.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setStep('select')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                이전
              </Button>
              
              <Button
                onClick={handleStartSession}
                className="gap-2 px-8"
                size="lg"
              >
                <Play className="w-5 h-5" />
                번역 시작
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}

// 단계 표시 컴포넌트
function StepIndicator({
  step,
  label,
  active,
  completed,
}: {
  step: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
          active
            ? 'bg-primary-500 text-white'
            : completed
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-200 text-slate-500'
        }`}
      >
        {completed ? '✓' : step}
      </div>
      <span
        className={`text-sm font-medium ${
          active ? 'text-primary-600' : 'text-slate-500'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

