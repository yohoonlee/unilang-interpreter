"""
플랫폼 연동 API 엔드포인트
=========================

화상회의 플랫폼 연동 관리 API
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from app.core.database import get_db, SupabaseDB
from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.meeting import PlatformType
from app.schemas.common import APIResponse

logger = get_logger(__name__)
router = APIRouter()


@router.get(
    "/status",
    response_model=APIResponse[dict],
    summary="플랫폼 연동 상태",
    description="각 화상회의 플랫폼의 연동 상태를 확인합니다."
)
async def get_platform_status():
    """플랫폼 연동 상태 확인"""
    status_info = {
        "zoom": {
            "configured": bool(settings.zoom_api_key and settings.zoom_api_secret),
            "name": "Zoom",
            "features": ["audio_stream", "captions", "webhooks"],
        },
        "teams": {
            "configured": bool(settings.ms_teams_client_id),
            "name": "Microsoft Teams",
            "features": ["audio_stream", "captions", "graph_api"],
        },
        "meet": {
            "configured": bool(settings.google_meet_client_id),
            "name": "Google Meet",
            "features": ["captions", "recording"],
        },
        "webex": {
            "configured": bool(settings.webex_client_id),
            "name": "Cisco Webex",
            "features": ["audio_stream", "captions", "webhooks"],
        },
    }
    
    return APIResponse(
        success=True,
        data=status_info
    )


@router.get(
    "/{platform}/oauth/authorize",
    summary="OAuth 인증 시작",
    description="플랫폼 OAuth 인증을 시작합니다."
)
async def oauth_authorize(
    platform: PlatformType,
    user_id: UUID = Query(..., description="사용자 ID"),
    redirect_uri: str = Query(..., description="콜백 URI"),
):
    """OAuth 인증 시작"""
    from app.services.platform_adapters import get_platform_adapter
    
    try:
        adapter = get_platform_adapter(platform)
        auth_url = adapter.get_oauth_url(
            user_id=str(user_id),
            redirect_uri=redirect_uri,
        )
        
        return RedirectResponse(url=auth_url)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(
            "OAuth authorization failed",
            platform=platform,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth 인증 실패: {str(e)}"
        )


@router.get(
    "/{platform}/oauth/callback",
    response_model=APIResponse[dict],
    summary="OAuth 콜백",
    description="플랫폼 OAuth 콜백을 처리합니다."
)
async def oauth_callback(
    platform: PlatformType,
    code: str = Query(..., description="인증 코드"),
    state: str = Query(..., description="상태 토큰"),
    db: SupabaseDB = Depends(get_db),
):
    """OAuth 콜백 처리"""
    from app.services.platform_adapters import get_platform_adapter
    
    try:
        adapter = get_platform_adapter(platform)
        
        # 토큰 교환
        token_data = await adapter.exchange_code(code)
        
        # state에서 user_id 추출 (실제로는 암호화된 state 검증 필요)
        user_id = state  # 간소화된 예시
        
        # 연결 정보 저장
        connection_data = {
            "user_id": user_id,
            "platform": platform.value,
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "token_expires_at": token_data.get("expires_at"),
            "platform_user_id": token_data.get("user_id"),
            "platform_email": token_data.get("email"),
            "is_active": True,
        }
        
        # Supabase에 저장 (upsert)
        db.client.table("platform_connections").upsert(
            connection_data,
            on_conflict="user_id,platform"
        ).execute()
        
        logger.info(
            "Platform connected",
            platform=platform,
            user_id=user_id
        )
        
        return APIResponse(
            success=True,
            message=f"{platform.value} 연동이 완료되었습니다.",
            data={"platform": platform.value, "connected": True}
        )
    except Exception as e:
        logger.error(
            "OAuth callback failed",
            platform=platform,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth 콜백 처리 실패: {str(e)}"
        )


@router.get(
    "/{platform}/meetings",
    response_model=APIResponse[list],
    summary="플랫폼 회의 목록",
    description="연동된 플랫폼의 회의 목록을 조회합니다."
)
async def get_platform_meetings(
    platform: PlatformType,
    user_id: UUID = Query(..., description="사용자 ID"),
    db: SupabaseDB = Depends(get_db),
):
    """플랫폼 회의 목록 조회"""
    from app.services.platform_adapters import get_platform_adapter
    
    try:
        # 연결 정보 조회
        response = (
            db.client.table("platform_connections")
            .select("*")
            .eq("user_id", str(user_id))
            .eq("platform", platform.value)
            .single()
            .execute()
        )
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="플랫폼 연동 정보가 없습니다."
            )
        
        connection = response.data
        adapter = get_platform_adapter(platform)
        
        # 플랫폼에서 회의 목록 조회
        meetings = await adapter.get_meetings(
            access_token=connection.get("access_token"),
        )
        
        return APIResponse(
            success=True,
            data=meetings
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get platform meetings",
            platform=platform,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회의 목록 조회 실패: {str(e)}"
        )


@router.delete(
    "/{platform}/disconnect",
    response_model=APIResponse[dict],
    summary="플랫폼 연동 해제",
    description="플랫폼 연동을 해제합니다."
)
async def disconnect_platform(
    platform: PlatformType,
    user_id: UUID = Query(..., description="사용자 ID"),
    db: SupabaseDB = Depends(get_db),
):
    """플랫폼 연동 해제"""
    try:
        db.client.table("platform_connections").delete().eq(
            "user_id", str(user_id)
        ).eq(
            "platform", platform.value
        ).execute()
        
        logger.info(
            "Platform disconnected",
            platform=platform,
            user_id=str(user_id)
        )
        
        return APIResponse(
            success=True,
            message=f"{platform.value} 연동이 해제되었습니다.",
            data={"platform": platform.value, "connected": False}
        )
    except Exception as e:
        logger.error(
            "Failed to disconnect platform",
            platform=platform,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"연동 해제 실패: {str(e)}"
        )


@router.post(
    "/{platform}/webhook",
    summary="플랫폼 웹훅",
    description="플랫폼의 웹훅 이벤트를 처리합니다."
)
async def handle_webhook(
    platform: PlatformType,
    payload: dict,
    db: SupabaseDB = Depends(get_db),
):
    """플랫폼 웹훅 처리"""
    from app.services.platform_adapters import get_platform_adapter
    
    try:
        adapter = get_platform_adapter(platform)
        
        # 웹훅 검증
        if not adapter.verify_webhook(payload):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="웹훅 검증 실패"
            )
        
        # 웹훅 이벤트 처리
        event_type = payload.get("event", payload.get("type"))
        
        logger.info(
            "Webhook received",
            platform=platform,
            event_type=event_type
        )
        
        # 이벤트 유형에 따른 처리
        await adapter.handle_webhook_event(payload, db)
        
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Webhook processing failed",
            platform=platform,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"웹훅 처리 실패: {str(e)}"
        )



