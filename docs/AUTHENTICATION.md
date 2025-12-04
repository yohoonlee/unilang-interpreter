# UniLang 통합 인증 시스템 문서

## 개요

UniLang은 다양한 인증 방식을 지원하여 사용자가 편리하게 서비스에 접근할 수 있도록 합니다.

---

## 지원 인증 방식

| 인증 방식 | Provider | 상태 | 비고 |
|----------|----------|------|------|
| 이메일/비밀번호 | Supabase Auth | ✅ 완료 | 기본 인증 |
| Google | Supabase OAuth | ✅ 완료 | 네이티브 지원 |
| Kakao | Supabase OAuth | ✅ 완료 | 네이티브 지원 |
| Naver | Custom OAuth | ✅ 완료 | 커스텀 구현 |
| LinkedIn | Supabase OIDC | ✅ 완료 | OpenID Connect |
| 휴대폰 SMS | Twilio + Supabase | ✅ 완료 | OTP 인증 |
| 이메일 OTP | Supabase Auth | ✅ 완료 | Magic Link |

---

## 인증 흐름

### 1. 이메일/비밀번호 로그인

```
사용자 → 이메일/비밀번호 입력 → Supabase Auth → 세션 생성 → 로그인 완료
```

### 2. 소셜 로그인 (Google, Kakao, LinkedIn)

```
사용자 → 소셜 버튼 클릭 → OAuth Provider 인증 
    → Supabase Callback → 세션 생성 → 로그인 완료
```

### 3. 네이버 로그인 (커스텀)

```
사용자 → 네이버 버튼 클릭 → Naver OAuth 인증 
    → 커스텀 Callback → 사용자 정보 조회 
    → Supabase 회원가입/로그인 → 세션 생성 → 로그인 완료
```

### 4. 휴대폰 OTP 로그인

```
사용자 → 휴대폰 번호 입력 → Twilio SMS 발송 
    → OTP 입력 → Supabase 검증 → 세션 생성 → 로그인 완료
```

---

## 환경 변수 설정

### Vercel 환경변수

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | ✅ |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | ✅ |
| `NEXT_PUBLIC_NAVER_CLIENT_ID` | Naver OAuth Client ID | ✅ |
| `NAVER_CLIENT_SECRET` | Naver OAuth Client Secret | ✅ |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | Google Cloud API Key (STT/Translation) | ✅ |

---

## Provider별 설정 가이드

### 1. Google OAuth

#### Google Cloud Console 설정
1. https://console.cloud.google.com 접속
2. 프로젝트 선택/생성
3. API 및 서비스 → OAuth 동의 화면 설정
4. API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 ID 생성
5. 애플리케이션 유형: **웹 애플리케이션**
6. 승인된 리디렉션 URI:
   ```
   https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/auth/v1/callback
   ```

#### Supabase 설정
1. Authentication → Providers → Google
2. Client ID / Client Secret 입력
3. 활성화

#### 테스트 모드 주의사항
- 테스트 모드에서는 등록된 테스트 사용자만 로그인 가능
- Google Cloud Console → 대상 → 테스트 사용자 추가

---

### 2. Kakao OAuth

#### Kakao Developers 설정
1. https://developers.kakao.com 접속
2. 내 애플리케이션 → 애플리케이션 추가하기
3. 앱 설정 → 플랫폼 → Web 플랫폼 등록
   - 사이트 도메인: `https://frontend-lime-eight-18.vercel.app`
4. 제품 설정 → 카카오 로그인 활성화
5. Redirect URI 등록:
   ```
   https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/auth/v1/callback
   ```
6. 동의항목 설정:
   - 닉네임: 필수 동의
   - 카카오계정(이메일): 필수 동의
7. 보안 → Client Secret 생성

#### Supabase 설정
1. Authentication → Providers → Kakao
2. REST API Key / Client Secret 입력
3. 활성화

---

### 3. Naver OAuth (커스텀 구현)

#### Naver Developers 설정
1. https://developers.naver.com 접속
2. Application → 애플리케이션 등록
3. 사용 API: 네아로(네이버 로그인)
4. 환경: PC웹
5. 서비스 URL: `https://frontend-lime-eight-18.vercel.app`
6. Callback URL:
   ```
   https://frontend-lime-eight-18.vercel.app/auth/naver/callback
   ```

#### 커스텀 구현 파일
- `lib/naver-oauth.ts` - OAuth 유틸리티
- `app/auth/naver/callback/page.tsx` - 클라이언트 콜백
- `app/api/auth/naver/exchange/route.ts` - 토큰 교환
- `app/api/auth/naver/signup/route.ts` - 회원가입/로그인

#### 인증 흐름
```typescript
// 1. 인증 URL 생성
const authUrl = `https://nid.naver.com/oauth2.0/authorize?
  response_type=code&
  client_id=${clientId}&
  redirect_uri=${redirectUri}&
  state=${state}`

// 2. Callback에서 코드 수신
// 3. 코드 → 토큰 교환 (서버)
// 4. 토큰으로 사용자 정보 조회
// 5. Supabase에 사용자 생성/로그인
```

