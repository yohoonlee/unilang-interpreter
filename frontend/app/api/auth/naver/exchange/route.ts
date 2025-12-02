import { NextRequest, NextResponse } from 'next/server'

interface NaverTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  error?: string
  error_description?: string
}

interface NaverUserInfo {
  resultcode: string
  message: string
  response: {
    id: string
    email: string
    name: string
    nickname?: string
    profile_image?: string
    age?: string
    gender?: string
    birthday?: string
    mobile?: string
  }
}

export async function GET(request: NextRequest) {
  console.log('🔄 [Naver Exchange] 토큰 교환 API 시작')
  
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    console.error('❌ [Naver Exchange] code 누락')
    return NextResponse.json({ success: false, error: 'code 누락' }, { status: 400 })
  }

  try {
    // 1. Authorization Code를 Access Token으로 교환
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID!
    const clientSecret = process.env.NAVER_CLIENT_SECRET!
    
    if (!clientId || !clientSecret) {
      console.error('❌ [Naver Exchange] 환경 변수 누락')
      console.error('Client ID:', clientId ? '있음' : '없음')
      console.error('Client Secret:', clientSecret ? '있음' : '없음')
      return NextResponse.json({ 
        success: false, 
        error: '서버 설정 오류: 환경 변수 누락' 
      }, { status: 500 })
    }
    
    // 토큰 교환 시 redirect_uri는 인증 시와 정확히 동일해야 함!
    const origin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const redirectUri = `${origin}/auth/naver/callback`
    
    // 토큰 교환 파라미터 생성
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    })
    
    // state가 있으면 추가
    if (state) {
      tokenParams.append('state', state)
    }

    console.log('🔄 [Naver Exchange] 토큰 요청 중...')
    console.log('🔑 [Naver Exchange] Origin:', origin)
    console.log('🔑 [Naver Exchange] Redirect URI:', redirectUri)

    const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ [Naver Exchange] 토큰 교환 실패:', errorText)
      return NextResponse.json({ success: false, error: '토큰 교환 실패' }, { status: 400 })
    }

    const tokenData: NaverTokenResponse = await tokenResponse.json()

    if (tokenData.error) {
      console.error('❌ [Naver Exchange] 토큰 응답 에러:', tokenData.error)
      console.error('❌ [Naver Exchange] 에러 설명:', tokenData.error_description)
      return NextResponse.json({ 
        success: false, 
        error: tokenData.error_description || tokenData.error 
      }, { status: 400 })
    }

    console.log('✅ [Naver Exchange] 토큰 획득 성공')

    // 2. Access Token으로 사용자 정보 가져오기
    console.log('👤 [Naver Exchange] 사용자 정보 요청...')
    
    const userResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('❌ [Naver Exchange] 사용자 정보 조회 실패:', errorText)
      return NextResponse.json({ success: false, error: '사용자 정보 조회 실패' }, { status: 400 })
    }

    const userData: NaverUserInfo = await userResponse.json()

    if (userData.resultcode !== '00') {
      console.error('❌ [Naver Exchange] API 응답 에러:', userData.message)
      return NextResponse.json({ success: false, error: userData.message }, { status: 400 })
    }

    if (!userData.response?.email) {
      console.error('❌ [Naver Exchange] 이메일 정보 없음')
      return NextResponse.json({ success: false, error: '이메일 정보 없음' }, { status: 400 })
    }

    console.log('✅ [Naver Exchange] 사용자 정보 획득:', userData.response.email)

    // 3. 사용자 정보 반환
    return NextResponse.json({
      success: true,
      user: {
        id: userData.response.id,
        email: userData.response.email,
        name: userData.response.name,
        nickname: userData.response.nickname || userData.response.name,
        profile_image: userData.response.profile_image,
      }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '내부 오류'
    console.error('❌ [Naver Exchange] 처리 중 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: errorMessage
    }, { status: 500 })
  }
}


