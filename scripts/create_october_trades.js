import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_EMAIL = 'magpie0930@gmail.com';
const TRADE_COUNT = 100;
const TARGET_YEAR = 2025;
const TARGET_MONTH = 10; // October

const tickerPool = [
  {
    ticker: 'AAPL',
    story: '아이폰 16 프로 초기 판매 호조와 서비스 매출 성장 기대'
  },
  {
    ticker: 'NVDA',
    story: '데이터센터 GPU 수요와 AI 인프라 투자 사이클이 지속되는 국면'
  },
  {
    ticker: 'TSLA',
    story: '신형 모델 프로덕션 확대로 분기별 출하 회복을 기대'
  },
  {
    ticker: 'AMZN',
    story: '프라임 빅딜 이벤트 이후 커머스 매출 반등과 AWS 안정세'
  },
  {
    ticker: 'MSFT',
    story: 'Azure의 AI 워크로드 증가와 Copilot 유료 확장에 따른 추가 수익'
  },
  {
    ticker: 'META',
    story: 'Reels 광고 수익화와 AI 추천 모델 개선으로 마진 확장 여지'
  },
  {
    ticker: 'GOOGL',
    story: '검색 광고 견조세와 Cloud 부문 손익 개선이 이어짐'
  },
  {
    ticker: 'NFLX',
    story: '광고 요금제 ARPU 상승과 신규 컨텐츠 라인업 기대감'
  },
  {
    ticker: 'AMD',
    story: 'MI300 및 Xilinx 시너지 확대가 예상되어 매출 믹스 개선'
  },
  {
    ticker: 'JPM',
    story: '금리 정체 구간에서 순이자마진 방어와 배당 확대 기대'
  },
  {
    ticker: 'GS',
    story: 'IB 수수료 회복과 자산운용 부문의 안정적인 수익 흐름'
  },
  {
    ticker: 'SPY',
    story: 'S&P 500 ETF로 미국 경기 연착륙 시나리오에 베팅'
  },
  {
    ticker: 'QQQ',
    story: '빅테크 중심 나스닥 지수 ETF로 AI 모멘텀에 참여'
  }
];

const entryMotifs = [
  '삼중바닥 패턴 확인 후 직전 고점 돌파 기대',
  '전일 실적 발표 이후 조정 국면에서 기술적 매수',
  '20일 이동평균 위에서 발생한 거래량 동반 상승 추세',
  'RSI 과매도 구간 진입 이후 반등 확인',
  '환율 약세로 달러 자산 투자에 유리한 환경'
];

const exitMotifs = [
  '목표가 도달 후 단계적 차익 실현',
  '저항선 근처에서 거래량 감소 포착',
  '손절 라인 이탈해 추가 하락 방지',
  '실적 발표 전 변동성 방지를 위해 포지션 축소',
  '원자재 가격 급등으로 예상 변동성 확대'
];

const formatRationale = (tickerInfo, entryReason, exitReason) =>
  `${tickerInfo.story}. 진입 근거: ${entryReason}. 청산 근거: ${exitReason}.`;

const randomPick = (array) => array[Math.floor(Math.random() * array.length)];

const generateTrades = (userId) => {
  const trades = [];
  for (let i = 0; i < TRADE_COUNT; i += 1) {
    const tickerInfo = randomPick(tickerPool);
    const entryReason = randomPick(entryMotifs);
    const exitReason = randomPick(exitMotifs);

    const day = Math.floor(Math.random() * 31) + 1; // 1일부터 31일까지
    const tradeDate = new Date(Date.UTC(TARGET_YEAR, TARGET_MONTH - 1, day));

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
    const user = await prisma.user.findFirst({ where: { email: USER_EMAIL } });
    if (!user) {
      console.error(`사용자(${USER_EMAIL})를 찾을 수 없습니다.`);
      process.exit(1);
    }

    const trades = generateTrades(user.id);
    await prisma.trade.createMany({ data: trades });
    console.log(`${USER_EMAIL} 사용자에게 2025년 10월 기준 더미 거래 ${trades.length}건을 추가했습니다.`);
  } catch (error) {
    console.error('더미 거래 생성 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
