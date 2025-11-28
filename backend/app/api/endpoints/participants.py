"""
참여자 API 엔드포인트
====================

회의 참여자 관리 API
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import get_db, SupabaseDB
from app.core.logging import get_logger
from app.schemas.participant import (
    ParticipantCreate,
    ParticipantUpdate,
    ParticipantResponse,
    ParticipantJoin,
    ParticipantLanguageUpdate,
)
from app.schemas.common import APIResponse

logger = get_logger(__name__)
router = APIRouter()


@router.post(
    "",
    response_model=APIResponse[ParticipantResponse],
    status_code=status.HTTP_201_CREATED,
    summary="참여자 추가",
    description="회의에 참여자를 추가합니다."
)
async def add_participant(
    participant_data: ParticipantCreate,
    db: SupabaseDB = Depends(get_db),
):
    """참여자 추가"""
    try:
        participant_dict = participant_data.model_dump()
        participant_dict["meeting_id"] = str(participant_data.meeting_id)
        if participant_data.user_id:
            participant_dict["user_id"] = str(participant_data.user_id)
        participant_dict["joined_at"] = datetime.utcnow().isoformat()
        
        result = await db.add_participant(participant_dict)
        
        logger.info(
            "Participant added",
            meeting_id=str(participant_data.meeting_id),
            participant_name=participant_data.name
        )
        
        return APIResponse(
            success=True,
            message="참여자가 추가되었습니다.",
            data=result
        )
    except Exception as e:
        logger.error("Failed to add participant", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"참여자 추가 실패: {str(e)}"
        )


@router.get(
    "/meeting/{meeting_id}",
    response_model=APIResponse[list[ParticipantResponse]],
    summary="회의 참여자 목록",
    description="특정 회의의 참여자 목록을 조회합니다."
)
async def get_meeting_participants(
    meeting_id: UUID,
    active_only: bool = Query(False, description="활성 참여자만"),
    db: SupabaseDB = Depends(get_db),
):
    """회의 참여자 목록 조회"""
    try:
        participants = await db.get_meeting_participants(str(meeting_id))
        
        if active_only:
            participants = [p for p in participants if p.get("is_active")]
        
        return APIResponse(
            success=True,
            data=participants
        )
    except Exception as e:
        logger.error(
            "Failed to get participants",
            meeting_id=str(meeting_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"참여자 목록 조회 실패: {str(e)}"
        )


@router.get(
    "/{participant_id}",
    response_model=APIResponse[ParticipantResponse],
    summary="참여자 상세 조회",
    description="특정 참여자의 상세 정보를 조회합니다."
)
async def get_participant(
    participant_id: UUID,
    db: SupabaseDB = Depends(get_db),
):
    """참여자 상세 조회"""
    try:
        participant = await db.get_participant(str(participant_id))
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="참여자를 찾을 수 없습니다."
            )
        
        return APIResponse(
            success=True,
            data=participant
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get participant",
            participant_id=str(participant_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"참여자 조회 실패: {str(e)}"
        )


@router.patch(
    "/{participant_id}",
    response_model=APIResponse[ParticipantResponse],
    summary="참여자 정보 수정",
    description="참여자 정보를 수정합니다."
)
async def update_participant(
    participant_id: UUID,
    update_data: ParticipantUpdate,
    db: SupabaseDB = Depends(get_db),
):
    """참여자 정보 수정"""
    try:
        update_dict = update_data.model_dump(exclude_unset=True)
        
        result = await db.update_participant(str(participant_id), update_dict)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="참여자를 찾을 수 없습니다."
            )
        
        logger.info("Participant updated", participant_id=str(participant_id))
        
        return APIResponse(
            success=True,
            message="참여자 정보가 수정되었습니다.",
            data=result
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to update participant",
            participant_id=str(participant_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"참여자 수정 실패: {str(e)}"
        )


@router.patch(
    "/{participant_id}/language",
    response_model=APIResponse[ParticipantResponse],
    summary="참여자 언어 설정",
    description="참여자의 선호 언어를 변경합니다."
)
async def update_participant_language(
    participant_id: UUID,
    language_update: ParticipantLanguageUpdate,
    db: SupabaseDB = Depends(get_db),
):
    """참여자 언어 설정 변경"""
    try:
        result = await db.update_participant(
            str(participant_id),
            {"preferred_language": language_update.preferred_language}
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="참여자를 찾을 수 없습니다."
            )
        
        logger.info(
            "Participant language updated",
            participant_id=str(participant_id),
            language=language_update.preferred_language
        )
        
        return APIResponse(
            success=True,
            message="언어 설정이 변경되었습니다.",
            data=result
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to update participant language",
            participant_id=str(participant_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"언어 설정 변경 실패: {str(e)}"
        )


@router.post(
    "/{participant_id}/leave",
    response_model=APIResponse[ParticipantResponse],
    summary="참여자 퇴장",
    description="참여자를 회의에서 퇴장 처리합니다."
)
async def participant_leave(
    participant_id: UUID,
    db: SupabaseDB = Depends(get_db),
):
    """참여자 퇴장 처리"""
    try:
        update_data = {
            "is_active": False,
            "left_at": datetime.utcnow().isoformat(),
        }
        
        result = await db.update_participant(str(participant_id), update_data)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="참여자를 찾을 수 없습니다."
            )
        
        logger.info("Participant left", participant_id=str(participant_id))
        
        return APIResponse(
            success=True,
            message="참여자가 퇴장했습니다.",
            data=result
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to process participant leave",
            participant_id=str(participant_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"퇴장 처리 실패: {str(e)}"
        )


@router.post(
    "/meeting/{meeting_id}/join",
    response_model=APIResponse[ParticipantResponse],
    status_code=status.HTTP_201_CREATED,
    summary="회의 참여",
    description="회의에 참여합니다."
)
async def join_meeting(
    meeting_id: UUID,
    join_data: ParticipantJoin,
    db: SupabaseDB = Depends(get_db),
):
    """회의 참여"""
    try:
        participant_dict = {
            "meeting_id": str(meeting_id),
            "name": join_data.name,
            "email": join_data.email,
            "preferred_language": join_data.preferred_language,
            "platform_participant_id": join_data.platform_participant_id,
            "joined_at": datetime.utcnow().isoformat(),
            "is_active": True,
        }
        
        result = await db.add_participant(participant_dict)
        
        logger.info(
            "Participant joined meeting",
            meeting_id=str(meeting_id),
            participant_name=join_data.name
        )
        
        return APIResponse(
            success=True,
            message="회의에 참여했습니다.",
            data=result
        )
    except Exception as e:
        logger.error(
            "Failed to join meeting",
            meeting_id=str(meeting_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회의 참여 실패: {str(e)}"
        )

