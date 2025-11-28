"""
번역 API 엔드포인트
==================

번역 관련 API
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import get_db, SupabaseDB
from app.core.logging import get_logger
from app.schemas.translation import (
    TranslationRequest,
    TranslationResult,
    BatchTranslationRequest,
    BatchTranslationResult,
    TranslationResponse,
)
from app.schemas.common import APIResponse
from app.services.translation_service import TranslationService

logger = get_logger(__name__)
router = APIRouter()


def get_translation_service() -> TranslationService:
    """번역 서비스 인스턴스 반환"""
    return TranslationService()


@router.post(
    "/translate",
    response_model=APIResponse[TranslationResult],
    summary="텍스트 번역",
    description="텍스트를 지정된 언어로 번역합니다."
)
async def translate_text(
    request: TranslationRequest,
    translation_service: TranslationService = Depends(get_translation_service),
):
    """단일 텍스트 번역"""
    try:
        result = await translation_service.translate(
            text=request.text,
            source_language=request.source_language,
            target_language=request.target_language,
        )
        
        return APIResponse(
            success=True,
            data=TranslationResult(
                original_text=request.text,
                translated_text=result,
                source_language=request.source_language,
                target_language=request.target_language,
            )
        )
    except Exception as e:
        logger.error("Translation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"번역 실패: {str(e)}"
        )


@router.post(
    "/translate/batch",
    response_model=APIResponse[BatchTranslationResult],
    summary="일괄 번역",
    description="여러 텍스트를 여러 언어로 일괄 번역합니다."
)
async def translate_batch(
    request: BatchTranslationRequest,
    translation_service: TranslationService = Depends(get_translation_service),
):
    """일괄 번역"""
    try:
        results = await translation_service.translate_batch(
            texts=request.texts,
            source_language=request.source_language,
            target_languages=request.target_languages,
        )
        
        return APIResponse(
            success=True,
            data=BatchTranslationResult(
                results=results,
                source_language=request.source_language,
                target_languages=request.target_languages,
            )
        )
    except Exception as e:
        logger.error("Batch translation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"일괄 번역 실패: {str(e)}"
        )


@router.get(
    "/utterance/{utterance_id}",
    response_model=APIResponse[list[TranslationResponse]],
    summary="발화 번역 조회",
    description="특정 발화의 번역 목록을 조회합니다."
)
async def get_utterance_translations(
    utterance_id: UUID,
    target_language: Optional[str] = Query(None, description="특정 언어만 조회"),
    db: SupabaseDB = Depends(get_db),
):
    """발화 번역 조회"""
    try:
        translations = await db.get_utterance_translations(
            utterance_id=str(utterance_id),
            target_language=target_language,
        )
        
        return APIResponse(
            success=True,
            data=translations
        )
    except Exception as e:
        logger.error(
            "Failed to get translations",
            utterance_id=str(utterance_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"번역 조회 실패: {str(e)}"
        )


@router.get(
    "/languages",
    response_model=APIResponse[dict],
    summary="지원 언어 목록",
    description="지원되는 언어 목록을 반환합니다."
)
async def get_supported_languages():
    """지원 언어 목록 조회"""
    from app.schemas.common import LANGUAGE_NAMES
    
    return APIResponse(
        success=True,
        data={
            "languages": LANGUAGE_NAMES,
            "default": "ko",
        }
    )


@router.post(
    "/detect",
    response_model=APIResponse[dict],
    summary="언어 감지",
    description="텍스트의 언어를 감지합니다."
)
async def detect_language(
    text: str = Query(..., min_length=1, description="감지할 텍스트"),
    translation_service: TranslationService = Depends(get_translation_service),
):
    """언어 감지"""
    try:
        detected = await translation_service.detect_language(text)
        
        return APIResponse(
            success=True,
            data={
                "text": text,
                "detected_language": detected.get("language"),
                "confidence": detected.get("confidence"),
            }
        )
    except Exception as e:
        logger.error("Language detection failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"언어 감지 실패: {str(e)}"
        )

