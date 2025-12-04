from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import subprocess
import json
import re
import os
import urllib.request
import urllib.error

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

# ===== 방법 1: yt-dlp (가장 강력) =====
def get_subtitles_with_ytdlp(video_id: str, lang: str = "ko") -> Optional[dict]:
    """yt-dlp를 사용하여 자막 가져오기"""
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        # yt-dlp 명령어 - 다양한 우회 옵션 추가
        cmd = [
            "yt-dlp",
            "--skip-download",
            "--write-sub",
            "--write-auto-sub",
            "--sub-langs", "ko,en,ja,zh,es,fr,de",
            "--sub-format", "json3/srv3/vtt/ttml/best",
            "--dump-json",
            "--no-warnings",
            "--geo-bypass",
            "--extractor-args", "youtube:player_client=android",
            url
        ]
        
        print(f"🔧 yt-dlp 실행: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode != 0:
            print(f"❌ yt-dlp 실패 (코드: {result.returncode})")
            print(f"stderr: {result.stderr[:500] if result.stderr else 'None'}")
            return None
            
        video_info = json.loads(result.stdout)
        
        # 자막 정보 확인
        subtitles_info = video_info.get("subtitles", {})
        automatic_captions = video_info.get("automatic_captions", {})
        
        print(f"📋 수동 자막: {list(subtitles_info.keys())}")
        print(f"📋 자동 자막: {list(automatic_captions.keys())[:10]}...")  # 너무 많을 수 있음
        
        # 사용 가능한 언어 목록
        available_langs = list(set(list(subtitles_info.keys()) + list(automatic_captions.keys())))
        
        # 우선순위에 따라 자막 선택
        lang_priority = [lang, "ko", "en", "ja", "zh"]
        selected_lang = None
        subtitle_url = None
        
        # 먼저 수동 자막에서 찾기
        for l in lang_priority:
            if l in subtitles_info and subtitles_info[l]:
                for fmt in subtitles_info[l]:
                    if fmt.get("url"):
                        subtitle_url = fmt.get("url")
                        selected_lang = l
                        print(f"✅ 수동 자막 발견: {l} ({fmt.get('ext', 'unknown')})")
                        break
                if subtitle_url:
                    break
        
        # 수동 자막 없으면 자동 자막에서 찾기
        if not subtitle_url:
            for l in lang_priority:
                if l in automatic_captions and automatic_captions[l]:
                    for fmt in automatic_captions[l]:
                        if fmt.get("url"):
                            subtitle_url = fmt.get("url")
                            selected_lang = l
                            print(f"✅ 자동 자막 발견: {l} ({fmt.get('ext', 'unknown')})")
                            break
                    if subtitle_url:
                        break
        
        if not subtitle_url:
            print("❌ 자막 URL을 찾을 수 없음")
            return None
        
        # 자막 다운로드
        print(f"📥 자막 다운로드: {subtitle_url[:100]}...")
        
        req = urllib.request.Request(subtitle_url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=15) as response:
            subtitle_content = response.read().decode('utf-8')
        
        # 자막 파싱 (json3 또는 srv3 형식)
        subtitles = parse_subtitle_content(subtitle_content)
        
        if not subtitles:
            print("❌ 자막 파싱 실패")
            return None
        
        print(f"✅ 자막 {len(subtitles)}개 파싱 완료")
        
        return {
            "language": selected_lang,
            "subtitles": subtitles,
            "available_languages": available_langs
        }
        
    except subprocess.TimeoutExpired:
        print("❌ yt-dlp 타임아웃")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON 파싱 에러: {e}")
        return None
    except Exception as e:
        print(f"❌ yt-dlp 에러: {type(e).__name__}: {e}")
        return None

def parse_subtitle_content(content: str) -> List[dict]:
    """다양한 형식의 자막 파싱"""
    subtitles = []
    
    # JSON3 형식 시도
    try:
        data = json.loads(content)
        events = data.get("events", [])
        for event in events:
            if "segs" not in event:
                continue
            text = "".join([seg.get("utf8", "") for seg in event.get("segs", [])])
            text = text.strip()
            if text:
                start = event.get("tStartMs", 0) / 1000
                duration = event.get("dDurationMs", 0) / 1000
                subtitles.append({"text": text, "start": start, "duration": duration})
        if subtitles:
            return subtitles
    except:
        pass
    
    # SRV3/TTML XML 형식 시도
    try:
        import xml.etree.ElementTree as ET
        root = ET.fromstring(content)
        
        # timedtext 형식
        for text_elem in root.iter():
            if text_elem.tag in ['text', 'p', 's']:
                start = float(text_elem.get('start', text_elem.get('t', 0)) or 0)
                if 'ms' in str(start) or start > 10000:  # ms 단위인 경우
                    start = start / 1000
                dur = float(text_elem.get('dur', text_elem.get('d', 1)) or 1)
                if dur > 10000:
                    dur = dur / 1000
                text = ''.join(text_elem.itertext()).strip()
                if text:
                    subtitles.append({"text": text, "start": start, "duration": dur})
        if subtitles:
            return subtitles
    except:
        pass
    
    # VTT 형식 시도
    try:
        lines = content.split('\n')
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            # 타임스탬프 라인 찾기 (00:00:00.000 --> 00:00:00.000)
            if '-->' in line:
                times = line.split('-->')
                start_time = parse_vtt_time(times[0].strip())
                end_time = parse_vtt_time(times[1].strip().split()[0])
                
                # 텍스트 라인들 수집
                text_lines = []
                i += 1
                while i < len(lines) and lines[i].strip() and '-->' not in lines[i]:
                    text_lines.append(lines[i].strip())
                    i += 1
                
                text = ' '.join(text_lines)
                # HTML 태그 제거
                text = re.sub(r'<[^>]+>', '', text)
                if text:
                    subtitles.append({
                        "text": text,
                        "start": start_time,
                        "duration": end_time - start_time
                    })
            else:
                i += 1
        if subtitles:
            return subtitles
    except:
        pass
    
    return subtitles

def parse_vtt_time(time_str: str) -> float:
    """VTT 타임스탬프를 초 단위로 변환"""
    try:
        parts = time_str.replace(',', '.').split(':')
        if len(parts) == 3:
            hours, minutes, seconds = parts
            return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
        elif len(parts) == 2:
            minutes, seconds = parts
            return int(minutes) * 60 + float(seconds)
    except:
        pass
    return 0

# ===== 방법 2: youtube-transcript-api =====
def get_subtitles_with_transcript_api(video_id: str, languages: List[str]) -> Optional[dict]:
    """youtube-transcript-api를 사용하여 자막 가져오기"""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
        
        print(f"📥 youtube-transcript-api 시도...")
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        available_languages = [t.language_code for t in transcript_list]
        print(f"📋 사용 가능한 자막: {available_languages}")
        
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
        
        print(f"✅ youtube-transcript-api 성공: {len(subtitles)}개")
        
        return {
            "language": used_language,
            "subtitles": subtitles,
            "available_languages": available_languages
        }
        
    except Exception as e:
        print(f"❌ youtube-transcript-api 에러: {type(e).__name__}: {e}")
        return None

# ===== 방법 3: InnerTube API 직접 호출 =====
def get_subtitles_with_innertube(video_id: str, lang: str = "ko") -> Optional[dict]:
    """YouTube InnerTube API를 직접 사용하여 자막 가져오기"""
    try:
        print(f"📥 InnerTube API 시도...")
        
        # InnerTube API 요청
        api_url = "https://www.youtube.com/youtubei/v1/player"
        
        payload = {
            "context": {
                "client": {
                    "hl": "ko",
                    "gl": "KR",
                    "clientName": "WEB",
                    "clientVersion": "2.20231219.04.00"
                }
            },
            "videoId": video_id
        }
        
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(api_url, data=data, headers={
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://www.youtube.com',
            'Referer': f'https://www.youtube.com/watch?v={video_id}'
        })
        
        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        # 자막 정보 추출
        captions = result.get("captions", {}).get("playerCaptionsTracklistRenderer", {})
        caption_tracks = captions.get("captionTracks", [])
        
        if not caption_tracks:
            print("❌ InnerTube: 자막 트랙 없음")
            return None
        
        available_languages = [t.get("languageCode", "") for t in caption_tracks]
        print(f"📋 InnerTube 자막: {available_languages}")
        
        # 언어 선택
        lang_priority = [lang, "ko", "en", "ja", "zh"]
        selected_track = None
        
        for l in lang_priority:
            for track in caption_tracks:
                if track.get("languageCode") == l:
                    selected_track = track
                    break
            if selected_track:
                break
        
        if not selected_track:
            selected_track = caption_tracks[0]
        
        # 자막 URL에서 데이터 가져오기
        caption_url = selected_track.get("baseUrl")
        if not caption_url:
            print("❌ InnerTube: 자막 URL 없음")
            return None
        
        # fmt=json3 추가
        if "fmt=" not in caption_url:
            caption_url += "&fmt=json3"
        
        print(f"📥 자막 다운로드: {caption_url[:80]}...")
        
        req = urllib.request.Request(caption_url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=15) as response:
            subtitle_content = response.read().decode('utf-8')
        
        subtitles = parse_subtitle_content(subtitle_content)
        
        if not subtitles:
            print("❌ InnerTube: 자막 파싱 실패")
            return None
        
        print(f"✅ InnerTube 성공: {len(subtitles)}개")
        
        return {
            "language": selected_track.get("languageCode", "unknown"),
            "subtitles": subtitles,
            "available_languages": available_languages
        }
        
    except urllib.error.HTTPError as e:
        print(f"❌ InnerTube HTTP 에러: {e.code}")
        return None
    except Exception as e:
        print(f"❌ InnerTube 에러: {type(e).__name__}: {e}")
        return None

@app.get("/")
def root():
    return {"message": "YouTube Subtitle API", "status": "running", "version": "2.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/api/subtitles", response_model=SubtitleResponse)
def get_subtitles(request: SubtitleRequest):
    """YouTube 자막 추출 API"""
    
    video_id = extract_video_id(request.youtube_url)
    if not video_id:
        raise HTTPException(status_code=400, detail="유효하지 않은 YouTube URL입니다")
    
    lang = request.languages[0] if request.languages else "ko"
    print(f"\n{'='*50}")
    print(f"🎬 자막 추출 시작: {video_id} (언어: {lang})")
    print(f"{'='*50}")
    
    result = None
    
    # 방법 1: yt-dlp
    print("\n[1/3] yt-dlp 시도...")
    result = get_subtitles_with_ytdlp(video_id, lang)
    
    # 방법 2: youtube-transcript-api
    if not result:
        print("\n[2/3] youtube-transcript-api 시도...")
        result = get_subtitles_with_transcript_api(video_id, request.languages)
    
    # 방법 3: InnerTube API
    if not result:
        print("\n[3/3] InnerTube API 시도...")
        result = get_subtitles_with_innertube(video_id, lang)
    
    if not result or not result.get("subtitles"):
        print(f"\n❌ 모든 방법 실패")
        raise HTTPException(status_code=404, detail="자막을 찾을 수 없습니다. YouTube가 서버 요청을 차단하고 있을 수 있습니다.")
    
    print(f"\n✅ 최종 결과: {len(result['subtitles'])}개 자막 ({result['language']})")
    
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

# 디버그 엔드포인트
@app.get("/api/debug/{video_id}")
def debug_video(video_id: str):
    """비디오 자막 정보 디버그"""
    results = {
        "video_id": video_id,
        "methods": {}
    }
    
    # yt-dlp 테스트
    try:
        cmd = ["yt-dlp", "--version"]
        version = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        results["yt_dlp_version"] = version.stdout.strip()
    except Exception as e:
        results["yt_dlp_version"] = f"Error: {e}"
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
