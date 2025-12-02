import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔍 [Naver Callback API] /api/auth/naver/callback 호출됨')
  console.log('🔄 [Naver Callback API] 클라이언트 페이지로 리디렉션')
  
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // 클라이언트 사이드 페이지로 리디렉션 (모든 파라미터 전달)
  const params = new URLSearchParams()
  if (code) params.set('code', code)
  if (state) params.set('state', state)
  if (error) params.set('error', error)

  const redirectUrl = new URL(`/auth/naver/callback?${params.toString()}`, request.url)
  console.log('➡️ [Naver Callback API] 리디렉션 URL:', redirectUrl.toString())
  
  return NextResponse.redirect(redirectUrl)
}






