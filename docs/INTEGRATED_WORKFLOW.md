# 통합 워크플로우 가이드

## 개요

"실시간 통역" 버튼 하나로 다음 기능들이 자동으로 처리됩니다:
- 자막 추출
- 번역
- AI 재처리
- 요약 생성
- 저장 및 재생

---

## 워크플로우 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    [실시간 통역] 버튼 클릭                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              0단계: 기존 저장 데이터 확인                      │
│                                                              │
│   localStorage에서 동일 영상 데이터 검색                       │
│   완성도 = (마지막자막시간 / 영상총시간) × 100                  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌──────────────────────┐        ┌──────────────────────┐
│   완성도 ≥ 98%       │        │   완성도 < 98%       │
│                      │        │   또는 데이터 없음    │
│   → 바로 재생 모드   │        │                      │
└──────────────────────┘        └──────────────────────┘
              │                               │
              │                               ▼
              │         ┌─────────────────────────────────────┐
              │         │        1단계: 자막 추출 시도          │
              │         │                                      │
              │         │   Railway 서버 → Webshare 프록시     │
              │         │   youtube-transcript-api / yt-dlp    │
              │         └─────────────────────────────────────┘
              │                               │
              │               ┌───────────────┴───────────────┐
              │               │                               │
              │               ▼                               ▼
              │   ┌──────────────────────┐    ┌──────────────────────┐
              │   │     자막 있음         │    │     자막 없음/실패    │
              │   └──────────────────────┘    └──────────────────────┘
              │               │                               │
              │               ▼                               ▼
              │   ┌──────────────────────┐    ┌──────────────────────┐
              │   │   2단계: 번역 수행    │    │   실시간 통역 모드    │
              │   │                      │    │                      │
              │   │   Google Translate   │    │   Deepgram /         │
              │   │   or Gemini          │    │   Web Speech API     │
              │   └──────────────────────┘    └──────────────────────┘
              │               │                               │
              │               ▼                               │
              │   ┌──────────────────────┐                    │
              │   │  3단계: AI 재처리     │                    │
              │   │                      │                    │
              │   │  Gemini API          │                    │
              │   │  텍스트 정리/보정     │                    │
              │   └──────────────────────┘                    │
              │               │                               │
              │               ▼                               │
              │   ┌──────────────────────┐                    │
              │   │   4단계: 요약 생성    │                    │
              │   │                      │                    │
              │   │   Gemini API         │                    │
              │   │   핵심 내용 요약      │                    │
              │   └──────────────────────┘                    │
              │               │                               │
              │               ▼                               │
              │   ┌──────────────────────┐                    │
              │   │   5단계: 저장         │                    │
              │   │                      │                    │
              │   │   • LocalStorage     │                    │
              │   │   • Supabase (백그라운드) │                │
              │   └──────────────────────┘                    │
              │               │                               │
              └───────────────┼───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     재생 모드 시작                           │
│                                                              │
│   YouTube 영상 + 자막 싱크 재생                              │
│   AI 요약 표시                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 상세 단계 설명

### 0단계: 기존 데이터 확인

```typescript
// 저장 키 형식
const key = `unilang_youtube_${videoId}_${sourceLang}_${targetLang}`

// 완성도 계산
const coverage = (lastTextTime / videoDuration) * 100

// 98% 이상이면 바로 재생
if (coverage >= 98) {
  // sessionStorage에 데이터 전달
  sessionStorage.setItem('unilang_saved_session', JSON.stringify(savedData))
  // 재생 모드로 이동
  window.open(`/service/translate/youtube/live?loadSaved=true`)
}
```

**완성도 판단 기준:**
| 조건 | 완성도 |
|------|--------|
| 마지막자막/영상길이 ≥ 98% | 완성 |
| 자막 100개 이상 (길이 정보 없음) | 완성으로 간주 |
| 그 외 | 미완성 |

---

### 1단계: 자막 추출

**추출 시도 순서:**
1. `yt-dlp` + Webshare 프록시
2. `youtube-transcript-api` + Webshare 프록시
3. `youtube-transcript-api` (프록시 없음)
4. 모두 실패 → 실시간 통역 모드

**선호 언어 순서:**
```
en → ko → ja → zh → es → fr → de
```

---

### 2단계: 번역 수행

```typescript
// 각 자막에 대해 번역 수행
for (const utterance of utterances) {
  const translated = await translateText(
    utterance.original,
    sourceLanguage,
    targetLanguage
  )
  utterance.translated = translated
}
```

**지원 언어:**
| 코드 | 언어 |
|------|------|
| `ko` | 한국어 |
| `en` | English |
| `ja` | 日本語 |
| `zh` | 中文 (간체) |
| `zh-TW` | 中文 (번체) |
| `th` | ภาษาไทย |
| `vi` | Tiếng Việt |
| `es` | Español |
| `fr` | Français |
| `de` | Deutsch |
| `ru` | Русский |
| `pt` | Português |
| `ar` | العربية |

