# 인증 설정 가이드

> **8가지 인증 방식**: 이메일, 휴대폰, Google, Apple, Kakao, Naver, Facebook(Instagram), LinkedIn

---

## 📋 목차

1. [Supabase 기본 설정](#supabase-기본-설정)
2. [이메일/비밀번호 인증](#이메일비밀번호-인증)
3. [휴대폰 번호 인증 (SMS OTP)](#휴대폰-번호-인증-sms-otp)
4. [Google OAuth](#google-oauth)
5. [Apple OAuth](#apple-oauth)
6. [Kakao OAuth](#kakao-oauth)
7. [Naver OAuth](#naver-oauth)
8. [Facebook OAuth](#facebook-oauth)
9. [LinkedIn OAuth](#linkedin-oauth)
10. [환경 변수 설정](#환경-변수-설정)

---

## Supabase 기본 설정

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인
2. 새 프로젝트 생성
3. 프로젝트 URL과 anon key 복사

### 2. 기본 환경 변수

```.env.local
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 이메일/비밀번호 인증

### Supabase 설정

1. Supabase Dashboard → Authentication → Providers
2. **Email** 활성화
3. **Confirm email** 옵션 설정:
   - ✅ Enable email confirmations (프로덕션)
   - ❌ Disable (개발 환경)

### 사용 방법

```typescript
// 회원가입
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
})

// 로그인
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
})
```

---

## 휴대폰 번호 인증 (SMS OTP)

### 1. Twilio 설정

1. [Twilio](https://www.twilio.com) 계정 생성
2. Phone Number 구매
3. Credentials 복사:
   - Account SID
   - Auth Token
   - Phone Number

### 2. Supabase 설정

1. Supabase Dashboard → Authentication → Providers
2. **Phone** 활성화
3. Twilio 정보 입력:
   - Account SID
   - Auth Token
   - Message Service SID (선택)

### 3. 환경 변수

```.env.local
# Twilio (SMS)
NEXT_PUBLIC_TWILIO_ACCOUNT_SID=AC...
NEXT_PUBLIC_TWILIO_AUTH_TOKEN=...
NEXT_PUBLIC_TWILIO_PHONE_NUMBER=+1234567890
```

### 사용 방법

```typescript
// OTP 발송
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+821012345678',
})

// OTP 확인
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+821012345678',
  token: '123456',
  type: 'sms',
})
```

---

## Google OAuth

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services** → **OAuth consent screen**
   - User Type: External
   - App name, User support email, Developer contact 입력
4. **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     https://your-project.supabase.co/auth/v1/callback
     https://studio.hiclever.com/auth/callback
     ```
5. Client ID와 Client Secret 복사

### 2. Supabase 설정

1. Supabase Dashboard → Authentication → Providers
2. **Google** 활성화
3. Google Client ID와 Client Secret 입력

### 3. 환경 변수

```.env.local
# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## Apple OAuth

### 1. Apple Developer 설정

1. [Apple Developer](https://developer.apple.com) 계정
2. **Certificates, Identifiers & Profiles**
3. **Identifiers** → **App IDs** → 새 App ID 생성
   - Sign in with Apple 활성화
4. **Services IDs** 생성
   - Return URLs:
     ```
     https://your-project.supabase.co/auth/v1/callback
     https://studio.hiclever.com/auth/callback
     ```
5. **Keys** 생성 (Sign in with Apple)
   - Key ID와 .p8 파일 다운로드

### 2. Supabase 설정

1. Supabase Dashboard → Authentication → Providers
2. **Apple** 활성화
3. Services ID, Team ID, Key ID 입력
4. .p8 파일 내용 복사하여 Secret Key에 입력

### 3. 환경 변수

```.env.local
# Apple OAuth
NEXT_PUBLIC_APPLE_CLIENT_ID=com.hiclever.studio
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

---

## Kakao OAuth

### 1. Kakao Developers 설정

1. [Kakao Developers](https://developers.kakao.com) 로그인
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. **앱 설정** → **플랫폼**
   - Web 플랫폼 추가
   - 사이트 도메인: `https://studio.hiclever.com`
4. **제품 설정** → **카카오 로그인**
   - 활성화 설정: ON
   - Redirect URI 추가:
     ```
     https://your-project.supabase.co/auth/v1/callback
     https://studio.hiclever.com/auth/callback
     ```
5. **앱 키** → REST API 키 복사

### 2. Supabase 설정

1. Supabase Dashboard → Authentication → Providers
2. **Kakao** 활성화 (없으면 Custom OAuth 사용)
3. Client ID (REST API 키) 입력

### 3. 환경 변수

```.env.local
# Kakao OAuth
NEXT_PUBLIC_KAKAO_CLIENT_ID=your-rest-api-key
KAKAO_CLIENT_SECRET=your-client-secret (선택)
```

---

## Naver OAuth

### 1. Naver Developers 설정

1. [Naver Developers](https://developers.naver.com) 로그인
2. **Application** → **애플리케이션 등록**
3. 애플리케이션 정보 입력:
   - 애플리케이션 이름
   - 사용 API: 네이버 로그인
   - 제공 정보: 이메일, 닉네임, 프로필 사진
   - 서비스 URL: `https://studio.hiclever.com`
   - Callback URL:
     ```
     https://your-project.supabase.co/auth/v1/callback
     https://studio.hiclever.com/auth/callback
     ```
4. Client ID와 Client Secret 복사

### 2. Supabase Custom OAuth 설정

Supabase에서 네이버는 기본 지원하지 않으므로 **Custom OAuth Provider** 설정:

1. Supabase Dashboard → Authentication → URL Configuration
2. Site URL: `https://studio.hiclever.com`
3. Redirect URLs 추가

### 3. API 라우트 구현 필요

`app/api/auth/naver/route.ts`:

```typescript
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!code) {
    // 네이버 로그인 페이지로 리다이렉트
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/naver/callback`
    )}&state=${state || "random_state"}`
    
    return NextResponse.redirect(naverAuthUrl)
  }

  // 토큰 교환 및 사용자 정보 조회
  // ...
}
```

### 4. 환경 변수

```.env.local
# Naver OAuth
NEXT_PUBLIC_NAVER_CLIENT_ID=your-client-id
NAVER_CLIENT_SECRET=your-client-secret
```

---

## Facebook OAuth

### 1. Facebook Developers 설정

1. [Facebook Developers](https://developers.facebook.com) 로그인
2. **내 앱** → **앱 만들기**
3. 앱 유형: **소비자**
4. **설정** → **기본 설정**
   - 앱 도메인: `studio.hiclever.com`
5. **Facebook 로그인** → **설정**
   - 유효한 OAuth 리디렉션 URI:
     ```
     https://your-project.supabase.co/auth/v1/callback
     https://studio.hiclever.com/auth/callback
     ```
6. **설정** → **기본 설정**
   - 앱 ID와 앱 시크릿 복사

### 2. Supabase 설정

1. Supabase Dashboard → Authentication → Providers
2. **Facebook** 활성화
3. Client ID (앱 ID)와 Client Secret (앱 시크릿) 입력

### 3. 환경 변수

```.env.local
# Facebook OAuth (Instagram 포함)
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=your-app-id
FACEBOOK_CLIENT_SECRET=your-app-secret
```

---

## LinkedIn OAuth

### 1. LinkedIn Developers 설정

1. [LinkedIn Developers](https://www.linkedin.com/developers) 로그인
2. **Create app**
3. 앱 정보 입력:
   - App name
   - LinkedIn Page (회사 페이지 필요)
   - App logo
4. **Auth** 탭
   - Authorized redirect URLs:
     ```
     https://your-project.supabase.co/auth/v1/callback
     https://studio.hiclever.com/auth/callback
     ```
5. **Products** 탭
   - **Sign In with LinkedIn** 활성화
6. **Auth** 탭에서 Client ID와 Client Secret 복사

### 2. Supabase 설정

1. Supabase Dashboard → Authentication → Providers
2. **LinkedIn** 또는 **Azure** 활성화
3. Client ID와 Client Secret 입력

### 3. 환경 변수

```.env.local
# LinkedIn OAuth
NEXT_PUBLIC_LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
```

---

## 환경 변수 설정

### 전체 `.env.local` 템플릿

```bash
# ==========================================
# Supabase
# ==========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ==========================================
# Site Configuration
# ==========================================
NEXT_PUBLIC_SITE_URL=https://studio.hiclever.com
# Development: http://localhost:3000

# ==========================================
# Email/Password (Supabase 기본 제공)
# ==========================================
# 별도 설정 불필요

# ==========================================
# Phone (SMS OTP)
# ==========================================
NEXT_PUBLIC_TWILIO_ACCOUNT_SID=AC...
NEXT_PUBLIC_TWILIO_AUTH_TOKEN=...
NEXT_PUBLIC_TWILIO_PHONE_NUMBER=+1234567890

# ==========================================
# Google OAuth
# ==========================================
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# ==========================================
# Apple OAuth
# ==========================================
NEXT_PUBLIC_APPLE_CLIENT_ID=com.hiclever.studio
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# ==========================================
# Kakao OAuth
# ==========================================
NEXT_PUBLIC_KAKAO_CLIENT_ID=your-rest-api-key
KAKAO_CLIENT_SECRET=your-client-secret

# ==========================================
# Naver OAuth
# ==========================================
NEXT_PUBLIC_NAVER_CLIENT_ID=your-client-id
NAVER_CLIENT_SECRET=your-client-secret

# ==========================================
# Facebook OAuth (Instagram 포함)
# ==========================================
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=your-app-id
FACEBOOK_CLIENT_SECRET=your-app-secret

# ==========================================
# LinkedIn OAuth
# ==========================================
NEXT_PUBLIC_LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
```

---

## 사용 방법

### 1. 컴포넌트에서 Auth Modal 사용

```typescript
import { AuthModal } from "@/components/auth/auth-modal"
import { useState } from "react"

export function YourComponent() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsAuthModalOpen(true)}>
        로그인
      </button>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultView="phone" // 또는 "email"
      />
    </>
  )
}
```

### 2. 사용자 세션 확인

```typescript
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

export function useAuth() {
  const [user, setUser] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // 인증 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user }
}
```

---

## 테스트

### 1. 로컬 테스트

```bash
# 개발 서버 실행
npm run dev

# http://localhost:3000에서 테스트
```

### 2. 각 인증 방식 테스트 체크리스트

- [ ] 이메일/비밀번호 회원가입
- [ ] 이메일/비밀번호 로그인
- [ ] 휴대폰 OTP 발송
- [ ] 휴대폰 OTP 인증
- [ ] Google 로그인
- [ ] Apple 로그인
- [ ] Kakao 로그인
- [ ] Naver 로그인
- [ ] Facebook 로그인
- [ ] LinkedIn 로그인

---

## 트러블슈팅

### 1. Redirect URI mismatch

**증상**: OAuth 로그인 시 "redirect_uri_mismatch" 오류

**해결**:
- 각 OAuth 제공자 설정에서 Redirect URI 확인
- Supabase Redirect URL과 정확히 일치하는지 확인
- `https://your-project.supabase.co/auth/v1/callback` 형식 확인

### 2. SMS 발송 실패

**증상**: 휴대폰 인증 코드가 발송되지 않음

**해결**:
- Twilio 계정 잔액 확인
- 휴대폰 번호 형식 확인 (`+821012345678`)
- Twilio Console에서 Message Logs 확인

### 3. OAuth 제공자 활성화 안 됨

**증상**: Supabase에서 특정 OAuth 제공자가 보이지 않음

**해결**:
- Supabase Dashboard → Authentication → Providers
- 스크롤을 내려서 모든 제공자 확인
- Custom OAuth Provider 사용 (Naver 등)

---

## 관련 문서

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [업스케일 공통모듈 가이드](./UPSCALE_COMMON_MODULE_COMPLETE.md)
- [토큰 무결성 체크 문서](./TOKEN_INTEGRITY_CHECK.md)

---

## 문의

인증 시스템 관련 문의사항은 개발팀에 연락해주세요.

