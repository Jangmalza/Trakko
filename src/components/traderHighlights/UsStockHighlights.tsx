import React from 'react';

const UsStockHighlights: React.FC = () => (
  <section className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <header className="mb-4 space-y-1">
      <p className="text-xs uppercase tracking-wide text-blue-500 dark:text-blue-300">미국주식 인사이트</p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">이번 주 체크 포인트</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        경제 지표와 메가캡 실적 발표 일정을 확인하고, 변동성 확대 구간에서 리스크를 조절하세요.
      </p>
    </header>
    <div className="grid gap-4 md:grid-cols-3">
      <article className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">주요 지수</h3>
        <ul className="text-xs text-slate-600 dark:text-slate-300">
          <li>• S&P500 방향성 및 섹터 강도</li>
          <li>• 나스닥 100 기술주 흐름</li>
        </ul>
      </article>
      <article className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">경제 일정</h3>
        <ul className="text-xs text-slate-600 dark:text-slate-300">
          <li>• FOMC, CPI, 고용지표 발표</li>
          <li>• Fed 스피치와 금리 예상치 변화</li>
        </ul>
      </article>
      <article className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">관심 종목</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          실적 시즌에는 가이던스와 마진 전망을 기록하고, 변동성 지수(VIX)를 참고해 포지션 규모를 조정하세요.
        </p>
      </article>
    </div>
  </section>
);

export default UsStockHighlights;
