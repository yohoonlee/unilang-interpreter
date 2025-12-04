from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
from pydantic import BaseModel
from typing import List, Optional
import re
import os

app = FastAPI(title="YouTube Subtitle API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def extract_video_id(url: str) -> str | None:
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

@app.get("/")
def root():
    return {"message": "YouTube Subtitle API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/api/subtitles", response_model=SubtitleResponse)
def get_subtitles(request: SubtitleRequest):
    """YouTube 자막 추출 API"""
    
    video_id = extract_video_id(request.youtube_url)
    if not video_id:
        raise HTTPException(status_code=400, detail="유효하지 않은 YouTube URL입니다")
    
    try:
        # 사용 가능한 자막 목록 가져오기
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        available_languages = [t.language_code for t in transcript_list]
        
        # 우선순위에 따라 자막 가져오기
        transcript = None
        used_language = None
        
        for lang in request.languages:
            try:
                transcript = transcript_list.find_transcript([lang])
                used_language = lang
                break
            except NoTranscriptFound:
                continue
        
        # 요청 언어가 없으면 첫 번째 자막 사용
        if transcript is None:
            transcript = list(transcript_list)[0]
            used_language = transcript.language_code
        
        # 자막 데이터 가져오기
        subtitle_data = transcript.fetch()
        
        subtitles = [
            SubtitleItem(
                text=item['text'],
                start=item['start'],
                duration=item['duration']
            )
            for item in subtitle_data
        ]
        
        return SubtitleResponse(
            success=True,
            video_id=video_id,
            language=used_language,
            subtitles=subtitles,
            available_languages=available_languages
        )
        
    except TranscriptsDisabled:
        raise HTTPException(status_code=400, detail="이 영상은 자막이 비활성화되어 있습니다")
    except NoTranscriptFound:
        raise HTTPException(status_code=404, detail="자막을 찾을 수 없습니다")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/subtitles/{video_id}")
def get_subtitles_by_id(video_id: str, lang: str = "ko"):
    """비디오 ID로 자막 가져오기 (GET 방식)"""
    return get_subtitles(SubtitleRequest(
        youtube_url=f"https://www.youtube.com/watch?v={video_id}",
        languages=[lang, "en", "ko", "ja"]
    ))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

