# Trakko

주식 투자 일지를 기록하고 분석할 수 있는 웹 애플리케이션입니다. 초기 자본을 등록하고 각 거래의 손익과 근거를 남기면서 자본 추이를 시각적으로 확인할 수 있습니다.

## 주요 기능

- **초기 시드 온보딩**: 첫 방문 시 투자에 사용할 초기 자본을 입력합니다.
- **거래 기록 관리**: 티커, 손익 금액, 거래일, 매매 근거를 상세하게 남길 수 있습니다.
- **자본 추이 차트**: 누적 손익이 자본에 미치는 영향을 그래프로 한눈에 파악합니다.
- **데이터 초기화**: 설정 페이지에서 시드와 거래 데이터를 초기 상태로 되돌릴 수 있습니다.
- **REST API**: Express 서버가 포트폴리오 데이터를 JSON 파일로 저장·제공합니다.

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
| POST   | `/api/portfolio/reset`  | 시드와 거래 데이터 초기화  |

## 기술 스택

- React 18 · TypeScript · Vite
- Tailwind CSS
- Zustand (상태 관리)
- Recharts (데이터 시각화)
- Express (백엔드 API)

## 환경 변수

- `VITE_API_BASE_URL` : 기본값 `http://localhost:4000/api`
- `VITE_APP_LOCALE` : 통화 포맷에 사용할 로케일 (기본 `en-US`)
- `VITE_APP_CURRENCY` : 표시 통화 코드 (기본 `USD`)

추후 Google 로그인 등 인증 기능을 추가할 경우 관련 클라이언트 ID/비밀키도 환경 변수로 관리하는 것을 권장합니다.

## 라이선스

MIT
