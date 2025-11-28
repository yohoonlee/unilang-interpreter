"""
번역 스키마 모듈
===============

번역 관련 Pydantic 스키마 정의
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TranslationCreate(BaseModel):
    """번역 생성 요청"""
    utterance_id: UUID = Field(..., description="발화 ID")
    target_language: str = Field(..., min_length=2, max_length=10, description="대상 언어")
    translated_text: str = Field(..., min_length=1, description="번역 텍스트")
    translation_engine: str = Field(default="google", description="번역 엔진")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="번역 신뢰도")


class TranslationResponse(BaseModel):
    """번역 응답"""
    id: UUID
    utterance_id: UUID
    target_language: str
    translated_text: str
    translation_engine: str
    confidence: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True


class TranslationRequest(BaseModel):
    """번역 요청 (수동 번역)"""
    text: str = Field(..., min_length=1, description="번역할 텍스트")
    source_language: str = Field(..., min_length=2, max_length=10, description="원본 언어")
    target_language: str = Field(..., min_length=2, max_length=10, description="대상 언어")


class TranslationResult(BaseModel):
    """번역 결과"""
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    confidence: Optional[float] = None


class BatchTranslationRequest(BaseModel):
    """일괄 번역 요청"""
    texts: list[str] = Field(..., min_items=1, max_items=100, description="번역할 텍스트 목록")
    source_language: str = Field(..., min_length=2, max_length=10, description="원본 언어")
    target_languages: list[str] = Field(..., min_items=1, description="대상 언어 목록")


class BatchTranslationResult(BaseModel):
    """일괄 번역 결과"""
    results: list[dict]
    source_language: str
    target_languages: list[str]

