# Trakko

�ֽ� ���� ������ ����ϰ� �м��� �� �ִ� �� ���ø����̼��Դϴ�. �ʱ� �ں��� ����ϰ� �� �ŷ��� ���Ͱ� �ٰŸ� ����鼭 �ں� ���̸� �ð������� Ȯ���� �� �ֽ��ϴ�.

## �ֿ� ���

- **�ʱ� �õ� �º���**: ù �湮 �� ���ڿ� ����� �ʱ� �ں��� �Է��մϴ�.
- **�ŷ� ��� ����**: ƼĿ, ���� �ݾ�, �ŷ���, �Ÿ� �ٰŸ� ���ϰ� ���� �� �ֽ��ϴ�.
- **�ں� ���� ��Ʈ**: ���� ������ �ں��� ��ġ�� ������ �׷����� �Ѵ��� �ľ��մϴ�.
- **������ �ʱ�ȭ**: ���� ���������� �õ�� �ŷ� �����͸� �ʱ� ���·� �ǵ��� �� �ֽ��ϴ�.
- **REST API**: Express ������ ��Ʈ������ �����͸� JSON ���Ϸ� ���塤�����մϴ�.

## ���� ����

```bash
npm install
npm run server # http://localhost:4000 ���� API ���� ����
npm run dev    # http://localhost:5173 ���� ����Ʈ ���� ���� ����
```

> �ٸ� �ּҿ��� API�� ȣ���Ϸ��� `VITE_API_BASE_URL` ȯ�� ������ �����ϼ���.

## API ����

| Method | Endpoint                | ����                       |
| ------ | ----------------------- | -------------------------- |
| GET    | `/api/portfolio`        | �õ� �� �ŷ� ������ ��ȸ   |
| POST   | `/api/portfolio/seed`   | �ʱ� �õ� ����/����        |
| POST   | `/api/portfolio/trades` | �ŷ� ��� �߰�             |
| POST   | `/api/portfolio/reset`  | �õ�� �ŷ� ������ �ʱ�ȭ  |

## ��� ����

- React 18 �� TypeScript �� Vite
- Tailwind CSS
- Zustand (���� ����)
- Recharts (������ �ð�ȭ)
- Express (�鿣�� API)

## ȯ�� ����

| ���� | ���� |
| --- | --- |
| `VITE_API_BASE_URL` | ����Ʈ���� ȣ���� API �ּ� (�⺻ `http://localhost:4000/api`) |
| `VITE_APP_LOCALE` | ��ȭ ���˿� ����� ������ (�⺻ `en-US`) |
| `VITE_APP_CURRENCY` | ǥ�� ��ȭ �ڵ� (�⺻ `USD`) |
| `GOOGLE_CLIENT_ID` | Google OAuth Ŭ���̾�Ʈ ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Ŭ���̾�Ʈ ���Ű |
| `GOOGLE_CALLBACK_URL` | Google OAuth �ݹ� URL (������ �� `http://localhost:4000/api/auth/google/callback`) |
| `CLIENT_BASE_URL` | ����Ʈ���� ���̽� URL (�⺻ `http://localhost:5173`) |
| `SESSION_SECRET` | Express ���� ���� ����� ���Ű |
| `OPENAI_API_KEY` | AI ��ý���Ʈ ���� ������ ���� OpenAI API Ű |
| `OPENAI_MODEL` | ����� OpenAI �� ID (�⺻ `gpt-4o-mini`) |

## ���̼���

MIT
