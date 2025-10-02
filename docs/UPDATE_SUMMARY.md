# 업데이트 개요

마지막 커밋 이후 적용된 주요 변경 사항을 정리했습니다.

## 백엔드
- 파일 기반 저장 방식을 **Prisma + MySQL** 구조로 전환했습니다.
  - `/api/portfolio` 전반과 `/api/preferences`가 모두 MySQL CRUD를 사용합니다.
  - Prisma 스키마(`User`, `Preference`, `Trade`)와 초기 마이그레이션을 추가했습니다.
  - 환율 변환·통화 설정 로직은 DB 데이터를 활용해 그대로 동작합니다.
- AI 어시스턴트는 DB에서 가져온 포트폴리오 요약과 최근 거래 정보를 바탕으로 답변합니다.

## 프런트엔드
- `usePortfolioStore` 등 상태 스토어를 DB 응답 구조에 맞게 수정했고, 거래 수정/삭제 모달을 복원했습니다.
- 통화 변경 시 환율이 즉시 반영되어 리스트·차트·폼에 표시되도록 조정했습니다.

## 문서화
- `docs/database-schema.md`에 Prisma 스키마 구조(테이블·컬럼·관계·환율 흐름)를 정리했습니다.
- `docs/DEPLOYMENT_GUIDE.md`를 UTF-8 한글로 다시 작성했습니다.

## 인프라/설정
- Docker Desktop 기반 MySQL 컨테이너로 로컬 개발 환경을 구성했습니다.
- `.env`에 `DATABASE_URL`을 추가해 서버가 MySQL에 연결되도록 설정했습니다.

필요한 추가 변경이나 개선 사항이 있다면 알려주세요.