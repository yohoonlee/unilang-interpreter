"""
발화 스키마 모듈
===============

발화(음성 인식 결과) 관련 Pydantic 스키마 정의
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class UtteranceCreate(BaseModel):
    """발화 생성 요청"""
    meeting_id: UUID = Field(..., description="회의 ID")
    participant_id: Optional[UUID] = Field(None, description="참여자 ID")
    speaker_name: Optional[str] = Field(None, description="화자 이름")
    original_language: str = Field(..., min_length=2, max_length=10, description="원본 언어")
    original_text: str = Field(..., min_length=1, description="원본 텍스트")
    audio_url: Optional[str] = Field(None, description="오디오 파일 URL")
    audio_duration_ms: Optional[int] = Field(None, ge=0, description="오디오 길이(ms)")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="인식 신뢰도")
    timestamp: datetime = Field(..., description="발화 시간")
    sequence_number: Optional[int] = Field(None, ge=0, description="순서 번호")


class TranslationBrief(BaseModel):
    """번역 요약 정보"""
    target_language: str
    translated_text: str
    
    class Config:
        from_attributes = True


class UtteranceResponse(BaseModel):
    """발화 응답"""
    id: UUID
    meeting_id: UUID
    participant_id: Optional[UUID]
    speaker_name: Optional[str]
    original_language: str
    original_text: str
    audio_url: Optional[str]
    audio_duration_ms: Optional[int]
    confidence: Optional[float]
    timestamp: datetime
    sequence_number: Optional[int]
    translations: list[TranslationBrief] = Field(default_factory=list)
    created_at: datetime
    
    class Config:
        from_attributes = True


class UtteranceWithTranslation(BaseModel):
    """특정 언어 번역이 포함된 발화"""
    id: UUID
    speaker_name: Optional[str]
    original_language: str
    original_text: str
    translated_text: Optional[str]
    target_language: Optional[str]
    timestamp: datetime
    
    class Config:
        from_attributes = True


class RealtimeUtterance(BaseModel):
    """실시간 발화 데이터 (WebSocket용)"""
    meeting_id: str
    participant_id: Optional[str]
    speaker_name: str
    original_language: str
    original_text: str
    is_final: bool = False
    confidence: Optional[float] = None
    timestamp: str


class RealtimeTranslation(BaseModel):
    """실시간 번역 데이터 (WebSocket용)"""
    meeting_id: str
    utterance_id: str
    speaker_name: str
    original_text: str
    original_language: str
    target_language: str
    translated_text: str
    timestamp: str










