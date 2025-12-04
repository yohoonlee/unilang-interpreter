from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
from pydantic import BaseModel
from typing import List, Optional
import subprocess
import json
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

def get_subtitles_with_ytdlp(video_id: str, lang: str = "ko") -> Optional[dict]:
    """yt-dlp를 사용하여 자막 가져오기"""
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        # yt-dlp로 자막 정보 가져오기
        cmd = [
            "yt-dlp",
            "--skip-download",
            "--write-sub",
            "--write-auto-sub",
            "--sub-langs", f"{lang},en,ko,ja,zh",
            "--sub-format", "json3",
            "--dump-json",
            url
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            print(f"yt-dlp error: {result.stderr}")
            return None
            
        video_info = json.loads(result.stdout)
        
        # 자막 URL 찾기
        subtitles_info = video_info.get("subtitles", {})
        automatic_captions = video_info.get("automatic_captions", {})
        
        # 사용 가능한 언어 목록
        available_langs = list(subtitles_info.keys()) + list(automatic_captions.keys())
        available_langs = list(set(available_langs))
        
        # 우선순위에 따라 자막 선택
        lang_priority = [lang, "ko", "en", "ja", "zh"]
        selected_lang = None
        subtitle_url = None
        
        for l in lang_priority:
            if l in subtitles_info and subtitles_info[l]:
                for fmt in subtitles_info[l]:
                    if fmt.get("ext") == "json3":
                        subtitle_url = fmt.get("url")
                        selected_lang = l
                        break
                if subtitle_url:
                    break
            if l in automatic_captions and automatic_captions[l]:
                for fmt in automatic_captions[l]:
                    if fmt.get("ext") == "json3":
                        subtitle_url = fmt.get("url")
                        selected_lang = l
                        break
                if subtitle_url:
                    break
        
        if not subtitle_url:
            print("No subtitle URL found")
            return None
        
        # 자막 다운로드
        import urllib.request
        with urllib.request.urlopen(subtitle_url, timeout=10) as response:
            subtitle_data = json.loads(response.read().decode())
        
        # json3 형식 파싱
        events = subtitle_data.get("events", [])
        subtitles = []
        
        for event in events:
            if "segs" not in event:
                continue
            text = "".join([seg.get("utf8", "") for seg in event.get("segs", [])])
            text = text.strip()
            if text:
                start = event.get("tStartMs", 0) / 1000  # ms to seconds
                duration = event.get("dDurationMs", 0) / 1000
                subtitles.append({
                    "text": text,
                    "start": start,
                    "duration": duration
                })
        
        return {
            "language": selected_lang,
            "subtitles": subtitles,
            "available_languages": available_langs
        }
        
    except subprocess.TimeoutExpired:
        print("yt-dlp timeout")
        return None
    except Exception as e:
        print(f"yt-dlp error: {e}")
        return None

def get_subtitles_with_api(video_id: str, languages: List[str]) -> Optional[dict]:
    """youtube-transcript-api를 사용하여 자막 가져오기"""
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        available_languages = [t.language_code for t in transcript_list]
        
        transcript = None
        used_language = None
        
        for lang in languages:
            try:
                transcript = transcript_list.find_transcript([lang])
                used_language = lang
                break
            except NoTranscriptFound:
                continue
        
        if transcript is None:
            transcript = list(transcript_list)[0]
            used_language = transcript.language_code
        
        subtitle_data = transcript.fetch()
        
        subtitles = [
            {
                "text": item['text'],
                "start": item['start'],
                "duration": item['duration']
            }
            for item in subtitle_data
        ]
        
        return {
            "language": used_language,
            "subtitles": subtitles,
            "available_languages": available_languages
        }
        
    except Exception as e:
        print(f"youtube-transcript-api error: {e}")
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
    
    # 먼저 yt-dlp 시도
    print(f"🎬 자막 추출 시작: {video_id}")
    print("📥 yt-dlp로 시도...")
    
    result = get_subtitles_with_ytdlp(video_id, request.languages[0] if request.languages else "ko")
    
    # yt-dlp 실패시 youtube-transcript-api 시도
    if not result:
        print("📥 youtube-transcript-api로 시도...")
        result = get_subtitles_with_api(video_id, request.languages)
    
    if not result or not result.get("subtitles"):
        raise HTTPException(status_code=404, detail="자막을 찾을 수 없습니다")
    
    print(f"✅ 자막 {len(result['subtitles'])}개 추출 완료 ({result['language']})")
    
    return SubtitleResponse(
        success=True,
        video_id=video_id,
        language=result["language"],
        subtitles=[SubtitleItem(**s) for s in result["subtitles"]],
        available_languages=result.get("available_languages", [])
    )

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
