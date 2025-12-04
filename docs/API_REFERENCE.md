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

### POST /api/ai/reorganize
AI 텍스트 재정리 (Gemini)

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

### POST /api/ai/summarize
AI 요약 생성 (Gemini)

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
Google Gemini 번역

**요청:**
```json
{
  "text": "번역할 텍스트",
  "sourceLang": "en",
  "targetLang": "ko"
}
```

**응답:**
```json
{
  "translatedText": "번역된 텍스트"
}
```

---

## 3. 외부 API 연동

### Deepgram (실시간 음성인식)
- **용도**: 시스템 오디오 캡처 모드에서 실시간 음성→텍스트 변환
- **문서**: https://developers.deepgram.com/
- **사용 위치**: `frontend/app/service/translate/youtube/live/page.tsx`

### Google Gemini (AI 처리)
- **용도**: 텍스트 재정리, 요약, 번역
- **문서**: https://ai.google.dev/
- **사용 위치**: `frontend/app/api/gemini/`

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

