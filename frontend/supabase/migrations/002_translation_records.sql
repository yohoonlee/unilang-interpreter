-- =====================================================
-- UniLang 번역 기록 테이블 확장
-- =====================================================

-- 1. 통역 세션 테이블 (회의/통역 세션 단위)
CREATE TABLE IF NOT EXISTS public.translation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 세션 정보
    title TEXT,
    session_type TEXT DEFAULT 'mic' CHECK (session_type IN ('mic', 'youtube', 'meeting', 'file', 'screen')),
    
    -- 시간
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- 언어 설정
    source_language TEXT NOT NULL,
    target_languages TEXT[] NOT NULL, -- 여러 언어로 번역 가능
    
    -- 상태
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    
    -- 통계
    total_utterances INTEGER DEFAULT 0,
    total_characters INTEGER DEFAULT 0,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'
);

-- 2. 발화 기록 테이블 (각 발언/번역 단위)
CREATE TABLE IF NOT EXISTS public.utterances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.translation_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 화자 정보
    speaker_id UUID, -- 말한 사람 (참여자가 여러 명일 경우)
    speaker_name TEXT,
    
    -- 원본
    original_text TEXT NOT NULL,
    original_language TEXT NOT NULL,
    
    -- 시간
    created_at TIMESTAMPTZ DEFAULT NOW(),
    audio_timestamp_start DECIMAL, -- 오디오 내 시작 시간 (초)
    audio_timestamp_end DECIMAL, -- 오디오 내 종료 시간 (초)
    
    -- 신뢰도
    confidence DECIMAL(3, 2),
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'
);

-- 3. 번역 기록 테이블 (각 언어별 번역)
CREATE TABLE IF NOT EXISTS public.translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utterance_id UUID REFERENCES public.utterances(id) ON DELETE CASCADE,
    
    -- 번역 내용
    translated_text TEXT NOT NULL,
    target_language TEXT NOT NULL,
    
    -- 번역 방식
    translation_provider TEXT DEFAULT 'google', -- google, deepl, etc.
    
    -- 시간
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'
);

-- 4. 세션 참여자 테이블 (참여자별 언어 설정)
CREATE TABLE IF NOT EXISTS public.session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.translation_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- 참여자 정보
    participant_name TEXT,
    
    -- 언어 설정
    preferred_language TEXT NOT NULL, -- 이 참여자가 보고 싶은 언어
    
    -- 참여 시간
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    
    -- 상태
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- 인덱스
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_translation_sessions_user_id ON public.translation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_translation_sessions_started_at ON public.translation_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_translation_sessions_status ON public.translation_sessions(status);

CREATE INDEX IF NOT EXISTS idx_utterances_session_id ON public.utterances(session_id);
CREATE INDEX IF NOT EXISTS idx_utterances_created_at ON public.utterances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utterances_speaker_id ON public.utterances(speaker_id);

CREATE INDEX IF NOT EXISTS idx_translations_utterance_id ON public.translations(utterance_id);
CREATE INDEX IF NOT EXISTS idx_translations_target_language ON public.translations(target_language);

CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON public.session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON public.session_participants(user_id);

-- =====================================================
-- RLS (Row Level Security) 정책
-- =====================================================

-- translation_sessions 테이블
ALTER TABLE public.translation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
    ON public.translation_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON public.translation_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON public.translation_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON public.translation_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- utterances 테이블
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view utterances in own sessions"
    ON public.utterances FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.translation_sessions 
            WHERE id = utterances.session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert utterances in own sessions"
    ON public.utterances FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.translation_sessions 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

-- translations 테이블
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view translations in own sessions"
    ON public.translations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.utterances u
            JOIN public.translation_sessions s ON s.id = u.session_id
            WHERE u.id = translations.utterance_id AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert translations"
    ON public.translations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.utterances u
            JOIN public.translation_sessions s ON s.id = u.session_id
            WHERE u.id = utterance_id AND s.user_id = auth.uid()
        )
    );

-- session_participants 테이블
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in own sessions"
    ON public.session_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.translation_sessions 
            WHERE id = session_participants.session_id AND user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can insert participants"
    ON public.session_participants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.translation_sessions 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );





