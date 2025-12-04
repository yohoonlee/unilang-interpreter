"""
회의 요약 서비스
===============

Google Gemini를 사용한 회의 요약 생성
"""

import json
from typing import Dict, List, Optional

import google.generativeai as genai

from app.core.config import settings
from app.core.logging import get_logger
from app.services.translation_service import TranslationService

logger = get_logger(__name__)


class SummaryService:
    """Google Gemini 기반 회의 요약 서비스"""
    
    MODEL_NAME = "gemini-pro"
    
    # 요약 프롬프트 템플릿
    SUMMARY_PROMPT_TEMPLATE = """
당신은 전문 회의록 작성자입니다. 아래 회의 발화 기록을 분석하여 상세한 요약을 작성해주세요.

## 회의 정보
- 참여자 수: {participant_count}명
- 총 발화 수: {utterance_count}개

## 발화 기록
{transcript}

## 요청 사항
다음 형식으로 회의 요약을 JSON으로 작성해주세요:

{{
    "summary": "회의 전체 요약 (3-5문장)",
    "key_points": ["핵심 포인트 1", "핵심 포인트 2", ...],
    "action_items": ["액션 아이템 1", "액션 아이템 2", ...],
    "decisions": ["결정 사항 1", "결정 사항 2", ...]
}}

반드시 유효한 JSON 형식으로만 응답해주세요.
"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        self.translation_service = TranslationService()
        self._model: Optional[genai.GenerativeModel] = None
        
        # Gemini API 설정
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
    
    @property
    def model(self) -> genai.GenerativeModel:
        """Gemini 모델 (지연 초기화)"""
        if self._model is None:
            self._model = genai.GenerativeModel(self.MODEL_NAME)
        return self._model
    
    def _format_transcript(self, utterances: List[Dict]) -> str:
        """발화 기록을 텍스트로 포맷팅"""
        lines = []
        for u in utterances:
            speaker = u.get("speaker_name", "Unknown")
            text = u.get("original_text", "")
            lang = u.get("original_language", "")
            timestamp = u.get("timestamp", "")
            
            lines.append(f"[{timestamp}] {speaker} ({lang}): {text}")
        
        return "\n".join(lines)
    
    async def generate_summary(
        self,
        meeting_id: str,
        utterances: List[Dict],
        language: str = "ko",
        include_key_points: bool = True,
        include_action_items: bool = True,
        include_decisions: bool = True,
    ) -> Dict:
        """
        회의 요약 생성
        
        Args:
            meeting_id: 회의 ID
            utterances: 발화 기록 목록
            language: 요약 언어
            include_key_points: 핵심 포인트 포함 여부
            include_action_items: 액션 아이템 포함 여부
            include_decisions: 결정 사항 포함 여부
            
        Returns:
            Dict: 요약 데이터
        """
        if not utterances:
            return self._empty_summary(meeting_id, language)
        
        # 참여자 목록 추출
        speakers = set()
        for u in utterances:
            if u.get("speaker_name"):
                speakers.add(u["speaker_name"])
        
        # 발화 기록 포맷팅
        transcript = self._format_transcript(utterances)
        
        # 프롬프트 생성
        prompt = self.SUMMARY_PROMPT_TEMPLATE.format(
            participant_count=len(speakers),
            utterance_count=len(utterances),
            transcript=transcript,
        )
        
        try:
            # Gemini API 호출
            response = self.model.generate_content(prompt)
            
            # 응답 파싱
            response_text = response.text.strip()
            
            # JSON 추출 (코드 블록이 있으면 제거)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            summary_data = json.loads(response_text)
            
            # 결과 구성
            result = {
                "meeting_id": meeting_id,
                "language": language,
                "summary_text": summary_data.get("summary", ""),
                "key_points": summary_data.get("key_points", []) if include_key_points else [],
                "action_items": summary_data.get("action_items", []) if include_action_items else [],
                "decisions": summary_data.get("decisions", []) if include_decisions else [],
                "ai_model": self.MODEL_NAME,
            }
            
            self.logger.info(
                "Summary generated",
                meeting_id=meeting_id,
                language=language,
                key_points_count=len(result["key_points"]),
            )
            
            return result
            
        except json.JSONDecodeError as e:
            self.logger.error(
                "Failed to parse summary response",
                error=str(e),
                response_text=response_text[:500] if 'response_text' in locals() else "N/A",
            )
            return self._empty_summary(meeting_id, language)
            
        except Exception as e:
            self.logger.error(
                "Summary generation failed",
                meeting_id=meeting_id,
                error=str(e),
            )
            raise
    
    async def generate_summaries(
        self,
        meeting_id: str,
        utterances: List[Dict],
        languages: List[str],
        include_key_points: bool = True,
        include_action_items: bool = True,
        include_decisions: bool = True,
    ) -> List[Dict]:
        """
        여러 언어로 회의 요약 생성
        
        Args:
            meeting_id: 회의 ID
            utterances: 발화 기록 목록
            languages: 요약 생성 언어 목록
            include_key_points: 핵심 포인트 포함 여부
            include_action_items: 액션 아이템 포함 여부
            include_decisions: 결정 사항 포함 여부
            
        Returns:
            List[Dict]: 각 언어별 요약 데이터
        """
        # 먼저 기본 언어(첫 번째)로 요약 생성
        primary_language = languages[0] if languages else "ko"
        
        primary_summary = await self.generate_summary(
            meeting_id=meeting_id,
            utterances=utterances,
            language=primary_language,
            include_key_points=include_key_points,
            include_action_items=include_action_items,
            include_decisions=include_decisions,
        )
        
        summaries = [primary_summary]
        
        # 나머지 언어로 번역
        for target_lang in languages[1:]:
            translated_summary = await self._translate_summary(
                summary=primary_summary,
                target_language=target_lang,
            )
            summaries.append(translated_summary)
        
        return summaries
    
    async def _translate_summary(
        self,
        summary: Dict,
        target_language: str,
    ) -> Dict:
        """요약을 다른 언어로 번역"""
        try:
            source_language = summary.get("language", "ko")
            
            if source_language == target_language:
                return summary
            
            # 요약 텍스트 번역
            translated_summary_text = await self.translation_service.translate(
                text=summary.get("summary_text", ""),
                source_language=source_language,
                target_language=target_language,
            )
            
            # 핵심 포인트 번역
            translated_key_points = []
            for point in summary.get("key_points", []):
                translated = await self.translation_service.translate(
                    text=point,
                    source_language=source_language,
                    target_language=target_language,
                )
                translated_key_points.append(translated)
            
            # 액션 아이템 번역
            translated_action_items = []
            for item in summary.get("action_items", []):
                translated = await self.translation_service.translate(
                    text=item,
                    source_language=source_language,
                    target_language=target_language,
                )
                translated_action_items.append(translated)
            
            # 결정 사항 번역
            translated_decisions = []
            for decision in summary.get("decisions", []):
                translated = await self.translation_service.translate(
                    text=decision,
                    source_language=source_language,
                    target_language=target_language,
                )
                translated_decisions.append(translated)
            
            return {
                "meeting_id": summary.get("meeting_id"),
                "language": target_language,
                "summary_text": translated_summary_text,
                "key_points": translated_key_points,
                "action_items": translated_action_items,
                "decisions": translated_decisions,
                "ai_model": summary.get("ai_model"),
            }
            
        except Exception as e:
            self.logger.error(
                "Summary translation failed",
                target_language=target_language,
                error=str(e),
            )
            # 번역 실패 시 원본 반환
            return {**summary, "language": target_language}
    
    def _empty_summary(self, meeting_id: str, language: str) -> Dict:
        """빈 요약 데이터 반환"""
        return {
            "meeting_id": meeting_id,
            "language": language,
            "summary_text": "회의 기록이 없어 요약을 생성할 수 없습니다.",
            "key_points": [],
            "action_items": [],
            "decisions": [],
            "ai_model": self.MODEL_NAME,
        }


class MeetingAnalyzer:
    """회의 분석 서비스"""
    
    def __init__(self, summary_service: SummaryService):
        self.summary_service = summary_service
        self.logger = get_logger(__name__)
    
    def analyze_participation(self, utterances: List[Dict]) -> Dict:
        """
        참여자별 발언 분석
        
        Args:
            utterances: 발화 기록 목록
            
        Returns:
            Dict: 참여 분석 결과
        """
        speaker_stats = {}
        
        for u in utterances:
            speaker = u.get("speaker_name", "Unknown")
            text = u.get("original_text", "")
            
            if speaker not in speaker_stats:
                speaker_stats[speaker] = {
                    "utterance_count": 0,
                    "total_characters": 0,
                    "languages_used": set(),
                }
            
            speaker_stats[speaker]["utterance_count"] += 1
            speaker_stats[speaker]["total_characters"] += len(text)
            speaker_stats[speaker]["languages_used"].add(u.get("original_language", ""))
        
        # set을 list로 변환
        for speaker in speaker_stats:
            speaker_stats[speaker]["languages_used"] = list(
                speaker_stats[speaker]["languages_used"]
            )
        
        # 총계 계산
        total_utterances = sum(s["utterance_count"] for s in speaker_stats.values())
        
        # 참여율 계산
        for speaker in speaker_stats:
            speaker_stats[speaker]["participation_rate"] = round(
                speaker_stats[speaker]["utterance_count"] / total_utterances * 100, 1
            ) if total_utterances > 0 else 0
        
        return {
            "total_participants": len(speaker_stats),
            "total_utterances": total_utterances,
            "speaker_stats": speaker_stats,
        }
    
    def get_language_distribution(self, utterances: List[Dict]) -> Dict[str, int]:
        """
        언어별 발화 분포
        
        Args:
            utterances: 발화 기록 목록
            
        Returns:
            Dict[str, int]: 언어별 발화 수
        """
        distribution = {}
        
        for u in utterances:
            lang = u.get("original_language", "unknown")
            distribution[lang] = distribution.get(lang, 0) + 1
        
        return distribution












