from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import re
import sys

print("🚀 서버 시작 중...", flush=True)

# youtube-transcript-api v1.0+ 새로운 인터페이스
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api.proxies import WebshareProxyConfig
    print("✅ youtube-transcript-api 로드 성공", flush=True)
except Exception as e:
    print(f"❌ youtube-transcript-api 로드 실패: {e}", flush=True)
    sys.exit(1)

print("📦 FastAPI 앱 초기화...", flush=True)
app = FastAPI(title="YouTube Subtitle API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Webshare 프록시 설정 (환경변수에서 읽기)
WEBSHARE_PROXY_USERNAME = os.getenv("WEBSHARE_PROXY_USERNAME")
WEBSHARE_PROXY_PASSWORD = os.getenv("WEBSHARE_PROXY_PASSWORD")

class SubtitleRequest(BaseModel):
    youtube_url: str
    languages: List[str] = ["ko", "en", "ja", "zh"]

class SubtitleItem(BaseModel):
    text: str
    start: float
    duration: float

class SubtitleResponse(BaseModel):
    success: bool
    video_id: str
    language: str
    subtitles: List[SubtitleItem]
    available_languages: List[str]
    error: Optional[str] = None

def extract_video_id(url: str) -> Optional[str]:
    """YouTube URL에서 비디오 ID 추출"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'^([a-zA-Z0-9_-]{11})$',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_youtube_transcript_api():
    """Webshare 프록시가 설정되어 있으면 프록시 사용, 아니면 일반 API 반환"""
    if WEBSHARE_PROXY_USERNAME and WEBSHARE_PROXY_PASSWORD:
        print(f"🌐 Webshare 프록시 사용 (username: {WEBSHARE_PROXY_USERNAME[:4]}...)")
        return YouTubeTranscriptApi(
            proxy_config=WebshareProxyConfig(
                proxy_username=WEBSHARE_PROXY_USERNAME,
                proxy_password=WEBSHARE_PROXY_PASSWORD
            )
        )
    else:
        print("⚠️ Webshare 프록시 미설정 - 직접 연결 시도")
        return YouTubeTranscriptApi()

def get_subtitles(video_id: str, languages: List[str]) -> Optional[dict]:
    """YouTube 자막 가져오기"""
    try:
        ytt_api = get_youtube_transcript_api()
        
        print(f"📥 자막 목록 조회: {video_id}")
        
        # 새로운 API: list() 사용
        transcript_list = ytt_api.list(video_id)
        
        # 사용 가능한 언어 목록
        available_languages = []
        for transcript in transcript_list:
            available_languages.append(transcript.language_code)
        
        print(f"📋 사용 가능한 자막: {available_languages}")
        
        # 우선순위에 따라 자막 선택
        selected_transcript = None
        selected_language = None
        
        for lang in languages:
            try:
                selected_transcript = transcript_list.find_transcript([lang])
                selected_language = lang
                print(f"✅ 선택된 자막: {lang}")
                break
            except:
                continue
        
        # 선호 언어가 없으면 첫 번째 자막 사용
        if selected_transcript is None:
            for transcript in transcript_list:
                selected_transcript = transcript
                selected_language = transcript.language_code
                print(f"✅ 첫 번째 자막 사용: {selected_language}")
                break
        
        if selected_transcript is None:
            print("❌ 사용 가능한 자막 없음")
            return None
        
        # 자막 데이터 가져오기
        subtitle_data = selected_transcript.fetch()
        
        subtitles = [
            {
                "text": item.text,
                "start": item.start,
                "duration": item.duration
            }
            for item in subtitle_data
        ]
        
        print(f"✅ 자막 {len(subtitles)}개 로드 완료")
        
        return {
            "language": selected_language,
            "subtitles": subtitles,
            "available_languages": available_languages
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ 자막 추출 에러: {type(e).__name__}: {error_msg}")
        
        # 에러 유형에 따른 메시지
        if "RequestBlocked" in error_msg or "IpBlocked" in error_msg:
            print("🚫 YouTube가 요청을 차단했습니다. Webshare 프록시가 필요합니다.")
        elif "TranscriptsDisabled" in error_msg:
            print("🚫 이 영상은 자막이 비활성화되어 있습니다.")
        elif "NoTranscriptFound" in error_msg:
            print("🚫 이 영상에는 자막이 없습니다.")
        
        return None

@app.get("/")
def root():
    proxy_status = "enabled" if (WEBSHARE_PROXY_USERNAME and WEBSHARE_PROXY_PASSWORD) else "disabled"
    return {
        "message": "YouTube Subtitle API",
        "status": "running",
        "version": "3.0",
        "proxy": proxy_status
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/api/subtitles", response_model=SubtitleResponse)
def api_get_subtitles(request: SubtitleRequest):
    """YouTube 자막 추출 API (POST)"""
    
    video_id = extract_video_id(request.youtube_url)
    if not video_id:
        raise HTTPException(status_code=400, detail="유효하지 않은 YouTube URL입니다")
    
    print(f"\n{'='*50}")
    print(f"🎬 자막 추출 요청: {video_id}")
    print(f"📝 선호 언어: {request.languages}")
    print(f"{'='*50}")
    
    result = get_subtitles(video_id, request.languages)
    
    if not result or not result.get("subtitles"):
        raise HTTPException(
            status_code=404, 
            detail="자막을 찾을 수 없습니다. 영상에 자막이 없거나, YouTube가 요청을 차단했을 수 있습니다."
        )
    
    print(f"\n✅ 최종 결과: {len(result['subtitles'])}개 자막 ({result['language']})")
    
    return SubtitleResponse(
        success=True,
        video_id=video_id,
        language=result["language"],
        subtitles=[SubtitleItem(**s) for s in result["subtitles"]],
        available_languages=result.get("available_languages", [])
    )

@app.get("/api/subtitles/{video_id}")
def api_get_subtitles_by_id(video_id: str, lang: str = "ko"):
    """비디오 ID로 자막 가져오기 (GET)"""
    return api_get_subtitles(SubtitleRequest(
        youtube_url=f"https://www.youtube.com/watch?v={video_id}",
        languages=[lang, "en", "ko", "ja", "zh"]
    ))

@app.get("/api/status")
def api_status():
    """API 상태 및 프록시 설정 확인"""
    return {
        "status": "running",
        "proxy_configured": bool(WEBSHARE_PROXY_USERNAME and WEBSHARE_PROXY_PASSWORD),
        "proxy_username": WEBSHARE_PROXY_USERNAME[:4] + "..." if WEBSHARE_PROXY_USERNAME else None
    }

# 시작 이벤트
@app.on_event("startup")
async def startup_event():
    print("=" * 50, flush=True)
    print("🎉 YouTube Subtitle API 서버 시작 완료!", flush=True)
    print(f"📡 프록시 설정: {'✅' if WEBSHARE_PROXY_USERNAME else '❌'}", flush=True)
    print("=" * 50, flush=True)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"🔧 PORT: {port}", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=port)
