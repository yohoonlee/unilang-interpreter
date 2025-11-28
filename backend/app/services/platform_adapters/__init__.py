"""
화상회의 플랫폼 어댑터 모듈
==========================

다양한 화상회의 플랫폼과의 연동을 위한 어댑터 패턴 구현
"""

from .base import BasePlatformAdapter
from .zoom_adapter import ZoomAdapter
from .teams_adapter import TeamsAdapter
from .meet_adapter import MeetAdapter
from .webex_adapter import WebexAdapter

from app.schemas.meeting import PlatformType


def get_platform_adapter(platform: PlatformType) -> BasePlatformAdapter:
    """
    플랫폼 타입에 맞는 어댑터 인스턴스 반환
    
    Args:
        platform: 화상회의 플랫폼 타입
        
    Returns:
        BasePlatformAdapter: 해당 플랫폼 어댑터 인스턴스
    """
    adapters = {
        PlatformType.ZOOM: ZoomAdapter,
        PlatformType.TEAMS: TeamsAdapter,
        PlatformType.MEET: MeetAdapter,
        PlatformType.WEBEX: WebexAdapter,
    }
    
    adapter_class = adapters.get(platform)
    if not adapter_class:
        raise ValueError(f"Unsupported platform: {platform}")
    
    return adapter_class()


__all__ = [
    "BasePlatformAdapter",
    "ZoomAdapter",
    "TeamsAdapter",
    "MeetAdapter",
    "WebexAdapter",
    "get_platform_adapter",
]

