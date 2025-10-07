import React from 'react';

const TrakkoAuthHero: React.FC = () => (
  <div className="mb-10 flex flex-col items-center gap-6 text-center">
    <h1 className="trakko-logo-animate text-3xl font-semibold text-slate-900 dark:text-slate-100">Trakko</h1>
    <p className="max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
      Google로 로그인하고 투자 일지를 시작하세요.
    </p>
  </div>
);

export default TrakkoAuthHero;
