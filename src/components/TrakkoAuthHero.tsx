import React from 'react';

const TrakkoAuthHero: React.FC = () => (
  <div className="mb-10 flex flex-col items-center gap-6 text-center">
    <div className="trakko-logo-animate flex h-14 w-40 items-center justify-center rounded-full bg-gradient-to-r from-slate-900 to-slate-700 text-lg font-semibold text-slate-50 shadow-lg">
      Trakko
    </div>
    <p className="text-sm text-slate-500">Google로 로그인하고 투자 일지를 시작하세요.</p>
  </div>
);

export default TrakkoAuthHero;
