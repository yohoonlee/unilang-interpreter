"""
실시간 처리 서비스
=================

실시간 음성 인식, 번역, 자막 전송을 통합 관리
"""

import asyncio
import base64
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.services.speech_service import SpeechService, TranscriptionResult
from app.services.translation_service import TranslationService, RealtimeTranslationPipeline

logger = get_logger(__name__)


class RealtimeService:
    """실시간 통역 파이프라인 서비스"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        self.speech_service = SpeechService()
        self.translation_service = TranslationService()
        self.translation_pipeline = RealtimeTranslationPipeline(self.translation_service)
        
        # 회의별 상태 관리
        self._meeting_states: Dict[str, MeetingState] = {}
    
    def get_meeting_state(self, meeting_id: str) -> "MeetingState":
        """회의 상태 조회 또는 생성"""
        if meeting_id not in self._meeting_states:
            self._meeting_states[meeting_id] = MeetingState(meeting_id)
        return self._meeting_states[meeting_id]
    
    def remove_meeting_state(self, meeting_id: str) -> None:
        """회의 상태 제거"""
        if meeting_id in self._meeting_states:
            del self._meeting_states[meeting_id]
    
    async def process_audio(
        self,
        meeting_id: str,
        participant_id: str,
        audio_data: str,  # Base64 인코딩된 오디오
        manager: Any,  # ConnectionManager
        source_language: Optional[str] = None,
    ) -> None:
        """
        오디오 데이터 처리 파이프라인
        
        1. 음성 인식 (STT)
        2. 번역 (각 참여자 언어로)
        3. 자막 브로드캐스트
        4. 데이터베이스 저장
        
        Args:
            meeting_id: 회의 ID
            participant_id: 참여자 ID
            audio_data: Base64 인코딩된 오디오 데이터
            manager: WebSocket 연결 관리자
            source_language: 화자 언어 (없으면 자동 감지)
        """
        meeting_state = self.get_meeting_state(meeting_id)
        
        try:
            # 1. Base64 디코딩
            audio_bytes = base64.b64decode(audio_data)
            
            # 2. 음성 인식
            # 화자 언어 결정
            if source_language is None:
                # 참여자의 선호 언어 사용 또는 자동 감지
                participant_info = meeting_state.participants.get(participant_id, {})
                source_language = participant_info.get("language", "ko")
            
            transcription = await self.speech_service.transcribe_audio(
                audio_data=audio_bytes,
                language_code=source_language,
            )
            
            if not transcription or not transcription.text.strip():
                return
            
            # 3. 참여자별 대상 언어 수집
            target_languages = meeting_state.get_target_languages()
            if not target_languages:
                target_languages = ["ko", "en"]  # 기본값
            
            # 4. 번역
            translations = await self.translation_pipeline.process_utterance(
                text=transcription.text,
                source_language=source_language,
                target_languages=target_languages,
            )
            
            # 5. 발화 데이터 구성
            utterance_data = {
                "id": str(uuid4()),
                "meeting_id": meeting_id,
                "participant_id": participant_id,
                "speaker_name": meeting_state.participants.get(participant_id, {}).get("name", "Unknown"),
                "original_language": source_language,
                "original_text": transcription.text,
                "confidence": transcription.confidence,
                "timestamp": datetime.utcnow().isoformat(),
                "is_final": transcription.is_final,
            }
            
            # 6. WebSocket으로 자막 브로드캐스트
            await manager.broadcast_translation(
                meeting_id=meeting_id,
                utterance_data=utterance_data,
                translations=translations,
            )
            
            # 7. 데이터베이스 저장 (최종 결과만)
            if transcription.is_final:
                await self._save_utterance(utterance_data, translations)
            
            self.logger.debug(
                "Audio processed",
                meeting_id=meeting_id,
                participant_id=participant_id,
                text_length=len(transcription.text),
            )
            
        except Exception as e:
            self.logger.error(
                "Audio processing failed",
                meeting_id=meeting_id,
                participant_id=participant_id,
                error=str(e),
            )
    
    async def process_text_input(
        self,
        meeting_id: str,
        participant_id: str,
        text: str,
        source_language: str,
        manager: Any,
    ) -> None:
        """
        텍스트 입력 처리 (수동 입력 지원)
        
        Args:
            meeting_id: 회의 ID
            participant_id: 참여자 ID
            text: 입력 텍스트
            source_language: 원본 언어
            manager: WebSocket 연결 관리자
        """
        meeting_state = self.get_meeting_state(meeting_id)
        
        try:
            # 대상 언어 수집
            target_languages = meeting_state.get_target_languages()
            
            # 번역
            translations = await self.translation_pipeline.process_utterance(
                text=text,
                source_language=source_language,
                target_languages=target_languages,
            )
            
            # 발화 데이터 구성
            utterance_data = {
                "id": str(uuid4()),
                "meeting_id": meeting_id,
                "participant_id": participant_id,
                "speaker_name": meeting_state.participants.get(participant_id, {}).get("name", "Unknown"),
                "original_language": source_language,
                "original_text": text,
                "confidence": 1.0,
                "timestamp": datetime.utcnow().isoformat(),
                "is_final": True,
            }
            
            # 브로드캐스트
            await manager.broadcast_translation(
                meeting_id=meeting_id,
                utterance_data=utterance_data,
                translations=translations,
            )
            
            # 저장
            await self._save_utterance(utterance_data, translations)
            
        except Exception as e:
            self.logger.error(
                "Text processing failed",
                meeting_id=meeting_id,
                error=str(e),
            )
    
    async def _save_utterance(
        self,
        utterance_data: Dict,
        translations: Dict[str, str],
    ) -> None:
        """발화 및 번역을 데이터베이스에 저장"""
        try:
            db = get_db()
            
            # 발화 저장
            utterance = await db.create_utterance({
                "meeting_id": utterance_data["meeting_id"],
                "participant_id": utterance_data.get("participant_id"),
                "speaker_name": utterance_data.get("speaker_name"),
                "original_language": utterance_data["original_language"],
                "original_text": utterance_data["original_text"],
                "confidence": utterance_data.get("confidence"),
                "timestamp": utterance_data["timestamp"],
            })
            
            utterance_id = utterance.get("id")
            
            if utterance_id:
                # 번역 저장
                translation_records = []
                for target_lang, translated_text in translations.items():
                    if target_lang != utterance_data["original_language"]:
                        translation_records.append({
                            "utterance_id": utterance_id,
                            "target_language": target_lang,
                            "translated_text": translated_text,
                            "translation_engine": "google",
                        })
                
                if translation_records:
                    await db.create_translations_bulk(translation_records)
            
        except Exception as e:
            self.logger.error("Failed to save utterance", error=str(e))


class MeetingState:
    """회의 상태 관리"""
    
    def __init__(self, meeting_id: str):
        self.meeting_id = meeting_id
        self.participants: Dict[str, Dict] = {}  # participant_id -> info
        self.started_at: Optional[datetime] = None
        self.utterance_count: int = 0
        self.is_active: bool = True
    
    def add_participant(
        self,
        participant_id: str,
        name: str,
        language: str,
    ) -> None:
        """참여자 추가"""
        self.participants[participant_id] = {
            "name": name,
            "language": language,
            "joined_at": datetime.utcnow().isoformat(),
        }
    
    def remove_participant(self, participant_id: str) -> None:
        """참여자 제거"""
        if participant_id in self.participants:
            del self.participants[participant_id]
    
    def update_participant_language(
        self,
        participant_id: str,
        language: str,
    ) -> None:
        """참여자 언어 업데이트"""
        if participant_id in self.participants:
            self.participants[participant_id]["language"] = language
    
    def get_target_languages(self) -> List[str]:
        """모든 참여자의 언어 목록 반환"""
        languages = set()
        for participant in self.participants.values():
            lang = participant.get("language")
            if lang:
                languages.add(lang)
        
        return list(languages) if languages else ["ko", "en"]
    
    def start(self) -> None:
        """회의 시작"""
        self.started_at = datetime.utcnow()
        self.is_active = True
    
    def end(self) -> None:
        """회의 종료"""
        self.is_active = False


class AudioBufferManager:
    """오디오 버퍼 관리자"""
    
    def __init__(
        self,
        buffer_duration_ms: int = 1000,
        sample_rate: int = 16000,
        channels: int = 1,
        bytes_per_sample: int = 2,
    ):
        self.buffer_duration_ms = buffer_duration_ms
        self.sample_rate = sample_rate
        self.channels = channels
        self.bytes_per_sample = bytes_per_sample
        
        # 버퍼 크기 계산
        self.buffer_size = int(
            sample_rate * channels * bytes_per_sample * buffer_duration_ms / 1000
        )
        
        self._buffers: Dict[str, bytearray] = {}  # participant_id -> buffer
    
    def add_chunk(self, participant_id: str, data: bytes) -> Optional[bytes]:
        """
        오디오 청크 추가
        
        버퍼가 가득 차면 데이터 반환
        """
        if participant_id not in self._buffers:
            self._buffers[participant_id] = bytearray()
        
        self._buffers[participant_id].extend(data)
        
        if len(self._buffers[participant_id]) >= self.buffer_size:
            buffer_data = bytes(self._buffers[participant_id])
            self._buffers[participant_id] = bytearray()
            return buffer_data
        
        return None
    
    def flush(self, participant_id: str) -> Optional[bytes]:
        """버퍼 플러시"""
        if participant_id in self._buffers and self._buffers[participant_id]:
            buffer_data = bytes(self._buffers[participant_id])
            self._buffers[participant_id] = bytearray()
            return buffer_data
        return None
    
    def clear(self, participant_id: str) -> None:
        """버퍼 클리어"""
        if participant_id in self._buffers:
            self._buffers[participant_id] = bytearray()
    
    def clear_all(self) -> None:
        """모든 버퍼 클리어"""
        self._buffers.clear()










