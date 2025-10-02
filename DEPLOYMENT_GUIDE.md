# Deployment Guide (Ubuntu)

## 1. �ý��� �䱸 ����
- Ubuntu 22.04 LTS �̻�
- Node.js 18.x (LTS)
- npm 10.x (Node 18�� ����)
- git, unzip �� �⺻ ��ƿ��Ƽ

## 2. Node.js & npm ��ġ
```
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v
npm -v
```

## 3. ������Ʈ ���� �غ�
```
git clone https://github.com/Jangmalza/Trakko.git
cd Trakko
npm install
```

## 4. ȯ�� ���� ����
`server/.env`�� ������Ʈ ��Ʈ�� `.env`�� �ۼ��մϴ�. ���ô� �Ʒ��� �����ϴ�.

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
```

**.env**
```
VITE_API_BASE_URL=https://api.your-domain
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini/api
VITE_APP_LOCALE=ko-KR
VITE_APP_CURRENCY=KRW
VITE_GOOGLE_CLIENT_ID=...
```

## 5. ����Ʈ���� ����
```
npm run build
```
`dist/` ������ �����Ǹ�, ���� �� ����(Nginx, S3 ��)�� �����մϴ�.

## 6. �鿣�� ���� ����
```
npm run server
```
� ȯ�濡���� PM2 �Ǵ� systemd�� ���μ����� �����ϴ� ���� �����մϴ�.

**PM2 ����**
```
npm install -g pm2
pm2 start server/index.js --name trakko-api
pm2 save
pm2 startup
```

## 7. ������ ���Ͻ�(Nginx ����)
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

## 8. HTTPS ���� (Let��s Encrypt)
```
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d api.your-domain -d your-domain
```

## 9. �α׿� ����͸�
- Express ���� �α�: PM2, systemd journal �� Ȱ��
- ����Ʈ ���� ����͸�: Sentry/LogRocket �� ���� ���

## 10. ��� �� ���� ����
- `server/data/portfolio-*.json` ������ ����ں� ���� �������Դϴ�. ���� ����� �����մϴ�.
- `npm audit`���� ������ ���� �̽��� �ֱ������� Ȯ���ϼ���.

