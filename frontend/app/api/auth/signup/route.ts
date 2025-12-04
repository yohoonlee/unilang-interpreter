import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "비밀번호는 최소 6자 이상이어야 합니다" }, { status: 400 })
    }

    // Create admin client with service role key to bypass email confirmation
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const foundUser = existingUser.users.find((user) => user.email === email)

    if (foundUser) {
      // 사용자의 메타데이터에서 OAuth 제공자 확인
      const provider = foundUser.user_metadata?.provider
      
      // OAuth 제공자별 안내 메시지
      const providerMessages: Record<string, string> = {
        'google': '이 이메일은 이미 Google로 가입되었습니다.\n아래 Google 버튼으로 로그인해주세요.',
        'kakao': '이 이메일은 이미 Kakao로 가입되었습니다.\n아래 카카오 버튼으로 로그인해주세요.',
        'naver': '이 이메일은 이미 네이버로 가입되었습니다.\n아래 네이버 버튼으로 로그인해주세요.',
      }

      // OAuth로 가입된 경우
      if (provider && providerMessages[provider]) {
        console.log(`[Email Signup] User already exists with ${provider}:`, email)
        return NextResponse.json(
          { 
            error: providerMessages[provider],
            provider: provider // 클라이언트에서 활용 가능
          },
          { status: 400 },
        )
      }

      // 이메일로 가입된 경우 (provider 없음)
      console.log('[Email Signup] User already exists with email/password:', email)
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다. 로그인해주세요." },
        { status: 400 },
      )
    }

    // Create user with auto-confirmed email
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name || '',
      },
    })

    if (error) {
      console.error("[UniLang] Signup error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log("[UniLang] User created successfully with auto-confirmed email:", data.user.id)

    // 생성된 사용자 정보 반환 (클라이언트에서 바로 로그인 가능)
    return NextResponse.json({
      success: true,
      message: "회원가입이 완료되었습니다.",
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })
  } catch (error) {
    console.error("[UniLang] Signup API error:", error)
    return NextResponse.json({ error: "회원가입 중 오류가 발생했습니다" }, { status: 500 })
  }
}










