# 인프라 설정 가이드

## 목차
1. [Railway 배포 (자막 서버)](#1-railway-배포-자막-서버)
2. [Webshare 프록시 설정](#2-webshare-프록시-설정)
3. [Vercel 배포 (프론트엔드)](#3-vercel-배포-프론트엔드)
4. [환경 변수 설정](#4-환경-변수-설정)

---

## 1. Railway 배포 (자막 서버)

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

## 2. Webshare 프록시 설정

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

## 3. Vercel 배포 (프론트엔드)

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

# AI APIs
GEMINI_API_KEY=AIza...
DEEPGRAM_API_KEY=...

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

## 4. 환경 변수 설정

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
| `GEMINI_API_KEY` | Google Gemini API Key | ✅ |
| `DEEPGRAM_API_KEY` | Deepgram API Key | ✅ |
| `SUBTITLE_API_URL` | Railway 자막 서버 URL | ✅ |
| `NAVER_CLIENT_ID` | 네이버 OAuth Client ID | ❌ |
| `NAVER_CLIENT_SECRET` | 네이버 OAuth Secret | ❌ |

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

