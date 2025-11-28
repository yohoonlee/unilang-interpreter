import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  MEDIA_SOURCE_CATEGORIES,
  MEDIA_SOURCE_INFO,
  type MediaSourceType,
} from '@/types/media'
import { Search, ChevronRight, Upload, Link, Mic, Monitor } from 'lucide-react'

interface MediaSourceSelectorProps {
  onSelect: (sourceType: MediaSourceType, sourceUrl?: string) => void
  selectedType?: MediaSourceType
}

export function MediaSourceSelector({
  onSelect,
  selectedType,
}: MediaSourceSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputUrl, setInputUrl] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  // 검색 필터링
  const filteredSources = searchQuery
    ? Object.values(MEDIA_SOURCE_INFO).filter(
        (source) =>
          source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          source.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null

  const handleSourceClick = (sourceType: MediaSourceType) => {
    const info = MEDIA_SOURCE_INFO[sourceType]
    
    // URL 입력이 필요한 소스인 경우
    if (['youtube', 'youtube_live', 'twitch', 'vimeo'].includes(sourceType)) {
      setShowUrlInput(true)
      onSelect(sourceType)
    } else {
      onSelect(sourceType)
    }
  }

  const handleUrlSubmit = () => {
    if (selectedType && inputUrl) {
      onSelect(selectedType, inputUrl)
      setInputUrl('')
      setShowUrlInput(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="미디어 소스 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* URL 입력 (영상 플랫폼) */}
      <AnimatePresence>
        {showUrlInput && selectedType && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary-200 bg-primary-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{MEDIA_SOURCE_INFO[selectedType].icon}</span>
                  <span className="font-medium">{MEDIA_SOURCE_INFO[selectedType].name}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="URL을 입력하세요"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Button onClick={handleUrlSubmit} disabled={!inputUrl}>
                    시작
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowUrlInput(false)
                      setInputUrl('')
                    }}
                  >
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 검색 결과 */}
      {filteredSources ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSources.map((source) => (
            <SourceCard
              key={source.type}
              source={source}
              isSelected={selectedType === source.type}
              onClick={() => handleSourceClick(source.type)}
            />
          ))}
          {filteredSources.length === 0 && (
            <p className="col-span-full text-center text-slate-500 py-8">
              검색 결과가 없습니다
            </p>
          )}
        </div>
      ) : (
        /* 카테고리별 표시 */
        <div className="space-y-4">
          {Object.entries(MEDIA_SOURCE_CATEGORIES).map(([key, category]) => (
            <div key={key}>
              {/* 카테고리 헤더 */}
              <button
                onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="font-medium text-slate-900">{category.name}</span>
                  <span className="text-sm text-slate-500">
                    ({category.sources.length})
                  </span>
                </div>
                <ChevronRight
                  className={cn(
                    'w-5 h-5 text-slate-400 transition-transform',
                    activeCategory === key && 'rotate-90'
                  )}
                />
              </button>

              {/* 카테고리 내용 */}
              <AnimatePresence>
                {activeCategory === key && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid sm:grid-cols-2 gap-3 pt-3">
                      {category.sources.map((sourceType) => {
                        const source = MEDIA_SOURCE_INFO[sourceType]
                        return (
                          <SourceCard
                            key={sourceType}
                            source={source}
                            isSelected={selectedType === sourceType}
                            onClick={() => handleSourceClick(sourceType)}
                          />
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* 빠른 액션 */}
      <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <QuickActionCard
          icon={<Upload className="w-6 h-6" />}
          title="파일 업로드"
          description="영상/오디오 파일"
          onClick={() => handleSourceClick('local_video')}
        />
        <QuickActionCard
          icon={<Monitor className="w-6 h-6" />}
          title="화면 캡처"
          description="시스템 오디오 포함"
          onClick={() => handleSourceClick('screen_capture')}
        />
        <QuickActionCard
          icon={<Mic className="w-6 h-6" />}
          title="마이크"
          description="음성 입력"
          onClick={() => handleSourceClick('microphone')}
        />
      </div>
    </div>
  )
}

// 소스 카드
function SourceCard({
  source,
  isSelected,
  onClick,
}: {
  source: (typeof MEDIA_SOURCE_INFO)[MediaSourceType]
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
        isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <span className="text-2xl flex-shrink-0">{source.icon}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{source.name}</span>
          {source.supportsRealtime && (
            <span className="px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded">
              실시간
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
          {source.description}
        </p>
      </div>
    </button>
  )
}

// 빠른 액션 카드
function QuickActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all text-center"
    >
      <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </button>
  )
}

