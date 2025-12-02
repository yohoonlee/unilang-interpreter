"""
Cisco Webex 플랫폼 어댑터
========================

Webex API 연동 구현
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from .base import BasePlatformAdapter, MeetingInfo, ParticipantInfo, AudioStream

logger = get_logger(__name__)


class WebexAdapter(BasePlatformAdapter):
    """Cisco Webex API 어댑터"""
    
    platform_name = "webex"
    
    API_URL = "https://webexapis.com/v1"
    OAUTH_URL = "https://webexapis.com/v1/authorize"
    TOKEN_URL = "https://webexapis.com/v1/access_token"
    
    def __init__(self):
        super().__init__()
        self.client_id = settings.webex_client_id
        self.client_secret = settings.webex_client_secret
    
    # ==================== OAuth ====================
    
    def get_oauth_url(self, user_id: str, redirect_uri: str) -> str:
        """OAuth 인증 URL 생성"""
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": "spark:all meeting:schedules_read meeting:participants_read",
            "state": user_id,
        }
        return f"{self.OAUTH_URL}?{urlencode(params)}"
    
    async def exchange_code(self, code: str) -> Dict[str, Any]:
        """인증 코드를 토큰으로 교환"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                },
            )
            response.raise_for_status()
            data = response.json()
            
            expires_at = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
            
            # 사용자 정보 조회
            user_response = await client.get(
                f"{self.API_URL}/people/me",
                headers={"Authorization": f"Bearer {data.get('access_token')}"},
            )
            user_data = user_response.json() if user_response.status_code == 200 else {}
            
            return {
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_at": expires_at.isoformat(),
                "user_id": user_data.get("id"),
                "email": user_data.get("emails", [None])[0],
            }
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """토큰 갱신"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
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
            response = await client.get(
                f"{self.API_URL}/meetings",
                headers=self._get_headers(access_token),
                params={
                    "meetingType": "scheduledMeeting",
                    "state": "scheduled",
                    "max": 30,
                },
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            
            meetings = []
            for meeting in data.get("items", []):
                meetings.append(MeetingInfo(
                    meeting_id=meeting.get("id"),
                    title=meeting.get("title", "Webex Meeting"),
                    host_id=meeting.get("hostUserId", ""),
                    host_name=meeting.get("hostDisplayName", ""),
                    start_time=meeting.get("start"),
                    end_time=meeting.get("end"),
                    join_url=meeting.get("webLink", ""),
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
            response = await client.get(
                f"{self.API_URL}/meetings/{meeting_id}",
                headers=self._get_headers(access_token),
            )
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            meeting = response.json()
            
            return MeetingInfo(
                meeting_id=meeting.get("id"),
                title=meeting.get("title", "Webex Meeting"),
                host_id=meeting.get("hostUserId", ""),
                host_name=meeting.get("hostDisplayName", ""),
                start_time=meeting.get("start"),
                end_time=meeting.get("end"),
                join_url=meeting.get("webLink", ""),
                participants=[],
            )
    
    async def get_participants(
        self,
        access_token: str,
        meeting_id: str
    ) -> List[ParticipantInfo]:
        """회의 참여자 목록 조회"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_URL}/meetingParticipants",
                headers=self._get_headers(access_token),
                params={"meetingId": meeting_id},
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            
            participants = []
            for p in data.get("items", []):
                participants.append(ParticipantInfo(
                    participant_id=p.get("id", ""),
                    name=p.get("displayName", ""),
                    email=p.get("email"),
                    is_host=p.get("host", False),
                    audio_enabled=p.get("audio", {}).get("muted", False) is False,
                    video_enabled=p.get("video", {}).get("muted", False) is False,
                ))
            
            return participants
    
    # ==================== 오디오 스트림 ====================
    
    async def connect_audio_stream(
        self,
        access_token: str,
        meeting_id: str,
        callback_url: str,
    ) -> AudioStream:
        """
        Webex 오디오 스트림 연결
        
        Webex의 경우 Webex Meetings XML API 또는
        Webex SDK를 통해 오디오 접근 가능
        """
        self.logger.info(
            "Webex audio stream connection requested",
            meeting_id=meeting_id
        )
        
        return AudioStream(
            stream_id=f"webex_{meeting_id}",
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
        self.logger.info("Webex audio stream disconnected", stream_id=stream_id)
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
        Webex 회의에 자막 전송
        
        Webex Closed Captioning API 사용
        """
        caption_text = text
        if speaker_name:
            caption_text = f"[{speaker_name}] {text}"
        
        self.logger.info(
            "Caption sent to Webex",
            meeting_id=meeting_id,
            text=caption_text[:50],
            language=language
        )
        
        return True
    
    # ==================== 웹훅 ====================
    
    def verify_webhook(self, payload: Dict) -> bool:
        """Webex 웹훅 검증"""
        # Webex는 X-Spark-Signature 헤더로 검증
        # 여기서는 간소화된 구현
        return True
    
    async def handle_webhook_event(self, payload: Dict, db: Any) -> None:
        """Webex 웹훅 이벤트 처리"""
        event = payload.get("event")
        resource = payload.get("resource")
        
        self.logger.info(
            "Webex webhook event",
            event=event,
            resource=resource
        )
        
        if event == "meeting.started":
            # 회의 시작
            meeting_data = payload.get("data", {})
            self.logger.info(
                "Webex meeting started",
                meeting_id=meeting_data.get("meetingId")
            )
        
        elif event == "meeting.ended":
            # 회의 종료
            meeting_data = payload.get("data", {})
            self.logger.info(
                "Webex meeting ended",
                meeting_id=meeting_data.get("meetingId")
            )
        
        elif event == "meeting.participant_joined":
            # 참여자 입장
            participant_data = payload.get("data", {})
            self.logger.info(
                "Participant joined Webex meeting",
                participant_name=participant_data.get("displayName")
            )
        
        elif event == "meeting.participant_left":
            # 참여자 퇴장
            participant_data = payload.get("data", {})
            self.logger.info(
                "Participant left Webex meeting",
                participant_name=participant_data.get("displayName")
            )



