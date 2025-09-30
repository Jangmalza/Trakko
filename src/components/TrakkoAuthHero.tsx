import React from 'react';

const TrakkoAuthHero: React.FC = () => (
  <div className="mb-10 flex flex-col items-center gap-6 text-center">
    <div className="trakko-logo-animate flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-900 text-xl font-semibold text-slate-50 shadow-lg">
      T
    </div>
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Trakko</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        Google로 로그인하고 투자 일지를 시작하세요.
      </p>
    </div>
  </div>
);

export default TrakkoAuthHero;
