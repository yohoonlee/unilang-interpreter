"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  // 세션 확인 (비밀번호 재설정 링크에서 온 경우)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setIsValidSession(true)
      } else {
        // URL에서 토큰 확인
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        if (accessToken && refreshToken && type === 'recovery') {
          // 토큰으로 세션 설정
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (!error) {
            setIsValidSession(true)
            // URL에서 해시 제거
            window.history.replaceState(null, '', window.location.pathname)
          } else {
            setIsValidSession(false)
            setError("유효하지 않은 링크입니다. 다시 비밀번호 재설정을 요청해주세요.")
          }
        } else {
          setIsValidSession(false)
          setError("유효하지 않은 링크입니다. 다시 비밀번호 재설정을 요청해주세요.")
        }
      }
    }

    checkSession()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.")
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSuccess(true)

      // 3초 후 홈으로 이동
      setTimeout(() => {
        router.push("/")
      }, 3000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 로딩 중
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-emerald-500 to-cyan-500">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-500 mb-4" />
          <p className="text-gray-600">링크 확인 중...</p>
        </div>
      </div>
    )
  }

  // 성공
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-emerald-500 to-cyan-500">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            비밀번호 변경 완료!
          </h1>
          <p className="text-gray-600 mb-4">
            새 비밀번호로 로그인하실 수 있습니다.
          </p>
          <p className="text-sm text-gray-400">
            잠시 후 홈으로 이동합니다...
          </p>
        </div>
      </div>
    )
  }

  // 유효하지 않은 링크
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-emerald-500 to-cyan-500">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            유효하지 않은 링크
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full h-12 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold hover:from-teal-600 hover:to-emerald-600 transition-all"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // 비밀번호 재설정 폼
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-emerald-500 to-cyan-500 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            새 비밀번호 설정
          </h1>
          <p className="text-gray-600">
            새로운 비밀번호를 입력해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              새 비밀번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="새 비밀번호를 입력하세요"
              required
              minLength={6}
              className="w-full h-12 px-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              required
              minLength={6}
              className="w-full h-12 px-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                변경 중...
              </span>
            ) : (
              "비밀번호 변경"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}






