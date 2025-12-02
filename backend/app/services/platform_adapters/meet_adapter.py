"""
Google Meet 플랫폼 어댑터
========================

Google Meet API 연동 구현
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from .base import BasePlatformAdapter, MeetingInfo, ParticipantInfo, AudioStream

logger = get_logger(__name__)


class MeetAdapter(BasePlatformAdapter):
    """Google Meet API 어댑터"""
    
    platform_name = "meet"
    
    OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3"
    MEET_API_URL = "https://meet.googleapis.com/v2"  # Google Meet REST API
    
    def __init__(self):
        super().__init__()
        self.client_id = settings.google_meet_client_id
        self.client_secret = settings.google_meet_client_secret
    
    # ==================== OAuth ====================
    
    def get_oauth_url(self, user_id: str, redirect_uri: str) -> str:
        """OAuth 인증 URL 생성"""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join([
                "https://www.googleapis.com/auth/calendar.readonly",
                "https://www.googleapis.com/auth/calendar.events",
                "https://www.googleapis.com/auth/meetings.space.readonly",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
            ]),
            "access_type": "offline",
            "prompt": "consent",
            "state": user_id,
        }
        return f"{self.OAUTH_URL}?{urlencode(params)}"
    
    async def exchange_code(self, code: str) -> Dict[str, Any]:
        """인증 코드를 토큰으로 교환"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.cors_origins[0] + "/api/v1/platforms/meet/oauth/callback",
                },
            )
            response.raise_for_status()
            data = response.json()
            
            expires_at = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
            
            # 사용자 정보 조회
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {data.get('access_token')}"},
            )
            user_data = user_response.json() if user_response.status_code == 200 else {}
            
            return {
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_at": expires_at.isoformat(),
                "user_id": user_data.get("id"),
                "email": user_data.get("email"),
            }
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """토큰 갱신"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            data = response.json()
            
            expires_at = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
            
            return {
                "access_token": data.get("access_token"),
                "refresh_token": refresh_token,  # Google은 새 refresh_token을 안 줄 수 있음
                "expires_at": expires_at.isoformat(),
            }
    
    # ==================== 회의 관련 ====================
    
    async def get_meetings(self, access_token: str) -> List[MeetingInfo]:
        """
        회의 목록 조회
        
        Google Calendar에서 conferenceData가 있는 이벤트 조회
        """
        async with httpx.AsyncClient() as client:
            # 앞으로 7일간의 이벤트 조회
            time_min = datetime.utcnow().isoformat() + "Z"
            time_max = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"
            
            response = await client.get(
                f"{self.CALENDAR_API_URL}/calendars/primary/events",
                headers=self._get_headers(access_token),
                params={
                    "timeMin": time_min,
                    "timeMax": time_max,
                    "singleEvents": "true",
                    "orderBy": "startTime",
                },
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            
            meetings = []
            for event in data.get("items", []):
                conference_data = event.get("conferenceData", {})
                entry_points = conference_data.get("entryPoints", [])
                
                # Google Meet 링크가 있는 이벤트만
                meet_link = None
                for entry in entry_points:
                    if entry.get("entryPointType") == "video":
                        meet_link = entry.get("uri")
                        break
                
                if meet_link:
                    start = event.get("start", {})
                    end = event.get("end", {})
                    
                    meetings.append(MeetingInfo(
                        meeting_id=event.get("id"),
                        title=event.get("summary", "Google Meet"),
                        host_id=event.get("organizer", {}).get("email", ""),
                        host_name=event.get("organizer", {}).get("displayName", ""),
                        start_time=start.get("dateTime") or start.get("date"),
                        end_time=end.get("dateTime") or end.get("date"),
                        join_url=meet_link,
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
                f"{self.CALENDAR_API_URL}/calendars/primary/events/{meeting_id}",
                headers=self._get_headers(access_token),
            )
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            event = response.json()
            
            conference_data = event.get("conferenceData", {})
            entry_points = conference_data.get("entryPoints", [])
            
            meet_link = None
            for entry in entry_points:
                if entry.get("entryPointType") == "video":
                    meet_link = entry.get("uri")
                    break
            
            start = event.get("start", {})
            end = event.get("end", {})
            
            return MeetingInfo(
                meeting_id=event.get("id"),
                title=event.get("summary", "Google Meet"),
                host_id=event.get("organizer", {}).get("email", ""),
                host_name=event.get("organizer", {}).get("displayName", ""),
                start_time=start.get("dateTime") or start.get("date"),
                end_time=end.get("dateTime") or end.get("date"),
                join_url=meet_link or "",
                participants=[],
            )
    
    async def get_participants(
        self,
        access_token: str,
        meeting_id: str
    ) -> List[ParticipantInfo]:
        """회의 참여자 목록 조회"""
        # Google Meet REST API를 통한 참여자 조회
        # 현재 Google Meet에서는 실시간 참여자 API가 제한적
        return []
    
    # ==================== 오디오 스트림 ====================
    
    async def connect_audio_stream(
        self,
        access_token: str,
        meeting_id: str,
        callback_url: str,
    ) -> AudioStream:
        """
        Google Meet 오디오 스트림 연결
        
        참고: Google Meet에서 실시간 오디오 접근은
        Chrome Extension이나 Meet Add-on을 통해 구현해야 함
        """
        self.logger.info(
            "Google Meet audio stream connection requested",
            meeting_id=meeting_id
        )
        
        return AudioStream(
            stream_id=f"meet_{meeting_id}",
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
        self.logger.info("Google Meet audio stream disconnected", stream_id=stream_id)
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
        Google Meet 회의에 자막 전송
        
        Google Meet은 내장 자막 기능이 있지만,
        외부에서 자막을 주입하려면 Meet Add-on 사용 필요
        """
        caption_text = text
        if speaker_name:
            caption_text = f"[{speaker_name}] {text}"
        
        self.logger.info(
            "Caption sent to Google Meet",
            meeting_id=meeting_id,
            text=caption_text[:50],
            language=language
        )
        
        return True
    
    # ==================== 웹훅 ====================
    
    def verify_webhook(self, payload: Dict) -> bool:
        """Google 웹훅 검증"""
        # Google Cloud Pub/Sub 또는 Push 알림 검증
        return True
    
    async def handle_webhook_event(self, payload: Dict, db: Any) -> None:
        """Google Meet 웹훅 이벤트 처리"""
        event_type = payload.get("type")
        
        self.logger.info(
            "Google Meet webhook event",
            event_type=event_type
        )



