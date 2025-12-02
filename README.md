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

### 5. 🎙️ 화자 구분 (Speaker Diarization) ✨ NEW
- AssemblyAI 기반 화자 자동 구분
- 무제한 화자 수 지원
- 회의 후 화자-참석자 매칭 기능
- 화자별 발언 통계

### 6. 📺 YouTube 통역 ✨ NEW
- YouTube URL 직접 입력으로 자동 전사
- **YouTube 자막 API 사용** (자막이 있는 영상만 지원)
- 다국어 번역 + SRT 자막 파일 다운로드
- Google Gemini 기반 AI 요약 기능

### 7. 🎥 화상회의 통역 ✨ NEW
- **Zoom, Teams, Meet, Discord** 등 모든 플랫폼 지원
- 시스템 오디오 캡처 방식 (범용)
- 화자 구분 + 실시간 번역
- 회의 종료 후 AI 요약

### 8. 💰 과금 시스템
- 시간 단위 사용량 추적
- 4가지 요금제 (무료, 베이직, 프로, 엔터프라이즈)
- 종량제 옵션
- 크레딧 충전 시스템

## 🛠️ 기술 스택

### Backend
- **Framework**: Python FastAPI / Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Real-time**: WebSocket
- **AI Services**:
  - **AssemblyAI** - STT + 화자 구분 (Speaker Diarization) ✨ NEW
  - Google Translate API (번역)
  - AssemblyAI LeMUR / Google Gemini (요약)

### Frontend
- **Framework**: Next.js 16 + TypeScript
- **State Management**: React Hooks + Context
- **Styling**: Tailwind CSS + Shadcn UI
- **Animation**: Framer Motion

### 🎙️ AssemblyAI 통합 (화자 구분)

| 기능 | 설명 |
|------|------|
| **STT** | 고정밀 음성→텍스트 변환 |
| **Speaker Diarization** | 화자별 자동 구분 (무제한) |
| **LeMUR** | AI 기반 회의 요약 |
| **YouTube 지원** | URL 직접 입력으로 자동 처리 |

```javascript
// AssemblyAI SDK 사용 예시
import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

const transcript = await client.transcripts.transcribe({
  audio: audioUrl,
  speaker_labels: true,  // 화자 구분 활성화
  language_code: "ko",   // 한국어
});

// 결과: 화자별 분리된 텍스트
transcript.utterances.forEach(utterance => {
  console.log(`화자 ${utterance.speaker}: ${utterance.text}`);
});
```

## 📱 서비스 페이지

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 실시간 통역 | `/service/translate/mic` | Web Speech API 기반 실시간 STT + 번역 |
| 녹음 통역 | `/service/translate/record` | AssemblyAI 화자 구분 + 녹음 전사 |
| 화상회의 통역 | `/service/translate/meeting` | 시스템 오디오 캡처 (Zoom/Teams/Meet) |
| YouTube 통역 | `/service/translate/youtube` | YouTube URL 자동 전사 + 번역 |
| 통역 기록 | `/service/history` | 저장된 통역 세션 조회 |

## 🔌 API 엔드포인트 (Frontend - Next.js API Routes)

### AssemblyAI (화자 구분, 녹음 통역)

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/assemblyai/transcribe` | POST | 오디오 전사 (화자 구분) |
| `/api/assemblyai/upload` | POST | 오디오 파일 업로드 |
| `/api/assemblyai/summarize` | POST | LeMUR AI 요약 |
| `/api/assemblyai/realtime` | POST | 실시간 전사 토큰 발급 |
| `/api/assemblyai/speakers` | GET/POST | 화자 매칭 관리 |

### YouTube (YouTube 통역)

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/youtube/transcript` | POST | YouTube 자막 추출 + 번역 |

> ⚠️ **참고**: YouTube는 AssemblyAI가 아닌 `youtube-transcript` 패키지를 사용합니다.
> AssemblyAI는 YouTube URL을 직접 지원하지 않습니다.

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

#### Vercel 환경변수 (Frontend)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Cloud
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-api-key

# AssemblyAI (화자 구분) ✨ NEW
ASSEMBLYAI_API_KEY=your-assemblyai-api-key

# OAuth (소셜 로그인)
NEXT_PUBLIC_KAKAO_CLIENT_ID=your-kakao-client-id
NEXT_PUBLIC_NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
```

#### Backend (.env) - 확장 시

```env
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-cloud-key.json
GOOGLE_PROJECT_ID=your-project-id

# AssemblyAI
ASSEMBLYAI_API_KEY=your-assemblyai-api-key

# 화상회의 플랫폼 (향후 확장)
ZOOM_API_KEY=your-zoom-api-key
ZOOM_API_SECRET=your-zoom-api-secret
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

## ☁️ Google Cloud API 설정

UniLang은 다음 Google Cloud API를 사용합니다. **반드시 활성화해야 합니다.**

### 필수 API 목록

| API | 용도 | 활성화 링크 |
|-----|------|-------------|
| **Cloud Translation API** | 실시간 번역 | [활성화](https://console.cloud.google.com/apis/library/translate.googleapis.com) |
| **Generative Language API** | AI 재정리, 요약 (Gemini) | [활성화](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) |
| Cloud Speech-to-Text API | 음성 인식 (선택) | [활성화](https://console.cloud.google.com/apis/library/speech.googleapis.com) |

### API 활성화 방법

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 (없으면 새로 생성)
3. **API 및 서비스** > **라이브러리** 이동
4. 각 API 검색 후 **"사용"** 버튼 클릭
5. **API 키 생성**: API 및 서비스 > 사용자 인증 정보 > API 키 생성

### Generative Language API (Gemini) - 중요 ⚠️

AI 재정리 및 요약 기능에 **필수**입니다.

```
에러 메시지:
"Generative Language API has not been used in project XXXXX before or it is disabled"
```

**해결 방법**:
1. [Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) 접속
2. **"사용"(ENABLE)** 버튼 클릭
3. 활성화 후 2~3분 대기

### API 키 권한 설정 (권장)

보안을 위해 API 키에 제한을 설정하세요:

1. [API 키 관리](https://console.cloud.google.com/apis/credentials) 접속
2. 해당 API 키 클릭
3. **API 제한사항** > "키 제한" 선택
4. 다음 API만 허용:
   - Cloud Translation API
   - Generative Language API
5. **애플리케이션 제한사항** (선택):
   - HTTP 리퍼러: `https://your-domain.vercel.app/*`

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

### 현재 구성 (AssemblyAI + Google Translate)

| 서비스 | 단가 | 시간당 비용 | 기능 |
|--------|------|-------------|------|
| **AssemblyAI** | $0.011/분 | **$0.66** | STT + 화자 구분 + 요약 |
| Google Translate | $20/100만자 | ~$0.30 | 번역 |
| **합계** | - | **~$0.96 (≈₩1,300)** | - |

### 이전 구성 (Google Only) - 참고용

| 서비스 | 단가 | 시간당 비용 |
|--------|------|-------------|
| Google STT (Enhanced) | $0.036/분 | $2.16 |
| Google Translate | $20/100만자 | ~$1.80 |
| Google Gemini (요약) | - | ~$0.003 |
| **합계** | - | **~$4.00 (≈₩5,400)** |

### 💡 비용 절감 효과
- **AssemblyAI 전환으로 약 75% 비용 절감**
- 화자 구분 기능 추가 (Google은 미지원)
- 더 정확한 STT 품질

## 📄 라이선스

MIT License

## 🤝 기여

Pull Request와 Issue를 환영합니다!

