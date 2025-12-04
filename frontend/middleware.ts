import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Supabase 환경변수가 없으면 미들웨어를 건너뛰기
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log("[UniLang] Middleware - Supabase 환경변수가 설정되지 않음, 인증 건너뛰기")
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              maxAge: options?.maxAge || 60 * 60 * 24 * 365, // 1 year
              path: options?.path || "/",
              sameSite: (options?.sameSite as "lax" | "strict" | "none") || "lax",
              secure: options?.secure !== false,
              httpOnly: options?.httpOnly !== false,
            }),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[UniLang] Middleware - User:", user ? user.email : "Not logged in")

  // ✅ 서비스 페이지는 인증 필수
  const protectedPaths = [
    '/service',
  ]

  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath && !user) {
    console.log("[UniLang] Middleware - Redirecting to home (not authenticated)")
    const redirectUrl = new URL('/', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}










