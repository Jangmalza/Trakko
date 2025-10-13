import React, { useMemo, useState } from 'react';

const insightSlides = [
  {
    id: 'earnings-window',
    headline: '메가캡 실적 집중 구간',
    subheadline: '실적 발표 전후 프리미엄이 붙는 종목을 추적하세요.',
    highlights: [
      'AAPL · 10/24 · 서비스 매출 성장률에 주목',
      'NVDA · 11/20 · 데이터센터/AI 칩 수요 체크',
      'TSLA · 11/05 · 마진 가이던스 하향 가능성'
    ],
    ctaLabel: '실적 캘린더 보기'
  },
  {
    id: 'macro-watch',
    headline: '이번 주 매크로 트리거',
    subheadline: '금리와 환율에 따라 성장주 밸류에이션이 급변합니다.',
    highlights: [
      'CPI 발표: 헤드라인 0.3%p ± 변동 여부',
      'FOMC 의사록: dot plot 수정 여부 확인',
      'DXY 지수: 106선 유지 시 해외 투자 자금 유출 가능'
    ],
    ctaLabel: '경제 캘린더 열기'
  },
  {
    id: 'rotation-play',
    headline: '섹터 로테이션 체크리스트',
    subheadline: '반도체에서 소비재로 자금이 순환하는 패턴을 추적하세요.',
    highlights: [
      'SMH ETF 상대 강도 >0.8 유지 여부',
      'XLY vs XLP 스프레드 반등 확인',
      '10년물 금리 4.5% 이하 안착 시 성장주 재진입 고려'
    ],
    ctaLabel: '섹터 강도 리포트'
  }
];

const adSlots = [
  {
    id: 'premium-briefing',
    badge: '스폰서',
    title: '월간 매크로 다이제스트',
    description: '월 1회 월가 전략가 컨퍼런스 콜 요약본과 체크리스트를 받아보세요.',
    actions: [
      { label: '무료 체험', tone: 'primary' },
      { label: '자세히 보기', tone: 'ghost' }
    ]
  },
  {
    id: 'options-lab',
    badge: 'Partner',
    title: '옵션 헷지 시뮬레이터',
    description: '포트폴리오 델타를 입력하면 즉시 스프레드 전략을 추천합니다.',
    actions: [{ label: '데모 요청', tone: 'primary' }]
  }
];

const UsStockHighlights: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const safeIndex = useMemo(() => {
    if (activeIndex < 0) return insightSlides.length - 1;
    if (activeIndex >= insightSlides.length) return 0;
    return activeIndex;
  }, [activeIndex]);

  const slide = insightSlides[safeIndex];

  const handlePrev = () => {
    setActiveIndex((index) => (index - 1 + insightSlides.length) % insightSlides.length);
  };

  const handleNext = () => {
    setActiveIndex((index) => (index + 1) % insightSlides.length);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-4 space-y-1">
        <p className="text-xs uppercase tracking-wide text-blue-500 dark:text-blue-300">미국주식 인사이트</p>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">이번 주 체크 포인트</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          경제 지표와 메가캡 실적, 섹터 로테이션 흐름을 5:5 레이아웃으로 빠르게 비교하세요.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 transition dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-300">Insight Carousel</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{slide.headline}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="rounded-full border border-slate-300 p-1 text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
                aria-label="이전 인사이트"
              >
                {'<'}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-full border border-slate-300 p-1 text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
                aria-label="다음 인사이트"
              >
                {'>'}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{slide.subheadline}</p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-200">
            {slide.highlights.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-400 dark:bg-blue-300" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-1">
              {insightSlides.map((item, index) => {
                const active = index === safeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-1.5 rounded-full transition ${active ? 'w-6 bg-blue-500 dark:bg-blue-300' : 'w-3 bg-slate-300 dark:bg-slate-600'}`}
                    aria-label={`${index + 1}번 인사이트 보기`}
                  />
                );
              })}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-blue-500 px-2.5 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-300 dark:text-blue-200 dark:hover:bg-blue-300/10"
            >
              {slide.ctaLabel}
            </button>
          </div>
        </article>

        <aside className="flex h-full flex-col gap-3">
          {adSlots.map((ad) => (
            <div
              key={ad.id}
              className="flex flex-col justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800 shadow-sm dark:border-amber-400/60 dark:bg-amber-500/10 dark:text-amber-200"
            >
              <div>
                <span className="text-[11px] uppercase tracking-wide text-amber-500 dark:text-amber-300">{ad.badge}</span>
                <h3 className="mt-0.5 text-sm font-semibold text-amber-900 dark:text-amber-100">{ad.title}</h3>
                <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200/90">{ad.description}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {ad.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className={
                      action.tone === 'primary'
                        ? 'inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-400 dark:bg-amber-300 dark:text-amber-900 dark:hover:bg-amber-200'
                        : 'inline-flex items-center gap-1 rounded-full border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:border-amber-500 hover:text-amber-900 dark:border-amber-400 dark:text-amber-200 dark:hover:border-amber-200 dark:hover:text-amber-100'
                    }
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
};

export default UsStockHighlights;
