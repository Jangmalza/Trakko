import React from 'react';

const insightCards = [
  {
    title: '이번 주 미국 시장 포커스',
    description: '주요 이벤트와 섹터 흐름을 빠르게 훑어보고 대응 전략을 세워보세요.',
    highlights: [
      '메가캡 실적 발표: 컨퍼런스 콜 핵심 키워드 정리',
      '연준 위원 발언 캘린더로 금리 관련 변동성 대비',
      '반도체에서 소비재로 이동하는 섹터 로테이션 체크'
    ],
    ctaLabel: '주간 브리핑 보기'
  },
  {
    title: '포트폴리오 체크리스트',
    description: '이번 주 손익을 정리하고 다음 투자 계획을 수립하세요.',
    highlights: [
      '상위/하위 종목 손익 원인 분석 및 거래 노트 업데이트',
      '위험 노출이 큰 포지션 점검 후 사이즈 재조정',
      '다음 주 매수/매도 후보군 간단 메모 작성'
    ],
    ctaLabel: '리뷰 & 플랜'
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
  return (
    <section className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-4 space-y-1">
        <p className="text-xs uppercase tracking-wide text-blue-500 dark:text-blue-300">미국주식 인사이트</p>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">이번 주 체크 포인트</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          경제 지표와 메가캡 실적, 포트폴리오 체크리스트를 한눈에 확인하세요.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {insightCards.map((card) => (
            <article
              key={card.title}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-xs text-slate-600 shadow-sm transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <p className="text-[11px] uppercase tracking-wide text-blue-400 dark:text-blue-300">Insight</p>
              <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{card.title}</h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{card.description}</p>
              <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-200">
                {card.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-400 dark:bg-blue-300" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1 rounded-full border border-blue-500 px-3 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-300 dark:text-blue-200 dark:hover:bg-blue-300/10"
              >
                {card.ctaLabel}
              </button>
            </article>
          ))}
        </div>

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
