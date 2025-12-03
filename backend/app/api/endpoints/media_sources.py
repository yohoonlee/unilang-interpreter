"""
미디어 소스 API 엔드포인트
=========================

YouTube, 영상파일, 영상통화 등 다양한 미디어 소스 처리
"""

from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status

from app.core.logging import get_logger
from app.schemas.media_source import (
    MediaSourceType,
    MediaSessionCreate,
    MediaSessionResponse,
    YouTubeVideoInfo,
    TranslationDisplaySettings,
    TranslationDisplaySettingsUpdate,
    MEDIA_SOURCE_CATEGORIES,
)
from app.schemas.common import APIResponse
from app.services.media_source_service import MediaSourceService, get_media_source_service

logger = get_logger(__name__)
router = APIRouter()


@router.get(
    "/sources",
    response_model=APIResponse[List[dict]],
    summary="지원 미디어 소스 목록",
    description="사용 가능한 모든 미디어 소스 목록을 반환합니다."
)
async def get_available_sources(
    media_service: MediaSourceService = Depends(get_media_source_service),
):
    """지원 미디어 소스 목록"""
    sources = media_service.get_available_sources()
    
    return APIResponse(
        success=True,
        data=sources
    )


@router.get(
    "/sources/categories",
    response_model=APIResponse[dict],
    summary="미디어 소스 카테고리",
    description="미디어 소스를 카테고리별로 분류하여 반환합니다."
)
async def get_source_categories():
    """미디어 소스 카테고리"""
    categories = {
        "video_conference": {
            "name": "화상회의",
            "icon": "📹",
            "sources": [s.value for s in MEDIA_SOURCE_CATEGORIES["video_conference"]],
        },
        "video_platform": {
            "name": "영상 플랫폼",
            "icon": "📺",
            "sources": [s.value for s in MEDIA_SOURCE_CATEGORIES["video_platform"]],
        },
        "local_media": {
            "name": "로컬 미디어",
            "icon": "📁",
            "sources": [s.value for s in MEDIA_SOURCE_CATEGORIES["local_media"]],
        },
        "video_call": {
            "name": "영상통화",
            "icon": "📱",
            "sources": [s.value for s in MEDIA_SOURCE_CATEGORIES["video_call"]],
        },
        "other": {
            "name": "기타",
            "icon": "🔊",
            "sources": [s.value for s in MEDIA_SOURCE_CATEGORIES["other"]],
        },
    }
    
    return APIResponse(
        success=True,
        data=categories
    )


@router.get(
    "/sources/{source_type}",
    response_model=APIResponse[dict],
    summary="미디어 소스 상세 정보",
    description="특정 미디어 소스의 상세 정보를 반환합니다."
)
async def get_source_info(
    source_type: MediaSourceType,
    media_service: MediaSourceService = Depends(get_media_source_service),
):
    """미디어 소스 상세 정보"""
    info = media_service.get_source_info(source_type)
    
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="지원하지 않는 미디어 소스입니다."
        )
    
    # 캡처 가이드 추가
    instructions = media_service.get_capture_instructions(source_type)
    info["instructions"] = instructions
    
    return APIResponse(
        success=True,
        data=info
    )


# ==================== 세션 관리 ====================

@router.post(
    "/sessions",
    response_model=APIResponse[MediaSessionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="미디어 세션 생성",
    description="새로운 미디어 세션을 생성합니다."
)
async def create_session(
    session_data: MediaSessionCreate,
    user_id: UUID = Query(..., description="사용자 ID"),
    media_service: MediaSourceService = Depends(get_media_source_service),
):
    """미디어 세션 생성"""
    try:
        session = await media_service.create_session(
            user_id=str(user_id),
            session_data=session_data,
        )
        
        return APIResponse(
            success=True,
            message="세션이 생성되었습니다.",
            data=session
        )
    except Exception as e:
        logger.error("Failed to create session", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"세션 생성 실패: {str(e)}"
        )


@router.get(
    "/sessions",
    response_model=APIResponse[List[MediaSessionResponse]],
    summary="미디어 세션 목록",
    description="사용자의 미디어 세션 목록을 조회합니다."
)
async def list_sessions(
    user_id: UUID = Query(..., description="사용자 ID"),
    source_type: Optional[MediaSourceType] = Query(None, description="소스 타입 필터"),
    status_filter: Optional[str] = Query(None, description="상태 필터"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    media_service: MediaSourceService = Depends(get_media_source_service),
):
    """미디어 세션 목록 조회"""
    offset = (page - 1) * page_size
    
    sessions = await media_service.list_sessions(
        user_id=str(user_id),
        source_type=source_type,
        status=status_filter,
        limit=page_size,
        offset=offset,
    )
    
    return APIResponse(
        success=True,
        data=sessions
    )


@router.get(
    "/sessions/{session_id}",
    response_model=APIResponse[MediaSessionResponse],
    summary="미디어 세션 조회",
    description="특정 미디어 세션의 상세 정보를 조회합니다."
)
async def get_session(
    session_id: UUID,
    media_service: MediaSourceService = Depends(get_media_source_service),
):
    """미디어 세션 조회"""
    session = await media_service.get_session(str(session_id))
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="세션을 찾을 수 없습니다."
        )
    
    return APIResponse(
        success=True,
        data=session
    )


@router.post(
    "/sessions/{session_id}/end",
    response_model=APIResponse[MediaSessionResponse],
    summary="미디어 세션 종료",
    description="미디어 세션을 종료합니다."
)
async def end_session(
    session_id: UUID,
    media_service: MediaSourceService = Depends(get_media_source_service),
):
    """미디어 세션 종료"""
    session = await media_service.end_session(str(session_id))
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="세션을 찾을 수 없습니다."
        )
    
    return APIResponse(
        success=True,
        message="세션이 종료되었습니다.",
        data=session
    )