---

### 3단계: AI 재처리

**목적:** 번역된 텍스트의 자연스러움 향상

```typescript
const response = await fetch("/api/ai/reorganize", {
  method: "POST",
  body: JSON.stringify({
    text: translatedText,
    language: targetLanguage
  })
})
```

**처리 내용:**
- 문법 오류 수정
- 자연스러운 문장으로 재구성
- 중복 제거
- 문맥 연결

---

### 4단계: 요약 생성

```typescript
const response = await fetch("/api/ai/summarize", {
  method: "POST",
  body: JSON.stringify({
    text: fullText,
    language: targetLanguage
  })
})
```

**요약 포함 내용:**
- 주요 주제
- 핵심 내용 3-5개
- 결론/요점

---

### 5단계: 저장

**LocalStorage (즉시):**
```typescript
localStorage.setItem(key, JSON.stringify({
  videoId,
  sourceLang,
  targetLang,
  utterances,
  savedAt: new Date().toISOString(),
  summary,
  isReorganized: true,
  videoDuration,
  lastTextTime
}))
```

**Supabase (백그라운드):**
```typescript
await supabase.from('translation_sessions').upsert({
  user_id,
  video_id,
  source_lang,
  target_lang,
  summary,
  is_reorganized,
  video_duration,
  last_text_time,
  utterances: JSON.stringify(utterances),
  updated_at: new Date().toISOString()
})
```

---

## 실시간 통역 모드 (자막 없음)

자막이 없는 경우 실시간 음성인식으로 전환됩니다.

### 입력 방식

| 모드 | API | 설명 |
|------|-----|------|
| 마이크 | Web Speech API | 외부 스피커 소리를 마이크로 캡처 |
| 시스템 오디오 | Deepgram | 컴퓨터 내부 오디오 직접 캡처 |

### 워크플로우

```
음성 입력 → 음성 인식 → 텍스트 변환 → 번역 → 화면 표시
                                           ↓
                                    주기적 저장 (30초)
                                           ↓
                                    종료 시 최종 저장
                                           ↓
                                    AI 재처리 & 요약
```

---

## 다국어 캐싱 시스템 (구현 완료 ✅)

### 개요

동일한 영상에 대해 여러 사용자가 다른 언어로 번역을 요청할 때, 이미 번역된 언어는 캐시에서 제공합니다.

### 캐싱 전략

```
┌─────────────────────────────────────────────────────────────────┐
│                    다국어 캐싱 워크플로우                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [사용자 A] 영어 영상 → 한국어 번역 요청                           │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────┐                                            │
│  │ 1. 캐시 확인     │──▶ 한국어 번역본 없음                        │
│  └──────────────────┘                                            │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────┐                                            │
│  │ 2. 번역 수행     │──▶ Google Cloud Translation                 │
│  └──────────────────┘                                            │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────┐                                            │
│  │ 3. 캐시 저장     │──▶ LocalStorage + Supabase                  │
│  └──────────────────┘                                            │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────┐                                            │
│  │ 4. 백그라운드    │──▶ 중국어, 태국어 등 추가 번역 (선택적)       │
│  │    멀티 번역     │    스레드 처리로 비동기 저장                  │
│  └──────────────────┘                                            │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│                                                                  │
│  [사용자 B] 같은 영상 → 중국어 번역 요청                           │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────┐                                            │
│  │ 1. 캐시 확인     │──▶ 중국어 번역본 있음! ✅                    │
│  └──────────────────┘                                            │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────┐                                            │
│  │ 2. 캐시 로드     │──▶ 번역 스킵, 바로 재생                      │
│  └──────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 캐시 규칙

| 시나리오 | 동작 |
|----------|------|
| 요청 언어의 기존 자막 존재 | 번역 스킵, 기존 자막 사용 |
| 요청 언어의 캐시 번역 존재 | 캐시에서 로드, 바로 재생 |
| 새 언어 번역 요청 | 번역 수행 후 캐시 저장 |
| 첫 번역 완료 시 | 백그라운드에서 주요 언어 추가 번역 |

### 데이터베이스 구조 (Supabase)

```sql
-- 영상별 다국어 자막 캐시 테이블
CREATE TABLE video_subtitles_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR NOT NULL,              -- YouTube 비디오 ID
  video_title VARCHAR,                    -- YouTube 제목 (oEmbed API로 추출)
  original_lang VARCHAR NOT NULL,         -- 원본 언어 (en, ko, etc.)
  subtitles JSONB NOT NULL,               -- 원본 자막 데이터
  translations JSONB DEFAULT '{}',        -- {ko: [...], zh: [...], th: [...]}
  summaries JSONB DEFAULT '{}',           -- {ko: "요약...", zh: "摘要..."}
  video_duration INTEGER,                 -- 영상 길이 (ms)
  last_text_time INTEGER,                 -- 마지막 자막 시간 (ms)
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 시청 시각
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(video_id)
);