---

### 4. LinkedIn OAuth (OIDC)

#### LinkedIn Developers 설정
1. https://www.linkedin.com/developers/apps 접속
2. Create App
3. App settings:
   - App name: UniLang
   - LinkedIn Page: 연결할 회사 페이지
   - Privacy policy URL: `https://frontend-lime-eight-18.vercel.app/privacy`
4. Auth 탭:
   - Authorized redirect URLs:
     ```
     https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/auth/v1/callback
     ```
5. Products 탭:
   - "Sign In with LinkedIn using OpenID Connect" 추가

#### Supabase 설정
1. Authentication → Providers → LinkedIn (OIDC)
2. API Key / API Secret Key 입력
3. 활성화

#### OAuth 2.0 Scopes
- openid
- profile
- email

---

### 5. 휴대폰 SMS 인증 (Twilio)

#### Twilio 설정
1. https://www.twilio.com 계정 생성
2. Console에서 확인:
   - Account SID
   - Auth Token
3. Phone Numbers → 번호 구매
4. Messaging → Services 생성
5. Verify → Services 생성

#### Supabase 설정
1. Authentication → Providers → Phone
2. SMS Provider: Twilio 선택
3. 입력:
   - Twilio Account SID
   - Twilio Auth Token
   - Twilio Message Service SID

#### Trial 계정 제한
- 인증된 번호로만 SMS 발송 가능
- Phone Numbers → Verified Caller IDs에서 번호 등록 필요

---

## Supabase URL Configuration

### Site URL
```
https://frontend-lime-eight-18.vercel.app
```

### Redirect URLs
```
https://frontend-lime-eight-18.vercel.app/**
```

---

## 콜백 URL 정리

| Provider | Callback URL |
|----------|--------------|
| Google | `https://[SUPABASE_ID].supabase.co/auth/v1/callback` |
| Kakao | `https://[SUPABASE_ID].supabase.co/auth/v1/callback` |
| LinkedIn | `https://[SUPABASE_ID].supabase.co/auth/v1/callback` |
| Naver | `https://frontend-lime-eight-18.vercel.app/auth/naver/callback` |

> 현재 Supabase Project ID: `ihqcklsrmmxdawffcapy`

---

## 데이터베이스 스키마

### profiles 테이블

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    phone TEXT,
    plan TEXT DEFAULT 'free',
    auth_provider TEXT, -- google, kakao, naver, linkedin, email, phone
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
```

### 자동 프로필 생성 트리거

새 사용자가 가입하면 자동으로 `profiles` 테이블에 레코드가 생성됩니다.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_url, auth_provider)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 프론트엔드 구현

### 인증 모달 컴포넌트
- `components/auth/auth-modal.tsx`

### Supabase 클라이언트
- `lib/supabase/client.ts` - 클라이언트 사이드
- `lib/supabase/server.ts` - 서버 사이드

### 인증 콜백 페이지
- `app/auth/callback/route.ts` - 일반 OAuth 콜백
- `app/auth/naver/callback/page.tsx` - 네이버 콜백
- `app/auth/reset-password/page.tsx` - 비밀번호 재설정

---

## 보안 고려사항

### 1. 환경 변수
- 민감한 키는 `NEXT_PUBLIC_` 접두사 없이 서버에서만 사용
- Vercel에서 모든 환경(Production, Preview, Development)에 설정

### 2. RLS (Row Level Security)
- 모든 테이블에 RLS 활성화
- 사용자는 자신의 데이터만 접근 가능

### 3. API 키 제한
- Google API 키: 특정 도메인에서만 사용 가능하도록 제한
- 웹사이트 리퍼러 제한 설정

---

## 문제 해결

### Google 로그인 오류: redirect_uri_mismatch
- Google Cloud Console의 승인된 리디렉션 URI 확인
- Supabase Callback URL과 일치해야 함

### Kakao 로그인 오류
- 동의항목에서 "카카오계정(이메일)" 필수 동의 설정 확인
- Client Secret 활성화 확인

### Naver 로그인 오류
- Callback URL이 정확히 일치하는지 확인
- 애플리케이션 상태가 "개발 중"인 경우 등록된 테스터만 이용 가능

### LinkedIn 로그인 오류
- "Sign In with LinkedIn using OpenID Connect" 제품 추가 확인
- OAuth 2.0 scopes (openid, profile, email) 확인

### SMS 인증 오류
- Twilio Trial 계정: Verified Caller IDs에 번호 등록 필요
- Messaging Service에 전화번호 연결 확인

---

## 참고 링크

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Google OAuth 설정](https://console.cloud.google.com)
- [Kakao Developers](https://developers.kakao.com)
- [Naver Developers](https://developers.naver.com)
- [LinkedIn Developers](https://www.linkedin.com/developers)
- [Twilio Console](https://console.twilio.com)

---

## 버전 정보

- 문서 작성일: 2025년 12월 1일
- Supabase Project ID: `ihqcklsrmmxdawffcapy`
- Frontend URL: `https://frontend-lime-eight-18.vercel.app`










