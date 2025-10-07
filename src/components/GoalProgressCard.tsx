import React from 'react';
import { Link } from 'react-router-dom';
import type { PerformanceGoalSummary } from '../data/portfolioTypes';
import { formatCurrency } from '../utils/formatCurrency';

interface GoalProgressCardProps {
  summary: PerformanceGoalSummary | null;
  loading?: boolean;
}

const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ summary, loading = false }) => {
  if (!summary) {
    return null;
  }

  const {
    goal,
    achievedAmount,
    remainingAmount,
    progressPercent,
    month
  } = summary;

  const safeProgress = progressPercent !== null ? Math.min(100, Math.max(0, progressPercent)) : 0;

  if (!goal) {
    return (
      <section className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Performance Goal</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{month.label} 성과 목표 없음</h2>
          </div>
        </header>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          이번 달에는 설정된 성과 목표가 없습니다. 목표를 지정하면 진행률과 남은 금액을 추적할 수 있어요.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">이번 달 손익</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(achievedAmount)}</p>
          </div>
          <Link
            to="/settings"
            className="inline-flex items-center rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            목표 설정하기
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Performance Goal</p>
          <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{month.label} 목표 진행률</h2>
        </div>
        <Link
          to="/settings"
          className="text-xs font-semibold text-slate-500 underline-offset-2 hover:underline dark:text-slate-300"
        >
          목표 관리
        </Link>
      </header>

      <div className="mt-5 space-y-4">
        <div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>달성률</span>
            <span>{loading ? '업데이트 중...' : `${safeProgress.toFixed(1)}%`}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">목표 금액</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(goal.targetAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">누적 손익</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(achievedAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">남은 금액</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {remainingAmount !== null ? formatCurrency(remainingAmount) : '—'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GoalProgressCard;
