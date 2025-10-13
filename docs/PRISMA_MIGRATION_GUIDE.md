# Prisma Migration Guide

Prisma Migrate는 스키마 변경 사항을 안전하게 적용하기 위한 도구입니다. 이 문서는 Trakko 프로젝트에서 마이그레이션을 생성·검증·배포하는 표준 절차를 정리합니다.

## 1. 준비 사항
- Node.js 18.x, npm 10.x 이상
- Prisma CLI (devDependency에 포함되어 있으므로 `npm install` 후 사용 가능)
- `.env` 또는 `server/.env`에 `DATABASE_URL`이 올바르게 설정되어 있을 것
- 로컬 DB와 스테이징/프로덕션 DB 백업 정책을 사전에 마련

> ⚠️ **주의**: 마이그레이션은 되돌리기 어렵습니다. 새로운 마이그레이션을 배포하기 전에는 반드시 DB 스냅샷을 확보하고, 변경 사항을 코드 리뷰로 검증하세요.

## 2. 로컬 개발 절차
1. `prisma/schema.prisma`에 모델/필드/인덱스 변경을 적용합니다.
2. 마이그레이션 생성:
   ```bash
   npx prisma migrate dev --name <변경요약>
   ```
   - `dev` 서브커맨드는 로컬 DB에 변경을 적용하면서 `prisma/migrations/<timestamp>_<name>` 폴더를 생성합니다.
   - `<변경요약>`은 `add-trade-fee-column`처럼 짧은 영어 슬러그를 권장합니다.
3. 생성된 SQL 확인:
   - `prisma/migrations/*/migration.sql` 내용을 검토해 의도한 DDL이 맞는지 확인합니다.
4. Prisma Client 재생성:
   ```bash
   npx prisma generate
   ```
5. 로컬 앱을 실행해 변경 사항이 정상 동작하는지 테스트합니다.

## 3. 버전 관리
- `schema.prisma`, `prisma/migrations/**`, 관련 애플리케이션 코드 변경을 함께 커밋합니다.
- 마이그레이션 파일을 수정해야 할 경우 **커밋 이전**이라면 `prisma/migrations/<id>` 폴더를 삭제 후 다시 `migrate dev`를 실행하세요.
- 이미 공유된 마이그레이션을 수정하면 다른 환경과 드리프트가 발생하므로 금지됩니다. 새 마이그레이션을 추가하거나 수동 SQL로 보정하세요.

## 4. 다른 환경에 적용하기
1. 대상 서버의 `DATABASE_URL`이 올바르게 설정되어 있는지 확인합니다.
2. 의존성 설치 및 Prisma CLI 준비:
   ```bash
   npm ci
   ```
3. 마이그레이션 적용:
   ```bash
   npx prisma migrate deploy
   ```
   - `deploy`는 마이그레이션 폴더에 기록된 순서대로 아직 실행되지 않은 SQL만 적용합니다.
   - 스테이징/프로덕션 배포 파이프라인에서는 항상 `npm run build` 전에 `migrate deploy`를 실행하도록 구성하세요.
4. 적용 상태 확인:
   ```bash
   npx prisma migrate status
   ```
   - `Database schema is up to date` 메시지를 확인합니다.

## 5. 스키마 드리프트 대응
- 누군가 DB를 수동으로 변경했다면 `npx prisma migrate diff`로 현재 DB와 스키마를 비교하여 변경 내용을 파악합니다.
- 드리프트를 해결하려면
  - 새로운 마이그레이션으로 수동 변경을 코드화하거나,
  - `npx prisma migrate resolve --applied <migration_id>`를 사용해 상태를 맞춰야 합니다.
- 급한 경우 `npx prisma db execute --file fix.sql`로 임시 SQL을 실행할 수 있지만, 이후 반드시 마이그레이션으로 반영해야 합니다.

## 6. Seed 데이터 실행 (선택)
프로젝트에 `prisma/seed.ts`가 구성되어 있다면 다음 명령으로 초기 데이터를 주입할 수 있습니다.
```bash
npx prisma db seed
```
Seed는 마이그레이션과 별도로 관리되므로, 환경에 맞춰 안전성을 평가한 뒤 사용하세요.

## 7. 문제 해결 체크리스트
- **DATABASE_URL 오류**: 올바른 드라이버(`mysql://` 등)와 권한을 확인합니다.
- **고아 마이그레이션**: `prisma/migrations`에는 있는데 DB에는 반영되지 않은 경우 `migrate deploy`를 재실행하거나 `migrate resolve`로 상태를 수정합니다.
- **대규모 DDL**: 장시간 잠금이 예상되는 경우 오프라인 유지보수 창을 확보하고, SQL을 수동 검토한 뒤 실행하세요.
- **롤백이 필요한 경우**: Prisma는 자동 롤백을 제공하지 않습니다. 마이그레이션 이전의 DB 스냅샷을 복원하거나 새로운 마이그레이션으로 반대 작업을 수행해야 합니다.

---
추가적인 Prisma 활용법은 [Prisma 공식 문서](https://www.prisma.io/docs/concepts/components/prisma-migrate)에서 확인할 수 있습니다. 프로젝트 특성상 금액·거래 데이터가 중요한 만큼, 모든 마이그레이션은 리뷰와 백업 절차를 거친 뒤 배포하세요.
