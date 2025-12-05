# 📝 UniLang Interpreter 개발 로그

최근 개발된 기능 및 개선 사항을 기록합니다.

---

## 🎤 Google Cloud TTS 통합 (2024-12)

### 개요
Web Speech API의 한계(앞부분 skip, 불안정)를 해결하기 위해 **Google Cloud Text-to-Speech API**를 도입했습니다.

### 주요 기능

#### 1. 다양한 음성 선택
| 언어 | 지원 음성 |
|------|----------|
| **한국어** | Neural2-A/B (여), Neural2-C (남), Wavenet-A~D |
| **영어** | Neural2-A/D/I/J (남), Neural2-C/E/F/G/H (여) |
| **일본어** | Neural2-B (여), Neural2-C/D (남) |
| **중국어** | Neural2-A/C (여), Neural2-B/D (남) |

#### 2. TTS 속도 조절
- 기본 속도: **1.3x**
- 조절 범위: 0.5x ~ 2.0x
- 설정값 localStorage 저장

#### 3. 음성 선택 UI
- 🎙️ 드롭다운에서 음성 선택
- 언어별로 사용 가능한 음성 표시
- 선택한 음성 localStorage에 저장

### API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/tts` | POST | TTS 음성 합성 |
| `/api/tts` | GET | 사용 가능한 음성 목록 |

### 파일 구조
```
frontend/app/api/tts/
└── route.ts    # Google Cloud TTS API 래퍼
```

---

## 🔄 TTS 동기화 시스템 (2024-12)

### 문제점
- 영상 일시정지/재생 시 TTS 동기화 문제
- 시간 이동(seek) 시 TTS 지연
- 긴 문장 재생 중 영상과 불일치

### 해결 방안

#### 1. 일시정지/재개 처리
| 함수 | 동작 |
|------|------|
| `pauseTTS()` | 오디오 일시정지 (현재 위치 유지) |
| `resumeTTS()` | 일시정지 위치에서 이어서 재생 |
| `stopTTS()` | 완전 초기화 (큐 비우기 + 오디오 삭제) |

#### 2. 시간 이동 시 스마트 처리 (옵션 C)
```
시간 이동 감지 (인덱스 2 이상 변경)
    ↓
남은 시간 계산 (다음 자막 시작 - 현재 영상 시간)
    ↓
남은 시간 < 3초 → 현재 자막 건너뛰기 (다음 자막부터 TTS)
남은 시간 >= 3초 → 1.5x 속도로 빠르게 읽기
```

#### 3. 이벤트별 TTS 처리

| 이벤트 | TTS 동작 |
|--------|----------|
| 영상 재생 | `resumeTTS()` 또는 새 자막 TTS 시작 |
| 영상 일시정지 | `pauseTTS()` - 위치 유지 |
| 영상 종료 | `stopTTS()` - 완전 초기화 |
| 시간 이동 | 스마트 처리 (건너뛰기 또는 빠른 속도) |
| 오디오 모드 전환 | `stopTTS()` - 완전 초기화 |

---

## 📺 YouTube 자막 처리 워크플로우 (2024-12)

### 처리 단계

```
1️⃣ 캐시 확인
    ↓ (캐시 있음 → 바로 재생)
2️⃣ 자막 다운로드 (외부 API / youtube-transcript)
    ↓
3️⃣ 원본 언어 감지 (Google Translation API)
    ↓
4️⃣ AI 재정리 (Gemini) - 끊어진 문장 합치기
    ↓
5️⃣ 배치 번역 (Google Cloud Translation)
    ↓
6️⃣ AI 요약 생성 (Gemini)
    ↓
7️⃣ 저장 (localStorage + Supabase)
    ↓
8️⃣ 재생 시작
```

### AI 재정리 (Gemini)

**입력**: 끊어진 자막 세그먼트
```
[1] Hello everyone, today
[2] we are going to talk about
[3] artificial intelligence.
```

**출력**: 합쳐진 자연스러운 문장 + 그룹 정보
```json
[
  {
    "merged_from": [1, 2, 3],
    "text": "Hello everyone, today we are going to talk about artificial intelligence."
  }
]
```

### 다국어 캐싱 시스템

| 테이블 | 용도 |
|--------|------|
| `video_subtitles_cache` | 비디오별 자막/번역 캐시 (언어별) |
| `user_video_history` | 사용자별 시청 기록 |

