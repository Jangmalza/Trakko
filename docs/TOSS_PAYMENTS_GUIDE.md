# 토스페이먼츠 결제 연동 가이드

Trakko 프로젝트에 토스페이먼츠(Toss Payments) 정기 결제를 연동하기 위한 단계별 안내입니다. Stripe 대신 국내 PG를 사용해야 할 때 참고하세요.

## 1. 사전 준비

- **PG 계약**: 토스페이먼츠와 계약해 `Client Key`, `Secret Key`를 발급받습니다. 정기 결제를 사용하려면 Billing API 이용 신청이 승인돼야 합니다.
- **환경 분리**: 개발/운영용 키를 구분해 `.env`(`TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`, `TOSS_API_BASE_URL`)에 저장하세요.
- **HTTPS**: 카드 정보 입력 페이지는 HTTPS가 필수이며, 성공/실패 리다이렉트 URL도 HTTPS여야 합니다.

## 2. 서버 설정

1. **의존성 추가**: Express 서버(`server/index.js`)에서 사용할 Axios 또는 공식 SDK를 설치합니다.
   ```bash
   npm install axios
   ```

2. **토스 API 클라이언트 유틸**: 공통 헤더와 엔드포인트를 관리하는 모듈을 작성합니다.
   ```ts
   // server/lib/tossClient.js
   import axios from 'axios';

   const client = axios.create({
     baseURL: process.env.TOSS_API_BASE_URL ?? 'https://api.tosspayments.com',
     headers: {
       'Content-Type': 'application/json',
       Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`
     }
   });

   export const tossClient = client;
   ```

3. **Checkout 세션 생성**: `/api/billing/create-checkout` 같은 엔드포인트를 만들고 토스 결제창에 전달할 `orderId`, `amount`, `customerKey` 등을 내려줍니다.
   ```ts
   app.post('/api/billing/create', requireAuth, async (req, res) => {
     const orderId = `trk_pro_${Date.now()}`;
     const amount = PRO_MONTHLY_PRICE;
     res.json({
       orderId,
       amount,
       customerKey: req.user.id,
       orderName: 'Trakko Pro 구독',
       successUrl: `${CLIENT_BASE_URL}/billing/success?orderId=${orderId}`,
       failUrl: `${CLIENT_BASE_URL}/billing/fail`
     });
   });
   ```

4. **첫 결제 승인 & 빌링키 발급**: 프런트에서 결제가 승인되면 `paymentKey`, `orderId`, `amount`를 서버에 POST하고, 서버는 `POST /v1/billing/authorizations/issue`로 빌링키를 발급받습니다.
   ```ts
   app.post('/api/billing/authorize', requireAuth, async (req, res) => {
     const { paymentKey, orderId, amount } = req.body;
     const response = await tossClient.post('/v1/billing/authorizations/issue', {
       paymentKey,
       orderId,
       amount,
       customerKey: req.user.id
     });
     const { billingKey, card, orderId: confirmedOrderId } = response.data;

     await prisma.user.update({
       where: { id: req.user.id },
       data: {
         tossBillingKey: billingKey,
         stripeCustomerId: null, // Stripe 사용 시와 구분
         subscriptionTier: 'PRO'
       }
     });

     res.json({ billingKey, card, orderId: confirmedOrderId });
   });
   ```

5. **Webhook 처리**: `/api/billing/toss/webhook` 엔드포인트를 만들고 `payment.approved`, `payment.failed` 이벤트를 받아서 구독 상태를 업데이트합니다. 헤더 `TossPayments-Signature`로 HMAC 검증을 수행하세요.
   ```ts
   app.post('/api/billing/toss/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
     const signature = req.headers['tosspayments-signature'];
     const expected = crypto.createHmac('sha256', process.env.TOSS_WEBHOOK_SECRET!)
       .update(req.body)
       .digest('hex');
     if (signature !== expected) return res.status(400).end();

     const event = JSON.parse(req.body.toString());
     if (event.type === 'PAYMENT_APPROVED') {
       await prisma.user.update({
         where: { tossBillingKey: event.data.billingKey },
         data: { subscriptionTier: 'PRO' }
       });
     }
     if (event.type === 'PAYMENT_FAILED') {
       // 실패 횟수에 따라 FREE로 다운그레이드하거나 알림 전송
     }

     res.sendStatus(200);
   });
   ```

## 3. 프런트엔드 흐름

1. **결제 버튼**: 설정 페이지에서 “Pro 업그레이드” 버튼을 클릭하면 `/api/billing/create`를 호출하고 그 응답을 기반으로 토스 결제창을 띄웁니다.
   ```ts
   const { data } = await axios.post('/api/billing/create');
   const tossPayments = TossPayments(import.meta.env.VITE_TOSS_CLIENT_KEY);
   await tossPayments.requestPayment('카드', {
     amount: data.amount,
     orderId: data.orderId,
     orderName: data.orderName,
     customerKey: data.customerKey,
     successUrl: data.successUrl,
     failUrl: data.failUrl
   });
   ```

2. **성공 페이지**: `successUrl`로 돌아오면 쿼리 파라미터에 포함된 `paymentKey`/`orderId`를 서버 `/api/billing/authorize`에 전달해 빌링키를 저장합니다. 이후 `/api/auth/me`를 다시 호출해 구독 상태(Pro)로 갱신합니다.

3. **취소/오류 처리**: `failUrl`에서 오류 메시지를 보여주고, 사용자가 결제를 재시도할 수 있도록 안내합니다.

## 4. 정기 청구 스케줄링

- 토스는 자동 청구 스케줄러가 없으므로 서버에서 주기적인 작업이 필요합니다.
- 예: `node-cron`, AWS Lambda, 혹은 기존 인프라의 배치 잡을 이용해 매일 09:00에 `billingKey`가 있는 사용자 목록을 조회하고, 만료일이 지난 구독은 `POST /v1/billing/authorizations/payments`로 청구합니다.
- 청구 성공 시 `User.subscriptionTier` 유지, 실패 시 상태를 기록하고 재시도를 위해 로그를 남깁니다.

## 5. 테스트 & 운영 체크리스트

- [ ] 테스트 키로 결제 → 빌링키 발급 → 재청구(재승인)까지 시나리오 검증
- [ ] Webhook 서명 검증 동작 확인
- [ ] FREE/PRO 플래그에 따라 UI 제한(3개월 내역, 연간 목표 등) 정상 작동
- [ ] 운영 키로 서비스 전환 전, 토스측 정기결제 심사·VAN 심사가 완료되었는지 확인
- [ ] 개인정보 취급 방침/이용약관에 결제 관련 조항 추가
- [ ] 환불/결제 실패 정책 문서화 및 고객센터 대응 플로우 준비

## 6. 추가 기능 아이디어

- **구독 상태 페이지**: 결제 내역, 다음 청구일, 카드 정보를 보여주는 UI 추가
- **취소 프로세스**: 사용자가 언제든 구독 취소 → DB에 취소 플래그 저장하고 스케줄러에서 청구 제외
- **알림 연동**: 결제 성공/실패 시 이메일 또는 Slack/Discord 알림 발송
- **프로모션 코드**: 토스 결제창에는 할인 기능이 없으므로, 서버에서 금액 조정 로직으로 우회할 수 있습니다.

이 가이드를 기반으로 백엔드(Express)와 프런트(React) 양쪽에서 순차적으로 연동하면 토스페이먼츠를 이용한 Pro 구독 결제를 구축할 수 있습니다.
