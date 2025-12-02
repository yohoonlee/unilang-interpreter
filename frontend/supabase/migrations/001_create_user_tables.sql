-- =====================================================
-- UniLang 사용자 관련 테이블
-- =====================================================

-- 1. 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    phone TEXT,
    
    -- 요금제 정보
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
    plan_started_at TIMESTAMPTZ,
    plan_expires_at TIMESTAMPTZ,
    
    -- 사용량 정보
    monthly_minutes_used INTEGER DEFAULT 0,
    monthly_minutes_limit INTEGER DEFAULT 30, -- 무료: 30분
    
    -- 설정
    preferred_language TEXT DEFAULT 'ko',
    notification_enabled BOOLEAN DEFAULT true,
    
    -- 메타데이터
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- OAuth 제공자 정보
    auth_provider TEXT, -- google, kakao, naver, linkedin, email, phone
    provider_id TEXT
);

-- 2. 로그인 기록 테이블
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 로그인 정보
    login_at TIMESTAMPTZ DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    
    -- 인증 방식
    auth_method TEXT, -- password, google, kakao, naver, linkedin, email_otp, phone_otp
    
    -- 디바이스/위치 정보
    ip_address INET,
    user_agent TEXT,
    device_type TEXT, -- desktop, mobile, tablet
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,
    
    -- 상태
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'blocked')),
    failure_reason TEXT
);

-- 3. 서비스 사용 기록 테이블
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 세션 정보
    session_id UUID,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- 서비스 유형
    service_type TEXT NOT NULL CHECK (service_type IN ('meeting', 'youtube', 'file', 'screen', 'mic')),
    
    -- 미디어 소스 정보
    source_url TEXT,
    source_name TEXT,
    
    -- 언어 설정
    source_language TEXT,
    target_language TEXT,
    
    -- 사용량
    characters_processed INTEGER DEFAULT 0,
    words_translated INTEGER DEFAULT 0,
    
    -- 비용 (원가)
    stt_cost DECIMAL(10, 6) DEFAULT 0, -- Google STT 비용
    translation_cost DECIMAL(10, 6) DEFAULT 0, -- Google Translate 비용
    total_cost DECIMAL(10, 6) DEFAULT 0,
    
    -- 품질 지표
    accuracy_score DECIMAL(3, 2),
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'
);

-- 4. 결제 기록 테이블
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 결제 정보
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'KRW',
    
    -- 요금제
    plan TEXT NOT NULL,
    plan_period TEXT, -- monthly, yearly
    
    -- 결제 상태
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    
    -- 결제 수단
    payment_method TEXT, -- card, bank_transfer, etc.
    payment_provider TEXT, -- toss, kakaopay, etc.
    payment_id TEXT, -- 외부 결제 시스템 ID
    
    -- 날짜
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    
    -- 영수증
    receipt_url TEXT,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'
);

-- 5. 회의 기록 테이블
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 회의 정보
    title TEXT,
    description TEXT,
    
    -- 시간
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- 참가자
    participant_count INTEGER DEFAULT 1,
    
    -- 언어
    source_language TEXT,
    target_languages TEXT[], -- 여러 언어 지원
    
    -- 플랫폼
    platform TEXT, -- zoom, teams, meet, webex, youtube, etc.
    meeting_url TEXT,
    
    -- 상태
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'
);

-- 6. 회의 스크립트 테이블
CREATE TABLE IF NOT EXISTS public.meeting_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 스크립트 내용
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    speaker TEXT,
    original_text TEXT NOT NULL,
    original_language TEXT,
    
    -- 번역
    translated_text TEXT,
    translated_language TEXT,
    
    -- 신뢰도
    confidence DECIMAL(3, 2),
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 인덱스
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON public.login_history(login_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_started_at ON public.usage_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_service_type ON public.usage_logs(service_type);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_started_at ON public.meetings(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting_id ON public.meeting_transcripts(meeting_id);

-- =====================================================
-- 트리거: 새 사용자 등록 시 프로필 자동 생성
-- =====================================================

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

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 트리거: 로그인 시 마지막 로그인 시간 업데이트
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET last_login_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS (Row Level Security) 정책
-- =====================================================

-- profiles 테이블
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- login_history 테이블
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
    ON public.login_history FOR SELECT
    USING (auth.uid() = user_id);

-- usage_logs 테이블
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs"
    ON public.usage_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs"
    ON public.usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- payments 테이블
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id);

-- meetings 테이블
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meetings"
    ON public.meetings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meetings"
    ON public.meetings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings"
    ON public.meetings FOR UPDATE
    USING (auth.uid() = user_id);

-- meeting_transcripts 테이블
ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transcripts"
    ON public.meeting_transcripts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transcripts"
    ON public.meeting_transcripts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 기존 사용자 프로필 마이그레이션 (이미 가입된 사용자용)
-- =====================================================

INSERT INTO public.profiles (id, email, name, avatar_url, auth_provider, created_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
    COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', ''),
    COALESCE(raw_app_meta_data->>'provider', 'email'),
    created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

