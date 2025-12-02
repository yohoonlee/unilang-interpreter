"""
회의 API 엔드포인트
==================

회의 CRUD 및 관리 API
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import get_db, SupabaseDB
from app.core.logging import get_logger
from app.schemas.meeting import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingListResponse,
    MeetingStartRequest,
    MeetingEndRequest,
    MeetingStatus,
)
from app.schemas.common import APIResponse, PaginatedResponse

logger = get_logger(__name__)
router = APIRouter()


@router.post(
    "",
    response_model=APIResponse[MeetingResponse],
    status_code=status.HTTP_201_CREATED,
    summary="회의 생성",
    description="새로운 회의를 생성합니다."
)
async def create_meeting(
    meeting_data: MeetingCreate,
    db: SupabaseDB = Depends(get_db),
):
    """새 회의 생성"""
    try:
        meeting_dict = meeting_data.model_dump()
        meeting_dict["settings"] = meeting_data.settings.model_dump()
        meeting_dict["status"] = MeetingStatus.SCHEDULED.value
        
        result = await db.create_meeting(meeting_dict)
        
        logger.info("Meeting created", meeting_id=result.get("id"))
        
        return APIResponse(
            success=True,
            message="회의가 생성되었습니다.",
            data=result
        )
    except Exception as e:
        logger.error("Failed to create meeting", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회의 생성 실패: {str(e)}"
        )


@router.get(
    "",
    response_model=APIResponse[list[MeetingListResponse]],
    summary="회의 목록 조회",
    description="사용자의 회의 목록을 조회합니다."
)
async def list_meetings(
    user_id: UUID = Query(..., description="사용자 ID"),
    status_filter: Optional[MeetingStatus] = Query(None, description="상태 필터"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    db: SupabaseDB = Depends(get_db),
):
    """회의 목록 조회"""
    try:
        offset = (page - 1) * page_size
        meetings = await db.list_meetings(
            user_id=str(user_id),
            limit=page_size,
            offset=offset
        )
        
        return APIResponse(
            success=True,
            data=meetings
        )
    except Exception as e:
        logger.error("Failed to list meetings", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회의 목록 조회 실패: {str(e)}"
        )


@router.get(
    "/{meeting_id}",
    response_model=APIResponse[MeetingResponse],
    summary="회의 상세 조회",
    description="특정 회의의 상세 정보를 조회합니다."
)
async def get_meeting(
    meeting_id: UUID,
    db: SupabaseDB = Depends(get_db),
):
    """회의 상세 조회"""
    try:
        meeting = await db.get_meeting(str(meeting_id))
        
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="회의를 찾을 수 없습니다."
            )
        
        return APIResponse(
            success=True,
            data=meeting
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get meeting", meeting_id=str(meeting_id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회의 조회 실패: {str(e)}"
        )


@router.patch(
    "/{meeting_id}",
    response_model=APIResponse[MeetingResponse],
    summary="회의 수정",
    description="회의 정보를 수정합니다."
)
async def update_meeting(
    meeting_id: UUID,
    meeting_data: MeetingUpdate,
    db: SupabaseDB = Depends(get_db),
):
    """회의 수정"""
    try:
        update_dict = meeting_data.model_dump(exclude_unset=True)
        
        if meeting_data.settings:
            update_dict["settings"] = meeting_data.settings.model_dump()
        
        result = await db.update_meeting(str(meeting_id), update_dict)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="회의를 찾을 수 없습니다."
            )
        
        logger.info("Meeting updated", meeting_id=str(meeting_id))
        
        return APIResponse(
            success=True,
            message="회의가 수정되었습니다.",
            data=result
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update meeting", meeting_id=str(meeting_id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회의 수정 실패: {str(e)}"
        )


@router.post(
    "/{meeting_id}/start",
    response_model=APIResponse[MeetingResponse],
    summary="회의 시작",
    description="회의를 시작 상태로 변경합니다."
)
async def start_meeting(
    meeting_id: UUID,
    request: MeetingStartRequest,
    db: SupabaseDB = Depends(get_db),
):
    """회의 시작"""
    try:
        update_data = {
            "status": MeetingStatus.ACTIVE.value,
            "actual_start": datetime.utcnow().isoformat(),
        }
        
        if request.platform_meeting_id:
            update_data["platform_meeting_id"] = request.platform_meeting_id
        if request.platform_meeting_url:
            update_data["platform_meeting_url"] = request.platform_meeting_url
        
        result = await db.update_meeting(str(meeting_id), update_data)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="회의를 찾을 수 없습니다."
            )
        
        logger.info("Meeting started", meeting_id=str(meeting_id))
        
        return APIResponse(
            success=True,
            message="회의가 시작되었습니다.",
            data=result
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to start meeting", meeting_id=str(meeting_id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회의 시작 실패: {str(e)}"
        )


@router.post(
    "/{meeting_id}/end",
    response_model=APIResponse[MeetingResponse],
    summary="회의 종료",
    description="회의를 종료하고 선택적으로 요약을 생성합니다."
)
async def end_meeting(
    meeting_id: UUID,
    request: MeetingEndRequest,
    db: SupabaseDB = Depends(get_db),
):
    """회의 종료"""
    try:
        update_data = {
            "status": MeetingStatus.ENDED.value,
            "actual_end": datetime.utcnow().isoformat(),
        }
        
        result = await db.update_meeting(str(meeting_id), update_data)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="회의를 찾을 수 없습니다."
            )
        
        logger.info("Meeting ended", meeting_id=str(meeting_id))
        
        # TODO: 요약 생성 로직 (request.generate_summary가 True인 경우)
        # 이 부분은 SummaryService에서 처리
        
        return APIResponse(
            success=True,
            message="회의가 종료되었습니다.",
            data=result
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to end meeting", meeting_id=str(meeting_id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회의 종료 실패: {str(e)}"
        )


@router.get(
    "/{meeting_id}/transcript",
    response_model=APIResponse[list],
    summary="회의 기록 조회",
    description="회의의 전체 발화 기록을 조회합니다."
)
async def get_meeting_transcript(
    meeting_id: UUID,
    language: Optional[str] = Query(None, description="번역 언어 (없으면 원본)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: SupabaseDB = Depends(get_db),
):
    """회의 기록 조회"""
    try:
        offset = (page - 1) * page_size
        utterances = await db.get_meeting_utterances(
            meeting_id=str(meeting_id),
            limit=page_size,
            offset=offset
        )
        
        return APIResponse(
            success=True,
            data=utterances
        )
    except Exception as e:
        logger.error(
            "Failed to get meeting transcript",
            meeting_id=str(meeting_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회의 기록 조회 실패: {str(e)}"
        )







