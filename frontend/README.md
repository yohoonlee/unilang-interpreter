# Real-time translation app

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/leeyohoon-3990s-projects/v0-real-time-translation-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/tgwjixQRmjl)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/leeyohoon-3990s-projects/v0-real-time-translation-app](https://vercel.com/leeyohoon-3990s-projects/v0-real-time-translation-app)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/tgwjixQRmjl](https://v0.app/chat/tgwjixQRmjl)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

---

## 🔧 환경 변수 설정

### 필수 환경 변수 (Vercel에 설정)

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `GOOGLE_API_KEY` | Google Cloud API 키 (번역, AI 재정리) | [Google Cloud Console](https://console.cloud.google.com/) |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | 클라이언트용 Google API 키 | 위와 동일 |
| `ASSEMBLYAI_API_KEY` | AssemblyAI 실시간 STT API 키 | [AssemblyAI](https://www.assemblyai.com/) |

### AssemblyAI API 키 발급 방법

1. [AssemblyAI 회원가입](https://www.assemblyai.com/app/signup)
2. 대시보드에서 **API Key** 복사
3. Vercel 환경 변수에 `ASSEMBLYAI_API_KEY` 추가
4. 재배포

### Google API 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. **Cloud Translation API** 활성화
3. **Generative Language API** 활성화 (AI 재정리용)
4. API 키 생성 (키 제한사항: 없음 또는 IP 주소)
5. Vercel 환경 변수에 등록

---

## 🎬 YouTube 실시간 통역 기능

### 사용 방법

1. YouTube 통역 페이지에서 URL 입력
2. **"실시간 통역"** 버튼 클릭
3. 새 탭에서 전용 페이지 열림
4. 화면 공유 팝업에서:
   - **Chrome 탭** 선택
   - **새로 열린 UniLang 탭** 선택
   - **"탭 오디오도 공유"** 체크 ✅
   - **"공유"** 클릭
5. YouTube 영상 재생
6. 화면 하단에 실시간 자막 표시!

### 기술 스택

- **AssemblyAI Real-time API**: 시스템 오디오를 직접 캡처하여 높은 정확도의 STT 제공
- **Google Cloud Translation API**: 실시간 번역
- **WebSocket**: 실시간 양방향 통신