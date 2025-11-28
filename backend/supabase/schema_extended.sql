-- =============================================
-- UniLang Interpreter - Extended Schema
-- =============================================
-- 기존 schema.sql 실행 후 이 파일을 실행하세요

-- =============================================
-- 미디어 소스 타입 확장
-- =============================================

-- 미디어 소스 타입 (화상회의 + 영상 + 영상통화)
CREATE TYPE media_source_type AS ENUM (
    -- 화상회의 플랫폼
    'zoom',
    'teams', 
    'meet',
    'webex',
    -- 영상 플랫폼
    'youtube',
    'youtube_live',
    'twitch',
    'vimeo',
    -- 로컬 미디어
    'local_video',
    'local_audio',
    'screen_capture',
    -- 영상통화
    'facetime',
    'skype',
    'discord',
    'kakaotalk',
    'line',
    -- 기타
    'browser_tab',
    'system_audio',
    'microphone'
);

-- 요금제 타입
CREATE TYPE subscription_tier AS ENUM (
    'free',
    'basic',
    'pro',
    'enterprise'
);

-- 과금 상태
CREATE TYPE billing_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded',
    'cancelled'
);

-- =============================================
-- 미디어 세션 테이블 (확장)
-- =============================================

CREATE TABLE IF NOT EXISTS media_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 미디어 소스 정보
    source_type media_source_type NOT NULL,
    source_url TEXT,  -- YouTube URL, 화상회의 URL 등
    source_title VARCHAR(500),
    source_metadata JSONB DEFAULT '{}',
    
    -- 세션 정보
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    
    -- 사용량 추적
    stt_seconds INTEGER DEFAULT 0,
    translation_characters INTEGER DEFAULT 0,
    translation_count INTEGER DEFAULT 0,
    target_languages TEXT[] DEFAULT '{}',
    
    -- 상태
    status VARCHAR(20) DEFAULT 'active',
    
    -- 과금 정보
    is_billed BOOLEAN DEFAULT FALSE,
    billed_amount DECIMAL(10, 2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 구독 및 요금제 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- 요금제 정보
    tier subscription_tier DEFAULT 'free',
    
    -- 구독 기간
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 월간 포함 시간 (분)
    monthly_included_minutes INTEGER DEFAULT 30,
    
    -- 이번 달 사용량 (분)
    current_month_usage_minutes INTEGER DEFAULT 0,
    
    -- 결제 정보
    payment_method JSONB DEFAULT '{}',
    auto_renew BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 사용량 기록 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES media_sessions(id) ON DELETE SET NULL,
    
    -- 사용 유형
    usage_type VARCHAR(50) NOT NULL,  -- 'stt', 'translation', 'summary'
    
    -- 사용량
    quantity DECIMAL(10, 4) NOT NULL,  -- 분, 글자 수 등
    unit VARCHAR(20) NOT NULL,  -- 'minutes', 'characters', 'requests'
    
    -- 비용
    unit_cost DECIMAL(10, 6) NOT NULL,  -- 단위당 원가
    total_cost DECIMAL(10, 4) NOT NULL,  -- 총 원가
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 청구서 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 청구 기간
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    
    -- 금액
    subtotal DECIMAL(10, 2) DEFAULT 0,  -- 기본 요금
    usage_charges DECIMAL(10, 2) DEFAULT 0,  -- 초과 사용 요금
    discount DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    
    -- 통화
    currency VARCHAR(3) DEFAULT 'KRW',
    
    -- 상태
    status billing_status DEFAULT 'pending',
    
    -- 결제 정보
    paid_at TIMESTAMPTZ,
    payment_method JSONB DEFAULT '{}',
    
    -- 상세 내역
    line_items JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 크레딧 테이블 (선불 충전)
-- =============================================

CREATE TABLE IF NOT EXISTS credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 크레딧 정보
    amount DECIMAL(10, 2) NOT NULL,
    remaining DECIMAL(10, 2) NOT NULL,
    
    -- 유효기간
    expires_at TIMESTAMPTZ,
    
    -- 구매 정보
    purchase_price DECIMAL(10, 2),
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 원본/번역 텍스트 저장 테이블 (확장)
-- =============================================

-- 발화 테이블에 컬럼 추가 (이미 존재하는 경우 무시)
ALTER TABLE utterances 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES media_sessions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS source_type media_source_type;

-- 번역 선호 설정 테이블
CREATE TABLE IF NOT EXISTS user_translation_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES media_sessions(id) ON DELETE CASCADE,
    
    -- 표시 설정
    show_original BOOLEAN DEFAULT TRUE,
    original_language VARCHAR(10),
    target_languages TEXT[] DEFAULT '{"ko", "en"}',
    primary_display_language VARCHAR(10) DEFAULT 'ko',
    
    -- 자막 스타일
    subtitle_position VARCHAR(20) DEFAULT 'bottom',
    font_size VARCHAR(10) DEFAULT 'medium',
    show_speaker_name BOOLEAN DEFAULT TRUE,
    show_timestamp BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, session_id)
);

-- =============================================
-- 가격 정책 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS pricing_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 정책 정보
    name VARCHAR(100) NOT NULL,
    tier subscription_tier NOT NULL,
    
    -- 가격 (KRW)
    monthly_price DECIMAL(10, 2) NOT NULL,
    yearly_price DECIMAL(10, 2),
    
    -- 포함량
    included_minutes INTEGER NOT NULL,
    overage_rate_per_minute DECIMAL(10, 2) NOT NULL,
    
    -- 기능
    max_languages INTEGER DEFAULT 3,
    summary_enabled BOOLEAN DEFAULT FALSE,
    api_access BOOLEAN DEFAULT FALSE,
    storage_days INTEGER DEFAULT 7,
    
    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 가격 정책 입력
INSERT INTO pricing_policies (name, tier, monthly_price, yearly_price, included_minutes, overage_rate_per_minute, max_languages, summary_enabled, api_access, storage_days) VALUES
('무료 체험', 'free', 0, 0, 30, 250, 3, FALSE, FALSE, 7),
('베이직', 'basic', 9900, 99000, 300, 200, 5, TRUE, FALSE, 30),
('프로', 'pro', 29900, 299000, 1200, 150, 14, TRUE, TRUE, 90),
('엔터프라이즈', 'enterprise', 0, 0, 999999, 100, 14, TRUE, TRUE, 365)
ON CONFLICT DO NOTHING;

-- =============================================
-- 인덱스
-- =============================================

CREATE INDEX IF NOT EXISTS idx_media_sessions_user_id ON media_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_media_sessions_source_type ON media_sessions(source_type);
CREATE INDEX IF NOT EXISTS idx_media_sessions_started_at ON media_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_session_id ON usage_records(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_recorded_at ON usage_records(recorded_at);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_billing_period ON invoices(billing_period_start, billing_period_end);

CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_expires_at ON credits(expires_at);

-- =============================================
-- 트리거
-- =============================================

CREATE TRIGGER update_media_sessions_updated_at
    BEFORE UPDATE ON media_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS 정책
-- =============================================

ALTER TABLE media_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_translation_preferences ENABLE ROW LEVEL SECURITY;

-- 사용자 본인 데이터만 접근
CREATE POLICY "Users can access own sessions" ON media_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can access own subscription" ON subscriptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can access own usage" ON usage_records FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can access own invoices" ON invoices FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can access own credits" ON credits FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can access own preferences" ON user_translation_preferences FOR ALL USING (user_id = auth.uid());

-- =============================================
-- 실시간 구독 활성화
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE media_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE usage_records;