```sql
-- video_subtitles_cache 구조
CREATE TABLE video_subtitles_cache (
  id UUID PRIMARY KEY,
  video_id TEXT NOT NULL,
  original_lang TEXT,
  translations JSONB,  -- {"ko": [...], "en": [...], "ja": [...]}
  summary JSONB,       -- {"ko": "...", "en": "...", "ja": "..."}
  video_title TEXT,
  video_duration INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 🎨 UI/UX 개선 (2024-12)

### YouTube 화면 디자인

| 요소 | 스타일 |
|------|--------|
| 타이틀 바 | `#14B8A6` (Teal) |
| 컨트롤 패널 | `#CCFBF1` (Light Teal) |
| 테이블 헤더 | `#14B8A6` |
| 테이블 테두리 | `#14B8A6` |
| 호버 효과 | `#CCFBF1` |
| 페이지 배경 | `#FFFFFF` |

### 버튼 배치 (창모드)

```
[🔊 화자음성/번역음성] [↗ 전체화면] [📖 자막 크게/작게] [🤖 AI 재정리]
```

- 화자음성/번역음성: 빨간색 토글
- 전체화면: 빨간색
- 자막 크게/작게: 회색
- AI 재정리: 보라색

### 전체화면 모드

```
상단: [🔊 화자음성/번역음성] [⛶ 창 모드]
중앙: YouTube 플레이어 + 자막 오버레이
하단: 속도 조절 (번역 음성 모드 시)
```

---

## 📁 주요 파일 구조

```
frontend/
├── app/
│   ├── api/
│   │   ├── tts/
│   │   │   └── route.ts          # Google Cloud TTS
│   │   ├── gemini/
│   │   │   ├── reorganize/route.ts  # AI 재정리
│   │   │   └── summarize/route.ts   # AI 요약
│   │   ├── translate/route.ts    # Google Translation
│   │   ├── cache/subtitle/route.ts  # 자막 캐시 API
│   │   └── youtube/
│   │       └── transcript/route.ts  # YouTube 자막 추출
│   ├── service/
│   │   └── translate/
│   │       └── youtube/
│   │           ├── page.tsx      # YouTube 메인 페이지
│   │           └── live/
│   │               └── page.tsx  # YouTube 재생 페이지
│   └── ...
└── ...

subtitle-server/
├── main.py          # Railway 자막 추출 서버
├── requirements.txt
└── Procfile
```

---

## 🔧 환경 변수

### Vercel (Frontend)

```env
# 기존
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Google Cloud (TTS, Translation, Gemini)
GOOGLE_API_KEY=...
NEXT_PUBLIC_GOOGLE_API_KEY=...

# Deepgram (실시간 STT)
DEEPGRAM_API_KEY=...

# AssemblyAI (화자 구분)
ASSEMBLYAI_API_KEY=...
```

### Railway (Subtitle Server)

```env
PORT=8080
WEBSHARE_PROXY_URL=...  # Webshare 프록시 (YouTube 차단 우회)
```

### Google Cloud API 필수 활성화

| API | 용도 |
|-----|------|
| Cloud Translation API | 텍스트 번역 |
| Cloud Text-to-Speech API | TTS 음성 합성 |
| Generative Language API | AI 재정리/요약 (Gemini) |

---

## 🚀 배포

### Vercel (Frontend)

```bash
# 자동 배포 (GitHub 연동)
git push origin main
```

### Railway (Subtitle Server)

```bash
# 자동 배포 (GitHub 연동)
git push origin main
```

### 수동 배포

```bash
# Vercel
vercel --prod

# Railway
railway up
```

---

## 📝 최근 변경 이력

| 날짜 | 내용 |
|------|------|
| 2024-12 | Google Cloud TTS 도입 |
| 2024-12 | TTS 동기화 시스템 개선 |
| 2024-12 | 시간 이동 시 스마트 TTS 처리 |
| 2024-12 | 음성 선택 드롭다운 UI |
| 2024-12 | 일시정지/재개 위치 기억 |
| 2024-12 | 번역 분할 로직 (원복) |
| 2024-12 | 드롭박스 UI 개선 |

---

## 🐛 알려진 이슈

1. **TTS 속도 localStorage**: 브라우저 캐시 삭제 시 기본값으로 리셋
2. **시간 이동 정확도**: 긴 자막의 경우 약간의 오차 발생 가능
3. **음성 변경 즉시 적용 안됨**: 다음 자막부터 적용 (현재 재생 중인 자막은 유지)

---

## 📞 문의

- GitHub Issues: [unilang-interpreter](https://github.com/yohoonlee/unilang-interpreter/issues)

