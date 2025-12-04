"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function NaverCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<string>("처리 중...")
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      console.log('🔍 [Naver Callback Page] 시작')
      console.log('📝 파라미터:', { hasCode: !!code, hasState: !!state, error })

      if (error) {
        console.error('❌ [Naver Callback Page] OAuth 에러:', error)
        setStatus(`에러: ${error}`)
        setTimeout(() => router.push('/'), 2000)
        return
      }

      if (!code) {
        console.error('❌ [Naver Callback Page] code 누락')
        setStatus('에러: 인증 코드 누락')
        setTimeout(() => router.push('/'), 2000)
        return
      }

      try {
        setStatus('네이버 토큰 교환 중...')
        
        // API 라우트 호출
        const response = await fetch(`/api/auth/naver/exchange?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || '토큰 교환 실패')
        }

        console.log('✅ [Naver Callback Page] 토큰 교환 성공')
        setStatus('Supabase 로그인 중...')

        // Supabase에 로그인/회원가입
        const email = data.user.email
        // ✅ 모든 OAuth에서 동일한 비밀번호 사용 (이메일 기반)
        const password = `oauth_${email}_unified`

        console.log('🔐 [Naver Callback Page] Supabase 로그인 시도')
        console.log('📧 [Naver Callback Page] Email:', email)
        console.log('🆔 [Naver Callback Page] Naver ID:', data.user.id)

        // 먼저 로그인 시도
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        console.log('🔍 [Naver Callback Page] 로그인 시도 결과:', signInError ? `에러: ${signInError.message}` : '성공')

        if (signInError) {
          console.log('🆕 [Naver Callback Page] 신규 사용자 - 서버 API로 회원가입 요청...')
          setStatus('신규 사용자 등록 중...')
          
          // 서버 API를 통해 이메일 인증 없이 사용자 생성
          const signupResponse = await fetch('/api/auth/naver/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              user_metadata: {
                name: data.user.name,
                nickname: data.user.nickname || data.user.name,
                avatar_url: data.user.profile_image,
                provider: 'naver',
                naver_id: data.user.id,
              },
            }),
          })

          const signupData = await signupResponse.json()

          if (!signupResponse.ok || !signupData.success) {
            console.error('❌ [Naver Callback Page] 회원가입 에러:', signupData.error)
            throw new Error(`회원가입 실패: ${signupData.error}`)
          }

          // ✅ 기존 사용자인지 확인
          if (signupData.existingUser) {
            console.log('✅ [Naver Callback Page] 기존 사용자 발견 - 다른 SNS로 이미 가입됨')
            console.log('📧 [Naver Callback Page] Email:', email)
            setStatus('기존 사용자 로그인 중...')
            
            // 기존 사용자 - 비밀번호로 로그인 시도
            const { error: existingSignInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            })

            if (existingSignInError) {
              console.error('❌ [Naver Callback Page] 기존 사용자 로그인 에러:', existingSignInError)
              throw new Error(`로그인 실패: ${existingSignInError.message}`)
            }

            console.log('✅ [Naver Callback Page] 기존 사용자 로그인 성공')
          } else {
            // 신규 사용자
            console.log('✅ [Naver Callback Page] 신규 사용자 회원가입 성공, 자동 로그인 시도...')

            // 회원가입 후 자동 로그인
            const { error: autoSignInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            })

            if (autoSignInError) {
              console.error('❌ [Naver Callback Page] 자동 로그인 에러:', autoSignInError)
              throw new Error(`자동 로그인 실패: ${autoSignInError.message}`)
            }

            console.log('✅ [Naver Callback Page] 신규 사용자 회원가입 및 로그인 성공')
          }
        } else {
          console.log('✅ [Naver Callback Page] 기존 사용자 로그인 성공')
        }

        setStatus('로그인 완료! 메인 페이지로 이동 중...')
        
        // 잠시 대기 후 리디렉션 (세션 동기화)
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 에러'
        console.error('❌ [Naver Callback Page] 에러:', err)
        setStatus(`에러: ${errorMessage}`)
        setTimeout(() => router.push('/?error=naver_auth_failed'), 2000)
      }
    }

    handleCallback()
  }, [searchParams, router, supabase])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">네이버 로그인 처리 중</h2>
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  )
}

export default function NaverCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">네이버 로그인 처리 중</h2>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    }>
      <NaverCallbackContent />
    </Suspense>
  )
}











