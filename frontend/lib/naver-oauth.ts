// Naver OAuth 2.0 구현
// Supabase가 네이버를 지원하지 않으므로 커스텀 구현

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

export class NaverOAuth {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || ''
    this.clientSecret = process.env.NAVER_CLIENT_SECRET || ''
    this.redirectUri = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/auth/naver/callback`
      : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/naver/callback`
    
    if (!this.clientId) {
      console.warn('⚠️ Naver Client ID가 설정되지 않았습니다.')
    }
  }

  // 네이버 로그인 URL 생성
  getAuthorizationUrl(): string {
    const state = this.generateState()
    
    // state를 sessionStorage에 저장 (CSRF 방지)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('naver_oauth_state', state)
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
    })

    return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`
  }

  // 랜덤 state 생성 (CSRF 방지)
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  // Authorization Code를 Access Token으로 교환 (서버 사이드)
  async exchangeCodeForToken(code: string, state: string): Promise<NaverTokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        state: state,
      })

      const response = await fetch('https://nid.naver.com/oauth2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Naver 토큰 교환 실패:', errorText)
        throw new Error('Naver 토큰 교환 실패')
      }

      const data: NaverTokenResponse = await response.json()

      if (data.error) {
        console.error('❌ Naver 토큰 응답 에러:', data.error, data.error_description)
        throw new Error(data.error_description || 'Naver 토큰 교환 실패')
      }

      console.log('✅ Naver 토큰 획득 성공')
      return data
    } catch (error) {
      console.error('❌ Naver 토큰 교환 중 오류:', error)
      throw error
    }
  }

  // Access Token으로 사용자 정보 가져오기
  async getUserInfo(accessToken: string): Promise<NaverUserInfo> {
    try {
      const response = await fetch('https://openapi.naver.com/v1/nid/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Naver 사용자 정보 조회 실패:', errorText)
        throw new Error('Naver 사용자 정보 조회 실패')
      }

      const data: NaverUserInfo = await response.json()

      if (data.resultcode !== '00') {
        console.error('❌ Naver API 오류:', data.message)
        throw new Error(`Naver API 오류: ${data.message}`)
      }

      if (!data.response?.email) {
        throw new Error('Naver 계정에서 이메일 정보를 가져올 수 없습니다.')
      }

      console.log('✅ Naver 사용자 정보 조회 성공:', data.response.email)
      return data
    } catch (error) {
      console.error('❌ Naver 사용자 정보 조회 중 오류:', error)
      throw error
    }
  }
}

// 싱글톤 인스턴스
export const naverOAuth = new NaverOAuth()


