# 🌐 UniLang Interpreter

실시간 다국어 통역 서비스 - 화상회의, YouTube, 영상통화, 로컬 미디어 지원

## 📋 주요 기능

### 1. 실시간 음성 인식 및 자막
- Google Speech-to-Text 기반 실시간 음성 인식
- 화자별 구분된 자막 표시
- 14개 이상 언어 지원
- **원본 + 번역 텍스트 동시 표시**
- **언어별 선택적 보기 기능**

### 2. 실시간 다국어 번역
- Google Translate API 기반 번역
- 참여자별 선호 언어로 자막 자동 번역
- 실시간 WebSocket 통신
- **다중 언어 동시 번역**

### 3. 회의 기록 및 요약
- 원본 + 번역 텍스트 저장
- Google Gemini 기반 AI 요약
- 참여자별 언어로 요약 제공
- **기록 보관 기간 요금제별 차등**

### 4. 다중 플랫폼 지원

#### 화상회의 📹
- ✅ Zoom
- ✅ Microsoft Teams
- ✅ Google Meet
- ✅ Cisco Webex

#### 영상 플랫폼 📺
- ✅ YouTube (녹화 영상)
- ✅ YouTube Live (실시간)
- ✅ Twitch
- ✅ Vimeo

#### 영상통화 📱
- ✅ FaceTime
- ✅ Skype
- ✅ Discord
- ✅ 카카오톡
- ✅ LINE

#### 로컬 미디어 📁
- ✅ 영상 파일 (MP4, MKV, AVI, MOV, WEBM)
- ✅ 오디오 파일 (MP3, WAV, M4A, AAC)
- ✅ 화면/시스템 오디오 캡처

### 5. 💰 과금 시스템
- 시간 단위 사용량 추적
- 4가지 요금제 (무료, 베이직, 프로, 엔터프라이즈)
- 종량제 옵션
- 크레딧 충전 시스템

## 🛠️ 기술 스택

### Backend
- **Framework**: Python FastAPI
- **Database**: Supabase (PostgreSQL)
- **Real-time**: WebSocket
- **AI Services**:
  - Google Speech-to-Text (STT)
  - Google Translate API (번역)
  - Google Gemini (요약)

### Frontend
- **Framework**: React 18 + TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **HTTP Client**: Axios + React Query

## 📁 프로젝트 구조

```
Real-time interpretation service/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints/        # API 엔드포인트
│   │   │       ├── meetings.py
│   │   │       ├── translations.py
│   │   │       ├── media_sources.py  # 미디어 소스
│   │   │       └── billing.py        # 과금
│   │   ├── core/                 # 설정, DB, 로깅
│   │   ├── schemas/              # Pydantic 스키마
│   │   │   ├── media_source.py   # 미디어 소스 스키마
│   │   │   └── billing.py        # 과금 스키마
│   │   └── services/             # 비즈니스 로직
│   │       ├── platform_adapters/ # 플랫폼 어댑터
│   │       ├── media_source_service.py
│   │       └── billing_service.py
│   ├── supabase/
│   │   ├── schema.sql            # 기본 DB 스키마
│   │   └── schema_extended.sql   # 확장 스키마 (미디어/과금)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── meeting/          # 회의 관련
│   │   │   ├── media/            # 미디어 소스 선택
│   │   │   │   ├── MediaSourceSelector.tsx
│   │   │   │   └── TranslationSettings.tsx
│   │   │   └── billing/          # 과금 관련
│   │   │       ├── PricingPlans.tsx
│   │   │       └── UsageDisplay.tsx
│   │   ├── hooks/                # Custom Hooks
│   │   ├── lib/                  # 유틸리티
│   │   ├── pages/                # 페이지
│   │   ├── store/                # 상태 관리
│   │   └── types/
│   │       ├── media.ts          # 미디어 타입
│   │       └── billing.ts        # 과금 타입
│   ├── package.json
│   └── vite.config.ts
└── docs/
    ├── UniLang_Interpreter_Technical_Design_v1.0.docx
    └── PRICING_AND_COST_ANALYSIS.md  # 가격 체계 문서
```

## 🚀 시작하기

### 사전 요구사항

- Python 3.10+
- Node.js 18+
- Supabase 계정
- Google Cloud 계정 (API 키)

### 환경 변수 설정

#### Backend (.env)

```env
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-cloud-key.json
GOOGLE_PROJECT_ID=your-project-id
GEMINI_API_KEY=your-gemini-api-key

# Zoom
ZOOM_API_KEY=your-zoom-api-key
ZOOM_API_SECRET=your-zoom-api-secret

# Microsoft Teams
MS_TEAMS_CLIENT_ID=your-teams-client-id
MS_TEAMS_CLIENT_SECRET=your-teams-client-secret
MS_TEAMS_TENANT_ID=your-teams-tenant-id

# Google Meet
GOOGLE_MEET_CLIENT_ID=your-meet-client-id
GOOGLE_MEET_CLIENT_SECRET=your-meet-client-secret

# Webex
WEBEX_CLIENT_ID=your-webex-client-id
WEBEX_CLIENT_SECRET=your-webex-client-secret
```

