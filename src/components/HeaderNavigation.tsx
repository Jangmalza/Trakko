import React from 'react';
import { Link } from 'react-router-dom';

const HeaderNavigation: React.FC = () => (
  <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
    <Link to="/dashboard" className="text-sm font-semibold text-slate-900">
      Investment Journal
    </Link>
    <div className="flex items-center gap-4 text-sm">
      <Link to="/dashboard" className="text-slate-600 hover:text-slate-900">
        대시보드
      </Link>
      <Link to="/settings" className="text-slate-600 hover:text-slate-900">
        설정
      </Link>
    </div>
  </nav>
);

export default HeaderNavigation;
