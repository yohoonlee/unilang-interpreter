# 변경 로그 (Changelog)

## 2024년 12월

### v2.3.0 - 실시간 통역 TTS 및 세션 관리 개선 (2024-12-07)

#### 🎯 주요 변경사항

##### 1. TTS (Text-to-Speech) 근본적 개선
- **문제**: 첫 번째 재생 시 대기시간 지연 + 앞부분 잘림
- **원인**: 브라우저 자동재생 정책으로 인한 AudioContext 비활성화
- **해결**: AudioContext 워밍업 시스템 구현

**YouTube vs mic 페이지 차이점 분석:**
| 페이지 | 상황 | 결과 |
|--------|------|------|
| YouTube live | `getDisplayMedia` 호출 → AudioContext 이미 활성화 | TTS 정상 |
| mic | TTS 버튼만 클릭 → AudioContext 비활성 | 첫 재생 문제 |

**해결 방법:**
```typescript
// 1. 페이지 첫 클릭 시 AudioContext 워밍업
const warmupAudioContext = async () => {
  const ctx = new AudioContext()
  await ctx.resume()
  
  // 무음 버퍼 재생으로 완전 워밍업
  const silentBuffer = ctx.createBuffer(1, sampleRate * 0.1, sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = silentBuffer
  source.start(0)
}

// 2. TTS 재생 전 워밍업 보장
const ensureAudioContextWarmedUp = async () => {
  if (audioContextWarmedUpRef.current) return ctx
  // 즉시 워밍업 수행...
}

// 3. 50ms 무음 버퍼 추가 (앞부분 잘림 방지)
const silenceSamples = Math.floor(0.05 * sampleRate)
newChannelData.set(originalData, silenceSamples)
```

##### 2. 세션 이어서 작업 기능
- **이전**: 마이크 중지 → 세션 종료 → 다시 시작 시 새 세션 생성
- **이후**: 마이크 중지 → 세션 유지 → 다시 시작 시 기존 세션에 이어서 작업

```typescript
// 중지 시 - 세션 종료하지 않음
console.log("⏸️ 마이크 중지 - 세션 유지:", sessionId)

// 재시작 시 - 기존 세션 활용
if (sessionId) {
  console.log("▶️ 기존 세션에 이어서 작업:", sessionId)
} else {
  const newSessionId = await createSession()
}
```

##### 3. 수동 병합 시간순 정렬 수정
- **문제**: 나중 문장이 먼저 병합되는 현상
- **원인**: `transcripts` 배열이 역순(최신이 위)으로 저장
- **해결**: 선택된 문장을 `timestamp` 기준 오름차순 정렬 후 병합

```typescript
const selectedItems = transcripts
  .filter(t => selectedForMerge.has(t.id))
  .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
```

##### 4. Web Speech API 완전 제거
- Google Cloud TTS로 완전 전환
- 폴백 코드 제거로 코드 단순화
- YouTube live 페이지와 동일한 구조로 통일

---

#### 🔧 기술적 변경사항

##### AudioContext 워밍업 프로세스
```
페이지 로드
  ↓
첫 번째 클릭 (아무 버튼)
  → AudioContext 생성
  → resume()
  → 무음 버퍼 재생 (워밍업)
  → audioContextWarmedUpRef = true
  ↓
TTS 버튼 클릭
  → ensureAudioContextWarmedUp() 
  → (이미 워밍업됨 → 스킵)
  → API 호출
  → 오디오 재생 ✅ 처음부터 정상!
```

##### 변경된 파일
| 파일 | 변경 내용 |
|------|----------|
| `frontend/app/service/translate/mic/page.tsx` | TTS AudioContext 방식, 세션 이어서 작업, 수동 병합 정렬 |

---

### v2.2.0 - 시청 기록 및 UI 개선 (2024-12-04)

#### 🎯 주요 변경사항

##### 1. 시청 기록 시스템
- `last_viewed_at` 컬럼 추가 (시청 시각 기록)
- 기록 목록: 최근 시청순 정렬 (DESC)
- 시간 표시: 로컬 시간으로 변환 (예: `2025. 12. 04. 오후 03:45`)

##### 2. YouTube 제목 자동 추출
- **oEmbed API** 사용하여 YouTube 제목 자동 가져오기
- `video_subtitles_cache.video_title` 컬럼에 저장
- 기록 목록에서 제목 표시

##### 3. 번역 언어별 별도 항목 표시
- 이전: 하나의 영상에 여러 언어 번역이 있어도 첫 번째만 표시
- 이후: 각 번역 언어별로 별도 항목으로 표시
```
video_id: KUYSytcly7s
├── 영어→한국어  (항목 1)
├── 영어→중국어  (항목 2)
├── 영어→일본어  (항목 3)
└── 영어→스페인어 (항목 4)
```

##### 4. YouTube 기록 UI 개선
- 썸네일 테두리 추가
- 영상 시간 표시 (분:초)
- "다시보기" / "요약보기" 버튼 색상 구분
- 투명 오버레이 배경

---

### v2.1.0 - 배치 번역 및 다국어 캐싱 (2024-12-04)

#### 🎯 주요 변경사항

##### 1. 배치 번역 (Batch Translation)
- Google Cloud Translation API 배치 호출
- 50개 문장씩 한번에 번역 → **속도 10배 향상**
- 기존: 문장마다 개별 API 호출 (느림)
- 변경: 배치로 묶어서 한번에 처리 (빠름)

##### 2. 다국어 캐싱 시스템 구현
- `video_subtitles_cache` 테이블 생성
- 원본 자막 + 다국어 번역본 JSONB 저장
- 백그라운드 멀티 번역 (한국어, 중국어, 일본어, 영어)

