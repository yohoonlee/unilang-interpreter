"""
요약 API 엔드포인트
==================

회의 요약 생성 및 조회 API
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks

from app.core.database import get_db, SupabaseDB
from app.core.logging import get_logger
from app.schemas.summary import (
    SummaryRequest,
    SummaryResponse,
    SummaryGenerateResponse,
)
from app.schemas.common import APIResponse
from app.services.summary_service import SummaryService

logger = get_logger(__name__)
router = APIRouter()


def get_summary_service() -> SummaryService:
    """요약 서비스 인스턴스 반환"""
    return SummaryService()


@router.post(
    "/generate",
    response_model=APIResponse[SummaryGenerateResponse],
    summary="회의 요약 생성",
    description="회의의 발화 기록을 기반으로 요약을 생성합니다."
)
async def generate_summary(
    request: SummaryRequest,
    background_tasks: BackgroundTasks,
    summary_service: SummaryService = Depends(get_summary_service),
    db: SupabaseDB = Depends(get_db),
):
    """회의 요약 생성"""
    try:
        # 회의 발화 기록 조회
        utterances = await db.get_meeting_utterances(
            meeting_id=str(request.meeting_id),
            limit=1000,  # 최대 1000개 발화
        )
        
        if not utterances:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="회의 기록이 없습니다."
            )
        
        # 요약 생성
        summaries = await summary_service.generate_summaries(
            meeting_id=str(request.meeting_id),
            utterances=utterances,
            languages=request.languages,
            include_key_points=request.include_key_points,
            include_action_items=request.include_action_items,
            include_decisions=request.include_decisions,
        )
        
        # 요약 저장
        saved_summaries = []
        for summary in summaries:
            saved = await db.create_summary(summary)
            saved_summaries.append(saved)
        
        logger.info(
            "Summary generated",
            meeting_id=str(request.meeting_id),
            languages=request.languages
        )
        
        return APIResponse(
            success=True,
            message="요약이 생성되었습니다.",
            data=SummaryGenerateResponse(
                meeting_id=request.meeting_id,
                summaries=saved_summaries,
                generated_languages=request.languages,
                ai_model="gemini-pro",
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to generate summary",
            meeting_id=str(request.meeting_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"요약 생성 실패: {str(e)}"
        )


@router.get(
    "/meeting/{meeting_id}",
    response_model=APIResponse[list[SummaryResponse]],
    summary="회의 요약 조회",
    description="특정 회의의 요약을 조회합니다."
)
async def get_meeting_summaries(
    meeting_id: UUID,
    language: Optional[str] = Query(None, description="특정 언어 요약만 조회"),
    db: SupabaseDB = Depends(get_db),
):
    """회의 요약 조회"""
    try:
        summaries = await db.get_meeting_summaries(
            meeting_id=str(meeting_id),
            language=language,
        )
        
        return APIResponse(
            success=True,
            data=summaries
        )
    except Exception as e:
        logger.error(
            "Failed to get summaries",
            meeting_id=str(meeting_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"요약 조회 실패: {str(e)}"
        )


@router.post(
    "/meeting/{meeting_id}/regenerate",
    response_model=APIResponse[SummaryGenerateResponse],
    summary="요약 재생성",
    description="회의 요약을 다시 생성합니다."
)
async def regenerate_summary(
    meeting_id: UUID,
    languages: list[str] = Query(default=["ko", "en"], description="생성할 언어 목록"),
    summary_service: SummaryService = Depends(get_summary_service),
    db: SupabaseDB = Depends(get_db),
):
    """요약 재생성"""
    try:
        # 기존 요약 삭제는 Supabase RLS 정책에 따라 처리
        # 여기서는 새로운 요약을 생성 (upsert)
        
        utterances = await db.get_meeting_utterances(
            meeting_id=str(meeting_id),
            limit=1000,
        )
        
        if not utterances:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="회의 기록이 없습니다."
            )
        
        summaries = await summary_service.generate_summaries(
            meeting_id=str(meeting_id),
            utterances=utterances,
            languages=languages,
            include_key_points=True,
            include_action_items=True,
            include_decisions=True,
        )
        
        saved_summaries = []
        for summary in summaries:
            saved = await db.create_summary(summary)
            saved_summaries.append(saved)
        
        logger.info(
            "Summary regenerated",
            meeting_id=str(meeting_id),
            languages=languages
        )
        
        return APIResponse(
            success=True,
            message="요약이 재생성되었습니다.",
            data=SummaryGenerateResponse(
                meeting_id=meeting_id,
                summaries=saved_summaries,
                generated_languages=languages,
                ai_model="gemini-pro",
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to regenerate summary",
            meeting_id=str(meeting_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"요약 재생성 실패: {str(e)}"
        )


@router.get(
    "/{summary_id}",
    response_model=APIResponse[SummaryResponse],
    summary="요약 상세 조회",
    description="특정 요약의 상세 정보를 조회합니다."
)
async def get_summary(
    summary_id: UUID,
    db: SupabaseDB = Depends(get_db),
):
    """요약 상세 조회"""
    try:
        # Supabase에서 직접 조회
        response = db.client.table("summaries").select("*").eq("id", str(summary_id)).single().execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="요약을 찾을 수 없습니다."
            )
        
        return APIResponse(
            success=True,
            data=response.data
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get summary",
            summary_id=str(summary_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"요약 조회 실패: {str(e)}"
        )












