# 구독 및 광고 노출 가이드

## 1. 구독 등급과 광고 정책
- `SubscriptionTier`는 `FREE`(기본), `PRO` 두 단계로 구성됩니다.
- `PRO` 사용자는 스폰서 배너와 추천 리소스 광고가 모두 비활성화됩니다.
- ADMIN 계정(`ADMIN_EMAILS`에 등록)은 로그인 시 자동으로 `PRO`로 승급됩니다.

### 광고 노출 위치 (FREE 사용자만)
1. 거래 기록 저장 직후 노출되는 스폰서 배너  
2. 대시보드의 자본 추이 카드 아래 “Trakko recommended resources” 섹션

## 2. 수동 등급 변경 방법
결제 플로우가 구축되기 전까지는 DB에서 직접 PRO로 변경해야 합니다.

```sql
UPDATE User
SET subscriptionTier = 'PRO'
WHERE email = 'user@example.com';
```

- 값은 `'FREE'` 또는 `'PRO'`만 허용됩니다.
- 변경 후 사용자가 다시 로그인하면 즉시 광고가 사라집니다.

## 3. 관련 코드 위치
- **Prisma 스키마**: `prisma/schema.prisma` (`SubscriptionTier` enum과 `User.subscriptionTier` 필드)  
- **마이그레이션**: `prisma/migrations/20251008084304_add_subscription_tier/`  
- **서버**: `server/index.js`  
  - `ensureUserRecord`에서 관리자 이메일을 PRO로 설정  
  - `/api/auth/me` 응답에 `subscriptionTier` 포함  
- **프런트엔드**:  
  - 타입 정의 `src/api/authApi.ts`  
  - 광고 노출 분기 `src/pages/PortfolioDashboard.tsx` (`isAdFreeUser` 계산)

## 4. 향후 확장 아이디어
- 구독 결제/취소 로직에서 `subscriptionTier`를 업데이트하면 광고 제어가 자동으로 연동됩니다.
- 추가 요금제가 필요하면 `SubscriptionTier` enum을 확장하고 조건만 조정하면 됩니다.

## 5. 현재 구현 상태 메모
- 2025년 1월 기준으로는 결제 연동 및 자동 갱신/해지 플로우가 구현되어 있지 않습니다.
- `User.subscriptionTier` 값은 관리자 수동 변경 또는 직접 DB 업데이트로만 바뀌며, 결제 미납 여부를 판별하거나 만료 시 자동으로 FREE로 되돌리는 로직이 없습니다.
- 향후 월 구독제를 도입하려면 결제 서비스 웹훅과 만료 시점(`currentPeriodEnd` 등)을 저장할 필드를 추가하고, 만료/미결제 상태에서 Pro 기능을 제한하는 서버·프런트 분기 처리가 필요합니다.
