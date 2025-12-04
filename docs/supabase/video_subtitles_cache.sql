-- ============================================
-- 다국어 자막 캐시 테이블
-- ============================================

-- 테이블 생성
CREATE TABLE IF NOT EXISTS video_subtitles_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR(20) NOT NULL UNIQUE,     -- YouTube 비디오 ID
  video_title VARCHAR(500),                  -- 영상 제목
  original_lang VARCHAR(10) NOT NULL,        -- 원본 언어 코드 (en, ko 등)
  subtitles JSONB NOT NULL,                  -- 원본 자막 데이터
  translations JSONB DEFAULT '{}',           -- 언어별 번역 {ko: [...], zh: [...]}
  summaries JSONB DEFAULT '{}',              -- 언어별 요약 {ko: "...", zh: "..."}
  video_duration INTEGER,                    -- 영상 길이 (ms)
  last_text_time INTEGER,                    -- 마지막 자막 시간 (ms)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_video_subtitles_cache_video_id 
  ON video_subtitles_cache(video_id);

CREATE INDEX IF NOT EXISTS idx_video_subtitles_cache_updated_at 
  ON video_subtitles_cache(updated_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_video_subtitles_cache_updated_at ON video_subtitles_cache;

CREATE TRIGGER update_video_subtitles_cache_updated_at
  BEFORE UPDATE ON video_subtitles_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 정책
-- 캐시는 모든 사용자가 읽을 수 있음 (공유 리소스)
ALTER TABLE video_subtitles_cache ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 사용자 허용
CREATE POLICY "Allow read access for all users" ON video_subtitles_cache
  FOR SELECT USING (true);

-- 쓰기: 인증된 사용자만 허용
CREATE POLICY "Allow insert for authenticated users" ON video_subtitles_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON video_subtitles_cache
  FOR UPDATE USING (true);

-- ============================================
-- 샘플 쿼리
-- ============================================

-- 캐시 확인
-- SELECT * FROM video_subtitles_cache WHERE video_id = 'dQw4w9WgXcQ';

-- 특정 언어 번역 존재 확인
-- SELECT translations->>'ko' IS NOT NULL as has_korean 
-- FROM video_subtitles_cache WHERE video_id = 'dQw4w9WgXcQ';

-- 번역 추가
-- UPDATE video_subtitles_cache 
-- SET translations = translations || '{"ko": [...]}'::jsonb
-- WHERE video_id = 'dQw4w9WgXcQ';

-- 요약 추가
-- UPDATE video_subtitles_cache 
-- SET summaries = summaries || '{"ko": "요약 내용..."}'::jsonb
-- WHERE video_id = 'dQw4w9WgXcQ';

