-- 회의록 문서 컬럼 추가 (translation_sessions 테이블)
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 원어 회의록 (마크다운)
ALTER TABLE translation_sessions 
ADD COLUMN IF NOT EXISTS document_original_md TEXT;

-- 번역어 회의록 (마크다운)
ALTER TABLE translation_sessions 
ADD COLUMN IF NOT EXISTS document_translated_md TEXT;

-- 문서 생성 시간
ALTER TABLE translation_sessions 
ADD COLUMN IF NOT EXISTS document_created_at TIMESTAMP WITH TIME ZONE;

-- 문서 수정 시간
ALTER TABLE translation_sessions 
ADD COLUMN IF NOT EXISTS document_updated_at TIMESTAMP WITH TIME ZONE;

-- 인덱스 추가 (문서가 있는 세션 빠르게 조회)
CREATE INDEX IF NOT EXISTS idx_sessions_has_document 
ON translation_sessions (user_id, document_created_at) 
WHERE document_original_md IS NOT NULL;

-- 확인용 쿼리
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'translation_sessions' 
AND column_name LIKE 'document%';

