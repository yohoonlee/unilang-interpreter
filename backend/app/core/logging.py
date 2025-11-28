"""
로깅 설정 모듈
=============

구조화된 로깅 설정
"""

import logging
import sys
from typing import Any

import structlog
from structlog.types import Processor

from .config import settings


def setup_logging() -> None:
    """로깅 설정 초기화"""
    
    # 공통 프로세서
    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
    ]
    
    if settings.is_production:
        # 프로덕션: JSON 형식
        shared_processors.append(structlog.processors.JSONRenderer())
    else:
        # 개발: 컬러 콘솔 출력
        shared_processors.append(
            structlog.dev.ConsoleRenderer(colors=True)
        )
    
    structlog.configure(
        processors=shared_processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(settings.log_level)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # 표준 라이브러리 로깅 설정
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.getLevelName(settings.log_level),
    )


def get_logger(name: str = __name__) -> Any:
    """로거 인스턴스 반환"""
    return structlog.get_logger(name)

