"""
과금 스키마 모듈
===============

구독, 사용량, 청구 관련 스키마
"""

from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Dict
from uuid import UUID

from pydantic import BaseModel, Field


class SubscriptionTier(str, Enum):
    """구독 등급"""
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class BillingStatus(str, Enum):
    """청구 상태"""
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class UsageType(str, Enum):
    """사용량 유형"""
    STT = "stt"
    TRANSLATION = "translation"
    SUMMARY = "summary"


# 요금제 정보
PRICING_INFO = {
    SubscriptionTier.FREE: {
        "name": "무료 체험",
        "monthly_price": 0,
        "yearly_price": 0,
        "included_minutes": 30,
        "overage_rate": 250,  # 원/분
        "max_languages": 3,
        "summary_enabled": False,
        "api_access": False,
        "storage_days": 7,
    },
    SubscriptionTier.BASIC: {
        "name": "베이직",
        "monthly_price": 9900,
        "yearly_price": 99000,
        "included_minutes": 300,  # 5시간
        "overage_rate": 200,
        "max_languages": 5,
        "summary_enabled": True,
        "api_access": False,
        "storage_days": 30,
    },
    SubscriptionTier.PRO: {
        "name": "프로",
        "monthly_price": 29900,
        "yearly_price": 299000,
        "included_minutes": 1200,  # 20시간
        "overage_rate": 150,
        "max_languages": 14,
        "summary_enabled": True,
        "api_access": True,
        "storage_days": 90,
    },
    SubscriptionTier.ENTERPRISE: {
        "name": "엔터프라이즈",
        "monthly_price": None,  # 문의
        "yearly_price": None,
        "included_minutes": 999999,  # 무제한
        "overage_rate": 100,
        "max_languages": 14,
        "summary_enabled": True,
        "api_access": True,
        "storage_days": 365,
    },
}

# API 원가 (USD)
API_COSTS = {
    "stt_per_minute": 0.036,  # Google STT Enhanced
    "translation_per_char": 0.00002,  # Google Translation Basic
    "summary_per_request": 0.003,  # Gemini Flash
}


class SubscriptionCreate(BaseModel):
    """구독 생성 요청"""
    tier: SubscriptionTier = SubscriptionTier.FREE


class SubscriptionResponse(BaseModel):
    """구독 정보 응답"""
    id: UUID
    user_id: UUID
    tier: SubscriptionTier
    tier_info: dict
    started_at: datetime
    expires_at: Optional[datetime]
    is_active: bool
    monthly_included_minutes: int
    current_month_usage_minutes: int
    remaining_minutes: int
    auto_renew: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UsageRecordCreate(BaseModel):
    """사용량 기록 생성"""
    session_id: Optional[UUID] = None
    usage_type: UsageType
    quantity: Decimal
    unit: str
    metadata: dict = Field(default_factory=dict)


class UsageRecordResponse(BaseModel):
    """사용량 기록 응답"""
    id: UUID
    user_id: UUID
    session_id: Optional[UUID]
    usage_type: UsageType
    quantity: Decimal
    unit: str
    unit_cost: Decimal
    total_cost: Decimal
    metadata: dict
    recorded_at: datetime
    
    class Config:
        from_attributes = True


class UsageSummary(BaseModel):
    """사용량 요약"""
    period_start: datetime
    period_end: datetime
    
    # 분 단위 사용량
    total_minutes: int
    included_minutes: int
    overage_minutes: int
    
    # 상세 사용량
    stt_minutes: float
    translation_characters: int
    summary_count: int
    
    # 비용 (원화)
    base_cost: Decimal
    overage_cost: Decimal
    total_cost: Decimal
    
    # 일별 사용량
    daily_usage: List[Dict]


class InvoiceLineItem(BaseModel):
    """청구서 항목"""
    description: str
    quantity: Decimal
    unit: str
    unit_price: Decimal
    amount: Decimal


class InvoiceResponse(BaseModel):
    """청구서 응답"""
    id: UUID
    user_id: UUID
    billing_period_start: date
    billing_period_end: date
    subtotal: Decimal
    usage_charges: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    currency: str
    status: BillingStatus
    paid_at: Optional[datetime]
    line_items: List[InvoiceLineItem]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CreditCreate(BaseModel):
    """크레딧 충전 요청"""
    amount: Decimal = Field(..., gt=0)


class CreditResponse(BaseModel):
    """크레딧 정보 응답"""
    id: UUID
    user_id: UUID
    amount: Decimal
    remaining: Decimal
    expires_at: Optional[datetime]
    purchase_price: Optional[Decimal]
    purchase_date: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


class CreditBalance(BaseModel):
    """크레딧 잔액"""
    total_remaining: Decimal
    credits: List[CreditResponse]


class PricingPlanResponse(BaseModel):
    """요금제 정보 응답"""
    tier: SubscriptionTier
    name: str
    monthly_price: Optional[int]
    yearly_price: Optional[int]
    included_minutes: int
    overage_rate: int
    max_languages: int
    summary_enabled: bool
    api_access: bool
    storage_days: int
    features: List[str]


class EstimatedCost(BaseModel):
    """예상 비용"""
    duration_minutes: int
    target_language_count: int
    
    # 원가 (USD)
    stt_cost_usd: Decimal
    translation_cost_usd: Decimal
    total_cost_usd: Decimal
    
    # 소비자가 (KRW)
    consumer_price_krw: int
    
    # 요금제별 비용
    by_tier: Dict[str, int]










