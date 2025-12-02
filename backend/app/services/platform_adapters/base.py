"""
플랫폼 어댑터 베이스 클래스
==========================

모든 화상회의 플랫폼 어댑터가 구현해야 하는 인터페이스 정의
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class AudioStream:
    """오디오 스트림 정보"""
    stream_id: str
    participant_id: str
    sample_rate: int
    channels: int
    format: str  # pcm, opus, etc.


@dataclass
class MeetingInfo:
    """회의 정보"""
    meeting_id: str
    title: str
    host_id: str
    host_name: str
    start_time: Optional[str]
    end_time: Optional[str]
    join_url: str
    participants: List[Dict]


@dataclass
class ParticipantInfo:
    """참여자 정보"""
    participant_id: str
    name: str
    email: Optional[str]
    is_host: bool
    audio_enabled: bool
    video_enabled: bool


class BasePlatformAdapter(ABC):
    """
    화상회의 플랫폼 어댑터 베이스 클래스
    
    모든 플랫폼 어댑터는 이 클래스를 상속받아 구현해야 합니다.
    """
    
    platform_name: str = "base"
    
    def __init__(self):
        self.logger = get_logger(f"{__name__}.{self.platform_name}")
    
    # ==================== OAuth 관련 ====================
    
    @abstractmethod
    def get_oauth_url(self, user_id: str, redirect_uri: str) -> str:
        """
        OAuth 인증 URL 생성
        
        Args:
            user_id: 사용자 ID (state로 사용)
            redirect_uri: 콜백 URI
            
        Returns:
            str: OAuth 인증 URL
        """
        pass
    
    @abstractmethod
    async def exchange_code(self, code: str) -> Dict[str, Any]:
        """
        인증 코드를 액세스 토큰으로 교환
        
        Args:
            code: OAuth 인증 코드
            
        Returns:
            Dict: 토큰 정보 (access_token, refresh_token, expires_at 등)
        """
        pass
    
    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        액세스 토큰 갱신
        
        Args:
            refresh_token: 리프레시 토큰
            
        Returns:
            Dict: 새로운 토큰 정보
        """
        pass
    
    # ==================== 회의 관련 ====================
    
    @abstractmethod
    async def get_meetings(self, access_token: str) -> List[MeetingInfo]:
        """
        회의 목록 조회
        
        Args:
            access_token: 액세스 토큰
            
        Returns:
            List[MeetingInfo]: 회의 목록
        """
        pass
    
    @abstractmethod
    async def get_meeting(
        self, 
        access_token: str, 
        meeting_id: str
    ) -> Optional[MeetingInfo]:
        """
        특정 회의 정보 조회
        
        Args:
            access_token: 액세스 토큰
            meeting_id: 회의 ID
            
        Returns:
            MeetingInfo: 회의 정보
        """
        pass
    
    @abstractmethod
    async def get_participants(
        self,
        access_token: str,
        meeting_id: str
    ) -> List[ParticipantInfo]:
        """
        회의 참여자 목록 조회
        
        Args:
            access_token: 액세스 토큰
            meeting_id: 회의 ID
            
        Returns:
            List[ParticipantInfo]: 참여자 목록
        """
        pass
    
    # ==================== 오디오 스트림 관련 ====================
    
    @abstractmethod
    async def connect_audio_stream(
        self,
        access_token: str,
        meeting_id: str,
        callback_url: str,
    ) -> AudioStream:
        """
        오디오 스트림 연결
        
        Args:
            access_token: 액세스 토큰
            meeting_id: 회의 ID
            callback_url: 오디오 데이터를 받을 콜백 URL
            
        Returns:
            AudioStream: 오디오 스트림 정보
        """
        pass
    
    @abstractmethod
    async def disconnect_audio_stream(
        self,
        access_token: str,
        stream_id: str
    ) -> bool:
        """
        오디오 스트림 연결 해제
        
        Args:
            access_token: 액세스 토큰
            stream_id: 스트림 ID
            
        Returns:
            bool: 성공 여부
        """
        pass
    
    # ==================== 자막 관련 ====================
    
    @abstractmethod
    async def send_caption(
        self,
        access_token: str,
        meeting_id: str,
        text: str,
        language: str,
        speaker_name: Optional[str] = None,
    ) -> bool:
        """
        자막 전송
        
        Args:
            access_token: 액세스 토큰
            meeting_id: 회의 ID
            text: 자막 텍스트
            language: 언어 코드
            speaker_name: 화자 이름 (선택)
            
        Returns:
            bool: 전송 성공 여부
        """
        pass
    
    # ==================== 웹훅 관련 ====================
    
    @abstractmethod
    def verify_webhook(self, payload: Dict) -> bool:
        """
        웹훅 요청 검증
        
        Args:
            payload: 웹훅 페이로드
            
        Returns:
            bool: 검증 성공 여부
        """
        pass
    
    @abstractmethod
    async def handle_webhook_event(self, payload: Dict, db: Any) -> None:
        """
        웹훅 이벤트 처리
        
        Args:
            payload: 웹훅 페이로드
            db: 데이터베이스 인스턴스
        """
        pass
    
    # ==================== 유틸리티 ====================
    
    def _get_headers(self, access_token: str) -> Dict[str, str]:
        """인증 헤더 생성"""
        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }







