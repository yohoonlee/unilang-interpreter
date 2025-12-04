# 인프라 설정 가이드

## 목차
1. [서비스 아키텍처](#1-서비스-아키텍처)
2. [Railway 배포 (자막 서버)](#2-railway-배포-자막-서버)
3. [Webshare 프록시 설정](#3-webshare-프록시-설정)
4. [Vercel 배포 (프론트엔드)](#4-vercel-배포-프론트엔드)
5. [환경 변수 설정](#5-환경-변수-설정)

---

## 1. 서비스 아키텍처

### 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UniLang 서비스 아키텍처                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        [YouTube 자막 모드]                              │ │
│  │                                                                         │ │
│  │  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐          │ │
│  │  │ YouTube  │───▶│   Railway    │───▶│  Google Cloud        │          │ │
│  │  │  영상    │    │ (자막 추출)   │    │  Translation API     │          │ │
│  │  │          │    │              │    │                      │          │ │
│  │  └──────────┘    │  + Webshare  │    │ (GOOGLE_API_KEY)     │          │ │
│  │                  │  (프록시)     │    └──────────────────────┘          │ │
│  │                  └──────────────┘              │                        │ │
│  │                         │                      ▼                        │ │
│  │                         │              ┌──────────────┐                 │ │
│  │                         │              │   번역된     │                 │ │
│  │                         └─────────────▶│   자막 표시  │                 │ │
│  │                                        │   + 영상싱크 │                 │ │
│  │                                        └──────────────┘                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                       [실시간 통역 모드]                                 │ │
│  │                                                                         │ │
│  │  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐          │ │
│  │  │ 마이크/  │───▶│   Deepgram   │───▶│  Google Cloud        │          │ │
│  │  │ 시스템   │    │   (STT)      │    │  Translation API     │          │ │
│  │  │ 오디오   │    │              │    │                      │          │ │
│  │  └──────────┘    │ WebSocket    │    │ (GOOGLE_API_KEY)     │          │ │
│  │                  └──────────────┘    └──────────────────────┘          │ │
│  │                         │                      │                        │ │
│  │                         │                      ▼                        │ │
│  │                         │              ┌──────────────┐                 │ │
│  │                         │              │   실시간     │                 │ │
│  │                         └─────────────▶│   자막 표시  │                 │ │
│  │                                        │   + 번역    │                 │ │
│  │                                        └──────────────┘                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                          [데이터 저장]                                  │ │
│  │                                                                         │ │
│  │  ┌──────────────┐              ┌──────────────────────┐                │ │
│  │  │ LocalStorage │◀────────────▶│      Supabase        │                │ │
│  │  │  (즉시저장)  │              │   (영구 저장/공유)    │                │ │
│  │  └──────────────┘              └──────────────────────┘                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 각 서비스 역할

| 서비스 | 역할 | API 키 | 비용 |
|--------|------|--------|------|
| **Railway** | YouTube 자막 추출 서버 호스팅 | `SUBTITLE_API_URL` | 무료~$5/월 |
| **Webshare** | YouTube IP 차단 우회 프록시 | Railway에 설정 | $3.50/월 |
| **Deepgram** | 실시간 음성→텍스트 (STT) | `DEEPGRAM_API_KEY` | 종량제 |
| **Google Cloud Translation** | 텍스트 번역 | `GOOGLE_API_KEY` | 종량제 |
| **Supabase** | 데이터베이스 + 인증 | `SUPABASE_*` | 무료~$25/월 |
| **Vercel** | Next.js 프론트엔드 호스팅 | - | 무료~$20/월 |

### 데이터 흐름

```
[사용자] ──▶ [Vercel 프론트엔드]
                    │
                    ├──▶ [Railway] ──▶ [YouTube] (자막 추출)
                    │         │
                    │         └──▶ [Webshare] (프록시)
                    │
                    ├──▶ [Deepgram] (실시간 STT)
                    │
                    ├──▶ [Google Cloud Translation] (번역)
                    │
                    └──▶ [Supabase] (저장/조회)
```

---

## 2. Railway 배포 (자막 서버)

### 개요
YouTube 자막 추출을 위한 Python FastAPI 서버를 Railway에 배포합니다.
YouTube는 서버에서의 요청을 차단하므로, Webshare 프록시와 함께 사용해야 합니다.

### 파일 구조
```
subtitle-server/
├── main.py           # FastAPI 메인 서버
├── requirements.txt  # Python 의존성
├── Procfile         # Railway 시작 명령
├── railway.json     # Railway 설정
├── runtime.txt      # Python 버전 지정
├── Dockerfile       # Docker 설정 (선택)
└── README.md        # 서버 문서
```

### 배포 단계

#### 1단계: Railway 가입
- https://railway.app 접속
- GitHub 계정으로 로그인

#### 2단계: 새 프로젝트 생성
1. Dashboard → "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. 저장소 선택: `unilang-interpreter`

#### 3단계: Root Directory 설정
1. 프로젝트 설정(Settings) 진입
2. "Root Directory" → `subtitle-server` 입력
3. 체크(✓) 버튼 클릭하여 저장

#### 4단계: 환경 변수 설정
Variables 탭에서 추가:
```
WEBSHARE_PROXY_USERNAME=<webshare_username>
WEBSHARE_PROXY_PASSWORD=<webshare_password>
```

#### 5단계: 도메인 설정
1. Settings → Networking → "Generate Domain" 클릭
2. 생성된 URL 복사 (예: `subtitle-server-xxx.railway.app`)

### 주요 파일 설명

#### `main.py`
```python
# 자막 추출 순서:
# 1. yt-dlp 시도 (가장 강력)
# 2. youtube-transcript-api (프록시 사용)
# 3. youtube-transcript-api (프록시 없음 - 폴백)
```

#### `requirements.txt`
```
fastapi==0.104.1
uvicorn==0.24.0
youtube-transcript-api==1.2.1
yt-dlp==2024.11.18
python-dotenv==1.0.0
```

#### `Procfile`
```
web: uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

#### `runtime.txt`
```
python-3.11.6
```

---

## 3. Webshare 프록시 설정

### 개요
YouTube는 서버 IP를 차단하므로, 주거용(Residential) 프록시가 필요합니다.
Webshare는 `youtube-transcript-api`에서 공식 지원하는 프록시 서비스입니다.

### 가입 및 설정

#### 1단계: Webshare 가입
- https://www.webshare.io 접속
- 계정 생성

#### 2단계: 프록시 구매
1. Dashboard → "Rotating Residential" 선택
2. 가격: 월 $3.50 (1GB)
3. 국가: "United States" 또는 "Any" 선택

#### 3단계: 인증 정보 확인
Dashboard에서 확인:
- **Username**: 예) `cgxrybja`
- **Password**: 예) `qdynkbdbmegv`

#### 4단계: 환경 변수 설정
Railway와 Vercel에 추가:
```
WEBSHARE_PROXY_USERNAME=cgxrybja
WEBSHARE_PROXY_PASSWORD=qdynkbdbmegv
```

### 프록시 사용 코드
```python
from youtube_transcript_api import YouTubeTranscriptApi, WebshareProxyConfig

proxy_config = WebshareProxyConfig(
    proxy_username="cgxrybja",
    proxy_password="qdynkbdbmegv"
)

transcript = YouTubeTranscriptApi.get_transcript(
    video_id,
    proxies=proxy_config
)
```

---

## 4. Vercel 배포 (프론트엔드)

### 개요
Next.js 프론트엔드를 Vercel에 배포합니다.

### 배포 단계

#### 1단계: Vercel 연결
1. https://vercel.com 접속
2. GitHub 저장소 연결
3. Root Directory: `frontend` 설정

#### 2단계: 환경 변수 설정
Vercel Dashboard → Settings → Environment Variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Google APIs
GOOGLE_API_KEY=AIza...              # Google Cloud Translation API
NEXT_PUBLIC_GOOGLE_API_KEY=AIza...  # 클라이언트 측 사용

# 음성 인식 API
DEEPGRAM_API_KEY=...                # Deepgram STT

# 자막 서버 (Railway)
SUBTITLE_API_URL=https://subtitle-server-xxx.railway.app

# OAuth (선택)
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
```

⚠️ **주의**: `SUBTITLE_API_URL`에 후행 슬래시(`/`)를 넣지 마세요!
- ✅ 올바름: `https://subtitle-server-xxx.railway.app`
- ❌ 잘못됨: `https://subtitle-server-xxx.railway.app/`

---

## 5. 환경 변수 설정

### Railway (subtitle-server)
| 변수명 | 설명 | 예시 |
|--------|------|------|
| `WEBSHARE_PROXY_USERNAME` | Webshare 사용자명 | `cgxrybja` |
| `WEBSHARE_PROXY_PASSWORD` | Webshare 비밀번호 | `qdynkbdbmegv` |

### Vercel (frontend)
| 변수명 | 설명 | 필수 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | ✅ |
| `GOOGLE_API_KEY` | Google Cloud Translation API Key | ✅ |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | Google API (클라이언트) | ✅ |
| `DEEPGRAM_API_KEY` | Deepgram STT API Key | ✅ |
| `SUBTITLE_API_URL` | Railway 자막 서버 URL | ✅ |
| `NAVER_CLIENT_ID` | 네이버 OAuth Client ID | ❌ |
| `NAVER_CLIENT_SECRET` | 네이버 OAuth Secret | ❌ |

---

## 6. Supabase 데이터베이스 설정

### 필수 테이블

#### `video_subtitles_cache` (YouTube 다국어 캐시)

```sql
-- docs/supabase/video_subtitles_cache.sql 참조
CREATE TABLE video_subtitles_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR NOT NULL UNIQUE,
  video_title VARCHAR,
  original_lang VARCHAR NOT NULL,
  subtitles JSONB NOT NULL,
  translations JSONB DEFAULT '{}',
  summaries JSONB DEFAULT '{}',
  video_duration INTEGER,
  last_text_time INTEGER,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 (시청순 정렬)
CREATE INDEX idx_video_subtitles_cache_last_viewed_at 
ON video_subtitles_cache(last_viewed_at DESC NULLS LAST);
```

#### `translation_sessions` (실시간 통역 세션)

```sql
CREATE TABLE translation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_type VARCHAR DEFAULT 'mic',
  source_language VARCHAR,
  target_language VARCHAR,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  summary TEXT
);
```

#### `utterances` (발화 기록)

```sql
CREATE TABLE utterances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES translation_sessions(id) ON DELETE CASCADE,
  original_text TEXT,
  translated_text TEXT,
  start_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### SQL 파일 위치

| 파일 | 설명 |
|------|------|
| `docs/supabase/video_subtitles_cache.sql` | YouTube 캐시 테이블 |
| `docs/supabase/add_last_viewed_at.sql` | 시청 시각 컬럼 추가 |

---

## 트러블슈팅

### Railway 배포 실패
1. **Root Directory 미설정**: Settings에서 `subtitle-server` 설정
2. **Dockerfile 오류**: `railway.json`에서 `NIXPACKS` 빌더 사용
3. **PORT 오류**: Procfile에서 `${PORT:-8000}` 사용

### 자막 추출 실패
1. **YouTube 차단**: Webshare 프록시 환경변수 확인
2. **404 오류**: `SUBTITLE_API_URL` 후행 슬래시 제거
3. **프록시 미작동**: Webshare 대시보드에서 프록시 상태 확인

### Vercel 배포 실패
1. **보안 경고**: Next.js 버전 업데이트 (`^16.0.7` 이상)
2. **환경변수 누락**: 모든 필수 변수 설정 확인


