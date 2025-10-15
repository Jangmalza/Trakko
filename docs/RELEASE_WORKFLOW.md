# Trakko Release Workflow

## 브랜치 정책
- `develop`: 모든 기능 작업과 통합 테스트가 이루어지는 기본 개발 브랜치입니다.
- `main`: 운영 배포만 담당하는 안정화 브랜치입니다. `develop`에서 충분히 검증된 커밋만 병합합니다.
- 필요에 따라 feature 브랜치를 만들어 `develop`에 병합한 뒤 운영 준비 시 `main`에 반영합니다.

## 개발 → 운영 병합 절차
```bash
# 개발 리포 (~/Trakko-dev)
git checkout develop
git pull origin develop         # 최신 개발 코드 반영

# 운영 배포 준비
git checkout main
git pull origin main            # 운영 브랜치 최신 상태 유지
git merge develop               # develop 변경 내용 병합

# 충돌이 나면 해결 후 커밋
git add <수정 파일>
git commit                      # 자동 커밋이 없으면 수동 커밋

git push origin main            # 원격 main 갱신

# 작업 계속을 위해 develop으로 복귀
git checkout develop
```

## 운영 디렉터리 배포 절차
```bash
cd ~/Trakko-prod
git checkout main
git pull origin main
npm install

# Prisma 마이그레이션 필요 시
npx prisma migrate deploy

# 프런트 자산은 정적 호스팅을 사용할 경우 별도로 업로드
# npm run build

# PM2 재기동
pm2 reload trakko-prod
pm2 restart trakko-frontend-prod
```

## 릴리스 태그 관리
- 운영 배포 완료 후 태그를 남기면 롤백이 쉬워집니다.
```bash
git tag v1.2.3
git push origin v1.2.3
```
- 문제 발생 시 해당 태그나 직전 커밋으로 롤백합니다.
```bash
git checkout v1.2.3
# 또는 git revert <커밋>
```

## 배포 체크리스트
1. `develop`에서 lint/build 및 주요 플로우 테스트 완료.
2. `main` 병합 후 필요 시 CI 확인.
3. 운영 DB 백업 스냅샷 생성.
4. `~/Trakko-prod`에서 `git pull origin main`, `npm install`, `prisma migrate deploy` 실행.
5. `pm2 reload trakko-prod`, `pm2 restart trakko-frontend-prod`로 서비스 재기동.
6. 주요 화면 수동 점검 및 `pm2 logs trakko-prod` 확인.
7. 이상 없으면 릴리스 태그 생성 및 공유.
