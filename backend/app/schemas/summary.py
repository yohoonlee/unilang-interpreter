"""
요약 스키마 모듈
===============

회의 요약 관련 Pydantic 스키마 정의
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SummaryCreate(BaseModel):
    """요약 생성 요청"""
    meeting_id: UUID = Field(..., description="회의 ID")
    language: str = Field(..., min_length=2, max_length=10, description="요약 언어")
    summary_text: str = Field(..., min_length=1, description="요약 텍스트")
    key_points: list[str] = Field(default_factory=list, description="핵심 포인트")
    action_items: list[str] = Field(default_factory=list, description="액션 아이템")
    decisions: list[str] = Field(default_factory=list, description="결정 사항")
    ai_model: str = Field(default="gemini-pro", description="AI 모델")


class SummaryResponse(BaseModel):
    """요약 응답"""
    id: UUID
    meeting_id: UUID
    language: str
    summary_text: str
    key_points: list[str]
    action_items: list[str]
    decisions: list[str]
    ai_model: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SummaryRequest(BaseModel):
    """요약 생성 요청"""
    meeting_id: UUID = Field(..., description="회의 ID")
    languages: list[str] = Field(
        default=["ko", "en"],
        min_items=1,
        description="요약 생성 언어 목록"
    )
    include_key_points: bool = Field(default=True, description="핵심 포인트 포함")
    include_action_items: bool = Field(default=True, description="액션 아이템 포함")
    include_decisions: bool = Field(default=True, description="결정 사항 포함")


class SummaryGenerateResponse(BaseModel):
    """요약 생성 응답"""
    meeting_id: UUID
    summaries: list[SummaryResponse]
    generated_languages: list[str]
    ai_model: str


class MeetingTranscript(BaseModel):
    """회의 전체 기록 (요약 생성용)"""
    meeting_id: UUID
    title: str
    duration_minutes: Optional[int]
    participant_count: int
    utterances: list[dict]
    
    class Config:
        from_attributes = True







