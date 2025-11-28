"""
API 라우터 모듈
==============

모든 API 엔드포인트 라우터 통합
"""

from fastapi import APIRouter

from .endpoints import (
    meetings,
    participants,
    translations,
    summaries,
    platforms,
    websocket,
    media_sources,
    billing,
)

router = APIRouter()

# 각 엔드포인트 라우터 등록
router.include_router(
    meetings.router,
    prefix="/meetings",
    tags=["Meetings"]
)

router.include_router(
    participants.router,
    prefix="/participants",
    tags=["Participants"]
)

router.include_router(
    translations.router,
    prefix="/translations",
    tags=["Translations"]
)

router.include_router(
    summaries.router,
    prefix="/summaries",
    tags=["Summaries"]
)

router.include_router(
    platforms.router,
    prefix="/platforms",
    tags=["Platforms"]
)

router.include_router(
    websocket.router,
    prefix="/ws",
    tags=["WebSocket"]
)

# 확장 기능
router.include_router(
    media_sources.router,
    prefix="/media",
    tags=["Media Sources"]
)

router.include_router(
    billing.router,
    prefix="/billing",
    tags=["Billing"]
)

