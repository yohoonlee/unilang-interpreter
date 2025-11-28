"""
애플리케이션 설정 모듈
=====================

환경 변수 및 설정값 관리
"""

from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """애플리케이션 설정 클래스"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Application Settings
    app_name: str = "UniLang Interpreter"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-this-secret-key-in-production"
    
    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Supabase Settings
    supabase_url: str = ""
    supabase_key: str = ""  # anon/public key
    supabase_service_role_key: str = ""  # service role key (서버 전용)
    
    # Redis Settings (캐싱용)
    redis_url: str = "redis://localhost:6379/0"
    
    # Google Cloud Settings
    google_application_credentials: str = ""
    google_project_id: str = ""
    
    # Google Gemini API
    gemini_api_key: str = ""
    
    # Zoom API Settings
    zoom_api_key: str = ""
    zoom_api_secret: str = ""
    zoom_webhook_secret: str = ""
    
    # Microsoft Teams Settings
    ms_teams_client_id: str = ""
    ms_teams_client_secret: str = ""
    ms_teams_tenant_id: str = ""
    
    # Google Meet Settings
    google_meet_client_id: str = ""
    google_meet_client_secret: str = ""
    
    # Cisco Webex Settings
    webex_client_id: str = ""
    webex_client_secret: str = ""
    webex_access_token: str = ""
    
    # JWT Settings
    jwt_secret_key: str = "jwt-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # CORS Settings
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"]
    )
    
    # Logging
    log_level: str = "INFO"
    
    # Supported Languages
    supported_languages: List[str] = Field(
        default=[
            "ko",  # Korean
            "en",  # English
            "ja",  # Japanese
            "zh",  # Chinese
            "es",  # Spanish
            "fr",  # French
            "de",  # German
            "pt",  # Portuguese
            "ru",  # Russian
            "ar",  # Arabic
            "hi",  # Hindi
            "vi",  # Vietnamese
            "th",  # Thai
            "id",  # Indonesian
        ]
    )
    
    @property
    def is_production(self) -> bool:
        """프로덕션 환경 여부"""
        return self.app_env == "production"


# 전역 설정 인스턴스
settings = Settings()

