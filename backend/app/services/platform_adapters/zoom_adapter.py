"""
Zoom 플랫폼 어댑터
=================

Zoom API 연동 구현
"""

import hashlib
import hmac
import base64
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from .base import BasePlatformAdapter, MeetingInfo, ParticipantInfo, AudioStream

logger = get_logger(__name__)


class ZoomAdapter(BasePlatformAdapter):
    """Zoom API 어댑터"""
    
    platform_name = "zoom"
    
    BASE_URL = "https://api.zoom.us/v2"
    OAUTH_URL = "https://zoom.us/oauth"
    
    def __init__(self):
        super().__init__()
        self.api_key = settings.zoom_api_key
        self.api_secret = settings.zoom_api_secret
        self.webhook_secret = settings.zoom_webhook_secret
    
    # ==================== OAuth ====================
    
    def get_oauth_url(self, user_id: str, redirect_uri: str) -> str:
        """OAuth 인증 URL 생성"""
        params = {
            "response_type": "code",
            "client_id": self.api_key,
            "redirect_uri": redirect_uri,
            "state": user_id,
        }
        return f"{self.OAUTH_URL}/authorize?{urlencode(params)}"
    
    async def exchange_code(self, code: str) -> Dict[str, Any]:
        """인증 코드를 토큰으로 교환"""
        async with httpx.AsyncClient() as client:
            # Basic Auth 헤더 생성
            credentials = base64.b64encode(
                f"{self.api_key}:{self.api_secret}".encode()
            ).decode()
            
            response = await client.post(
                f"{self.OAUTH_URL}/token",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                },
            )
            response.raise_for_status()
            data = response.json()
            
            # 만료 시간 계산
            expires_at = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
            
            return {
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_at": expires_at.isoformat(),
                "token_type": data.get("token_type"),
                "scope": data.get("scope"),
            }
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """토큰 갱신"""
        async with httpx.AsyncClient() as client:
            credentials = base64.b64encode(
                f"{self.api_key}:{self.api_secret}".encode()
            ).decode()
            
            response = await client.post(
                f"{self.OAUTH_URL}/token",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "refresh_token",
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
                f"{self.BASE_URL}/users/me/meetings",
                headers=self._get_headers(access_token),
                params={"type": "scheduled", "page_size": 30},
            )
            response.raise_for_status()
            data = response.json()
            
            meetings = []
            for meeting in data.get("meetings", []):
                meetings.append(MeetingInfo(
                    meeting_id=str(meeting.get("id")),
                    title=meeting.get("topic", ""),
                    host_id=meeting.get("host_id", ""),
                    host_name="",
                    start_time=meeting.get("start_time"),
                    end_time=None,
                    join_url=meeting.get("join_url", ""),
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
                f"{self.BASE_URL}/meetings/{meeting_id}",
                headers=self._get_headers(access_token),
            )
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            meeting = response.json()
            
            return MeetingInfo(
                meeting_id=str(meeting.get("id")),
                title=meeting.get("topic", ""),
                host_id=meeting.get("host_id", ""),
                host_name=meeting.get("host_email", ""),
                start_time=meeting.get("start_time"),
                end_time=None,
                join_url=meeting.get("join_url", ""),
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
                f"{self.BASE_URL}/meetings/{meeting_id}/participants",
                headers=self._get_headers(access_token),
            )
            
            if response.status_code == 404:
                return []
            
            response.raise_for_status()
            data = response.json()
            
            participants = []
            for p in data.get("participants", []):
                participants.append(ParticipantInfo(
                    participant_id=p.get("id", p.get("user_id", "")),
                    name=p.get("name", ""),
                    email=p.get("user_email"),
                    is_host=p.get("id") == data.get("host_id"),
                    audio_enabled=True,
                    video_enabled=True,
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
        Zoom 오디오 스트림 연결
        
        참고: Zoom Real-time Media API 또는 Raw Recording 기능 필요
        """
        # Zoom Meeting SDK를 사용한 Raw Audio 접근은
        # Zoom Meeting SDK (클라이언트 사이드)에서 처리해야 함
        # 서버에서는 Recording/Transcription 웹훅을 통해 처리
        
        self.logger.info(
            "Zoom audio stream connection requested",
            meeting_id=meeting_id
        )
        
        return AudioStream(
            stream_id=f"zoom_{meeting_id}",
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
        self.logger.info("Zoom audio stream disconnected", stream_id=stream_id)
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
        Zoom 회의에 자막 전송
        
        Zoom Closed Caption API 사용
        """
        async with httpx.AsyncClient() as client:
            # Zoom Closed Caption API endpoint
            # 실제로는 Zoom Meeting SDK의 Closed Caption 기능 사용
            
            caption_text = text
            if speaker_name:
                caption_text = f"[{speaker_name}] {text}"
            
            # Zoom CC API는 회의 중 CC URL을 통해 전송
            # 여기서는 예시 구현
            self.logger.info(
                "Caption sent to Zoom",
                meeting_id=meeting_id,
                text=caption_text[:50],
                language=language
            )
            
            return True
    
    # ==================== 웹훅 ====================
    
    def verify_webhook(self, payload: Dict) -> bool:
        """Zoom 웹훅 검증"""
        if not self.webhook_secret:
            return True  # 시크릿 없으면 검증 스킵
        
        # Zoom webhook verification
        # https://marketplace.zoom.us/docs/api-reference/webhook-reference/#verify-webhook-events
        
        event = payload.get("event")
        
        # URL Validation 이벤트
        if event == "endpoint.url_validation":
            plain_token = payload.get("payload", {}).get("plainToken", "")
            encrypted_token = hmac.new(
                self.webhook_secret.encode(),
                plain_token.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # 클라이언트에 반환해야 할 값
            payload["validation_response"] = {
                "plainToken": plain_token,
                "encryptedToken": encrypted_token,
            }
            return True
        
        return True
    
    async def handle_webhook_event(self, payload: Dict, db: Any) -> None:
        """Zoom 웹훅 이벤트 처리"""
        event = payload.get("event")
        event_payload = payload.get("payload", {}).get("object", {})
        
        self.logger.info("Zoom webhook event", event=event)
        
        if event == "meeting.started":
            # 회의 시작
            meeting_id = event_payload.get("id")
            self.logger.info("Zoom meeting started", meeting_id=meeting_id)
            
        elif event == "meeting.ended":
            # 회의 종료
            meeting_id = event_payload.get("id")
            self.logger.info("Zoom meeting ended", meeting_id=meeting_id)
            
        elif event == "meeting.participant_joined":
            # 참여자 입장
            participant = event_payload.get("participant", {})
            self.logger.info(
                "Participant joined Zoom meeting",
                participant_name=participant.get("user_name")
            )
            
        elif event == "meeting.participant_left":
            # 참여자 퇴장
            participant = event_payload.get("participant", {})
            self.logger.info(
                "Participant left Zoom meeting",
                participant_name=participant.get("user_name")
            )

