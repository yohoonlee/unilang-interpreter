"""
음성 인식 서비스 (STT)
=====================

Google Cloud Speech-to-Text API를 사용한 실시간 음성 인식
"""

import asyncio
import base64
from typing import AsyncGenerator, Callable, Dict, List, Optional
from dataclasses import dataclass

from google.cloud import speech_v1 as speech
from google.cloud.speech_v1 import SpeechClient
from google.cloud.speech_v1.types import (
    RecognitionConfig,
    StreamingRecognitionConfig,
    StreamingRecognizeRequest,
    StreamingRecognizeResponse,
)

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class TranscriptionResult:
    """음성 인식 결과"""
    text: str
    language: str
    confidence: float
    is_final: bool
    speaker_tag: Optional[int] = None


class SpeechService:
    """Google Cloud Speech-to-Text 서비스"""
    
    # 지원 언어 매핑 (ISO 639-1 -> BCP-47)
    LANGUAGE_CODES = {
        "ko": "ko-KR",
        "en": "en-US",
        "ja": "ja-JP",
        "zh": "zh-CN",
        "es": "es-ES",
        "fr": "fr-FR",
        "de": "de-DE",
        "pt": "pt-BR",
        "ru": "ru-RU",
        "ar": "ar-SA",
        "hi": "hi-IN",
        "vi": "vi-VN",
        "th": "th-TH",
        "id": "id-ID",
    }
    
    def __init__(self):
        self.logger = get_logger(__name__)
        self._client: Optional[SpeechClient] = None
    
    @property
    def client(self) -> SpeechClient:
        """Speech 클라이언트 (지연 초기화)"""
        if self._client is None:
            self._client = SpeechClient()
        return self._client
    
    def _get_recognition_config(
        self,
        language_code: str = "ko",
        sample_rate: int = 16000,
        enable_automatic_punctuation: bool = True,
        enable_speaker_diarization: bool = False,
        diarization_speaker_count: int = 2,
        alternative_language_codes: Optional[List[str]] = None,
    ) -> RecognitionConfig:
        """음성 인식 설정 생성"""
        
        bcp47_code = self.LANGUAGE_CODES.get(language_code, "ko-KR")
        
        config = RecognitionConfig(
            encoding=RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=sample_rate,
            language_code=bcp47_code,
            enable_automatic_punctuation=enable_automatic_punctuation,
            model="latest_long",  # 긴 오디오에 적합한 모델
            use_enhanced=True,  # 향상된 모델 사용
        )
        
        # 다중 언어 인식 (대체 언어)
        if alternative_language_codes:
            alt_codes = [
                self.LANGUAGE_CODES.get(code, code)
                for code in alternative_language_codes
                if code != language_code
            ]
            config.alternative_language_codes = alt_codes[:3]  # 최대 3개
        
        # 화자 분리 설정
        if enable_speaker_diarization:
            config.enable_speaker_diarization = True
            config.diarization_speaker_count = diarization_speaker_count
        
        return config
    
    async def transcribe_audio(
        self,
        audio_data: bytes,
        language_code: str = "ko",
        sample_rate: int = 16000,
    ) -> Optional[TranscriptionResult]:
        """
        단일 오디오 청크 음성 인식
        
        Args:
            audio_data: PCM 오디오 데이터
            language_code: 언어 코드 (ISO 639-1)
            sample_rate: 샘플링 레이트
            
        Returns:
            TranscriptionResult: 인식 결과
        """
        try:
            config = self._get_recognition_config(
                language_code=language_code,
                sample_rate=sample_rate,
            )
            
            audio = speech.RecognitionAudio(content=audio_data)
            
            # 동기 API 호출을 비동기로 래핑
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.recognize(config=config, audio=audio)
            )
            
            if response.results:
                result = response.results[0]
                alternative = result.alternatives[0]
                
                return TranscriptionResult(
                    text=alternative.transcript,
                    language=language_code,
                    confidence=alternative.confidence,
                    is_final=True,
                )
            
            return None
            
        except Exception as e:
            self.logger.error("Transcription failed", error=str(e))
            raise
    
    async def transcribe_audio_base64(
        self,
        audio_base64: str,
        language_code: str = "ko",
        sample_rate: int = 16000,
    ) -> Optional[TranscriptionResult]:
        """
        Base64 인코딩된 오디오 음성 인식
        
        Args:
            audio_base64: Base64 인코딩된 오디오
            language_code: 언어 코드
            sample_rate: 샘플링 레이트
            
        Returns:
            TranscriptionResult: 인식 결과
        """
        audio_data = base64.b64decode(audio_base64)
        return await self.transcribe_audio(audio_data, language_code, sample_rate)
    
    async def stream_transcribe(
        self,
        audio_stream: AsyncGenerator[bytes, None],
        language_code: str = "ko",
        sample_rate: int = 16000,
        on_result: Optional[Callable[[TranscriptionResult], None]] = None,
    ) -> AsyncGenerator[TranscriptionResult, None]:
        """
        실시간 스트리밍 음성 인식
        
        Args:
            audio_stream: 오디오 청크 생성기
            language_code: 언어 코드
            sample_rate: 샘플링 레이트
            on_result: 결과 콜백 함수
            
        Yields:
            TranscriptionResult: 실시간 인식 결과
        """
        config = self._get_recognition_config(
            language_code=language_code,
            sample_rate=sample_rate,
        )
        
        streaming_config = StreamingRecognitionConfig(
            config=config,
            interim_results=True,  # 중간 결과 포함
            single_utterance=False,  # 연속 발화 인식
        )
        
        async def request_generator():
            """스트리밍 요청 생성기"""
            # 첫 번째 요청: 설정
            yield StreamingRecognizeRequest(streaming_config=streaming_config)
            
            # 이후 요청: 오디오 데이터
            async for chunk in audio_stream:
                yield StreamingRecognizeRequest(audio_content=chunk)
        
        try:
            # 스트리밍 인식 실행
            # 참고: 실제 구현에서는 gRPC 비동기 스트리밍 사용
            requests = []
            async for req in request_generator():
                requests.append(req)
            
            responses = self.client.streaming_recognize(requests=iter(requests))
            
            for response in responses:
                for result in response.results:
                    if result.alternatives:
                        alternative = result.alternatives[0]
                        
                        transcription = TranscriptionResult(
                            text=alternative.transcript,
                            language=language_code,
                            confidence=alternative.confidence if result.is_final else 0.0,
                            is_final=result.is_final,
                        )
                        
                        if on_result:
                            on_result(transcription)
                        
                        yield transcription
                        
        except Exception as e:
            self.logger.error("Streaming transcription failed", error=str(e))
            raise
    
    async def detect_language(
        self,
        audio_data: bytes,
        sample_rate: int = 16000,
        candidate_languages: Optional[List[str]] = None,
    ) -> Dict[str, any]:
        """
        오디오의 언어 감지
        
        Args:
            audio_data: PCM 오디오 데이터
            sample_rate: 샘플링 레이트
            candidate_languages: 후보 언어 목록
            
        Returns:
            Dict: 감지된 언어 정보
        """
        if candidate_languages is None:
            candidate_languages = ["ko", "en", "ja", "zh"]
        
        # 여러 언어로 시도하여 가장 높은 신뢰도를 가진 언어 선택
        best_result = None
        best_confidence = 0.0
        best_language = candidate_languages[0]
        
        for lang in candidate_languages[:4]:  # 최대 4개 언어 시도
            try:
                result = await self.transcribe_audio(
                    audio_data=audio_data,
                    language_code=lang,
                    sample_rate=sample_rate,
                )
                
                if result and result.confidence > best_confidence:
                    best_confidence = result.confidence
                    best_language = lang
                    best_result = result
                    
            except Exception:
                continue
        
        return {
            "language": best_language,
            "confidence": best_confidence,
            "transcript": best_result.text if best_result else "",
        }


