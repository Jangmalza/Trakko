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