-- video_subtitles_cache 테이블에 last_viewed_at 컬럼 추가
-- 시청 시각을 기록하여 최근 시청순으로 정렬하기 위함

ALTER TABLE video_subtitles_cache 
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 기존 데이터의 last_viewed_at을 updated_at으로 설정
UPDATE video_subtitles_cache 
SET last_viewed_at = COALESCE(updated_at, created_at, NOW())
WHERE last_viewed_at IS NULL;

-- 인덱스 생성 (정렬 성능 향상)
CREATE INDEX IF NOT EXISTS idx_video_subtitles_cache_last_viewed_at 
ON video_subtitles_cache(last_viewed_at DESC NULLS LAST);

