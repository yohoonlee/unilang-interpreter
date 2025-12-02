import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  console.log('🆕 [Naver Signup API] 시작')
  
  try {
    const body = await request.json()
    const { email, password, user_metadata } = body

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email and password required' 
      }, { status: 400 })
    }

    // Supabase Admin Client (이메일 인증 우회 가능)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin 권한
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔐 [Naver Signup API] Admin으로 사용자 생성...')
    console.log('📧 [Naver Signup API] Email:', email)

    // Admin API로 사용자 생성 (이메일 인증 자동 완료)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 자동 완료
      user_metadata,
    })

    if (error) {
      // ✅ 이미 존재하는 사용자인 경우 - 비밀번호 업데이트!
      if (error.message && (
        error.message.includes('already been registered') || 
        error.message.includes('User already registered') ||
        error.message.includes('already registered')
      )) {
        console.log('✅ [Naver Signup API] 기존 사용자 발견 - 비밀번호 업데이트 시도...')
        console.log('📧 [Naver Signup API] Email:', email)
        
        try {
          // 1. 이메일로 사용자 ID 찾기
          const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
          
          if (listError) {
            console.error('❌ [Naver Signup API] 사용자 목록 조회 실패:', listError)
            throw listError
          }
          
          const existingUser = users.users.find(u => u.email === email)
          
          if (!existingUser) {
            console.error('❌ [Naver Signup API] 사용자를 찾을 수 없음:', email)
            throw new Error('User not found')
          }
          
          console.log('🔍 [Naver Signup API] 기존 사용자 ID:', existingUser.id)
          
          // 2. 비밀번호를 통합 비밀번호로 업데이트
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            { password }
          )
          
          if (updateError) {
            console.error('❌ [Naver Signup API] 비밀번호 업데이트 실패:', updateError)
            throw updateError
          }
          
          console.log('✅ [Naver Signup API] 비밀번호 업데이트 성공!')
          
          // ✅ 비밀번호 업데이트 완료 - 클라이언트에서 로그인 처리
          return NextResponse.json({ 
            success: true,
            existingUser: true,
            passwordUpdated: true,
            message: 'Existing user - password updated, proceed with login'
          })
        } catch (updateErr: unknown) {
          const errorMessage = updateErr instanceof Error ? updateErr.message : 'Unknown error'
          console.error('❌ [Naver Signup API] 비밀번호 업데이트 중 오류:', updateErr)
          return NextResponse.json({ 
            success: false, 
            error: `Password update failed: ${errorMessage}` 
          }, { status: 500 })
        }
      }
      
      console.error('❌ [Naver Signup API] 사용자 생성 실패:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 400 })
    }

    console.log('✅ [Naver Signup API] 신규 사용자 생성 성공:', data.user.email)

    return NextResponse.json({ 
      success: true,
      existingUser: false, // 신규 사용자
      user: data.user 
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('❌ [Naver Signup API] 처리 중 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: errorMessage
    }, { status: 500 })
  }
}






