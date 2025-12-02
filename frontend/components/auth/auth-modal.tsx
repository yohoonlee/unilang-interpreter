"use client"

import { useState } from "react"
import { X, Mail, Phone, Loader2 } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultView?: "login" | "signup" | "forgot-password"
}

export function AuthModal({ isOpen, onClose, defaultView = "login" }: AuthModalProps) {
  const [currentView, setCurrentView] = useState<"login" | "signup" | "forgot-password" | "email-otp" | "phone-otp">(defaultView)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // 로그인 폼
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  
  // 회원가입 폼
  const [signupName, setSignupName] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("")
  
  // 비밀번호 찾기
  const [forgotEmail, setForgotEmail] = useState("")

  // 이메일 OTP
  const [otpEmail, setOtpEmail] = useState("")
  const [emailOtp, setEmailOtp] = useState("")
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false)

  // 휴대폰 OTP
  const [phoneNumber, setPhoneNumber] = useState("")
  const [phoneOtp, setPhoneOtp] = useState("")
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false)

  if (!isOpen) return null

  // Supabase가 설정되지 않은 경우 안내 메시지
  if (!isSupabaseConfigured()) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-8">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">설정 필요</h2>
            <p className="text-gray-600 mb-4">
              인증 서비스를 사용하려면 Supabase 환경변수를 설정해야 합니다.
            </p>
            <p className="text-sm text-gray-500">
              NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정해주세요.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const supabase = createClient()

  // SNS 로그인 핸들러
  const handleSocialLogin = async (provider: 'google' | 'kakao' | 'naver' | 'linkedin_oidc') => {
    setError("")
    setIsLoading(true)
    
    try {
      if (provider === 'google' || provider === 'kakao' || provider === 'linkedin_oidc') {
        // Supabase 네이티브 OAuth
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
      } else if (provider === 'naver') {
        // 커스텀 네이버 OAuth
        const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
        const redirectUri = `${window.location.origin}/auth/naver/callback`
        const state = Math.random().toString(36).substring(7)
        sessionStorage.setItem('naver_oauth_state', state)
        const authUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
        window.location.href = authUrl
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '로그인에 실패했습니다.'
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  // 이메일 로그인
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      if (error) throw error

      onClose()
      window.location.reload()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '로그인에 실패했습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 회원가입
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (signupPassword !== signupConfirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    if (signupPassword.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.")
      return
    }

    setIsLoading(true)

    try {
      // 서버 API를 통해 회원가입 (중복 이메일 체크 포함)
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          name: signupName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.')
      }

      // 회원가입 성공 후 자동 로그인
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: signupEmail,
        password: signupPassword,
      })

      if (loginError) {
        setSuccess("회원가입이 완료되었습니다! 로그인해주세요.")
        setTimeout(() => {
          setCurrentView("login")
          setSuccess("")
        }, 2000)
      } else {
        onClose()
        window.location.reload()
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '회원가입에 실패했습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 이메일 OTP 전송
  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: otpEmail,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) throw error

      setIsEmailOtpSent(true)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '인증 코드 전송에 실패했습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 이메일 OTP 검증
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: emailOtp,
        type: 'email',
      })

      if (error) throw error

      onClose()
      window.location.reload()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '인증 코드가 올바르지 않습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 휴대폰 OTP 전송
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // 전화번호 포맷팅 (+82)
      let formattedPhone = phoneNumber.replace(/[^0-9]/g, '')
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+82' + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+82' + formattedPhone
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      })

      if (error) throw error

      setIsPhoneOtpSent(true)
    } catch (err: unknown) {
      let errorMessage = '인증 코드 전송에 실패했습니다.'
      if (err instanceof Error) {
        if (err.message?.includes('not enabled')) {
          errorMessage = '휴대폰 인증이 활성화되지 않았습니다.'
        } else {
          errorMessage = err.message
        }
      }
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 휴대폰 OTP 검증
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      let formattedPhone = phoneNumber.replace(/[^0-9]/g, '')
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+82' + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+82' + formattedPhone
      }

      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: phoneOtp,
        type: 'sms',
      })

      if (error) throw error

      onClose()
      window.location.reload()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '인증 코드가 올바르지 않습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 비밀번호 재설정
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setSuccess("재설정 링크를 이메일로 보냈습니다.")
      
      // 1초 후 로그인 화면으로 자동 이동
      setTimeout(() => {
        setCurrentView("login")
        setForgotEmail("")
        setSuccess("")
      }, 1000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '요청에 실패했습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {currentView === "login" && "로그인"}
              {currentView === "signup" && "회원가입"}
              {currentView === "forgot-password" && "비밀번호 재설정"}
              {currentView === "email-otp" && "이메일 인증"}
              {currentView === "phone-otp" && "휴대폰 인증"}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {currentView === "login" && "UniLang 실시간 통역 서비스에 로그인하세요"}
              {currentView === "signup" && "새 계정을 만들어 시작하세요"}
              {currentView === "forgot-password" && "이메일로 비밀번호 재설정 링크를 보내드립니다"}
              {currentView === "email-otp" && "이메일로 인증 코드를 받으세요"}
              {currentView === "phone-otp" && "휴대폰으로 인증 코드를 받으세요"}
            </p>
          </div>

          {/* SNS 로그인 버튼들 (로그인 화면에서만) */}
          {currentView === "login" && (
            <>
              <div className="space-y-3 mb-6">
                {/* 1행: 네이버, 카카오 */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('naver')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#03C75A] hover:bg-[#02B350] text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <span className="font-bold">N</span>
                    <span>네이버</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('kakao')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#FEE500] hover:bg-[#E5CE00] text-black font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <span className="font-bold">K</span>
                    <span>카카오</span>
                  </button>
                </div>
                {/* 2행: Google, LinkedIn */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <span className="font-bold">G</span>
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('linkedin_oidc')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <span className="font-bold">in</span>
                    <span>LinkedIn</span>
                  </button>
                </div>
                {/* 3행: 이메일, 휴대폰 (OTP) */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError("")
                      setCurrentView("email-otp")
                    }}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    <span>이메일</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError("")
                      setCurrentView("phone-otp")
                    }}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <Phone className="w-4 h-4" />
                    <span>휴대폰</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 에러/성공 메시지 */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-600 text-sm">
              {success}
            </div>
          )}

          {/* 로그인 폼 */}
          {currentView === "login" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                  required
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentView("forgot-password")}
                  className="text-sm text-teal-600 hover:text-teal-700"
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    로그인 중...
                  </span>
                ) : (
                  "로그인"
                )}
              </button>

              <div className="text-center pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">계정이 없으신가요? </span>
                <button
                  type="button"
                  onClick={() => setCurrentView("signup")}
                  className="text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  회원가입
                </button>
              </div>
            </form>
          )}

          {/* 회원가입 폼 */}
          {currentView === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  required
                  autoComplete="off"
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                  required
                  autoComplete="off"
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  autoComplete="new-password"
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                  autoComplete="new-password"
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    가입 중...
                  </span>
                ) : (
                  "회원가입"
                )}
              </button>

              <div className="text-center pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">이미 계정이 있으신가요? </span>
                <button
                  type="button"
                  onClick={() => setCurrentView("login")}
                  className="text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  로그인
                </button>
              </div>
            </form>
          )}

          {/* 이메일 OTP 폼 */}
          {currentView === "email-otp" && (
            <div className="space-y-4">
              {!isEmailOtpSent ? (
                <form onSubmit={handleSendEmailOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이메일 주소
                    </label>
                    <input
                      type="email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="이메일을 입력하세요"
                      required
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-600 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        전송 중...
                      </span>
                    ) : (
                      "인증 코드 받기"
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600">
                      <strong>{otpEmail}</strong>로<br />
                      전송된 6자리 코드를 입력하세요.
                    </p>
                  </div>
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full h-14 px-4 rounded-lg border border-gray-200 text-center text-2xl font-bold tracking-[0.5em] text-gray-900 placeholder:text-gray-300 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || emailOtp.length !== 6}
                    className="w-full h-12 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-600 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        확인 중...
                      </span>
                    ) : (
                      "인증하기"
                    )}
                  </button>

                  <div className="flex justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmailOtpSent(false)
                        setEmailOtp("")
                      }}
                      className="text-gray-500 hover:underline"
                    >
                      ← 이메일 변경
                    </button>
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={isLoading}
                      className="text-purple-600 hover:underline disabled:opacity-50"
                    >
                      코드 재전송
                    </button>
                  </div>
                </form>
              )}

              <div className="text-center pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView("login")
                    setIsEmailOtpSent(false)
                    setEmailOtp("")
                    setOtpEmail("")
                    setError("")
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← 다른 방법으로 로그인
                </button>
              </div>
            </div>
          )}

          {/* 휴대폰 OTP 폼 */}
          {currentView === "phone-otp" && (
            <div className="space-y-4">
              {!isPhoneOtpSent ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      휴대폰 번호
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="010-1234-5678"
                      required
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        전송 중...
                      </span>
                    ) : (
                      "인증 코드 받기"
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600">
                      <strong>{phoneNumber}</strong>로<br />
                      전송된 6자리 코드를 입력하세요.
                    </p>
                  </div>
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full h-14 px-4 rounded-lg border border-gray-200 text-center text-2xl font-bold tracking-[0.5em] text-gray-900 placeholder:text-gray-300 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || phoneOtp.length !== 6}
                    className="w-full h-12 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        확인 중...
                      </span>
                    ) : (
                      "인증하기"
                    )}
                  </button>

                  <div className="flex justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPhoneOtpSent(false)
                        setPhoneOtp("")
                      }}
                      className="text-gray-500 hover:underline"
                    >
                      ← 번호 변경
                    </button>
                    <button
                      type="button"
                      onClick={handleSendPhoneOtp}
                      disabled={isLoading}
                      className="text-orange-600 hover:underline disabled:opacity-50"
                    >
                      코드 재전송
                    </button>
                  </div>
                </form>
              )}

              <div className="text-center pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView("login")
                    setIsPhoneOtpSent(false)
                    setPhoneOtp("")
                    setPhoneNumber("")
                    setError("")
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← 다른 방법으로 로그인
                </button>
              </div>
            </div>
          )}

          {/* 비밀번호 재설정 폼 */}
          {currentView === "forgot-password" && (
            <div className="space-y-4">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{success}</p>
                  <p className="text-sm text-gray-500 mt-2">잠시 후 로그인 화면으로 이동합니다...</p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이메일 주소 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="가입하신 이메일을 입력하세요"
                      required
                      className="w-full h-12 px-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        전송 중...
                      </span>
                    ) : (
                      "재설정 링크 보내기"
                    )}
                  </button>

                  <div className="text-center pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setCurrentView("login")}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← 로그인으로 돌아가기
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

