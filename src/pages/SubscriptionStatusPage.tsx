import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import HeaderNavigation from '../components/HeaderNavigation';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { useAuthStore } from '../store/authStore';

type FeatureItem = {
  id: string;
  name: string;
  description: string;
  free: boolean;
  pro: boolean;
};

const featureMatrix: FeatureItem[] = [
  {
    id: 'history',
    name: '전체 거래 히스토리',
    description: '무료 사용자에겐 최근 3개월 거래만 제공되며, Pro에서는 전체 기록과 CSV 다운로드를 사용할 수 있습니다.',
    free: false,
    pro: true
  },
  {
    id: 'goals',
    name: '월간 목표 관리',
    description: '한 달 목표를 설정하고 달성률을 추적합니다.',
    free: true,
    pro: true
  },
  {
    id: 'annual-goal',
    name: '연간 목표 및 장기 지표',
    description: 'Pro에서는 연간 목표와 누적 성과를 함께 관리할 수 있습니다.',
    free: false,
    pro: true
  },
  {
    id: 'ads',
    name: '광고 제거',
    description: 'Pro 구독자는 대시보드와 거래 화면에서 스폰서 콘텐츠가 사라져 집중도가 높아집니다.',
    free: false,
    pro: true
  },
  {
    id: 'ai',
    name: 'AI 트레이드 리포트',
    description: '기본 요약은 모든 사용자에게 제공되며, Pro는 추가 인사이트가 곧 제공될 예정입니다.',
    free: true,
    pro: true
  },
  {
    id: 'future',
    name: '자동 알림 & 통합 계정',
    description: 'Pro 전용 기능으로 준비 중입니다. 손익 임계값 알림과 계정 연동이 추가될 예정입니다.',
    free: false,
    pro: true
  }
];

const SubscriptionStatusPage: React.FC = () => {
  const { user, checking } = useAuthStore();
  const tier = user?.subscriptionTier ?? 'FREE';
  const isProUser = tier === 'PRO';

  const statusMessage = useMemo(() => {
    if (checking) {
      return '구독 상태를 불러오는 중입니다...';
    }
    if (!user) {
      return '로그인 후 구독 정보를 확인할 수 있습니다.';
    }
    return isProUser
      ? 'Pro 구독이 활성화되어 있습니다.'
      : '현재 무료 플랜을 사용 중입니다.';
  }, [checking, user, isProUser]);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <HeaderNavigation />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Subscription</p>
          <h1 className="text-3xl font-semibold">구독 상태</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Trakko Pro의 혜택과 현재 이용 중인 플랜을 확인하세요.</p>
        </header>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">현재 플랜</p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{isProUser ? 'Trakko Pro' : '무료 플랜'}</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{statusMessage}</p>
            </div>
            <div className="flex gap-2">
              {!checking && !user && (
                <Link
                  to="/"
                  className="rounded-full border border-blue-500 px-4 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-300 dark:text-blue-200 dark:hover:bg-blue-300/10"
                >
                  로그인 페이지로 이동
                </Link>
              )}
              {!checking && user && !isProUser && (
                <Link
                  to="/settings"
                  className="rounded-full border border-blue-500 px-4 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-300 dark:text-blue-200 dark:hover:bg-blue-300/10"
                >
                  Pro 업그레이드 안내
                </Link>
              )}
              {!checking && user && isProUser && (
                <span className="inline-flex items-center rounded-full border border-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-600 dark:border-emerald-400 dark:text-emerald-300">
                  활성 구독
                </span>
              )}
            </div>
          </div>

          {isProUser ? (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              결제 관리 및 영수증 기능은 곧 Settings &gt; Billing 영역에서 제공될 예정입니다.
            </p>
          ) : (
            <div className="mt-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
              <p>Pro 구독을 통해 광고 없이 전체 히스토리를 확인하고, 연간 목표 및 CSV 다운로드 기능을 사용할 수 있습니다.</p>
            </div>
          )}
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">플랜별 기능 비교</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">기능</th>
                  <th className="px-4 py-3 text-center font-semibold">무료</th>
                  <th className="px-4 py-3 text-center font-semibold">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {featureMatrix.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 align-top text-left text-slate-700 dark:text-slate-200">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{item.description}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {item.free ? <span className="text-emerald-500">✓</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {item.pro ? <span className="text-emerald-500">✓</span> : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <ThemeToggleButton />
    </div>
  );
};

export default SubscriptionStatusPage;
