import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_EMAIL = 'magpie0930@gmail.com';
const TRADE_COUNT = 100;

const tickerPool = [
  {
    ticker: 'AAPL',
    story: '아이폰 16 수요 리포트와 서비스 매출 성장 기대감'
  },
  {
    ticker: 'NVDA',
    story: '데이터센터용 GPU 수요가 AI 인프라 투자와 함께 폭발적으로 증가'
  },
  {
    ticker: 'TSLA',
    story: '전기차 가격 조정 이후 마진 회복과 사이버트럭 생산 확대 기대'
  },
  {
    ticker: 'AMZN',
    story: 'AWS 성장률 안정과 프라임데이 이후 커머스 매출 반등 모멘텀'
  },
  {
    ticker: 'MSFT',
    story: 'Azure AI 워크로드 증가와 Copilot 출시 확대 기대'
  },
  {
    ticker: 'META',
    story: '리일스 광고 수익화가 본격화되며 마진 개선 가능성'
  },
  {
    ticker: 'GOOGL',
    story: '서치 광고 견조세와 클라우드 부문 손익 개선 추세'
  },
  {
    ticker: 'NFLX',
    story: '유료 가입자 순증과 광고 요금제 확장에 따른 ARPU 상승'
  },
  {
    ticker: 'AMD',
    story: 'MI300 가속기 출하와 Xilinx 시너지 본격 반영 기대'
  },
  {
    ticker: 'JPM',
    story: '금리 고점 구간에서 NIM 방어, 배당과 자사주 매입 확대'
  },
  {
    ticker: 'GS',
    story: 'IB 수수료 회복과 자산운용 부문의 수익 가시성 증가'
  },
  {
    ticker: 'SPY',
    story: 'S&P 500 ETF로 경기 연착륙 시나리오에 베팅'
  },
  {
    ticker: 'QQQ',
    story: '빅테크 중심 나스닥 지수 추종으로 AI 모멘텀 참여'
  }
];

const entryMotifs = [
  '20일 이동평균선 지지 확인 후 분할 매수',
  '전일 실적 발표 후 갭상승 구간 눌림목 매수',
  'RSI 과매도 구간 진입으로 기술적 반등 기대',
  '거래량 동반한 추세 전환 패턴 확인',
  '거시 지표(실업률, CPI) 우호적으로 나오며 리스크온 분위기'
];

const exitMotifs = [
  '목표가 도달 후 일부 차익 실현',
  '저항선 부근에서 거래량 감소 포착',
  '손절 라인 이탈하여 추가 하락 방지 목적',
  '리스크 관리 차원에서 이벤트(실적 발표) 이전 정리',
  '원자재/환율 급변으로 예상 변동성 확대'
];

const formatRationale = (tickerInfo, entryReason, exitReason) =>
  `${tickerInfo.story}. 진입 근거: ${entryReason}. 청산 근거: ${exitReason}.`;

const randomPick = (array) => array[Math.floor(Math.random() * array.length)];

const generateTrades = (userId) => {
  const now = new Date();
  const trades = [];

  for (let i = 0; i < TRADE_COUNT; i += 1) {
    const tickerInfo = randomPick(tickerPool);
    const entryReason = randomPick(entryMotifs);
    const exitReason = randomPick(exitMotifs);

    const offsetDays = Math.floor(Math.random() * 120) + 1; // 최근 4개월 내
    const tradeDate = new Date(now);
    tradeDate.setDate(now.getDate() - offsetDays);

    const profitLoss = Number(((Math.random() - 0.45) * 1200).toFixed(2));

    trades.push({
      userId,
      ticker: tickerInfo.ticker,
      profitLoss: profitLoss.toFixed(2),
      rationale: formatRationale(tickerInfo, entryReason, exitReason),
      entryRationale: entryReason,
      exitRationale: exitReason,
      tradeDate,
      createdAt: new Date()
    });
  }

  return trades;
};

(async () => {
  try {
    const user = await prisma.user.findFirst({
      where: { email: USER_EMAIL }
    });

    if (!user) {
      console.error(`사용자(${USER_EMAIL})를 찾을 수 없습니다.`);
      process.exit(1);
    }

    const trades = generateTrades(user.id);
    await prisma.trade.createMany({ data: trades });
    console.log(`${USER_EMAIL} 사용자에게 더미 거래 ${trades.length}건을 추가했습니다.`);
  } catch (error) {
    console.error('더미 거래 생성에 실패했습니다:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
