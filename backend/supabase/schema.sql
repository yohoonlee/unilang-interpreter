-- =============================================
-- UniLang Interpreter - Supabase Database Schema
-- =============================================
-- Supabase SQL Editor에서 실행하세요

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM Types
-- =============================================

-- 화상회의 플랫폼
CREATE TYPE platform_type AS ENUM ('zoom', 'teams', 'meet', 'webex');

-- 회의 상태
CREATE TYPE meeting_status AS ENUM ('scheduled', 'active', 'ended', 'cancelled');

-- 참여자 역할
CREATE TYPE participant_role AS ENUM ('host', 'co_host', 'participant', 'interpreter');

-- =============================================
-- Tables
-- =============================================

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    preferred_language VARCHAR(10) DEFAULT 'ko',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 회의 테이블
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    platform platform_type NOT NULL,
    platform_meeting_id VARCHAR(255),
    platform_meeting_url TEXT,
    status meeting_status DEFAULT 'scheduled',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 참여자 테이블
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role participant_role DEFAULT 'participant',
    preferred_language VARCHAR(10) NOT NULL,
    platform_participant_id VARCHAR(255),
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(meeting_id, email)
);

-- 발화 기록 테이블
CREATE TABLE IF NOT EXISTS utterances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    speaker_name VARCHAR(255),
    original_language VARCHAR(10) NOT NULL,
    original_text TEXT NOT NULL,
    audio_url TEXT,
    audio_duration_ms INTEGER,
    confidence DECIMAL(5, 4),
    timestamp TIMESTAMPTZ NOT NULL,
    sequence_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 번역 테이블
CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utterance_id UUID REFERENCES utterances(id) ON DELETE CASCADE,
    target_language VARCHAR(10) NOT NULL,
    translated_text TEXT NOT NULL,
    translation_engine VARCHAR(50) DEFAULT 'google',
    confidence DECIMAL(5, 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(utterance_id, target_language)
);

-- 회의 요약 테이블
CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL,
    summary_text TEXT NOT NULL,
    key_points JSONB DEFAULT '[]',
    action_items JSONB DEFAULT '[]',
    decisions JSONB DEFAULT '[]',
    ai_model VARCHAR(100) DEFAULT 'gemini-pro',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(meeting_id, language)
);

-- API 연결 정보 테이블 (사용자별 OAuth 토큰 등)
CREATE TABLE IF NOT EXISTS platform_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    platform_user_id VARCHAR(255),
    platform_email VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, platform)
);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_meetings_created_by ON meetings(created_by);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_platform ON meetings(platform);
CREATE INDEX idx_meetings_scheduled_start ON meetings(scheduled_start);

CREATE INDEX idx_participants_meeting_id ON participants(meeting_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);
CREATE INDEX idx_participants_is_active ON participants(is_active);

CREATE INDEX idx_utterances_meeting_id ON utterances(meeting_id);
CREATE INDEX idx_utterances_participant_id ON utterances(participant_id);
CREATE INDEX idx_utterances_timestamp ON utterances(timestamp);

CREATE INDEX idx_translations_utterance_id ON translations(utterance_id);
CREATE INDEX idx_translations_target_language ON translations(target_language);

CREATE INDEX idx_summaries_meeting_id ON summaries(meeting_id);
CREATE INDEX idx_summaries_language ON summaries(language);

CREATE INDEX idx_platform_connections_user_id ON platform_connections(user_id);

-- =============================================
-- Functions
-- =============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- Triggers
-- =============================================

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at
    BEFORE UPDATE ON summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_connections_updated_at
    BEFORE UPDATE ON platform_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for meetings
CREATE POLICY "Users can view meetings they created or participate in"
    ON meetings FOR SELECT
    USING (
        created_by = auth.uid() OR
        id IN (
            SELECT meeting_id FROM participants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create meetings"
    ON meetings FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own meetings"
    ON meetings FOR UPDATE
    USING (created_by = auth.uid());

-- RLS Policies for participants
CREATE POLICY "Users can view participants of their meetings"
    ON participants FOR SELECT
    USING (
        meeting_id IN (
            SELECT id FROM meetings WHERE created_by = auth.uid()
        ) OR user_id = auth.uid()
    );

-- RLS Policies for utterances
CREATE POLICY "Users can view utterances of their meetings"
    ON utterances FOR SELECT
    USING (
        meeting_id IN (
            SELECT id FROM meetings WHERE created_by = auth.uid()
            UNION
            SELECT meeting_id FROM participants WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for translations
CREATE POLICY "Users can view translations of their meetings"
    ON translations FOR SELECT
    USING (
        utterance_id IN (
            SELECT id FROM utterances WHERE meeting_id IN (
                SELECT id FROM meetings WHERE created_by = auth.uid()
                UNION
                SELECT meeting_id FROM participants WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for summaries
CREATE POLICY "Users can view summaries of their meetings"
    ON summaries FOR SELECT
    USING (
        meeting_id IN (
            SELECT id FROM meetings WHERE created_by = auth.uid()
            UNION
            SELECT meeting_id FROM participants WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for platform_connections
CREATE POLICY "Users can manage own platform connections"
    ON platform_connections FOR ALL
    USING (user_id = auth.uid());

-- =============================================
-- Service Role Bypass (백엔드 서버용)
-- =============================================
-- 참고: 백엔드에서 service_role 키를 사용하면 RLS를 우회합니다.

-- =============================================
-- Realtime Subscriptions 활성화
-- =============================================

-- 실시간 자막을 위한 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE utterances;
ALTER PUBLICATION supabase_realtime ADD TABLE translations;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;












