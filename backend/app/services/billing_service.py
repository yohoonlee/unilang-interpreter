"""
과금 서비스
==========

사용량 추적, 과금 계산, 구독 관리
"""

from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.schemas.billing import (
    SubscriptionTier,
    UsageType,
    BillingStatus,
    PRICING_INFO,
    API_COSTS,
    UsageSummary,
    EstimatedCost,
)

logger = get_logger(__name__)

# 환율 (1 USD = KRW)
USD_TO_KRW = 1350


class BillingService:
    """과금 및 사용량 관리 서비스"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        self.db = get_db()
    
    # ==================== 구독 관리 ====================
    
    async def get_subscription(self, user_id: str) -> Optional[dict]:
        """사용자 구독 정보 조회"""
        response = (
            self.db.client.table("subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        
        if response.data:
            sub = response.data
            tier = SubscriptionTier(sub.get("tier", "free"))
            tier_info = PRICING_INFO[tier]
            
            sub["tier_info"] = tier_info
            sub["remaining_minutes"] = max(
                0,
                sub.get("monthly_included_minutes", 0) - sub.get("current_month_usage_minutes", 0)
            )
        
        return response.data
    
    async def create_subscription(
        self,
        user_id: str,
        tier: SubscriptionTier = SubscriptionTier.FREE,
    ) -> dict:
        """구독 생성"""
        tier_info = PRICING_INFO[tier]
        
        subscription_data = {
            "user_id": user_id,
            "tier": tier.value,
            "monthly_included_minutes": tier_info["included_minutes"],
            "current_month_usage_minutes": 0,
            "is_active": True,
            "auto_renew": True,
        }
        
        # 유료 요금제인 경우 만료일 설정
        if tier != SubscriptionTier.FREE:
            subscription_data["expires_at"] = (
                datetime.utcnow() + timedelta(days=30)
            ).isoformat()
        
        response = (
            self.db.client.table("subscriptions")
            .upsert(subscription_data, on_conflict="user_id")
            .execute()
        )
        
        return response.data[0] if response.data else {}
    
    async def upgrade_subscription(
        self,
        user_id: str,
        new_tier: SubscriptionTier,
    ) -> dict:
        """구독 업그레이드"""
        tier_info = PRICING_INFO[new_tier]
        
        update_data = {
            "tier": new_tier.value,
            "monthly_included_minutes": tier_info["included_minutes"],
            "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        }
        
        response = (
            self.db.client.table("subscriptions")
            .update(update_data)
            .eq("user_id", user_id)
            .execute()
        )
        
        self.logger.info(
            "Subscription upgraded",
            user_id=user_id,
            new_tier=new_tier.value
        )
        
        return response.data[0] if response.data else {}
    
    # ==================== 사용량 추적 ====================
    
    async def record_usage(
        self,
        user_id: str,
        session_id: Optional[str],
        usage_type: UsageType,
        quantity: Decimal,
        unit: str,
        metadata: dict = None,
    ) -> dict:
        """사용량 기록"""
        # 단위 원가 계산
        if usage_type == UsageType.STT:
            unit_cost = Decimal(str(API_COSTS["stt_per_minute"]))
        elif usage_type == UsageType.TRANSLATION:
            unit_cost = Decimal(str(API_COSTS["translation_per_char"]))
        else:
            unit_cost = Decimal(str(API_COSTS["summary_per_request"]))
        
        total_cost = quantity * unit_cost
        
        record_data = {
            "user_id": user_id,
            "session_id": session_id,
            "usage_type": usage_type.value,
            "quantity": float(quantity),
            "unit": unit,
            "unit_cost": float(unit_cost),
            "total_cost": float(total_cost),
            "metadata": metadata or {},
        }
        
        response = (
            self.db.client.table("usage_records")
            .insert(record_data)
            .execute()
        )
        
        # 구독 사용량 업데이트 (STT 사용량만 분으로 계산)
        if usage_type == UsageType.STT:
            await self._update_subscription_usage(user_id, float(quantity))
        
        return response.data[0] if response.data else {}
    
    async def _update_subscription_usage(
        self,
        user_id: str,
        minutes: float,
    ) -> None:
        """구독 사용량 업데이트"""
        # 현재 사용량 조회 후 증가
        sub = await self.get_subscription(user_id)
        if sub:
            new_usage = sub.get("current_month_usage_minutes", 0) + int(minutes)
            
            self.db.client.table("subscriptions").update({
                "current_month_usage_minutes": new_usage
            }).eq("user_id", user_id).execute()
    
    async def get_usage_summary(
        self,
        user_id: str,
        period_start: datetime,
        period_end: datetime,
    ) -> UsageSummary:
        """기간별 사용량 요약"""
        # 사용량 기록 조회
        response = (
            self.db.client.table("usage_records")
            .select("*")
            .eq("user_id", user_id)
            .gte("recorded_at", period_start.isoformat())
            .lte("recorded_at", period_end.isoformat())
            .execute()
        )
        
        records = response.data or []
        
        # 집계
        stt_minutes = 0.0
        translation_chars = 0
        summary_count = 0
        total_cost_usd = Decimal("0")
        daily_usage = {}
        
        for record in records:
            usage_type = record.get("usage_type")
            quantity = Decimal(str(record.get("quantity", 0)))
            recorded_date = record.get("recorded_at", "")[:10]
            
            if usage_type == "stt":
                stt_minutes += float(quantity)
            elif usage_type == "translation":
                translation_chars += int(quantity)
            elif usage_type == "summary":
                summary_count += 1
            
            total_cost_usd += Decimal(str(record.get("total_cost", 0)))
            
            # 일별 집계
            if recorded_date not in daily_usage:
                daily_usage[recorded_date] = {"minutes": 0, "cost": 0}
            daily_usage[recorded_date]["minutes"] += float(quantity) if usage_type == "stt" else 0
            daily_usage[recorded_date]["cost"] += float(record.get("total_cost", 0))
        
        # 구독 정보 조회
        sub = await self.get_subscription(user_id)
        included_minutes = sub.get("monthly_included_minutes", 30) if sub else 30
        tier = SubscriptionTier(sub.get("tier", "free")) if sub else SubscriptionTier.FREE
        
        total_minutes = int(stt_minutes)
        overage_minutes = max(0, total_minutes - included_minutes)
        
        # 비용 계산 (원화)
        tier_info = PRICING_INFO[tier]
        base_cost = Decimal(str(tier_info["monthly_price"]))
        overage_cost = Decimal(str(overage_minutes * tier_info["overage_rate"]))
        
        return UsageSummary(
            period_start=period_start,
            period_end=period_end,
            total_minutes=total_minutes,
            included_minutes=included_minutes,
            overage_minutes=overage_minutes,
            stt_minutes=stt_minutes,
            translation_characters=translation_chars,
            summary_count=summary_count,
            base_cost=base_cost,
            overage_cost=overage_cost,
            total_cost=base_cost + overage_cost,
            daily_usage=[
                {"date": k, **v} for k, v in sorted(daily_usage.items())
            ],
        )
    
    # ==================== 비용 계산 ====================
    
    def calculate_api_cost(
        self,
        duration_minutes: int,
        translation_chars: int = 0,
        target_language_count: int = 1,
        include_summary: bool = False,
    ) -> Dict[str, Decimal]:
        """API 원가 계산"""
        # STT 비용
        stt_cost = Decimal(str(duration_minutes)) * Decimal(str(API_COSTS["stt_per_minute"]))
        
        # 번역 비용 (기본 추정: 분당 500자)
        if translation_chars == 0:
            translation_chars = duration_minutes * 500
        
        translation_cost = (
            Decimal(str(translation_chars)) *
            Decimal(str(API_COSTS["translation_per_char"])) *
            Decimal(str(target_language_count))
        )
        
        # 요약 비용
        summary_cost = Decimal(str(API_COSTS["summary_per_request"])) if include_summary else Decimal("0")
        
        total_usd = stt_cost + translation_cost + summary_cost
        total_krw = total_usd * Decimal(str(USD_TO_KRW))
        
        return {
            "stt_cost_usd": stt_cost,
            "translation_cost_usd": translation_cost,
            "summary_cost_usd": summary_cost,
            "total_cost_usd": total_usd,
            "total_cost_krw": total_krw,
        }
    
    def estimate_consumer_price(
        self,
        duration_minutes: int,
        target_language_count: int = 1,
    ) -> EstimatedCost:
        """소비자 가격 예측"""
        # 원가 계산
        api_costs = self.calculate_api_cost(
            duration_minutes=duration_minutes,
            target_language_count=target_language_count,
            include_summary=True,
        )
        
        # 요금제별 비용 계산
        by_tier = {}
        for tier, info in PRICING_INFO.items():
            if tier == SubscriptionTier.ENTERPRISE:
                by_tier[tier.value] = None  # 문의
                continue
            
            included = info["included_minutes"]
            overage = max(0, duration_minutes - included)
            
            # 월정액 + 초과 요금 (분당)
            cost = info["monthly_price"] + (overage * info["overage_rate"])
            by_tier[tier.value] = cost
        
        # 종량제 비용
        payg_price = duration_minutes * 250  # 분당 250원
        by_tier["pay_as_you_go"] = payg_price
        
        return EstimatedCost(
            duration_minutes=duration_minutes,
            target_language_count=target_language_count,
            stt_cost_usd=api_costs["stt_cost_usd"],
            translation_cost_usd=api_costs["translation_cost_usd"],
            total_cost_usd=api_costs["total_cost_usd"],
            consumer_price_krw=payg_price,
            by_tier=by_tier,
        )
    
    # ==================== 청구서 ====================
    
    async def generate_invoice(
        self,
        user_id: str,
        billing_period_start: date,
        billing_period_end: date,
    ) -> dict:
        """청구서 생성"""
        # 사용량 요약 조회
        summary = await self.get_usage_summary(
            user_id=user_id,
            period_start=datetime.combine(billing_period_start, datetime.min.time()),
            period_end=datetime.combine(billing_period_end, datetime.max.time()),
        )
        
        # 구독 정보
        sub = await self.get_subscription(user_id)
        tier = SubscriptionTier(sub.get("tier", "free")) if sub else SubscriptionTier.FREE
        tier_info = PRICING_INFO[tier]
        
        # 청구 항목 구성
        line_items = []
        
        # 기본 요금
        if tier_info["monthly_price"] > 0:
            line_items.append({
                "description": f"{tier_info['name']} 월정액",
                "quantity": 1,
                "unit": "월",
                "unit_price": tier_info["monthly_price"],
                "amount": tier_info["monthly_price"],
            })
        
        # 초과 사용 요금
        if summary.overage_minutes > 0:
            overage_amount = summary.overage_minutes * tier_info["overage_rate"]
            line_items.append({
                "description": f"초과 사용 ({summary.overage_minutes}분)",
                "quantity": summary.overage_minutes,
                "unit": "분",
                "unit_price": tier_info["overage_rate"],
                "amount": overage_amount,
            })
        
        subtotal = float(summary.base_cost)
        usage_charges = float(summary.overage_cost)
        tax = int((subtotal + usage_charges) * 0.1)  # 10% VAT
        total = subtotal + usage_charges + tax
        
        invoice_data = {
            "user_id": user_id,
            "billing_period_start": billing_period_start.isoformat(),
            "billing_period_end": billing_period_end.isoformat(),
            "subtotal": subtotal,
            "usage_charges": usage_charges,
            "discount": 0,
            "tax": tax,
            "total": total,
            "currency": "KRW",
            "status": BillingStatus.PENDING.value,
            "line_items": line_items,
        }
        
        response = (
            self.db.client.table("invoices")
            .insert(invoice_data)
            .execute()
        )
        
        self.logger.info(
            "Invoice generated",
            user_id=user_id,
            total=total
        )
        
        return response.data[0] if response.data else {}
    
    # ==================== 크레딧 ====================
    
    async def add_credit(
        self,
        user_id: str,
        amount: Decimal,
        purchase_price: Decimal,
        expires_days: int = 365,
    ) -> dict:
        """크레딧 추가"""
        credit_data = {
            "user_id": user_id,
            "amount": float(amount),
            "remaining": float(amount),
            "purchase_price": float(purchase_price),
            "expires_at": (datetime.utcnow() + timedelta(days=expires_days)).isoformat(),
            "is_active": True,
        }
        
        response = (
            self.db.client.table("credits")
            .insert(credit_data)
            .execute()
        )
        
        return response.data[0] if response.data else {}
    
    async def get_credit_balance(self, user_id: str) -> Dict:
        """크레딧 잔액 조회"""
        response = (
            self.db.client.table("credits")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .gt("remaining", 0)
            .gt("expires_at", datetime.utcnow().isoformat())
            .order("expires_at")
            .execute()
        )
        
        credits = response.data or []
        total_remaining = sum(c.get("remaining", 0) for c in credits)
        
        return {
            "total_remaining": total_remaining,
            "credits": credits,
        }
    
    async def use_credit(
        self,
        user_id: str,
        amount: Decimal,
    ) -> bool:
        """크레딧 사용"""
        balance = await self.get_credit_balance(user_id)
        
        if Decimal(str(balance["total_remaining"])) < amount:
            return False
        
        remaining_to_use = amount
        
        for credit in balance["credits"]:
            if remaining_to_use <= 0:
                break
            
            credit_remaining = Decimal(str(credit.get("remaining", 0)))
            use_amount = min(credit_remaining, remaining_to_use)
            
            new_remaining = float(credit_remaining - use_amount)
            
            self.db.client.table("credits").update({
                "remaining": new_remaining,
                "is_active": new_remaining > 0,
            }).eq("id", credit["id"]).execute()
            
            remaining_to_use -= use_amount
        
        return True


# 싱글톤 인스턴스
_billing_service: Optional[BillingService] = None


def get_billing_service() -> BillingService:
    """과금 서비스 인스턴스 반환"""
    global _billing_service
    if _billing_service is None:
        _billing_service = BillingService()
    return _billing_service







