import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from "next/headers"

// 환경변수가 없을 때 사용할 더미 값
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              maxAge: options?.maxAge || 60 * 60 * 24 * 365, // 1 year
              path: options?.path || "/",
              sameSite: (options?.sameSite as "lax" | "strict" | "none") || "lax",
              secure: options?.secure !== false,
              httpOnly: options?.httpOnly !== false,
            })
          })
        } catch {
          // Server component - cookies might be read-only
        }
      },
    },
  })
}

// Admin client for server-side operations (bypasses RLS)
export function createServerSupabaseAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Alias for consistency
export const createClient = createServerSupabaseClient

