import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const error_description = requestUrl.searchParams.get("error_description")
  const origin = requestUrl.origin

  if (error) {
    console.log("[Auth Callback] Auth error:", error, error_description)
    // 에러 시 홈으로 리다이렉트 (에러 메시지 포함)
    return NextResponse.redirect(
      `${origin}?error=${error}&message=${encodeURIComponent(error_description || "인증 오류가 발생했습니다")}`,
    )
  }

  if (code) {
    console.log("[Auth Callback] Code 감지, 세션 교환 시작:", code.substring(0, 10) + "...")
    
    const supabase = await createServerSupabaseClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("[Auth Callback] 세션 교환 실패:", exchangeError.message)
      // 에러 시 홈으로 리다이렉트
      return NextResponse.redirect(
        `${origin}?error=auth_error&message=${encodeURIComponent(exchangeError.message)}`,
      )
    }

    console.log("[Auth Callback] 세션 교환 성공! 사용자:", data.user?.email)
    
    // ✅ 성공 시 홈으로 리다이렉트 (쿠키 동기화)
    const redirectUrl = new URL(origin)
    redirectUrl.searchParams.set("confirmed", "true")
    const response = NextResponse.redirect(redirectUrl.toString())
    
    // Supabase 쿠키 동기화
    const cookieStore = await cookies()
    cookieStore.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie)
    })
    
    return response
  }

  return NextResponse.redirect(`${origin}`)
}


