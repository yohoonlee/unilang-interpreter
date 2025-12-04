# API 레퍼런스

## 목차
1. [자막 서버 API (Railway)](#1-자막-서버-api-railway)
2. [프론트엔드 API Routes (Vercel)](#2-프론트엔드-api-routes-vercel)
3. [외부 API 연동](#3-외부-api-연동)

---

## 1. 자막 서버 API (Railway)

### 기본 URL
```
https://subtitle-server-xxx.railway.app
```

### 엔드포인트

#### GET /health
서버 상태 확인

**응답:**
```json
{
  "status": "healthy"
}
```

---

#### GET /api/status
서버 상태 및 프록시 설정 확인

**응답:**
```json
{
  "status": "healthy",
  "proxy_configured": true,
  "proxy_username_set": true,
  "proxy_password_set": true
}
```

---

#### GET /api/subtitles/{video_id}
YouTube 자막 추출

**파라미터:**
| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `video_id` | string | ✅ | YouTube 비디오 ID |
| `target_languages` | string | ❌ | 선호 언어 (쉼표 구분). 기본값: `en,ko,ja,zh,es,fr,de` |

**요청 예시:**
```
GET /api/subtitles/dQw4w9WgXcQ?target_languages=ko,en
```

**성공 응답:**
```json
{
  "success": true,
  "videoId": "dQw4w9WgXcQ",
  "language": "ko",
  "is_generated": false,
  "transcript": [
    {
      "text": "안녕하세요",
      "start": 0.0,
      "duration": 2.5
    },
    {
      "text": "반갑습니다",
      "start": 2.5,
      "duration": 1.8
    }
  ],
  "available_languages": [
    {"code": "ko", "is_generated": false},
    {"code": "en", "is_generated": true}
  ]
}
```

**에러 응답:**
```json
// 404 - 자막 없음
{
  "detail": {
    "message": "No subtitles found or YouTube blocked the request.",
    "error_type": "NoTranscriptFound"
  }
}

// 400 - 자막 비활성화
{
  "detail": "Subtitles are disabled for this video."
}

// 403 - YouTube 차단
{
  "detail": "YouTube blocked the request: ..."
}
```

---

## 2. 프론트엔드 API Routes (Vercel)

### POST /api/youtube/transcript
YouTube 자막 추출 (Railway 서버 프록시)

**요청:**
```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "targetLanguage": "ko"
}
```

**응답:**
```json
{
  "success": true,
  "videoId": "dQw4w9WgXcQ",
  "language": "ko",
  "text": "전체 자막 텍스트...",
  "duration": 180000,
  "utterances": [
    {
      "speaker": "Speaker 1",
      "text": "안녕하세요",
      "start": 0,
      "end": 2500
    }
  ]
}
```

---

### GET /api/deepgram/token
Deepgram API 토큰 발급

**응답:**
```json
{
  "key": "temporary_api_key"
}
```

---

### POST /api/gemini/translate
Google Cloud Translation API를 사용한 번역

**요청:**
```json
{
  "text": "번역할 텍스트",
  "sourceLang": "en",      // 원본 언어 (생략 시 자동 감지)
  "targetLang": "ko"       // 대상 언어 (필수)
}
```

**응답:**
```json
{
  "translatedText": "번역된 텍스트"
}
```

**에러 응답:**
```json
{
  "error": "GOOGLE_API_KEY not configured",
  "translatedText": ""
}
```

**지원 언어 코드:**
| 코드 | 언어 | 코드 | 언어 |
|------|------|------|------|
| `ko` | 한국어 | `th` | 태국어 |
| `en` | 영어 | `vi` | 베트남어 |
| `ja` | 일본어 | `ru` | 러시아어 |
| `zh` | 중국어(간체) | `pt` | 포르투갈어 |
| `zh-TW` | 중국어(번체) | `ar` | 아랍어 |
| `es` | 스페인어 | `de` | 독일어 |
| `fr` | 프랑스어 | | |

---

### POST /api/gemini/reorganize
AI 텍스트 재정리 (Google AI)

**요청:**
```json
{
  "text": "재정리할 텍스트...",
  "language": "ko"
}
```

**응답:**
```json
{
  "reorganizedText": "재정리된 텍스트..."
}
```

---

### POST /api/gemini/summarize
AI 요약 생성 (Google AI)

**요청:**
```json
{
  "text": "요약할 텍스트...",
  "language": "ko"
}
```

**응답:**
```json
{
  "summary": "요약된 내용..."
}
```

---

### POST /api/gemini/translate-batch
배치 번역 (다수 문장 한번에 번역)

**요청:**
```json
{
  "texts": ["문장1", "문장2", "문장3", ...],
  "targetLang": "ko",
  "sourceLang": "en"  // 선택사항
}
```

**응답:**
```json
{
  "translations": ["번역1", "번역2", "번역3", ...]
}
```

**특징:**
- 50개 문장씩 배치 처리
- 기존 개별 번역 대비 **10배 이상 속도 향상**

---

### GET /api/cache/subtitle
캐시된 자막/번역 조회

**파라미터:**
| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `videoId` | string | ✅ | YouTube 비디오 ID |
| `lang` | string | ❌ | 조회할 언어 코드 |

**응답 (캐시 있음):**
```json
{
  "exists": true,
  "cached": true,
  "isOriginal": false,
  "videoId": "xxx",
  "language": "ko",
  "utterances": [...],
  "summary": "요약...",
  "videoDuration": 180000,
  "cachedAt": "2024-12-04T..."
}
```

**응답 (캐시 없음):**
```json
{
  "exists": false,
  "cached": false,
  "videoId": "xxx"
}
```

---

### POST /api/cache/subtitle
자막/번역 캐시 저장

**요청:**
```json
{
  "videoId": "xxx",
  "videoTitle": "YouTube 제목",
  "originalLang": "en",
  "subtitles": [...],
  "translations": {
    "ko": [...],
    "zh": [...]
  },
  "summaries": {
    "ko": "한국어 요약...",
    "zh": "中文摘要..."
  },
  "videoDuration": 180000,
  "lastTextTime": 175000
}
```

**응답:**
```json
{
  "success": true,
  "action": "created"  // 또는 "updated"
}
```

---

### PUT /api/cache/subtitle
특정 언어 번역 추가

**요청:**
```json
{
  "videoId": "xxx",
  "lang": "th",
  "utterances": [...],
  "summary": "태국어 요약..."
}
```

**응답:**
```json
{
  "success": true,
  "lang": "th"
}
```

---

### POST /api/cache/background-translate
백그라운드 멀티 번역 시작

**요청:**
```json
{
  "videoId": "xxx",
  "originalLang": "en",
  "targetLangs": ["ko", "zh", "ja", "es"]
}
```

**응답:**
```json
{
  "success": true,
  "message": "백그라운드 번역 시작"
}
```

---

## 3. 외부 API 연동

### Deepgram (실시간 음성인식)
- **용도**: 시스템 오디오 캡처 모드에서 실시간 음성→텍스트 변환
- **API 키**: `DEEPGRAM_API_KEY`
- **문서**: https://developers.deepgram.com/
- **사용 위치**: `frontend/app/service/translate/youtube/live/page.tsx`

### Google Cloud Translation (번역)
- **용도**: 텍스트 번역 (다국어 지원)
- **API 키**: `GOOGLE_API_KEY`, `NEXT_PUBLIC_GOOGLE_API_KEY`
- **문서**: https://cloud.google.com/translate/docs
- **사용 위치**: `frontend/app/api/gemini/translate/route.ts`

### Google AI (Gemini - AI 처리)
- **용도**: 텍스트 재정리, 요약
- **API 키**: `GOOGLE_API_KEY` (동일)
- **문서**: https://ai.google.dev/
- **사용 위치**: `frontend/app/api/gemini/reorganize/`, `frontend/app/api/gemini/summarize/`

### Supabase (데이터베이스)
- **용도**: 사용자 인증, 번역 세션 저장, 히스토리 관리
- **문서**: https://supabase.com/docs
- **사용 위치**: `frontend/lib/supabase/`

### YouTube Transcript API
- **용도**: YouTube 자막 추출
- **라이브러리**: `youtube-transcript-api` (Python)
- **사용 위치**: `subtitle-server/main.py`

### yt-dlp
- **용도**: YouTube 자막 추출 (백업 방법)
- **라이브러리**: `yt-dlp` (Python)
- **사용 위치**: `subtitle-server/main.py`

### Webshare Proxy
- **용도**: YouTube 서버 차단 우회
- **서비스**: https://www.webshare.io
- **사용 위치**: `subtitle-server/main.py`

---

## 데이터 스키마

### SavedSession (LocalStorage)
```typescript
interface SavedSession {
  videoId: string           // YouTube 비디오 ID
  sourceLang: string        // 원본 언어
  targetLang: string        // 타겟 언어
  utterances: Utterance[]   // 발화 목록
  savedAt: string           // 저장 시간 (ISO 8601)
  summary?: string          // AI 요약
  isReorganized?: boolean   // AI 재정리 여부
  videoDuration?: number    // 영상 총 시간 (ms)
  lastTextTime?: number     // 마지막 자막 시간 (ms)
}
```

### Utterance
```typescript
interface Utterance {
  id: string           // 고유 ID
  original: string     // 원본 텍스트
  translated: string   // 번역된 텍스트
  timestamp: Date      // 타임스탬프
  startTime: number    // 시작 시간 (ms)
}
```

---

## 에러 코드

| 코드 | 설명 | 해결 방법 |
|------|------|----------|
| `400` | 잘못된 요청 | 요청 파라미터 확인 |
| `403` | YouTube 차단 | 프록시 설정 확인 |
| `404` | 자막 없음 | 실시간 통역 모드 사용 |
| `500` | 서버 오류 | 로그 확인 |