### Backend 설치 및 실행

```bash
cd backend

# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt

# Supabase 스키마 적용
# Supabase Dashboard > SQL Editor에서 supabase/schema.sql 실행

# 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend 설치 및 실행

```bash
cd frontend

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```

### 접속
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs

## 📡 API 엔드포인트

### Meetings
- `POST /api/v1/meetings` - 회의 생성
- `GET /api/v1/meetings` - 회의 목록
- `GET /api/v1/meetings/{id}` - 회의 상세
- `POST /api/v1/meetings/{id}/start` - 회의 시작
- `POST /api/v1/meetings/{id}/end` - 회의 종료

### Participants
- `POST /api/v1/participants` - 참여자 추가
- `POST /api/v1/participants/meeting/{id}/join` - 회의 참여
- `PATCH /api/v1/participants/{id}/language` - 언어 변경

### Translations
- `POST /api/v1/translations/translate` - 텍스트 번역
- `GET /api/v1/translations/languages` - 지원 언어

### Summaries
- `POST /api/v1/summaries/generate` - 요약 생성
- `GET /api/v1/summaries/meeting/{id}` - 요약 조회

### Media Sources (확장)
- `GET /api/v1/media/sources` - 지원 미디어 소스 목록
- `GET /api/v1/media/sources/categories` - 카테고리별 소스
- `POST /api/v1/media/sessions` - 미디어 세션 생성
- `GET /api/v1/media/sessions` - 세션 목록
- `POST /api/v1/media/sessions/{id}/end` - 세션 종료
- `GET /api/v1/media/youtube/info` - YouTube 영상 정보
- `GET /api/v1/media/upload/formats` - 지원 파일 형식
- `POST /api/v1/media/upload/url` - 업로드 URL 생성
- `PATCH /api/v1/media/sessions/{id}/display-settings` - 번역 표시 설정

### Billing (과금)
- `GET /api/v1/billing/pricing` - 요금제 목록
- `GET /api/v1/billing/estimate` - 비용 예측
- `GET /api/v1/billing/subscription` - 구독 정보
- `POST /api/v1/billing/subscription` - 구독 생성/변경
- `GET /api/v1/billing/usage` - 사용량 조회
- `GET /api/v1/billing/invoices` - 청구서 목록
- `GET /api/v1/billing/credits` - 크레딧 잔액
- `POST /api/v1/billing/credits` - 크레딧 충전

### WebSocket
- `WS /api/v1/ws/meeting/{meeting_id}` - 실시간 연결

## 🔧 플랫폼 연동 설정

### Zoom
1. [Zoom Marketplace](https://marketplace.zoom.us/)에서 앱 생성
2. OAuth 자격 증명 발급
3. Webhook URL 설정

### Microsoft Teams
1. [Azure Portal](https://portal.azure.com/)에서 앱 등록
2. Graph API 권한 설정
3. 클라이언트 시크릿 생성

### Google Meet
1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. Calendar API, Meet API 활성화
3. OAuth 2.0 자격 증명 생성

### Cisco Webex
1. [Webex Developer](https://developer.webex.com/)에서 앱 생성
2. OAuth 통합 설정
3. 필요한 스코프 권한 요청

## 🌍 지원 언어

| 코드 | 언어 |
|------|------|
| ko | 한국어 |
| en | English |
| ja | 日本語 |
| zh | 中文 |
| es | Español |
| fr | Français |
| de | Deutsch |
| pt | Português |
| ru | Русский |
| ar | العربية |
| hi | हिन्दी |
| vi | Tiếng Việt |
| th | ไทย |
| id | Bahasa Indonesia |

## 💰 요금제

| 요금제 | 월 가격 | 포함 시간 | 초과 요금 | 주요 기능 |
|--------|---------|-----------|-----------|-----------|
| **무료** | ₩0 | 30분 | ₩250/분 | 3개 언어, 7일 보관 |
| **베이직** | ₩9,900 | 5시간 | ₩200/분 | 5개 언어, AI 요약, 30일 보관 |
| **프로** | ₩29,900 | 20시간 | ₩150/분 | 전체 언어, API 접근, 90일 보관 |
| **엔터프라이즈** | 문의 | 무제한 | ₩100/분 | 전용 서버, SLA 보장 |

### 종량제 (Pay-as-you-go)
- 분당 **₩250** (요금제 없이 사용)
- 최소 과금 단위: 1분

## 📊 API 원가 (참고)

| 서비스 | 단가 | 시간당 비용 |
|--------|------|-------------|
| Google STT (Enhanced) | $0.036/분 | $2.16 |
| Google Translate | $20/100만자 | ~$1.80 |
| Google Gemini (요약) | - | ~$0.003 |
| **합계** | - | **~$4.00 (≈₩5,400)** |

## 📄 라이선스

MIT License

## 🤝 기여

Pull Request와 Issue를 환영합니다!

