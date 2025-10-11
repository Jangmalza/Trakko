import React from 'react';

const KrStockHighlights: React.FC = () => (
  <section className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <header className="mb-4 space-y-1">
      <p className="text-xs uppercase tracking-wide text-amber-500 dark:text-amber-300">국내주식 인사이트</p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">오늘 체크할 포인트</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        환율과 외국인 수급을 함께 확인하고, 섹터 로테이션 흐름을 따라 포트폴리오를 조정해 보세요.
      </p>
    </header>
    <div className="grid gap-4 md:grid-cols-2">
      <article className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">시장 수급 요약</h3>
        <ul className="text-xs text-slate-600 dark:text-slate-300">
          <li>• 외국인·기관 순매수/순매도 확인</li>
          <li>• 코스피/코스닥 지수 방향성 체크</li>
        </ul>
      </article>
      <article className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">관심 섹터 메모</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            반도체, 2차전지, 소비 관련 업종 등 테마별 이슈를 기록하고, 실적 발표 일정과 공시를 확인하세요.
          </p>
      </article>
    </div>
  </section>
);

export default KrStockHighlights;
