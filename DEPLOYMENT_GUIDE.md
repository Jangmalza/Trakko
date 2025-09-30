# Photo Gallery 배포 가이드 (Ubuntu EC2)

## 1. 인스턴스 준비
- Ubuntu 22.04 LTS 인스턴스를 생성합니다(t3.small 이상 권장).
- 보안 그룹에서 TCP 22(SSH), 80/443(웹), 4000(API)을 허용합니다. 5173 포트는 개발 중에만 임시로 열어 두고 작업 후 닫으세요.
- SSH 접속: `ssh -i <key>.pem ubuntu@<EC2-IP>`.

## 2. 시스템 세팅
- 패키지 업데이트:
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```
- Node.js 20 및 빌드 도구 설치:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs build-essential
  ```
- 설치 확인: `node -v`, `npm -v`.

## 3. 프로젝트 배포
- 저장소 클론 및 의존성 설치:
  ```bash
  git clone <repository-url>
  cd photo-gallery
  npm install
  ```
- 환경 변수 설정(쉘 또는 프로세스 매니저):
  ```bash
  export VITE_API_BASE_URL="https://<domain-or-ip>/api"
  export VITE_ADMIN_PASSWORD="<strong-password>"
  export PORT=4000
  ```

## 4. API 서버(Express)
- 동작 테스트: `npm run server` 실행 후 `curl http://localhost:4000/api/health`로 확인합니다.
- PM2 설치 및 서비스 등록:
  ```bash
  sudo npm install -g pm2
  pm2 start npm --name gallery-api -- run server
  pm2 set pm2:env:gallery-api PORT 4000
  pm2 set pm2:env:gallery-api VITE_API_BASE_URL https://<domain-or-ip>/api
  pm2 set pm2:env:gallery-api VITE_ADMIN_PASSWORD <strong-password>
  pm2 save
  sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
  ```
- 자주 쓰는 명령: `pm2 status`, `pm2 logs gallery-api`, `pm2 restart gallery-api`.

## 5. 프런트엔드 빌드 및 Nginx 설정
- 정적 파일 빌드:
  ```bash
  npm run build
  ```
- Nginx 설치:
  ```bash
  sudo apt install -y nginx
  ```
- `/etc/nginx/sites-available/gallery` 파일 생성:
  ```nginx
  server {
    listen 80;
    server_name <domain-or-ip>;

    location /api/ {
      proxy_pass http://127.0.0.1:4000/api/;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
      root /home/ubuntu/photo-gallery/dist;
      try_files $uri /index.html;
    }
  }
  ```
- 사이트 활성화 및 재시작:
  ```bash
  sudo ln -s /etc/nginx/sites-available/gallery /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl reload nginx
  ```
- HTTPS 설정(권장):
  ```bash
  sudo snap install core && sudo snap refresh core
  sudo snap install --classic certbot
  sudo ln -s /snap/bin/certbot /usr/bin/certbot
  sudo certbot --nginx -d <domain>
  ```

## 6. 검증
- 브라우저에서 `https://<domain>`을 열어 갤러리가 정상적으로 로드되는지 확인합니다.
- `/admin` 경로에 접속해 `VITE_ADMIN_PASSWORD`로 로그인해 봅니다.
- API 상태 확인: `curl https://<domain>/api/health` 또는 HTTP만 사용하는 경우 `curl http://<EC2-IP>/api/health`.

## 7. 운영 및 유지보수 팁
- 개발이 끝나면 5173 포트를 닫고, 보안 그룹에는 필요한 포트만 남겨 두세요.
- 관리자 비밀번호를 정기적으로 교체하고 기본값이 코드에 남지 않도록 관리합니다.
- 업데이트 시 `npm audit fix`를 실행하고, 장기 로그는 `pm2 logs`나 CloudWatch/pm2-logrotate`로 관리하세요.
- 최신 코드를 적용할 때는 `git pull` 후 `npm run build`, `pm2 restart gallery-api` 순으로 재배포합니다.
