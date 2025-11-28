"""
UniLang Interpreter - Main Application
======================================

FastAPI 메인 애플리케이션 엔트리포인트
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.api import router as api_router

# 로깅 초기화
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """애플리케이션 생명주기 관리"""
    # Startup
    logger.info(
        "Starting UniLang Interpreter",
        app_name=settings.app_name,
        environment=settings.app_env,
    )
    
    yield
    
    # Shutdown
    logger.info("Shutting down UniLang Interpreter")


# FastAPI 애플리케이션 생성
app = FastAPI(
    title=settings.app_name,
    description="""
    ## 🌐 UniLang Interpreter - 실시간 다국어 통역 서비스
    
    다양한 화상회의 플랫폼(Zoom, MS Teams, Google Meet, Webex)과 연동하여
    실시간 음성 인식, 번역, 자막을 제공하는 서비스입니다.
    
    ### 주요 기능
    
    - 🎙️ **실시간 음성 인식**: Google Speech-to-Text 기반
    - 🌍 **실시간 번역**: Google Translate API 기반
    - 📝 **자막 표시**: 참여자별 자국어 자막
    - 📊 **회의 기록**: 원본 + 번역 저장
    - 📋 **회의 요약**: Google Gemini 기반 다국어 요약
    
    ### 지원 플랫폼
    
    - Zoom
    - Microsoft Teams
    - Google Meet
    - Cisco Webex
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 상태 체크 엔드포인트
@app.get("/health", tags=["Health"])
async def health_check():
    """서버 상태 체크"""
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": "1.0.0",
        "environment": settings.app_env,
    }


@app.get("/", tags=["Root"])
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Welcome to UniLang Interpreter API",
        "docs": "/docs",
        "health": "/health",
    }


# API 라우터 등록
app.include_router(api_router, prefix="/api/v1")


# 전역 예외 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """전역 예외 처리"""
    logger.error(
        "Unhandled exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if settings.debug else "An unexpected error occurred",
        },
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )

