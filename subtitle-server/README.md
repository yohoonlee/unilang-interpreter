# YouTube Subtitle API Server

YouTube 자막을 추출하는 Python FastAPI 서버입니다.

## 🚀 Railway 배포 (무료)

### 1. Railway 가입
[https://railway.app](https://railway.app)에서 GitHub으로 로그인

### 2. 새 프로젝트 생성
1. "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. 이 저장소 선택
4. `subtitle-server` 폴더를 Root Directory로 설정

### 3. 환경 변수 (필요 없음)
이 서버는 환경 변수가 필요 없습니다.

### 4. 배포 완료
Railway가 자동으로 빌드하고 배포합니다.
배포 URL 예시: `https://subtitle-server-production.up.railway.app`

## 📡 API 사용법

### 자막 가져오기 (POST)

```bash
curl -X POST "https://YOUR_RAILWAY_URL/api/subtitles" \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://www.youtube.com/watch?v=VIDEO_ID", "languages": ["ko", "en"]}'
```

### 자막 가져오기 (GET)

```bash
curl "https://YOUR_RAILWAY_URL/api/subtitles/VIDEO_ID?lang=ko"
```

### 응답 예시

```json
{
  "success": true,
  "video_id": "VIDEO_ID",
  "language": "en",
  "subtitles": [
    {"text": "Hello", "start": 0.0, "duration": 2.5},
    {"text": "World", "start": 2.5, "duration": 3.0}
  ],
  "available_languages": ["en", "ko", "ja"]
}
```

## 🔗 UniLang 연동

UniLang의 환경 변수에 추가:

```env
SUBTITLE_API_URL=https://YOUR_RAILWAY_URL
```

## 💰 비용

Railway 무료 플랜:
- 월 500시간 실행 시간
- 월 $5 크레딧 (충분)

