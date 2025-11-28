"""
번역 서비스
==========

Google Cloud Translation API를 사용한 실시간 번역
"""

import asyncio
from typing import Dict, List, Optional

from google.cloud import translate_v2 as translate

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class TranslationService:
    """Google Cloud Translation 서비스"""
    
    # 언어 이름 매핑
    LANGUAGE_NAMES = {
        "ko": "한국어",
        "en": "English",
        "ja": "日本語",
        "zh": "中文",
        "es": "Español",
        "fr": "Français",
        "de": "Deutsch",
        "pt": "Português",
        "ru": "Русский",
        "ar": "العربية",
        "hi": "हिन्दी",
        "vi": "Tiếng Việt",
        "th": "ไทย",
        "id": "Bahasa Indonesia",
    }
    
    def __init__(self):
        self.logger = get_logger(__name__)
        self._client: Optional[translate.Client] = None
    
    @property
    def client(self) -> translate.Client:
        """Translation 클라이언트 (지연 초기화)"""
        if self._client is None:
            self._client = translate.Client()
        return self._client
    
    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> str:
        """
        텍스트 번역
        
        Args:
            text: 원본 텍스트
            source_language: 원본 언어 코드 (ISO 639-1)
            target_language: 대상 언어 코드 (ISO 639-1)
            
        Returns:
            str: 번역된 텍스트
        """
        if source_language == target_language:
            return text
        
        if not text.strip():
            return text
        
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.client.translate(
                    text,
                    source_language=source_language,
                    target_language=target_language,
                )
            )
            
            translated_text = result.get("translatedText", text)
            
            self.logger.debug(
                "Translation completed",
                source=source_language,
                target=target_language,
                original_length=len(text),
                translated_length=len(translated_text),
            )
            
            return translated_text
            
        except Exception as e:
            self.logger.error(
                "Translation failed",
                error=str(e),
                source=source_language,
                target=target_language,
            )
            raise
    
    async def translate_to_multiple(
        self,
        text: str,
        source_language: str,
        target_languages: List[str],
    ) -> Dict[str, str]:
        """
        하나의 텍스트를 여러 언어로 번역
        
        Args:
            text: 원본 텍스트
            source_language: 원본 언어 코드
            target_languages: 대상 언어 코드 목록
            
        Returns:
            Dict[str, str]: {언어코드: 번역텍스트} 딕셔너리
        """
        if not text.strip():
            return {lang: text for lang in target_languages}
        
        # 병렬 번역 실행
        tasks = []
        for target_lang in target_languages:
            if target_lang == source_language:
                continue
            tasks.append(self._translate_with_lang(text, source_language, target_lang))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        translations = {source_language: text}  # 원본 언어는 그대로
        
        for i, target_lang in enumerate(target_languages):
            if target_lang == source_language:
                continue
            
            task_idx = sum(1 for l in target_languages[:i] if l != source_language) - 1
            if task_idx < 0:
                task_idx = 0
            
            result = results[task_idx] if task_idx < len(results) else None
            
            if isinstance(result, Exception):
                self.logger.warning(
                    "Translation to language failed",
                    target=target_lang,
                    error=str(result)
                )
                translations[target_lang] = text  # 실패 시 원본 반환
            elif result:
                translations[target_lang] = result
            else:
                translations[target_lang] = text
        
        return translations
    
    async def _translate_with_lang(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> str:
        """번역 헬퍼 (에러 처리 포함)"""
        try:
            return await self.translate(text, source_language, target_language)
        except Exception as e:
            self.logger.error(f"Translation error: {e}")
            return text
    
    async def translate_batch(
        self,
        texts: List[str],
        source_language: str,
        target_languages: List[str],
    ) -> List[Dict]:
        """
        여러 텍스트를 여러 언어로 일괄 번역
        
        Args:
            texts: 원본 텍스트 목록
            source_language: 원본 언어 코드
            target_languages: 대상 언어 코드 목록
            
        Returns:
            List[Dict]: 각 텍스트의 번역 결과 목록
        """
        results = []
        
        for text in texts:
            translations = await self.translate_to_multiple(
                text=text,
                source_language=source_language,
                target_languages=target_languages,
            )
            results.append({
                "original": text,
                "source_language": source_language,
                "translations": translations,
            })
        
        return results
    
    async def detect_language(self, text: str) -> Dict[str, any]:
        """
        텍스트의 언어 감지
        
        Args:
            text: 감지할 텍스트
            
        Returns:
            Dict: 감지 결과 (language, confidence)
        """
        if not text.strip():
            return {"language": "en", "confidence": 0.0}
        
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.client.detect_language(text)
            )
            
            return {
                "language": result.get("language", "en"),
                "confidence": result.get("confidence", 0.0),
            }
            
        except Exception as e:
            self.logger.error("Language detection failed", error=str(e))
            return {"language": "en", "confidence": 0.0}
    
    def get_supported_languages(self) -> Dict[str, str]:
        """지원 언어 목록 반환"""
        return self.LANGUAGE_NAMES.copy()
    
    def get_language_name(self, code: str) -> str:
        """언어 코드에 해당하는 언어 이름 반환"""
        return self.LANGUAGE_NAMES.get(code, code)


class RealtimeTranslationPipeline:
    """실시간 번역 파이프라인"""
    
    def __init__(self, translation_service: TranslationService):
        self.translation_service = translation_service
        self.logger = get_logger(__name__)
        self._cache: Dict[str, Dict[str, str]] = {}  # 번역 캐시
        self._cache_max_size = 1000
    
    async def process_utterance(
        self,
        text: str,
        source_language: str,
        target_languages: List[str],
        use_cache: bool = True,
    ) -> Dict[str, str]:
        """
        발화 텍스트 번역 처리
        
        Args:
            text: 원본 텍스트
            source_language: 원본 언어
            target_languages: 대상 언어 목록
            use_cache: 캐시 사용 여부
            
        Returns:
            Dict[str, str]: 번역 결과
        """
        # 캐시 키 생성
        cache_key = f"{source_language}:{text}"
        
        # 캐시 확인
        if use_cache and cache_key in self._cache:
            cached = self._cache[cache_key]
            # 필요한 언어가 모두 캐시에 있는지 확인
            if all(lang in cached for lang in target_languages):
                return {lang: cached[lang] for lang in target_languages}
        
        # 번역 실행
        translations = await self.translation_service.translate_to_multiple(
            text=text,
            source_language=source_language,
            target_languages=target_languages,
        )
        
        # 캐시 저장
        if use_cache:
            if len(self._cache) >= self._cache_max_size:
                # 캐시 크기 초과 시 오래된 항목 제거
                keys_to_remove = list(self._cache.keys())[:100]
                for key in keys_to_remove:
                    del self._cache[key]
            
            if cache_key not in self._cache:
                self._cache[cache_key] = {}
            self._cache[cache_key].update(translations)
        
        return translations
    
    def clear_cache(self) -> None:
        """캐시 초기화"""
        self._cache.clear()