-- 인덱스 (시청순 정렬 성능 향상)
CREATE INDEX idx_video_subtitles_cache_last_viewed_at 
ON video_subtitles_cache(last_viewed_at DESC NULLS LAST);

-- 번역본 추가 예시
UPDATE video_subtitles_cache 
SET translations = translations || '{"ko": [...]}'::jsonb,
    updated_at = NOW()
WHERE video_id = 'xxx';

-- 시청 시각 업데이트
UPDATE video_subtitles_cache 
SET last_viewed_at = NOW()
WHERE video_id = 'xxx';
```

### API 구조

```typescript
// 캐시 확인 API
GET /api/cache/subtitle?videoId=xxx&lang=ko

// 응답
{
  "exists": true,
  "cached": true,           // 캐시에서 가져옴
  "utterances": [...],
  "summary": "...",
  "cachedAt": "2024-12-04T..."
}

// 캐시 저장 API (백그라운드)
POST /api/cache/subtitle
{
  "videoId": "xxx",
  "lang": "ko",
  "utterances": [...],
  "summary": "..."
}
```

### 백그라운드 멀티 번역

```typescript
// 첫 번역 완료 후 백그라운드에서 추가 언어 번역
async function backgroundMultiTranslate(
  videoId: string,
  originalLang: string,
  originalUtterances: Utterance[],
  primaryLang: string  // 이미 번역된 언어
) {
  // 추가 번역 대상 언어 (우선순위)
  const additionalLangs = ['zh', 'th', 'ja', 'es', 'vi']
    .filter(lang => lang !== primaryLang && lang !== originalLang)
  
  // 순차적으로 번역 (API 제한 고려)
  for (const targetLang of additionalLangs) {
    try {
      const translated = await translateAllUtterances(
        originalUtterances,
        originalLang,
        targetLang
      )
      
      // Supabase에 저장
      await saveToCache(videoId, targetLang, translated)
      
      console.log(`✅ 백그라운드 번역 완료: ${targetLang}`)
    } catch (error) {
      console.error(`❌ 백그라운드 번역 실패: ${targetLang}`, error)
    }
    
    // API 제한 방지 (1초 대기)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}
```

---

## 저장 데이터 구조

```typescript
interface SavedSession {
  videoId: string         // YouTube 비디오 ID
  sourceLang: string      // 원본 언어 코드
  targetLang: string      // 타겟 언어 코드
  utterances: Array<{
    id: string            // 고유 ID
    original: string      // 원본 텍스트
    translated: string    // 번역 텍스트
    timestamp: Date       // 생성 시간
    startTime: number     // 영상 내 시작 시간 (ms)
  }>
  savedAt: string         // 저장 시간 (ISO 8601)
  summary?: string        // AI 요약
  isReorganized?: boolean // AI 재처리 여부
  videoDuration?: number  // 영상 총 시간 (ms)
  lastTextTime?: number   // 마지막 자막 시간 (ms)
}

// 다국어 캐시 데이터 구조
interface VideoSubtitleCache {
  videoId: string
  videoTitle?: string            // YouTube 제목 (oEmbed API)
  originalLang: string
  subtitles: Utterance[]         // 원본 자막
  translations: {                 // 언어별 번역본
    [langCode: string]: Utterance[]
  }
  summaries: {                    // 언어별 요약
    [langCode: string]: string
  }
  videoDuration?: number
  lastTextTime?: number
  lastViewedAt?: string          // 시청 시각 (로컬 시간 표시용)
  createdAt: string
  updatedAt: string
}
```

---

## 에러 처리

| 상황 | 처리 방법 |
|------|----------|
| 자막 추출 실패 | 실시간 통역 모드로 자동 전환 |
| 번역 실패 | 원본 텍스트 유지 |
| AI 재처리 실패 | 번역 텍스트 유지 |
| 요약 생성 실패 | 요약 없이 저장 |
| 저장 실패 | 에러 로그, 재시도 |

---

## 사용 예시

### Case 1: 자막 있는 영상 (첫 방문)
```
1. URL 입력: https://youtube.com/watch?v=xxx
2. [실시간 통역] 클릭
3. "자막 추출 중..." → "번역 중..." → "AI 재처리 중..." → "저장 중..."
4. 플레이어 팝업 열림
5. 영상 재생 시 자막 싱크 표시
```

### Case 2: 자막 있는 영상 (재방문, 98% 이상)
```
1. URL 입력: https://youtube.com/watch?v=xxx
2. [실시간 통역] 클릭
3. "기존 데이터 발견! (99.5% 완성) 바로 재생합니다..."
4. 플레이어 팝업 즉시 열림
```

### Case 3: 자막 없는 영상
```
1. URL 입력: https://youtube.com/watch?v=yyy
2. [실시간 통역] 클릭
3. "자막 없음 - 실시간 통역 모드로 전환..."
4. 플레이어 팝업 열림
5. 시스템 오디오 캡처 시작
6. 실시간 음성인식 및 번역 표시
```


