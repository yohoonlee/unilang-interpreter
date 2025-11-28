"""
Supabase 데이터베이스 설정 모듈
=============================

Supabase 클라이언트 연결 및 관리
"""

from typing import Optional
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

from .config import settings
from .logging import get_logger

logger = get_logger(__name__)

# Supabase 클라이언트 인스턴스
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Supabase 클라이언트 싱글톤 반환
    
    Returns:
        Client: Supabase 클라이언트 인스턴스
    """
    global _supabase_client
    
    if _supabase_client is None:
        if not settings.supabase_url or not settings.supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables"
            )
        
        options = ClientOptions(
            postgrest_client_timeout=10,
            storage_client_timeout=10,
        )
        
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_key,
            options=options
        )
        logger.info("Supabase client initialized successfully")
    
    return _supabase_client


class SupabaseDB:
    """Supabase 데이터베이스 작업 클래스"""
    
    def __init__(self):
        self.client = get_supabase_client()
    
    # ==================== Meetings ====================
    
    async def create_meeting(self, meeting_data: dict) -> dict:
        """회의 생성"""
        response = self.client.table("meetings").insert(meeting_data).execute()
        return response.data[0] if response.data else {}
    
    async def get_meeting(self, meeting_id: str) -> Optional[dict]:
        """회의 조회"""
        response = (
            self.client.table("meetings")
            .select("*, participants(*)")
            .eq("id", meeting_id)
            .single()
            .execute()
        )
        return response.data
    
    async def update_meeting(self, meeting_id: str, update_data: dict) -> dict:
        """회의 업데이트"""
        response = (
            self.client.table("meetings")
            .update(update_data)
            .eq("id", meeting_id)
            .execute()
        )
        return response.data[0] if response.data else {}
    
    async def list_meetings(
        self, 
        user_id: str, 
        limit: int = 20, 
        offset: int = 0
    ) -> list:
        """사용자의 회의 목록 조회"""
        response = (
            self.client.table("meetings")
            .select("*")
            .eq("created_by", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return response.data or []
    
    # ==================== Participants ====================
    
    async def add_participant(self, participant_data: dict) -> dict:
        """참여자 추가"""
        response = (
            self.client.table("participants")
            .insert(participant_data)
            .execute()
        )
        return response.data[0] if response.data else {}
    
    async def get_participant(self, participant_id: str) -> Optional[dict]:
        """참여자 조회"""
        response = (
            self.client.table("participants")
            .select("*")
            .eq("id", participant_id)
            .single()
            .execute()
        )
        return response.data
    
    async def update_participant(
        self, 
        participant_id: str, 
        update_data: dict
    ) -> dict:
        """참여자 정보 업데이트"""
        response = (
            self.client.table("participants")
            .update(update_data)
            .eq("id", participant_id)
            .execute()
        )
        return response.data[0] if response.data else {}
    
    async def get_meeting_participants(self, meeting_id: str) -> list:
        """회의 참여자 목록 조회"""
        response = (
            self.client.table("participants")
            .select("*")
            .eq("meeting_id", meeting_id)
            .execute()
        )
        return response.data or []
    
    # ==================== Utterances ====================
    
    async def create_utterance(self, utterance_data: dict) -> dict:
        """발화 기록 생성"""
        response = (
            self.client.table("utterances")
            .insert(utterance_data)
            .execute()
        )
        return response.data[0] if response.data else {}
    
    async def get_meeting_utterances(
        self, 
        meeting_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> list:
        """회의 발화 기록 조회"""
        response = (
            self.client.table("utterances")
            .select("*, translations(*)")
            .eq("meeting_id", meeting_id)
            .order("timestamp", desc=False)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return response.data or []
    
    # ==================== Translations ====================
    
    async def create_translation(self, translation_data: dict) -> dict:
        """번역 생성"""
        response = (
            self.client.table("translations")
            .insert(translation_data)
            .execute()
        )
        return response.data[0] if response.data else {}
    
    async def create_translations_bulk(self, translations: list) -> list:
        """번역 일괄 생성"""
        response = (
            self.client.table("translations")
            .insert(translations)
            .execute()
        )
        return response.data or []
    
    async def get_utterance_translations(
        self, 
        utterance_id: str,
        target_language: Optional[str] = None
    ) -> list:
        """발화에 대한 번역 조회"""
        query = (
            self.client.table("translations")
            .select("*")
            .eq("utterance_id", utterance_id)
        )
        
        if target_language:
            query = query.eq("target_language", target_language)
        
        response = query.execute()
        return response.data or []
    
    # ==================== Summaries ====================
    
    async def create_summary(self, summary_data: dict) -> dict:
        """요약 생성"""
        response = (
            self.client.table("summaries")
            .insert(summary_data)
            .execute()
        )
        return response.data[0] if response.data else {}
    
    async def get_meeting_summaries(
        self, 
        meeting_id: str,
        language: Optional[str] = None
    ) -> list:
        """회의 요약 조회"""
        query = (
            self.client.table("summaries")
            .select("*")
            .eq("meeting_id", meeting_id)
        )
        
        if language:
            query = query.eq("language", language)
        
        response = query.execute()
        return response.data or []
    
    # ==================== Users ====================
    
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """이메일로 사용자 조회"""
        response = (
            self.client.table("users")
            .select("*")
            .eq("email", email)
            .single()
            .execute()
        )
        return response.data
    
    async def create_user(self, user_data: dict) -> dict:
        """사용자 생성"""
        response = (
            self.client.table("users")
            .insert(user_data)
            .execute()
        )
        return response.data[0] if response.data else {}
    
    async def update_user(self, user_id: str, update_data: dict) -> dict:
        """사용자 정보 업데이트"""
        response = (
            self.client.table("users")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )
        return response.data[0] if response.data else {}


# 데이터베이스 인스턴스
db = SupabaseDB()


def get_db() -> SupabaseDB:
    """데이터베이스 인스턴스 반환 (의존성 주입용)"""
    return db
