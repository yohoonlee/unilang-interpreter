import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LanguageSelector } from '@/components/meeting/LanguageSelector'
import { toast } from '@/components/ui/Toaster'
import { platformsApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { PLATFORM_INFO } from '@/types'
import type { Platform, LanguageCode } from '@/types'
import {
  Globe,
  Video,
  Link as LinkIcon,
  Unlink,
  Check,
  X,
  Settings as SettingsIcon,
  Bell,
  Shield,
  Palette,
  ExternalLink,
} from 'lucide-react'

const TEMP_USER_ID = 'temp-user-123'

export default function SettingsPage() {
  const [defaultLanguage, setDefaultLanguage] = useState<LanguageCode>('ko')
  const [autoRecord, setAutoRecord] = useState(true)
  const [showOriginal, setShowOriginal] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // 플랫폼 연동 상태 조회
  const { data: platformStatus } = useQuery({
    queryKey: ['platformStatus'],
    queryFn: platformsApi.getStatus,
  })

  const handleConnect = async (platform: Platform) => {
    try {
      const redirectUri = `${window.location.origin}/api/v1/platforms/${platform}/oauth/callback`
      const authUrl = await platformsApi.getOAuthUrl(platform, TEMP_USER_ID, redirectUri)
      
      if (authUrl) {
        window.location.href = authUrl
      } else {
        toast.error('오류', 'OAuth URL을 가져올 수 없습니다.')
      }
    } catch (error) {
      toast.error('연동 오류', '플랫폼 연동을 시작할 수 없습니다.')
    }
  }

  const handleDisconnect = async (platform: Platform) => {
    try {
      await platformsApi.disconnect(platform, TEMP_USER_ID)
      toast.success('연동 해제', `${PLATFORM_INFO[platform].name} 연동이 해제되었습니다.`)
    } catch (error) {
      toast.error('오류', '연동 해제에 실패했습니다.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">설정</h1>
        <p className="text-slate-600 mt-1">서비스 설정을 관리하세요</p>
      </div>

      {/* 플랫폼 연동 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary-500" />
              화상회의 플랫폼 연동
            </CardTitle>
            <CardDescription>
              화상회의 플랫폼을 연동하여 실시간 통역 서비스를 사용하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {(Object.entries(PLATFORM_INFO) as [Platform, typeof PLATFORM_INFO[Platform]][]).map(([platform, info]) => {
                const status = platformStatus?.[platform]
                const isConnected = status?.configured || false

                return (
                  <div
                    key={platform}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all',
                      isConnected
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          `bg-${info.color}-100`
                        )}>
                          <Video className={cn('w-5 h-5', `text-${info.color}-600`)} />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{info.name}</h3>
                          <p className="text-sm text-slate-500">
                            {isConnected ? '연동됨' : '연동 안됨'}
                          </p>
                        </div>
                      </div>
                      {isConnected ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <X className="w-5 h-5 text-slate-300" />
                      )}
                    </div>

                    {isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDisconnect(platform)}
                        leftIcon={<Unlink className="w-4 h-4" />}
                      >
                        연동 해제
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => handleConnect(platform)}
                        leftIcon={<LinkIcon className="w-4 h-4" />}
                      >
                        연동하기
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 언어 설정 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-500" />
              언어 설정
            </CardTitle>
            <CardDescription>
              기본 언어 및 번역 관련 설정을 관리하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <LanguageSelector
                label="기본 자막 언어"
                value={defaultLanguage}
                onChange={setDefaultLanguage}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">원본 텍스트 표시</p>
                  <p className="text-sm text-slate-500">번역과 함께 원본 텍스트도 표시합니다</p>
                </div>
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className={cn(
                    'w-12 h-7 rounded-full transition-colors relative',
                    showOriginal ? 'bg-primary-500' : 'bg-slate-200'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
                      showOriginal ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 회의 설정 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary-500" />
              회의 설정
            </CardTitle>
            <CardDescription>
              회의 관련 기본 설정을 관리하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">자동 녹음 시작</p>
                <p className="text-sm text-slate-500">회의 시작 시 자동으로 녹음을 시작합니다</p>
              </div>
              <button
                onClick={() => setAutoRecord(!autoRecord)}
                className={cn(
                  'w-12 h-7 rounded-full transition-colors relative',
                  autoRecord ? 'bg-primary-500' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
                    autoRecord ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div>
                <p className="font-medium text-slate-900">자동 요약 생성</p>
                <p className="text-sm text-slate-500">회의 종료 시 자동으로 요약을 생성합니다</p>
              </div>
              <button
                className="w-12 h-7 rounded-full bg-primary-500 relative"
              >
                <span className="absolute top-1 translate-x-6 w-5 h-5 bg-white rounded-full shadow-sm" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 알림 설정 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-500" />
              알림 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">데스크톱 알림</p>
                <p className="text-sm text-slate-500">새 회의 초대 시 알림을 받습니다</p>
              </div>
              <button className="w-12 h-7 rounded-full bg-primary-500 relative">
                <span className="absolute top-1 translate-x-6 w-5 h-5 bg-white rounded-full shadow-sm" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div>
                <p className="font-medium text-slate-900">이메일 알림</p>
                <p className="text-sm text-slate-500">회의 요약이 준비되면 이메일로 알려드립니다</p>
              </div>
              <button className="w-12 h-7 rounded-full bg-slate-200 relative">
                <span className="absolute top-1 translate-x-1 w-5 h-5 bg-white rounded-full shadow-sm" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 외관 설정 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary-500" />
              외관
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">다크 모드</p>
                <p className="text-sm text-slate-500">어두운 테마를 사용합니다</p>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={cn(
                  'w-12 h-7 rounded-full transition-colors relative',
                  darkMode ? 'bg-primary-500' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 계정 정보 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-500" />
              계정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">개인정보 처리방침</p>
              </div>
              <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-4 h-4" />}>
                보기
              </Button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div>
                <p className="font-medium text-slate-900">이용약관</p>
              </div>
              <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-4 h-4" />}>
                보기
              </Button>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500 mb-3">
                버전 1.0.0 • © 2024 UniLang Interpreter
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