# ==================== YouTube ====================

@router.get(
    "/youtube/info",
    response_model=APIResponse[YouTubeVideoInfo],
    summary="YouTube 영상 정보",
    description="YouTube URL에서 영상 정보를 가져옵니다."
)
async def get_youtube_info(
    url: str = Query(..., description="YouTube URL"),
    media_service: MediaSourceService = Depends(get_media_source_service),
):
    """YouTube 영상 정보 조회"""
    video_info = await media_service.get_youtube_info(url)
    
    if not video_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않은 YouTube URL입니다."
        )
    
    return APIResponse(
        success=True,
        data=video_info
    )


# ==================== 파일 업로드 ====================

@router.get(
    "/upload/formats",
    response_model=APIResponse[dict],
    summary="지원 파일 형식",
    description="업로드 가능한 파일 형식을 반환합니다."
)
async def get_supported_formats(
    media_service: MediaSourceService = Depends(get_media_source_service),
):
    """지원 파일 형식"""
    formats = media_service.get_supported_formats()
    
    return APIResponse(
        success=True,
        data={
            "video": {
                "extensions": formats["video"],
                "max_size_mb": 2048,  # 2GB
            },
            "audio": {
                "extensions": formats["audio"],
                "max_size_mb": 500,  # 500MB
            },
        }
    )


@router.post(
    "/upload/url",
    response_model=APIResponse[dict],
    summary="업로드 URL 생성",
    description="파일 업로드를 위한 서명된 URL을 생성합니다."
)
async def create_upload_url(
    user_id: UUID = Query(..., description="사용자 ID"),
    filename: str = Query(..., description="파일명"),
    file_size: int = Query(..., description="파일 크기 (bytes)"),
    mime_type: str = Query(..., description="MIME 타입"),
    media_service: MediaSourceService = Depends(get_media_source_service),
):
    """업로드 URL 생성"""
    try:
        upload_info = await media_service.create_upload_url(
            user_id=str(user_id),
            filename=filename,
            file_size=file_size,
            mime_type=mime_type,
        )
        
        return APIResponse(
            success=True,
            data=upload_info
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ==================== 번역 표시 설정 ====================

@router.get(
    "/sessions/{session_id}/display-settings",
    response_model=APIResponse[TranslationDisplaySettings],
    summary="번역 표시 설정 조회",
    description="세션의 번역 표시 설정을 조회합니다."
)
async def get_display_settings(
    session_id: UUID,
    user_id: UUID = Query(..., description="사용자 ID"),
    media_service: MediaSourceService = Depends(get_media_source_service),
):
    """번역 표시 설정 조회"""
    # DB에서 설정 조회
    response = (
        media_service.db.client.table("user_translation_preferences")
        .select("*")
        .eq("user_id", str(user_id))
        .eq("session_id", str(session_id))
        .single()
        .execute()
    )
    
    if response.data:
        return APIResponse(
            success=True,
            data=response.data
        )
    
    # 기본 설정 반환
    return APIResponse(
        success=True,
        data=TranslationDisplaySettings()
    )


@router.patch(
    "/sessions/{session_id}/display-settings",
    response_model=APIResponse[TranslationDisplaySettings],
    summary="번역 표시 설정 업데이트",
    description="세션의 번역 표시 설정을 업데이트합니다."
)
async def update_display_settings(
    session_id: UUID,
    settings_update: TranslationDisplaySettingsUpdate,
    user_id: UUID = Query(..., description="사용자 ID"),
    media_service: MediaSourceService = Depends(get_media_source_service),
):
    """번역 표시 설정 업데이트"""
    update_dict = settings_update.model_dump(exclude_unset=True)
    update_dict["user_id"] = str(user_id)
    update_dict["session_id"] = str(session_id)
    
    response = (
        media_service.db.client.table("user_translation_preferences")
        .upsert(update_dict, on_conflict="user_id,session_id")
        .execute()
    )
    
    return APIResponse(
        success=True,
        message="설정이 업데이트되었습니다.",
        data=response.data[0] if response.data else {}
    )










