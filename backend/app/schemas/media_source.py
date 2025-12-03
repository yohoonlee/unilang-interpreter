"""
미디어 소스 스키마 모듈
=====================

다양한 미디어 소스 (YouTube, 영상파일, 영상통화 등) 관련 스키마
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class MediaSourceType(str, Enum):
    """미디어 소스 타입"""
    # 화상회의 플랫폼
    ZOOM = "zoom"
    TEAMS = "teams"
    MEET = "meet"
    WEBEX = "webex"
    
    # 영상 플랫폼
    YOUTUBE = "youtube"
    YOUTUBE_LIVE = "youtube_live"
    TWITCH = "twitch"
    VIMEO = "vimeo"
    
    # 로컬 미디어
    LOCAL_VIDEO = "local_video"
    LOCAL_AUDIO = "local_audio"
    SCREEN_CAPTURE = "screen_capture"
    
    # 영상통화
    FACETIME = "facetime"
    SKYPE = "skype"
    DISCORD = "discord"
    KAKAOTALK = "kakaotalk"
    LINE = "line"
    
    # 기타
    BROWSER_TAB = "browser_tab"
    SYSTEM_AUDIO = "system_audio"
    MICROPHONE = "microphone"


# 미디어 소스 카테고리
MEDIA_SOURCE_CATEGORIES = {
    "video_conference": [
        MediaSourceType.ZOOM,
        MediaSourceType.TEAMS,
        MediaSourceType.MEET,
        MediaSourceType.WEBEX,
    ],
    "video_platform": [
        MediaSourceType.YOUTUBE,
        MediaSourceType.YOUTUBE_LIVE,
        MediaSourceType.TWITCH,
        MediaSourceType.VIMEO,
    ],
    "local_media": [
        MediaSourceType.LOCAL_VIDEO,
        MediaSourceType.LOCAL_AUDIO,
        MediaSourceType.SCREEN_CAPTURE,
    ],
    "video_call": [
        MediaSourceType.FACETIME,
        MediaSourceType.SKYPE,
        MediaSourceType.DISCORD,
        MediaSourceType.KAKAOTALK,
        MediaSourceType.LINE,
    ],
    "other": [
        MediaSourceType.BROWSER_TAB,
        MediaSourceType.SYSTEM_AUDIO,
        MediaSourceType.MICROPHONE,
    ],
}


class MediaSourceInfo(BaseModel):
    """미디어 소스 정보"""
    type: MediaSourceType
    name: str
    icon: str
    supports_realtime: bool
    supports_upload: bool
    description: str


# 미디어 소스 메타데이터
MEDIA_SOURCE_INFO = {
    MediaSourceType.YOUTUBE: MediaSourceInfo(
        type=MediaSourceType.YOUTUBE,
        name="YouTube",
        icon="📺",
        supports_realtime=False,
        supports_upload=False,
        description="YouTube 영상 URL을 입력하여 자막 번역",
    ),
    MediaSourceType.YOUTUBE_LIVE: MediaSourceInfo(
        type=MediaSourceType.YOUTUBE_LIVE,
        name="YouTube Live",
        icon="🔴",
        supports_realtime=True,
        supports_upload=False,
        description="YouTube 라이브 스트리밍 실시간 번역",
    ),
    MediaSourceType.LOCAL_VIDEO: MediaSourceInfo(
        type=MediaSourceType.LOCAL_VIDEO,
        name="영상 파일",
        icon="🎬",
        supports_realtime=False,
        supports_upload=True,
        description="로컬 영상 파일 업로드 후 번역",
    ),
    MediaSourceType.LOCAL_AUDIO: MediaSourceInfo(
        type=MediaSourceType.LOCAL_AUDIO,
        name="오디오 파일",
        icon="🎵",
        supports_realtime=False,
        supports_upload=True,
        description="로컬 오디오 파일 업로드 후 번역",
    ),
    MediaSourceType.SCREEN_CAPTURE: MediaSourceInfo(
        type=MediaSourceType.SCREEN_CAPTURE,
        name="화면 캡처",
        icon="🖥️",
        supports_realtime=True,
        supports_upload=False,
        description="화면 및 시스템 오디오 캡처",
    ),
    MediaSourceType.DISCORD: MediaSourceInfo(
        type=MediaSourceType.DISCORD,
        name="Discord",
        icon="💬",
        supports_realtime=True,
        supports_upload=False,
        description="Discord 음성/영상 통화 번역",
    ),
    MediaSourceType.FACETIME: MediaSourceInfo(
        type=MediaSourceType.FACETIME,
        name="FaceTime",
        icon="📱",
        supports_realtime=True,
        supports_upload=False,
        description="FaceTime 영상통화 번역 (macOS/iOS)",
    ),
    MediaSourceType.SKYPE: MediaSourceInfo(
        type=MediaSourceType.SKYPE,
        name="Skype",
        icon="💠",
        supports_realtime=True,
        supports_upload=False,
        description="Skype 영상통화 번역",
    ),
    MediaSourceType.KAKAOTALK: MediaSourceInfo(
        type=MediaSourceType.KAKAOTALK,
        name="카카오톡",
        icon="💛",
        supports_realtime=True,
        supports_upload=False,
        description="카카오톡 영상통화 번역",
    ),
    MediaSourceType.TWITCH: MediaSourceInfo(
        type=MediaSourceType.TWITCH,
        name="Twitch",
        icon="🎮",
        supports_realtime=True,
        supports_upload=False,
        description="Twitch 스트리밍 실시간 번역",
    ),
    MediaSourceType.SYSTEM_AUDIO: MediaSourceInfo(
        type=MediaSourceType.SYSTEM_AUDIO,
        name="시스템 오디오",
        icon="🔊",
        supports_realtime=True,
        supports_upload=False,
        description="시스템 오디오 출력 캡처",
    ),
    MediaSourceType.MICROPHONE: MediaSourceInfo(
        type=MediaSourceType.MICROPHONE,
        name="마이크",
        icon="🎤",
        supports_realtime=True,
        supports_upload=False,
        description="마이크 입력 번역",
    ),
}


class MediaSessionCreate(BaseModel):
    """미디어 세션 생성 요청"""
    source_type: MediaSourceType
    source_url: Optional[str] = None
    source_title: Optional[str] = Field(None, max_length=500)
    source_metadata: dict = Field(default_factory=dict)
    
    # 번역 설정
    original_language: Optional[str] = Field(None, min_length=2, max_length=10)
    target_languages: List[str] = Field(default=["ko", "en"])


class MediaSessionUpdate(BaseModel):
    """미디어 세션 업데이트 요청"""
    source_title: Optional[str] = None
    status: Optional[str] = None
    ended_at: Optional[datetime] = None


class MediaSessionResponse(BaseModel):
    """미디어 세션 응답"""
    id: UUID
    user_id: UUID
    source_type: MediaSourceType
    source_url: Optional[str]
    source_title: Optional[str]
    source_metadata: dict
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: int
    stt_seconds: int
    translation_characters: int
    translation_count: int
    target_languages: List[str]
    status: str
    is_billed: bool
    billed_amount: float
    created_at: datetime
    
    class Config:
        from_attributes = True


class YouTubeVideoInfo(BaseModel):
    """YouTube 영상 정보"""
    video_id: str
    title: str
    channel: str
    duration_seconds: int
    thumbnail_url: str
    is_live: bool


class FileUploadInfo(BaseModel):
    """파일 업로드 정보"""
    filename: str
    file_size: int
    mime_type: str
    duration_seconds: Optional[int]
    upload_url: str


class TranslationDisplaySettings(BaseModel):
    """번역 표시 설정"""
    show_original: bool = True
    original_language: Optional[str] = None
    target_languages: List[str] = Field(default=["ko", "en"])
    primary_display_language: str = "ko"
    subtitle_position: str = "bottom"  # top, bottom, left, right
    font_size: str = "medium"  # small, medium, large, xlarge
    show_speaker_name: bool = True
    show_timestamp: bool = False


class TranslationDisplaySettingsUpdate(BaseModel):
    """번역 표시 설정 업데이트"""
    show_original: Optional[bool] = None
    original_language: Optional[str] = None
    target_languages: Optional[List[str]] = None
    primary_display_language: Optional[str] = None
    subtitle_position: Optional[str] = None
    font_size: Optional[str] = None
    show_speaker_name: Optional[bool] = None
    show_timestamp: Optional[bool] = None










