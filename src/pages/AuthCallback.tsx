import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePortfolioStore } from '../store/portfolioStore';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { refetch } = useAuthStore();
  const { loadPortfolio } = usePortfolioStore();

  useEffect(() => {
    (async () => {
      const user = await refetch();
      if (user) {
        await loadPortfolio();
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    })();
  }, [refetch, loadPortfolio, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-slate-600">
      로그인 정보를 확인하는 중입니다...
    </div>
  );
};

export default AuthCallback;