##### 3. 자막 다운로드 최적화
- 원본 자막이 캐시에 있으면 YouTube 다운로드 스킵
- 번역본만 추가 생성

##### 4. 언어 목록 확장 (19개 언어)
| 상위 5개 (우선 표시) | 기타 언어 (알파벳순) |
|---------------------|---------------------|
| 한국어, English, 中文, 日本語, Español | Arabic, Deutsch, Français, हिन्दी, Bahasa Indonesia, Italiano, Nederlands, Polski, Português, Русский, ภาษาไทย, Türkçe, Tiếng Việt |

---

### v2.0.0 - 통합 워크플로우 릴리스 (2024-12-04)

#### 🎯 주요 변경사항

##### 1. 통합 "실시간 통역" 버튼
기존 3개 버튼을 하나로 통합했습니다:
- ~~자막 추출~~ 
- ~~실시간 통역~~
- ~~빠른 요약~~
- → **실시간 통역** (통합)

**동작 방식:**
```
[실시간 통역] 버튼 클릭
        ↓
   기존 데이터 확인 (98% 이상?)
        ↓
    ┌──────┴──────┐
    ↓             ↓
 98% 이상       98% 미만
    ↓             ↓
 바로 재생     자막 추출 시도
                  ↓
              ┌───┴───┐
              ↓       ↓
           자막 있음  자막 없음
              ↓       ↓
           번역 수행  실시간 통역
              ↓       모드 전환
           AI 재처리
              ↓
           요약 생성
              ↓
           저장 & 재생
```

##### 2. 기존 데이터 완성도 체크
- 동일한 영상 재방문 시 기존 데이터 확인
- **98% 이상** 완성 시 바로 재생 모드로 전환
- 완성도 계산: `마지막 자막 시간 / 영상 총 시간 × 100`

##### 3. 이중 저장 시스템
- **LocalStorage**: 즉시 저장 (오프라인 지원)
- **Supabase**: 백그라운드 저장 (영구 보관)

---

#### 🎨 UI/UX 개선

##### 1. YouTube 페이지 햄버거 메뉴
- 기존: 별도 `📋 기록` 버튼
- 변경: 우측 상단 `☰` 햄버거 아이콘
- 슬라이드 패널로 히스토리 목록 표시

##### 2. 히스토리 기능 강화
| 기능 | 설명 |
|------|------|
| 다시보기 | 저장된 자막과 함께 영상 재생 |
| 요약보기 | AI 요약 모달로 표시 |
| 삭제 | 히스토리 항목 삭제 |

##### 3. 실시간 통역 페이지 메뉴 이동
- 기존: 시작 버튼 옆 햄버거 아이콘
- 변경: 헤더 우측 상단으로 이동

---

#### 🔧 인프라 구축

##### 1. Railway 자막 서버 배포
- Python FastAPI 서버
- YouTube 자막 추출 전용
- Webshare 프록시 통합

##### 2. Webshare 프록시 연동
- 월 $3.50 주거용 프록시
- YouTube 서버 차단 우회
- `youtube-transcript-api` 공식 지원

##### 3. 자막 추출 다중 폴백
```
1단계: yt-dlp (프록시)
   ↓ 실패
2단계: youtube-transcript-api (프록시)
   ↓ 실패
3단계: youtube-transcript-api (프록시 없음)
   ↓ 실패
4단계: 실시간 통역 모드로 자동 전환
```

---

#### 📁 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/app/service/translate/youtube/page.tsx` | 통합 버튼, 98% 체크, 햄버거 메뉴 |
| `frontend/app/service/translate/youtube/live/page.tsx` | 자막 처리 워크플로우, 저장 데이터 로드 |
| `frontend/app/service/translate/mic/page.tsx` | 햄버거 메뉴 위치 이동 |
| `frontend/app/api/youtube/transcript/route.ts` | Railway 서버 연동 |
| `subtitle-server/main.py` | Webshare 프록시, 다중 폴백 |
| `subtitle-server/requirements.txt` | yt-dlp 추가 |

---

#### 🐛 버그 수정

1. **자막 추출 실패 문제**
   - 원인: YouTube 서버 차단
   - 해결: Webshare 프록시 + Railway 서버

2. **404 오류 (외부 API)**
   - 원인: `SUBTITLE_API_URL` 후행 슬래시
   - 해결: 슬래시 제거

3. **Next.js 보안 취약점**
   - 해결: `next@^16.0.7`로 업데이트

---

### v1.x - 이전 버전

#### v1.3.0 - 자막 업로드 기능
- SRT/VTT/TXT 파일 업로드 지원
- 업로드된 자막으로 영상 싱크 재생

#### v1.2.0 - 빠른 요약 모드
- 영상 끝까지 자막 추출 후 AI 요약
- 전체 영상 내용 한눈에 파악

#### v1.1.0 - 실시간 통역 모드
- 마이크 모드: Web Speech API
- 시스템 오디오 모드: Deepgram API
- 실시간 번역 및 자막 표시

#### v1.0.0 - 초기 릴리스
- YouTube 자막 추출
- 다국어 번역
- Supabase 인증

---

## 향후 계획

### 단기 (1-2주)
- [x] ~~실시간 통역 종료 시 자동 AI 재처리/요약~~ → 회의록 자동작성 기능으로 구현
- [ ] 히스토리 검색 기능
- [ ] 오프라인 모드 강화

### 중기 (1-2개월)
- [ ] 다중 화자 분리 (Speaker Diarization)
- [x] ~~회의록 자동 생성~~ → 문서정리 + 회의록 보기 기능 구현 완료
- [ ] 공유 기능

### 장기
- [ ] 모바일 앱
- [ ] 브라우저 확장 프로그램
- [ ] 실시간 자막 방송


