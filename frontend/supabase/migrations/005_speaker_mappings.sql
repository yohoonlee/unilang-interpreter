-- 화자 매칭 테이블
-- AssemblyAI 화자 구분 결과(A, B, C...)를 실제 참석자와 매칭

CREATE TABLE IF NOT EXISTS public.speaker_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.translation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    speaker_id TEXT NOT NULL,                    -- AssemblyAI 화자 ID (A, B, C...)
    participant_id UUID REFERENCES auth.users(id), -- 실제 참석자 ID (선택)
    participant_name TEXT NOT NULL,              -- 표시 이름
    participant_email TEXT,                       -- 이메일 (선택)
    color TEXT DEFAULT '#3B82F6',                 -- UI 표시 색상
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 세션당 화자 ID는 고유
    UNIQUE(session_id, speaker_id)
);

-- RLS 활성화
ALTER TABLE public.speaker_mappings ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 데이터만 접근 가능
CREATE POLICY "Users can manage own speaker mappings" 
    ON public.speaker_mappings 
    FOR ALL 
    USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_speaker_mappings_session ON public.speaker_mappings(session_id);
CREATE INDEX idx_speaker_mappings_user ON public.speaker_mappings(user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_speaker_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_speaker_mappings_updated_at
    BEFORE UPDATE ON public.speaker_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_speaker_mappings_updated_at();

-- AssemblyAI 전사 결과 저장 테이블 (선택)
CREATE TABLE IF NOT EXISTS public.assemblyai_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.translation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transcript_id TEXT NOT NULL,                  -- AssemblyAI transcript ID
    audio_url TEXT,                               -- 원본 오디오 URL
    status TEXT DEFAULT 'processing',             -- processing, completed, error
    language_code TEXT,                           -- 감지된 언어
    duration_seconds INTEGER,                     -- 오디오 길이 (초)
    confidence DECIMAL(4, 3),                     -- 전체 신뢰도
    full_text TEXT,                               -- 전체 전사 텍스트
    utterances_count INTEGER DEFAULT 0,           -- 발화 수
    speakers_count INTEGER DEFAULT 0,             -- 화자 수
    raw_response JSONB,                           -- AssemblyAI 원본 응답 (백업)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 세션당 하나의 전사
    UNIQUE(session_id)
);

-- RLS 활성화
ALTER TABLE public.assemblyai_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can manage own transcripts" 
    ON public.assemblyai_transcripts 
    FOR ALL 
    USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_assemblyai_transcripts_session ON public.assemblyai_transcripts(session_id);
CREATE INDEX idx_assemblyai_transcripts_transcript_id ON public.assemblyai_transcripts(transcript_id);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER trigger_update_assemblyai_transcripts_updated_at
    BEFORE UPDATE ON public.assemblyai_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_speaker_mappings_updated_at();

-- 코멘트
COMMENT ON TABLE public.speaker_mappings IS 'AssemblyAI 화자 구분 결과와 실제 참석자 매칭';
COMMENT ON TABLE public.assemblyai_transcripts IS 'AssemblyAI 전사 결과 저장';

