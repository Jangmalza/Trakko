import React from 'react';
import MiniMarketTicker from '../MiniMarketTicker';

const CryptoHighlights: React.FC = () => (
  <section className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <header className="mb-4 space-y-1">
      <p className="text-xs uppercase tracking-wide text-emerald-500 dark:text-emerald-300">암호화폐 인사이트</p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">실시간 시장 포커스</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        주요 디지털 자산과 온체인 지표를 빠르게 확인하세요. 변동성이 큰 코인일수록 진입·청산 계획이 필요합니다.
      </p>
    </header>
    <div className="grid gap-4 md:grid-cols-2">
      <article className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">24시간 변동 체크리스트</h3>
        <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <li>• 거래량 급증·급감 종목을 먼저 확인하세요.</li>
          <li>• 주요 온체인 흐름(고래 이동, 거래소 입출금)을 주시하세요.</li>
          <li>• 레버리지 비율과 펀딩비 변동을 참고하세요.</li>
        </ul>
      </article>
      <article className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">관심 코인 메모</h3>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          주기적으로 전략을 검토하고, 가격 알림을 설정해 예상 리스크를 관리하세요.
        </p>
      </article>
    </div>
    <div className="mt-6">
      <MiniMarketTicker />
    </div>
  </section>
);

export default CryptoHighlights;
