"""
과금 API 엔드포인트
==================

구독, 사용량, 청구 관리 API
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.logging import get_logger
from app.schemas.billing import (
    SubscriptionTier,
    SubscriptionCreate,
    SubscriptionResponse,
    UsageSummary,
    InvoiceResponse,
    CreditCreate,
    CreditBalance,
    PricingPlanResponse,
    EstimatedCost,
    PRICING_INFO,
)
from app.schemas.common import APIResponse
from app.services.billing_service import BillingService, get_billing_service

logger = get_logger(__name__)
router = APIRouter()


# ==================== 요금제 정보 ====================

@router.get(
    "/pricing",
    response_model=APIResponse[List[PricingPlanResponse]],
    summary="요금제 목록",
    description="사용 가능한 요금제 목록을 반환합니다."
)
async def get_pricing_plans():
    """요금제 목록"""
    plans = []
    
    for tier, info in PRICING_INFO.items():
        features = []
        
        features.append(f"월 {info['included_minutes']}분 포함")
        features.append(f"초과 시 분당 {info['overage_rate']}원")
        features.append(f"최대 {info['max_languages']}개 언어")
        
        if info["summary_enabled"]:
            features.append("AI 요약 기능")
        if info["api_access"]:
            features.append("API 접근")
        
        features.append(f"기록 {info['storage_days']}일 보관")
        
        plans.append(PricingPlanResponse(
            tier=tier,
            name=info["name"],
            monthly_price=info["monthly_price"],
            yearly_price=info["yearly_price"],
            included_minutes=info["included_minutes"],
            overage_rate=info["overage_rate"],
            max_languages=info["max_languages"],
            summary_enabled=info["summary_enabled"],
            api_access=info["api_access"],
            storage_days=info["storage_days"],
            features=features,
        ))
    
    return APIResponse(
        success=True,
        data=plans
    )


@router.get(
    "/estimate",
    response_model=APIResponse[EstimatedCost],
    summary="비용 예측",
    description="예상 사용량에 따른 비용을 예측합니다."
)
async def estimate_cost(
    duration_minutes: int = Query(..., ge=1, description="예상 사용 시간 (분)"),
    target_language_count: int = Query(default=1, ge=1, le=14, description="번역 대상 언어 수"),
    billing_service: BillingService = Depends(get_billing_service),
):
    """비용 예측"""
    estimate = billing_service.estimate_consumer_price(
        duration_minutes=duration_minutes,
        target_language_count=target_language_count,
    )
    
    return APIResponse(
        success=True,
        data=estimate
    )


# ==================== 구독 관리 ====================

@router.get(
    "/subscription",
    response_model=APIResponse[SubscriptionResponse],
    summary="구독 정보 조회",
    description="현재 구독 정보를 조회합니다."
)
async def get_subscription(
    user_id: UUID = Query(..., description="사용자 ID"),
    billing_service: BillingService = Depends(get_billing_service),
):
    """구독 정보 조회"""
    subscription = await billing_service.get_subscription(str(user_id))
    
    if not subscription:
        # 무료 구독 자동 생성
        subscription = await billing_service.create_subscription(str(user_id))
    
    return APIResponse(
        success=True,
        data=subscription
    )


@router.post(
    "/subscription",
    response_model=APIResponse[SubscriptionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="구독 생성/변경",
    description="구독을 생성하거나 요금제를 변경합니다."
)
async def create_or_update_subscription(
    subscription_data: SubscriptionCreate,
    user_id: UUID = Query(..., description="사용자 ID"),
    billing_service: BillingService = Depends(get_billing_service),
):
    """구독 생성/변경"""
    try:
        existing = await billing_service.get_subscription(str(user_id))
        
        if existing:
            subscription = await billing_service.upgrade_subscription(
                user_id=str(user_id),
                new_tier=subscription_data.tier,
            )
        else:
            subscription = await billing_service.create_subscription(
                user_id=str(user_id),
                tier=subscription_data.tier,
            )
        
        return APIResponse(
            success=True,
            message="구독이 업데이트되었습니다.",
            data=subscription
        )
    except Exception as e:
        logger.error("Subscription update failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"구독 업데이트 실패: {str(e)}"
        )


# ==================== 사용량 ====================

@router.get(
    "/usage",
    response_model=APIResponse[UsageSummary],
    summary="사용량 조회",
    description="기간별 사용량을 조회합니다."
)
async def get_usage(
    user_id: UUID = Query(..., description="사용자 ID"),
    start_date: date = Query(None, description="시작일 (기본: 이번 달 1일)"),
    end_date: date = Query(None, description="종료일 (기본: 오늘)"),
    billing_service: BillingService = Depends(get_billing_service),
):
    """사용량 조회"""
    if start_date is None:
        today = date.today()
        start_date = today.replace(day=1)
    
    if end_date is None:
        end_date = date.today()
    
    summary = await billing_service.get_usage_summary(
        user_id=str(user_id),
        period_start=datetime.combine(start_date, datetime.min.time()),
        period_end=datetime.combine(end_date, datetime.max.time()),
    )
    
    return APIResponse(
        success=True,
        data=summary
    )


# ==================== 청구서 ====================

@router.get(
    "/invoices",
    response_model=APIResponse[List[InvoiceResponse]],
    summary="청구서 목록",
    description="청구서 목록을 조회합니다."
)
async def list_invoices(
    user_id: UUID = Query(..., description="사용자 ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    billing_service: BillingService = Depends(get_billing_service),
):
    """청구서 목록"""
    offset = (page - 1) * page_size
    
    response = (
        billing_service.db.client.table("invoices")
        .select("*")
        .eq("user_id", str(user_id))
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    
    return APIResponse(
        success=True,
        data=response.data or []
    )


@router.get(
    "/invoices/{invoice_id}",
    response_model=APIResponse[InvoiceResponse],
    summary="청구서 상세",
    description="특정 청구서의 상세 정보를 조회합니다."
)
async def get_invoice(
    invoice_id: UUID,
    billing_service: BillingService = Depends(get_billing_service),
):
    """청구서 상세"""
    response = (
        billing_service.db.client.table("invoices")
        .select("*")
        .eq("id", str(invoice_id))
        .single()
        .execute()
    )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="청구서를 찾을 수 없습니다."
        )
    
    return APIResponse(
        success=True,
        data=response.data
    )


@router.post(
    "/invoices/generate",
    response_model=APIResponse[InvoiceResponse],
    summary="청구서 생성",
    description="지정된 기간의 청구서를 생성합니다."
)
async def generate_invoice(
    user_id: UUID = Query(..., description="사용자 ID"),
    start_date: date = Query(..., description="청구 시작일"),
    end_date: date = Query(..., description="청구 종료일"),
    billing_service: BillingService = Depends(get_billing_service),
):
    """청구서 생성"""
    invoice = await billing_service.generate_invoice(
        user_id=str(user_id),
        billing_period_start=start_date,
        billing_period_end=end_date,
    )
    
    return APIResponse(
        success=True,
        message="청구서가 생성되었습니다.",
        data=invoice
    )


# ==================== 크레딧 ====================

@router.get(
    "/credits",
    response_model=APIResponse[CreditBalance],
    summary="크레딧 잔액",
    description="크레딧 잔액을 조회합니다."
)
async def get_credits(
    user_id: UUID = Query(..., description="사용자 ID"),
    billing_service: BillingService = Depends(get_billing_service),
):
    """크레딧 잔액 조회"""
    balance = await billing_service.get_credit_balance(str(user_id))
    
    return APIResponse(
        success=True,
        data=balance
    )


@router.post(
    "/credits",
    response_model=APIResponse[dict],
    status_code=status.HTTP_201_CREATED,
    summary="크레딧 충전",
    description="크레딧을 충전합니다."
)
async def add_credits(
    credit_data: CreditCreate,
    user_id: UUID = Query(..., description="사용자 ID"),
    billing_service: BillingService = Depends(get_billing_service),
):
    """크레딧 충전"""
    # 충전 금액 = 크레딧 (1:1)
    credit = await billing_service.add_credit(
        user_id=str(user_id),
        amount=credit_data.amount,
        purchase_price=credit_data.amount,
    )
    
    return APIResponse(
        success=True,
        message=f"{credit_data.amount}원 크레딧이 충전되었습니다.",
        data=credit
    )







