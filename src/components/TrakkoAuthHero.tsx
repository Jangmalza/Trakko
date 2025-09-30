import React from 'react';
import trakkoLogo from '../assets/trakko-logo.svg';

const TrakkoAuthHero: React.FC = () => (
  <div className="mb-8 text-center">
    <img src={trakkoLogo} alt="Trakko" className="mx-auto h-12 w-auto" />
    <p className="mt-2 text-sm text-slate-500">Google로 로그인하고 투자 일지를 시작하세요.</p>
  </div>
);

export default TrakkoAuthHero;
