# Deployment Guide (Ubuntu)

## 1. 시스템 요구 사항
- Ubuntu 22.04 LTS 이상
- Node.js 18.x (LTS)
- npm 10.x (Node 18에 포함)
- git, unzip 등 기본 유틸리티

## 2. Node.js & npm 설치
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v
npm -v
```

## 3. 프로젝트 배포 준비
```bash
git clone https://github.com/Jangmalza/Trakko.git
cd Trakko
npm install
```

## 4. 환경 변수 설정
`server/.env`와 프로젝트 루트의 `.env`를 작성합니다. 예시는 아래와 같습니다.

**server/.env**
```
PORT=4000
CLIENT_BASE_URL=https://your-domain
SESSION_SECRET=YOUR_RANDOM_SECRET
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://api.your-domain/api/auth/google/callback
API_BASE_URL=https://api.your-domain
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/trakko
```

**.env**
```
VITE_API_BASE_URL=https://api.your-domain/api
VITE_APP_LOCALE=ko-KR
VITE_APP_CURRENCY=KRW
VITE_GOOGLE_CLIENT_ID=...
```

## 5. 프런트엔드 빌드
```bash
npm run build
```
`dist/` 폴더가 생성되며, 정적 웹 서버(Nginx, S3 등)로 배포합니다.

## 6. 백엔드 서버 실행
```bash
npm run server
```
운영 환경에서는 PM2 또는 systemd로 프로세스를 관리하는 것을 권장합니다.

**PM2 예시**
```bash
npm install -g pm2
pm2 start server/index.js --name trakko-api
pm2 save
pm2 startup
```

## 7. 리버스 프록시(Nginx 예시)
```
server {
    listen 80;
    server_name api.your-domain;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 8. HTTPS 적용 (Let’s Encrypt)
```bash
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d api.your-domain -d your-domain
```

## 9. 로그와 모니터링
- Express 서버 로그: PM2, systemd journal 등 활용
- 프런트 오류 모니터링: Sentry/LogRocket 등 연동 고려

## 10. 백업 및 유지 관리
- `prisma migrate diff`로 스키마 변경을 관리하고, 정기적으로 덤프 백업을 수행하세요.
- `npm audit`으로 의존성 보안 이슈를 주기적으로 확인하세요.
- Prisma 마이그레이션 절차는 `docs/PRISMA_MIGRATION_GUIDE.md`에서 상세 가이드를 참고하세요.

## 11. Pre-Launch Checklist
- 스테이징과 운영용 `.env`, `server/.env`를 별도로 관리해 OAuth, OpenAI, 세션, DB 자격 증명이 테스트 값과 섞이지 않도록 합니다.
- Google Cloud 콘솔에서 운영 도메인에 맞는 OAuth 클라이언트를 생성하고 승인된 리디렉션 URI에 `/api/auth/google/callback`을 등록합니다.
- `npm run build`와 `npm run server`를 로컬에서 기동해 Prisma 클라이언트가 최신 스키마로 생성됐는지 확인합니다.
- 온보딩, 거래, 목표, 커뮤니티, AI 챗 등 주요 사용자 흐름을 전부 수동 테스트해 API와 프런트 상태가 일치하는지 검증합니다.

## 12. 백엔드 및 데이터 준비
- 운영 MySQL 인스턴스를 구성하고 `DATABASE_URL`을 지정한 뒤 `npx prisma migrate deploy`로 스키마를 반영합니다.
- `server/index.js`를 PM2 또는 systemd로 실행해 세션, Google OAuth, OpenAI 호출이 운영 환경에서 정상 동작하는지 점검합니다.
- 커뮤니티 이미지 업로드 디렉터리를 서버에 생성하고 퍼미션을 확인해 5MB 제한과 MIME 필터가 작동하도록 합니다.
- FINNHUB, OpenAI 키가 없을 때의 폴백 메시지와 캐시 전략이 서비스 정책에 맞는지 확인합니다.

## 13. 프런트엔드 전달 및 인프라
- `dist/` 결과물을 S3+CloudFront 혹은 Nginx 정적 경로에 업로드하고 캐시 정책을 설정합니다.
- Nginx 리버스 프록시에서 `/api`는 Express로, 그 외 경로는 정적 자산으로 전달되도록 구성합니다.
- 환경별 `VITE_API_BASE_URL`, 통화, 로케일 설정을 재확인하고 배포 후 CORS 정책이 허용된 도메인에만 적용되는지 검증합니다.
- 프런트 라우팅, 다크 모드, Pro 제약(최근 3개월 제한) 등 상태 기반 UI가 운영 빌드에서 기대대로 동작하는지 테스트합니다.

## 14. 보안 및 준법
- certbot 등으로 HTTPS 인증서를 발급하고 HSTS, 보안 헤더를 프록시에서 설정합니다.
- 세션 쿠키의 `secure`, `sameSite` 옵션이 운영 모드에서 올바르게 적용되는지 확인합니다.
- `requireAdmin`을 사용하는 관리자 전용 라우트가 실제 운영 계정에만 열려 있는지 검증합니다.
- 사업자 등록, 통신판매업 신고, 개인정보 처리방침·약관 문구를 준비해 결제·회원 관리를 합법적으로 운영합니다.

## 15. 운영 체계
- PM2 로그, logrotate, CloudWatch 등으로 API 로그를 수집하고 알람 임계값을 정의합니다.
- DB 백업 주기, Prisma 마이그레이션 절차, 장애 대응 연락처를 문서화해 팀이 공유하도록 합니다.
- Sentry, LogRocket 등 모니터링 도구를 연동하고 핵심 지표를 설정합니다.
- 스테이징에서 운영으로 이어지는 배포 파이프라인과 롤백 절차를 정립해 일관된 릴리스를 보장합니다.
