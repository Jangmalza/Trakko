# Deployment Guide (Ubuntu)

## 1. 시스템 요구 사항
- Ubuntu 22.04 LTS 이상
- Node.js 22.x (LTS) 또는 호환 가능한 최신 LTS 버전
- npm 10.x 이상
- git, unzip, Docker Engine

## 2. Node.js 및 필수 패키지 설치
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git unzip
node -v
npm -v
```

## 3. 소스 코드 다운로드
```bash
git clone https://github.com/Jangmalza/Trakko.git
cd Trakko
npm install
```

## 4. 데이터베이스(MySQL) 준비
Docker로 MySQL 8.4 컨테이너를 실행하는 예시입니다. 비밀번호, 포트, DB 이름은 환경에 맞게 수정하세요.
```bash
docker run --name trakko-mysql \
  -e MYSQL_ROOT_PASSWORD=strong-password \
  -e MYSQL_DATABASE=trakko \
  -p 3306:3306 \
  -d mysql:8.4

docker logs -f trakko-mysql   # 초기화 완료까지 모니터링
```
이미 별도의 MySQL 인스턴스를 사용한다면 접속 정보만 확보하면 됩니다.

## 5. 환경 변수 설정
애플리케이션은 두 개의 `.env` 파일을 사용합니다. 두 파일 모두 동일한 `DATABASE_URL`을 유지하세요.

### 5-1. `server/.env`
백엔드 서버 실행에 필요한 값입니다.
```
DATABASE_URL="mysql://root:strong-password@localhost:3306/trakko"
PORT=4000
CLIENT_BASE_URL="https://your-frontend-domain"
API_BASE_URL="https://api.your-domain"
SESSION_SECRET="랜덤으로_충분히_긴_문자열"
GOOGLE_CLIENT_ID="발급받은 Google OAuth Client ID"
GOOGLE_CLIENT_SECRET="발급받은 Client Secret"
GOOGLE_CALLBACK_URL="https://api.your-domain/api/auth/google/callback"
OPENAI_API_KEY="필요 시 OpenAI API Key"
OPENAI_MODEL="gpt-4o-mini"
```

### 5-2. 프로젝트 루트 `.env`
Prisma CLI와 프론트엔드(Vite) 빌드에서 참조합니다.
```
DATABASE_URL="mysql://root:strong-password@localhost:3306/trakko"
VITE_API_BASE_URL="https://api.your-domain/api"
VITE_APP_LOCALE="ko-KR"
VITE_APP_CURRENCY="KRW"
VITE_GOOGLE_CLIENT_ID="Google OAuth Client ID"
```

로컬 개발 시에는 `CLIENT_BASE_URL`, `API_BASE_URL`, `GOOGLE_CALLBACK_URL` 값을 `http://localhost` 기준으로 조정하면 됩니다.

## 6. Prisma 초기화 및 마이그레이션
데이터베이스 스키마를 준비하려면 다음 명령을 순서대로 실행합니다.
```bash
npx prisma generate          # Prisma Client 생성
npx prisma migrate deploy    # 운영 배포용 마이그레이션 적용
```
개발 환경에서 스키마를 수정했다면 `npx prisma migrate dev`를 사용해도 됩니다. 마이그레이션이 완료되면 `User` 등 필수 테이블이 데이터베이스에 생성됩니다.

## 7. 프론트엔드 빌드
```bash
npm run build
```
`dist/` 디렉터리가 생성되며, 정적 호스팅(Nginx, S3 등)에 업로드하여 서비스할 수 있습니다.

## 8. 백엔드 서버 실행
로컬에서 직접 실행:
```bash
npm run server
```
운영 환경에서는 PM2 또는 systemd 같은 프로세스 매니저 사용을 권장합니다.

**PM2 예시**
```bash
npm install -g pm2
pm2 start server/index.js --name trakko-api
pm2 save
pm2 startup
```

## 9. 리버스 프록시(Nginx 예시)
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

## 10. HTTPS 적용 (Let’s Encrypt)
```bash
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d api.your-domain -d your-domain
```

## 11. 로깅 및 모니터링
- Express 서버 로그: `pm2 logs` 또는 `journalctl` 활용
- 클라이언트/에러 추적: Sentry, LogRocket 등 필요에 따라 연동

## 12. 운영 점검 사항
- `server/data/portfolio-*.json`은 로컬 테스트 데이터이므로 운영 환경에서는 삭제하거나 권한을 제한하세요.
- 주기적으로 `npm audit`으로 의존성 취약점을 확인하세요.
- 데이터베이스 백업 정책(MySQL dump 등)을 마련해 두세요.
