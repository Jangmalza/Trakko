# Trakko

주식 투자 일지를 기록하고 분석할 수 있는 웹 애플리케이션입니다. 초기 자본을 등록하고 각 거래의 손익과 근거를 남기면서 자본 추이를 시각적으로 확인할 수 있습니다.

## 주요 기능
- **초기 시드 온보딩**: 첫 방문 시 투자에 사용할 초기 자본을 입력합니다.
- **거래 기록 관리**: 티커, 손익 금액, 거래일, 매매 근거를 상세하게 남길 수 있습니다.
- **자본 추이 차트**: 누적 손익이 자본에 미치는 영향을 그래프로 한눈에 파악합니다.
- **데이터 초기화**: 설정 페이지에서 시드와 거래 데이터를 초기 상태로 되돌릴 수 있습니다.
- **AI 어시스턴트**: 최근 거래 데이터를 바탕으로 맞춤형 인사이트를 제공합니다.

## 빠른 시작

```bash
npm install
npm run server # http://localhost:4000 에서 API 서버 실행
npm run dev    # http://localhost:5173 에서 프런트 개발 서버 실행
```

> 다른 주소에서 API를 호출하려면 `VITE_API_BASE_URL` 환경 변수를 설정하세요.

## API 개요

| Method | Endpoint                | 설명                       |
| ------ | ----------------------- | -------------------------- |
| GET    | `/api/portfolio`        | 시드 및 거래 데이터 조회   |
| POST   | `/api/portfolio/seed`   | 초기 시드 설정/수정        |
| POST   | `/api/portfolio/trades` | 거래 기록 추가             |
| PATCH  | `/api/portfolio/trades/:id` | 거래 기록 수정         |
| DELETE | `/api/portfolio/trades/:id` | 거래 기록 삭제         |
| POST   | `/api/portfolio/reset`  | 시드와 거래 데이터 초기화  |
| GET/POST | `/api/preferences`    | 사용자 통화 설정 조회/변경 |

## 기술 스택
- React 18 · TypeScript · Vite
- Tailwind CSS
- Zustand (상태 관리)
- Recharts (데이터 시각화)
- Express (백엔드 API)
- OpenAI API (AI 어시스턴트)

## 환경 변수

| 변수 | 설명 |
| --- | --- |
| `VITE_API_BASE_URL` | 프런트에서 호출할 API 주소 (기본 `http://localhost:4000/api`) |
| `VITE_APP_LOCALE` | 통화 포맷에 사용할 로케일 (기본 `en-US`) |
| `VITE_APP_CURRENCY` | 표시 통화 코드 (기본 `USD`) |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 비밀키 |
| `GOOGLE_CALLBACK_URL` | Google OAuth 콜백 URL (미지정 시 `http://localhost:4000/api/auth/google/callback`) |
| `CLIENT_BASE_URL` | 프런트엔드 베이스 URL (기본 `http://localhost:5173`) |
| `SESSION_SECRET` | Express 세션 서명에 사용할 비밀키 |
| `OPENAI_API_KEY` | AI 어시스턴트 응답 생성을 위한 OpenAI API 키 |
| `OPENAI_MODEL` | 사용할 OpenAI 모델 ID (기본 `gpt-4o-mini`) |

## 라이선스

MIT
