"""
미디어 소스 서비스
=================

다양한 미디어 소스 (YouTube, 영상파일, 영상통화 등) 처리
"""

import re
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

import httpx

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.schemas.media_source import (
    MediaSourceType,
    MediaSessionCreate,
    YouTubeVideoInfo,
    MEDIA_SOURCE_INFO,
)

logger = get_logger(__name__)


class MediaSourceService:
    """미디어 소스 처리 서비스"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        self.db = get_db()
    
    # ==================== 세션 관리 ====================
    
    async def create_session(
        self,
        user_id: str,
        session_data: MediaSessionCreate,
    ) -> dict:
        """미디어 세션 생성"""
        session_dict = {
            "user_id": user_id,
            "source_type": session_data.source_type.value,
            "source_url": session_data.source_url,
            "source_title": session_data.source_title,
            "source_metadata": session_data.source_metadata,
            "target_languages": session_data.target_languages,
            "status": "active",
        }
        
        # YouTube인 경우 영상 정보 가져오기
        if session_data.source_type in [MediaSourceType.YOUTUBE, MediaSourceType.YOUTUBE_LIVE]:
            if session_data.source_url:
                video_info = await self.get_youtube_info(session_data.source_url)
                if video_info:
                    session_dict["source_title"] = video_info.title
                    session_dict["source_metadata"] = {
                        **session_dict.get("source_metadata", {}),
                        "video_id": video_info.video_id,
                        "channel": video_info.channel,
                        "duration_seconds": video_info.duration_seconds,
                        "is_live": video_info.is_live,
                    }
        
        response = (
            self.db.client.table("media_sessions")
            .insert(session_dict)
            .execute()
        )
        
        self.logger.info(
            "Media session created",
            session_id=response.data[0]["id"] if response.data else None,
            source_type=session_data.source_type.value,
        )
        
        return response.data[0] if response.data else {}
    
    async def get_session(self, session_id: str) -> Optional[dict]:
        """세션 조회"""
        response = (
            self.db.client.table("media_sessions")
            .select("*")
            .eq("id", session_id)
            .single()
            .execute()
        )
        return response.data
    
    async def update_session(
        self,
        session_id: str,
        update_data: dict,
    ) -> dict:
        """세션 업데이트"""
        response = (
            self.db.client.table("media_sessions")
            .update(update_data)
            .eq("id", session_id)
            .execute()
        )
        return response.data[0] if response.data else {}
    
    async def end_session(self, session_id: str) -> dict:
        """세션 종료"""
        session = await self.get_session(session_id)
        if not session:
            return {}
        
        started_at = datetime.fromisoformat(session["started_at"].replace("Z", "+00:00"))
        ended_at = datetime.utcnow()
        duration_seconds = int((ended_at - started_at).total_seconds())
        
        update_data = {
            "status": "ended",
            "ended_at": ended_at.isoformat(),
            "duration_seconds": duration_seconds,
        }
        
        return await self.update_session(session_id, update_data)
    
    async def list_sessions(
        self,
        user_id: str,
        source_type: Optional[MediaSourceType] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[dict]:
        """세션 목록 조회"""
        query = (
            self.db.client.table("media_sessions")
            .select("*")
            .eq("user_id", user_id)
        )
        
        if source_type:
            query = query.eq("source_type", source_type.value)
        
        if status:
            query = query.eq("status", status)
        
        response = (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        return response.data or []
    
    # ==================== YouTube 처리 ====================
    
    def extract_youtube_id(self, url: str) -> Optional[str]:
        """YouTube URL에서 비디오 ID 추출"""
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
            r'youtube\.com\/v\/([^&\n?#]+)',
            r'youtube\.com\/shorts\/([^&\n?#]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    async def get_youtube_info(self, url: str) -> Optional[YouTubeVideoInfo]:
        """YouTube 영상 정보 조회"""
        video_id = self.extract_youtube_id(url)
        if not video_id:
            return None
        
        try:
            # oEmbed API로 기본 정보 가져오기 (API 키 불필요)
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                
                return YouTubeVideoInfo(
                    video_id=video_id,
                    title=data.get("title", ""),
                    channel=data.get("author_name", ""),
                    duration_seconds=0,  # oEmbed doesn't provide duration
                    thumbnail_url=data.get("thumbnail_url", ""),
                    is_live=False,  # Can't determine from oEmbed
                )
        except Exception as e:
            self.logger.error("Failed to get YouTube info", error=str(e))
            return None
    
    async def get_youtube_audio_stream(self, video_id: str) -> Optional[str]:
        """
        YouTube 오디오 스트림 URL 가져오기
        
        참고: 실제 구현에서는 yt-dlp 등을 사용하거나
        클라이언트에서 오디오를 캡처하여 전송해야 함
        """
        # 서버에서 직접 YouTube 오디오 추출은 법적 이슈가 있을 수 있음
        # 클라이언트 측에서 탭 오디오 캡처 권장
        self.logger.info("YouTube audio stream requested", video_id=video_id)
        return None
    
    # ==================== 로컬 파일 처리 ====================
    
    def get_supported_formats(self) -> Dict[str, List[str]]:
        """지원 파일 형식 반환"""
        return {
            "video": ["mp4", "mkv", "avi", "mov", "webm", "m4v", "flv"],
            "audio": ["mp3", "wav", "m4a", "aac", "ogg", "flac", "wma"],
        }
    
    async def create_upload_url(
        self,
        user_id: str,
        filename: str,
        file_size: int,
        mime_type: str,
    ) -> Dict[str, str]:
        """
        파일 업로드 URL 생성 (Supabase Storage 사용)
        """
        # 파일 확장자 확인
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        supported = self.get_supported_formats()
        
        is_video = ext in supported["video"]
        is_audio = ext in supported["audio"]
        
        if not is_video and not is_audio:
            raise ValueError(f"Unsupported file format: {ext}")
        
        # 파일 크기 제한 (2GB)
        max_size = 2 * 1024 * 1024 * 1024  # 2GB
        if file_size > max_size:
            raise ValueError(f"File too large. Max size: {max_size} bytes")
        
        # Supabase Storage에 업로드 URL 생성
        file_path = f"media/{user_id}/{uuid4()}/{filename}"
        
        # 실제로는 Supabase Storage API 사용
        # upload_url = self.db.client.storage.from_("media-files").create_signed_upload_url(file_path)
        
        return {
            "upload_url": f"/api/v1/media/upload/{file_path}",
            "file_path": file_path,
            "expires_in": 3600,
        }
    
    # ==================== 화면/시스템 오디오 캡처 ====================
    
    def get_capture_instructions(
        self,
        source_type: MediaSourceType,
    ) -> Dict[str, Any]:
        """캡처 방법 안내 반환"""
        instructions = {
            MediaSourceType.SCREEN_CAPTURE: {
                "title": "화면 및 시스템 오디오 캡처",
                "steps": [
                    "브라우저에서 '화면 공유' 버튼을 클릭하세요",
                    "'시스템 오디오 공유'를 선택하세요",
                    "캡처할 화면 또는 탭을 선택하세요",
                ],
                "requirements": {
                    "browser": "Chrome 74+, Edge 79+, Firefox 66+",
                    "permissions": ["screen-capture", "audio"],
                },
            },
            MediaSourceType.SYSTEM_AUDIO: {
                "title": "시스템 오디오 캡처",
                "steps": [
                    "브라우저에서 탭 오디오 캡처를 허용하세요",
                    "캡처할 탭을 선택하세요",
                ],
                "requirements": {
                    "browser": "Chrome 74+",
                    "permissions": ["audio"],
                },
                "note": "Windows에서는 'Stereo Mix' 활성화 필요할 수 있음",
            },
            MediaSourceType.DISCORD: {
                "title": "Discord 음성 캡처",
                "steps": [
                    "Discord를 브라우저에서 열거나 데스크톱 앱을 실행하세요",
                    "'화면 공유' 또는 '시스템 오디오 캡처'를 사용하세요",
                    "또는 Discord Bot을 사용할 수 있습니다",
                ],
            },
        }
        
        return instructions.get(source_type, {
            "title": f"{source_type.value} 캡처",
            "steps": ["화면 또는 시스템 오디오 캡처를 사용하세요"],
        })
    
    # ==================== 미디어 소스 정보 ====================
    
    def get_available_sources(self) -> List[Dict]:
        """사용 가능한 미디어 소스 목록"""
        sources = []
        for source_type, info in MEDIA_SOURCE_INFO.items():
            sources.append({
                "type": source_type.value,
                "name": info.name,
                "icon": info.icon,
                "supports_realtime": info.supports_realtime,
                "supports_upload": info.supports_upload,
                "description": info.description,
            })
        return sources
    
    def get_source_info(self, source_type: MediaSourceType) -> Optional[Dict]:
        """특정 미디어 소스 정보"""
        info = MEDIA_SOURCE_INFO.get(source_type)
        if info:
            return {
                "type": source_type.value,
                "name": info.name,
                "icon": info.icon,
                "supports_realtime": info.supports_realtime,
                "supports_upload": info.supports_upload,
                "description": info.description,
            }
        return None


# 싱글톤 인스턴스
_media_source_service: Optional[MediaSourceService] = None


def get_media_source_service() -> MediaSourceService:
    """미디어 소스 서비스 인스턴스 반환"""
    global _media_source_service
    if _media_source_service is None:
        _media_source_service = MediaSourceService()
    return _media_source_service

