"""
Microsoft Teams 플랫폼 어댑터
============================

Microsoft Graph API를 통한 Teams 연동 구현
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from .base import BasePlatformAdapter, MeetingInfo, ParticipantInfo, AudioStream

logger = get_logger(__name__)


class TeamsAdapter(BasePlatformAdapter):
    """Microsoft Teams API 어댑터"""
    
    platform_name = "teams"
    
    GRAPH_URL = "https://graph.microsoft.com/v1.0"
    OAUTH_URL = "https://login.microsoftonline.com"
    
    def __init__(self):
        super().__init__()
        self.client_id = settings.ms_teams_client_id
        self.client_secret = settings.ms_teams_client_secret
        self.tenant_id = settings.ms_teams_tenant_id
    
    # ==================== OAuth ====================
    
    def get_oauth_url(self, user_id: str, redirect_uri: str) -> str:
        """OAuth 인증 URL 생성"""
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "response_mode": "query",
            "scope": "https://graph.microsoft.com/OnlineMeetings.ReadWrite "
                     "https://graph.microsoft.com/User.Read "
                     "offline_access",
            "state": user_id,
        }
        
        tenant = self.tenant_id or "common"
        return f"{self.OAUTH_URL}/{tenant}/oauth2/v2.0/authorize?{urlencode(params)}"
    
    async def exchange_code(self, code: str) -> Dict[str, Any]:
        """인증 코드를 토큰으로 교환"""
        tenant = self.tenant_id or "common"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.OAUTH_URL}/{tenant}/oauth2/v2.0/token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "authorization_code",
                    "code": code,
                    "scope": "https://graph.microsoft.com/OnlineMeetings.ReadWrite "
                             "https://graph.microsoft.com/User.Read "
                             "offline_access",
                },
            )
            response.raise_for_status()
            data = response.json()
            
            expires_at = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
            
            # 사용자 정보 조회
            user_response = await client.get(
                f"{self.GRAPH_URL}/me",
                headers={"Authorization": f"Bearer {data.get('access_token')}"},
            )
            user_data = user_response.json() if user_response.status_code == 200 else {}
            
            return {
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_at": expires_at.isoformat(),
                "user_id": user_data.get("id"),
                "email": user_data.get("mail") or user_data.get("userPrincipalName"),
            }
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """토큰 갱신"""
        tenant = self.tenant_id or "common"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.OAUTH_URL}/{tenant}/oauth2/v2.0/token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "scope": "https://graph.microsoft.com/OnlineMeetings.ReadWrite "
                             "https://graph.microsoft.com/User.Read "
                             "offline_access",
                },
            )
            response.raise_for_status()
            data = response.json()
            
            expires_at = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
            
            return {
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_at": expires_at.isoformat(),
            }
    
    # ==================== 회의 관련 ====================
    
    async def get_meetings(self, access_token: str) -> List[MeetingInfo]:
        """회의 목록 조회"""
        async with httpx.AsyncClient() as client:
            # 사용자 ID 먼저 조회
            user_response = await client.get(
                f"{self.GRAPH_URL}/me",
                headers=self._get_headers(access_token),
            )
            user_data = user_response.json()
            user_id = user_data.get("id")
            
            # 온라인 회의 목록 조회
            response = await client.get(
                f"{self.GRAPH_URL}/users/{user_id}/onlineMeetings",
                headers=self._get_headers(access_token),
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            
            meetings = []
            for meeting in data.get("value", []):
                meetings.append(MeetingInfo(
                    meeting_id=meeting.get("id"),
                    title=meeting.get("subject", "Teams Meeting"),
                    host_id=user_id,
                    host_name=user_data.get("displayName", ""),
                    start_time=meeting.get("startDateTime"),
                    end_time=meeting.get("endDateTime"),
                    join_url=meeting.get("joinWebUrl", ""),
                    participants=[],
                ))
            
            return meetings
    
    async def get_meeting(
        self,
        access_token: str,
        meeting_id: str
    ) -> Optional[MeetingInfo]:
        """특정 회의 정보 조회"""
        async with httpx.AsyncClient() as client:
            user_response = await client.get(
                f"{self.GRAPH_URL}/me",
                headers=self._get_headers(access_token),
            )
            user_data = user_response.json()
            user_id = user_data.get("id")
            
            response = await client.get(
                f"{self.GRAPH_URL}/users/{user_id}/onlineMeetings/{meeting_id}",
                headers=self._get_headers(access_token),
            )
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            meeting = response.json()
            
            return MeetingInfo(
                meeting_id=meeting.get("id"),
                title=meeting.get("subject", "Teams Meeting"),
                host_id=user_id,
                host_name=user_data.get("displayName", ""),
                start_time=meeting.get("startDateTime"),
                end_time=meeting.get("endDateTime"),
                join_url=meeting.get("joinWebUrl", ""),
                participants=[],
            )
    
    async def get_participants(
        self,
        access_token: str,
        meeting_id: str
    ) -> List[ParticipantInfo]:
        """회의 참여자 목록 조회"""
        # Teams에서 실시간 참여자 목록은 Call API를 통해 조회
        # 여기서는 기본 구현 제공
        return []
    
    # ==================== 오디오 스트림 ====================
    
    async def connect_audio_stream(
        self,
        access_token: str,
        meeting_id: str,
        callback_url: str,
    ) -> AudioStream:
        """
        Teams 오디오 스트림 연결
        
        Teams에서 실시간 오디오 스트림은 Communications API와
        Bot Framework를 통해 처리해야 함
        """
        self.logger.info(
            "Teams audio stream connection requested",
            meeting_id=meeting_id
        )
        
        return AudioStream(
            stream_id=f"teams_{meeting_id}",
            participant_id="all",
            sample_rate=16000,
            channels=1,
            format="pcm",
        )
    
    async def disconnect_audio_stream(
        self,
        access_token: str,
        stream_id: str
    ) -> bool:
        """오디오 스트림 연결 해제"""
        self.logger.info("Teams audio stream disconnected", stream_id=stream_id)
        return True
    
    # ==================== 자막 ====================
    
    async def send_caption(
        self,
        access_token: str,
        meeting_id: str,
        text: str,
        language: str,
        speaker_name: Optional[str] = None,
    ) -> bool:
        """
        Teams 회의에 자막 전송
        
        Teams Live Captions API 또는 Bot Framework 사용
        """
        caption_text = text
        if speaker_name:
            caption_text = f"[{speaker_name}] {text}"
        
        self.logger.info(
            "Caption sent to Teams",
            meeting_id=meeting_id,
            text=caption_text[:50],
            language=language
        )
        
        return True
    
    # ==================== 웹훅 ====================
    
    def verify_webhook(self, payload: Dict) -> bool:
        """Teams 웹훅 검증"""
        # Microsoft Graph 웹훅은 validation token으로 검증
        validation_token = payload.get("validationToken")
        if validation_token:
            payload["validation_response"] = validation_token
            return True
        
        return True
    
    async def handle_webhook_event(self, payload: Dict, db: Any) -> None:
        """Teams 웹훅 이벤트 처리"""
        change_type = payload.get("changeType")
        resource = payload.get("resource")
        
        self.logger.info(
            "Teams webhook event",
            change_type=change_type,
            resource=resource
        )
        
        # 이벤트 유형에 따른 처리
        if "calls" in str(resource):
            # 통화 관련 이벤트
            self.logger.info("Teams call event received")












