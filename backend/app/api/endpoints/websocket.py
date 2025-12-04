"""
WebSocket 엔드포인트
===================

실시간 통신을 위한 WebSocket 엔드포인트
"""

import json
from typing import Dict, Set
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends

from app.core.database import get_db, SupabaseDB
from app.core.logging import get_logger
from app.services.realtime_service import RealtimeService

logger = get_logger(__name__)
router = APIRouter()


class ConnectionManager:
    """WebSocket 연결 관리자"""
    
    def __init__(self):
        # meeting_id -> set of WebSocket connections
        self.meeting_connections: Dict[str, Set[WebSocket]] = {}
        # participant_id -> WebSocket connection
        self.participant_connections: Dict[str, WebSocket] = {}
        # WebSocket -> participant info
        self.connection_info: Dict[WebSocket, dict] = {}
    
    async def connect(
        self,
        websocket: WebSocket,
        meeting_id: str,
        participant_id: str,
        preferred_language: str,
    ):
        """새 연결 추가"""
        await websocket.accept()
        
        # 회의별 연결 관리
        if meeting_id not in self.meeting_connections:
            self.meeting_connections[meeting_id] = set()
        self.meeting_connections[meeting_id].add(websocket)
        
        # 참여자별 연결 관리
        self.participant_connections[participant_id] = websocket
        
        # 연결 정보 저장
        self.connection_info[websocket] = {
            "meeting_id": meeting_id,
            "participant_id": participant_id,
            "preferred_language": preferred_language,
        }
        
        logger.info(
            "WebSocket connected",
            meeting_id=meeting_id,
            participant_id=participant_id
        )
    
    def disconnect(self, websocket: WebSocket):
        """연결 제거"""
        info = self.connection_info.get(websocket)
        if info:
            meeting_id = info["meeting_id"]
            participant_id = info["participant_id"]
            
            # 회의별 연결에서 제거
            if meeting_id in self.meeting_connections:
                self.meeting_connections[meeting_id].discard(websocket)
                if not self.meeting_connections[meeting_id]:
                    del self.meeting_connections[meeting_id]
            
            # 참여자별 연결에서 제거
            if participant_id in self.participant_connections:
                del self.participant_connections[participant_id]
            
            # 연결 정보 제거
            del self.connection_info[websocket]
            
            logger.info(
                "WebSocket disconnected",
                meeting_id=meeting_id,
                participant_id=participant_id
            )
    
    async def broadcast_to_meeting(self, meeting_id: str, message: dict):
        """회의 참여자 전체에게 메시지 전송"""
        if meeting_id in self.meeting_connections:
            disconnected = set()
            for connection in self.meeting_connections[meeting_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.add(connection)
            
            # 실패한 연결 정리
            for conn in disconnected:
                self.disconnect(conn)
    
    async def send_to_participant(self, participant_id: str, message: dict):
        """특정 참여자에게 메시지 전송"""
        if participant_id in self.participant_connections:
            try:
                await self.participant_connections[participant_id].send_json(message)
            except Exception:
                websocket = self.participant_connections[participant_id]
                self.disconnect(websocket)
    
    async def broadcast_translation(
        self,
        meeting_id: str,
        utterance_data: dict,
        translations: Dict[str, str],
    ):
        """
        번역된 자막을 각 참여자의 선호 언어로 전송
        
        Args:
            meeting_id: 회의 ID
            utterance_data: 원본 발화 데이터
            translations: {언어코드: 번역텍스트} 딕셔너리
        """
        if meeting_id not in self.meeting_connections:
            return
        
        for connection in self.meeting_connections[meeting_id]:
            info = self.connection_info.get(connection)
            if not info:
                continue
            
            preferred_lang = info["preferred_language"]
            
            # 해당 언어 번역이 있으면 사용, 없으면 원본
            translated_text = translations.get(
                preferred_lang,
                utterance_data.get("original_text", "")
            )
            
            message = {
                "type": "subtitle",
                "data": {
                    "speaker_name": utterance_data.get("speaker_name"),
                    "original_language": utterance_data.get("original_language"),
                    "original_text": utterance_data.get("original_text"),
                    "translated_text": translated_text,
                    "target_language": preferred_lang,
                    "timestamp": utterance_data.get("timestamp"),
                    "is_final": utterance_data.get("is_final", True),
                }
            }
            
            try:
                await connection.send_json(message)
            except Exception:
                pass  # 에러는 무시하고 계속 진행
    
    def get_meeting_participants(self, meeting_id: str) -> list:
        """회의 참여자 정보 목록 반환"""
        if meeting_id not in self.meeting_connections:
            return []
        
        participants = []
        for conn in self.meeting_connections[meeting_id]:
            info = self.connection_info.get(conn)
            if info:
                participants.append(info)
        
        return participants


# 전역 연결 관리자
manager = ConnectionManager()


@router.websocket("/meeting/{meeting_id}")
async def websocket_meeting(
    websocket: WebSocket,
    meeting_id: str,
    participant_id: str = Query(...),
    preferred_language: str = Query(default="ko"),
):
    """
    회의 실시간 연결
    
    연결 후 수신 가능한 메시지 타입:
    - subtitle: 실시간 자막
    - participant_joined: 참여자 입장
    - participant_left: 참여자 퇴장
    - meeting_ended: 회의 종료
    
    전송 가능한 메시지 타입:
    - audio: 오디오 데이터 (base64)
    - language_change: 언어 변경
    """
    await manager.connect(
        websocket=websocket,
        meeting_id=meeting_id,
        participant_id=participant_id,
        preferred_language=preferred_language,
    )
    
    # 실시간 서비스 인스턴스
    realtime_service = RealtimeService()
    
    # 참여자 입장 알림
    await manager.broadcast_to_meeting(
        meeting_id,
        {
            "type": "participant_joined",
            "data": {
                "participant_id": participant_id,
                "preferred_language": preferred_language,
            }
        }
    )
    
    try:
        while True:
            # 클라이언트로부터 메시지 수신
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            
            if message_type == "audio":
                # 오디오 데이터 처리 (STT -> 번역 -> 브로드캐스트)
                await realtime_service.process_audio(
                    meeting_id=meeting_id,
                    participant_id=participant_id,
                    audio_data=message.get("data"),
                    manager=manager,
                )
            
            elif message_type == "language_change":
                # 언어 설정 변경
                new_language = message.get("language")
                if websocket in manager.connection_info:
                    manager.connection_info[websocket]["preferred_language"] = new_language
                    
                    await websocket.send_json({
                        "type": "language_changed",
                        "data": {"language": new_language}
                    })
            
            elif message_type == "ping":
                # 연결 유지
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        
        # 참여자 퇴장 알림
        await manager.broadcast_to_meeting(
            meeting_id,
            {
                "type": "participant_left",
                "data": {"participant_id": participant_id}
            }
        )
    except Exception as e:
        logger.error(
            "WebSocket error",
            meeting_id=meeting_id,
            participant_id=participant_id,
            error=str(e)
        )
        manager.disconnect(websocket)


@router.get("/meeting/{meeting_id}/participants")
async def get_websocket_participants(meeting_id: str):
    """회의의 현재 WebSocket 연결 참여자 목록"""
    participants = manager.get_meeting_participants(meeting_id)
    return {"participants": participants, "count": len(participants)}