class RealtimeSpeechProcessor:
    """실시간 음성 처리기"""
    
    def __init__(self, speech_service: SpeechService):
        self.speech_service = speech_service
        self.logger = get_logger(__name__)
        self._audio_buffer: List[bytes] = []
        self._buffer_duration_ms: int = 0
        self._min_buffer_ms: int = 500  # 최소 버퍼 (500ms)
        self._max_buffer_ms: int = 5000  # 최대 버퍼 (5초)
    
    def add_audio_chunk(
        self,
        audio_data: bytes,
        duration_ms: int,
    ) -> Optional[bytes]:
        """
        오디오 청크 추가 및 버퍼 관리
        
        Args:
            audio_data: 오디오 데이터
            duration_ms: 청크 길이 (밀리초)
            
        Returns:
            bytes: 처리할 버퍼가 준비되면 반환, 아니면 None
        """
        self._audio_buffer.append(audio_data)
        self._buffer_duration_ms += duration_ms
        
        # 버퍼가 최소 크기 이상이면 반환
        if self._buffer_duration_ms >= self._min_buffer_ms:
            buffer_data = b"".join(self._audio_buffer)
            
            # 버퍼가 최대 크기를 넘으면 일부만 유지
            if self._buffer_duration_ms > self._max_buffer_ms:
                # 최근 데이터만 유지
                keep_ratio = self._max_buffer_ms / self._buffer_duration_ms
                keep_bytes = int(len(buffer_data) * keep_ratio)
                buffer_data = buffer_data[-keep_bytes:]
            
            self._audio_buffer = []
            self._buffer_duration_ms = 0
            
            return buffer_data
        
        return None
    
    def clear_buffer(self) -> None:
        """버퍼 초기화"""
        self._audio_buffer = []
        self._buffer_duration_ms = 0












