"""
참여자 스키마 모듈
=================

참여자 관련 Pydantic 스키마 정의
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, EmailStr


class ParticipantRole(str, Enum):
    """참여자 역할"""
    HOST = "host"
    CO_HOST = "co_host"
    PARTICIPANT = "participant"
    INTERPRETER = "interpreter"


class ParticipantCreate(BaseModel):
    """참여자 생성 요청"""
    meeting_id: UUID = Field(..., description="회의 ID")
    user_id: Optional[UUID] = Field(None, description="사용자 ID")
    name: str = Field(..., min_length=1, max_length=255, description="참여자 이름")
    email: Optional[EmailStr] = Field(None, description="참여자 이메일")
    role: ParticipantRole = Field(
        default=ParticipantRole.PARTICIPANT, 
        description="참여자 역할"
    )
    preferred_language: str = Field(
        default="ko", 
        min_length=2, 
        max_length=10,
        description="선호 언어 (ISO 639-1)"
    )
    platform_participant_id: Optional[str] = Field(
        None, 
        description="플랫폼 참여자 ID"
    )


class ParticipantUpdate(BaseModel):
    """참여자 업데이트 요청"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[ParticipantRole] = None
    preferred_language: Optional[str] = Field(None, min_length=2, max_length=10)
    is_active: Optional[bool] = None


class ParticipantJoin(BaseModel):
    """참여자 입장 요청"""
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    preferred_language: str = Field(default="ko")
    platform_participant_id: Optional[str] = None


class ParticipantLeave(BaseModel):
    """참여자 퇴장 요청"""
    participant_id: UUID


class ParticipantResponse(BaseModel):
    """참여자 응답"""
    id: UUID
    meeting_id: UUID
    user_id: Optional[UUID]
    name: str
    email: Optional[str]
    role: ParticipantRole
    preferred_language: str
    platform_participant_id: Optional[str]
    joined_at: Optional[datetime]
    left_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ParticipantLanguageUpdate(BaseModel):
    """참여자 언어 설정 업데이트"""
    preferred_language: str = Field(..., min_length=2, max_length=10)







