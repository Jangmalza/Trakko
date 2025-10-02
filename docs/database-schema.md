# 데이터베이스 스키마 개요

현재 Prisma + MySQL 기반으로 운영되는 핵심 테이블과 컬럼을 정리했습니다. 모든 금액은 기본 통화(KRW)로 저장되며, 표시 통화는 `Preference` 테이블의 값을 바탕으로 변환됩니다.

## 테이블 상세

### `User`
| 컬럼 | 타입 | Nullable | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `String` | ❌ |  | Google OAuth 프로필 ID (PK) |
| `displayName` | `String` | ✅ |  | 사용자 표시 이름 |
| `email` | `String` | ✅ |  | 사용자 이메일 |
| `initialSeed` | `Decimal(18,2)` | ✅ |  | 기본 통화(KRW) 기준 초기 시드 금액 |
| `baseCurrency` | `String` | ❌ | `"KRW"` | 저장용 기준 통화 코드 |
| `createdAt` | `DateTime` | ❌ | `now()` | 사용자 최초 생성 시각 |
| `updatedAt` | `DateTime` | ❌ | 자동 | 사용자 레코드 갱신 시각 |

관계:
- `User` 1 ── 1 `Preference`
- `User` 1 ── n `Trade`

### `Preference`
| 컬럼 | 타입 | Nullable | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `userId` | `String` | ❌ |  | `User.id`를 참조하는 PK |
| `currency` | `String` | ❌ |  | 사용자 표시 통화 (예: KRW, USD) |
| `locale` | `String` | ❌ |  | 금액 표시에 사용할 로케일 |

관계:
- `Preference.userId` → `User.id` (onDelete: Cascade)

### `Trade`
| 컬럼 | 타입 | Nullable | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `String` | ❌ | `cuid()` | 거래 식별자 (PK) |
| `userId` | `String` | ❌ |  | 거래를 소유한 사용자 ID |
| `ticker` | `String` | ❌ |  | 종목 티커 (대문자) |
| `profitLoss` | `Decimal(18,2)` | ❌ |  | 기준 통화(KRW)로 저장된 손익 |
| `rationale` | `String` | ❌ |  | 매매 근거 메모 |
| `tradeDate` | `DateTime` | ❌ |  | 거래 날짜 (UTC 기준) |
| `createdAt` | `DateTime` | ❌ | `now()` | 거래 기록 생성 시각 |

관계:
- `Trade.userId` → `User.id` (onDelete: Cascade)

## 주요 동작 흐름
- **시드/거래 입력**: 요청에 포함된 통화 정보를 기준으로 환율을 적용해 `User.initialSeed`, `Trade.profitLoss`를 항상 기준 통화(KRW)로 저장합니다.
- **표시 통화 변경**: `Preference.currency`를 업데이트하면 이후 API 응답 시 자동으로 환산된 금액이 내려갑니다.
- **데이터 삭제/초기화**: 사용자 삭제 또는 초기화 시 관련 `Preference`, `Trade` 레코드가 순차적으로 제거됩니다.

## 마이그레이션
- 초기 스키마는 `prisma/migrations/20251002063254_init` 폴더에서 확인할 수 있습니다. 새 필드나 테이블을 추가할 때는 Prisma 스키마 수정 후 `npx prisma migrate dev --name <migration-name>`을 실행하세요.
