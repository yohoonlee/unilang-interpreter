import { createBrowserClient, type SupabaseClient } from "@supabase/ssr"

// 환경변수가 없을 때 사용할 더미 클라이언트
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

let client: SupabaseClient | null = null

export function createClient() {
  if (client) return client
  
  client = createBrowserClient(
    SUPABASE_URL, 
    SUPABASE_ANON_KEY,
    {
      auth: {
        // ⚠️ PKCE 비활성화 - 크로스 디바이스 Magic Link를 위해
        // PKCE는 같은 브라우저에서만 작동 (code_verifier 필요)
        // Implicit Flow는 토큰이 URL에 직접 포함됨
        flowType: 'implicit',
      }
    }
  )
  
  return client
}

// 환경변수가 설정되었는지 확인
export function isSupabaseConfigured() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

