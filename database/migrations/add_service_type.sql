-- 서비스 타입 컬럼 추가 (회의록 자동작성 vs 실시간 통역)
-- 실행: Supabase SQL Editor에서 실행

-- 1. service_type 컬럼 추가
ALTER TABLE translation_sessions 
ADD COLUMN IF NOT EXISTS service_type VARCHAR(20) DEFAULT 'minutes';

-- 2. 기존 데이터는 모두 'minutes' (회의록 자동작성)으로 설정
UPDATE translation_sessions 
SET service_type = 'minutes' 
WHERE service_type IS NULL;

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_translation_sessions_service_type 
ON translation_sessions(service_type);

-- 4. 복합 인덱스 (사용자별 서비스 타입 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_translation_sessions_user_service 
ON translation_sessions(user_id, service_type);

-- service_type 값:
-- 'minutes' = 회의록 자동작성
-- 'realtime' = 실시간 통역

