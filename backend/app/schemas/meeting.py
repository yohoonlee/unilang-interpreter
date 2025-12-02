"""
회의 스키마 모듈
===============

회의 관련 Pydantic 스키마 정의
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class PlatformType(str, Enum):
    """화상회의 플랫폼 타입"""
    ZOOM = "zoom"
    TEAMS = "teams"
    MEET = "meet"
    WEBEX = "webex"


class MeetingStatus(str, Enum):
    """회의 상태"""
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    ENDED = "ended"
    CANCELLED = "cancelled"


class MeetingSettings(BaseModel):
    """회의 설정"""
    enable_transcription: bool = True
    enable_translation: bool = True
    enable_auto_summary: bool = True
    default_source_language: Optional[str] = None
    target_languages: list[str] = Field(default_factory=list)
    save_audio: bool = False


class MeetingCreate(BaseModel):
    """회의 생성 요청"""
    title: str = Field(..., min_length=1, max_length=500, description="회의 제목")
    description: Optional[str] = Field(None, description="회의 설명")
    platform: PlatformType = Field(..., description="화상회의 플랫폼")
    platform_meeting_id: Optional[str] = Field(None, description="플랫폼 회의 ID")
    platform_meeting_url: Optional[str] = Field(None, description="플랫폼 회의 URL")
    scheduled_start: Optional[datetime] = Field(None, description="예정 시작 시간")
    scheduled_end: Optional[datetime] = Field(None, description="예정 종료 시간")
    settings: MeetingSettings = Field(default_factory=MeetingSettings)


class MeetingUpdate(BaseModel):
    """회의 업데이트 요청"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[MeetingStatus] = None
    platform_meeting_id: Optional[str] = None
    platform_meeting_url: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    settings: Optional[MeetingSettings] = None


class ParticipantBrief(BaseModel):
    """참여자 요약 정보"""
    id: UUID
    name: str
    preferred_language: str
    is_active: bool
    
    class Config:
        from_attributes = True


class MeetingResponse(BaseModel):
    """회의 응답"""
    id: UUID
    title: str
    description: Optional[str]
    platform: PlatformType
    platform_meeting_id: Optional[str]
    platform_meeting_url: Optional[str]
    status: MeetingStatus
    created_by: Optional[UUID]
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    settings: dict
    participants: list[ParticipantBrief] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MeetingListResponse(BaseModel):
    """회의 목록 응답"""
    id: UUID
    title: str
    platform: PlatformType
    status: MeetingStatus
    scheduled_start: Optional[datetime]
    participant_count: int = 0
    created_at: datetime
    
    class Config:
        from_attributes = True


class MeetingStartRequest(BaseModel):
    """회의 시작 요청"""
    platform_meeting_id: Optional[str] = None
    platform_meeting_url: Optional[str] = None


class MeetingEndRequest(BaseModel):
    """회의 종료 요청"""
    generate_summary: bool = True
    summary_languages: list[str] = Field(default_factory=lambda: ["ko", "en"])



