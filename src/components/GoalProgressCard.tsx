import React from 'react';
import { Link } from 'react-router-dom';
import type { GoalProgressSummary, PerformanceGoalSummary } from '../data/portfolioTypes';
import { formatCurrency } from '../utils/formatCurrency';

interface GoalProgressCardProps {
  summary: PerformanceGoalSummary | null;
  loading?: boolean;
}

type GoalCopy = {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  achievedLabel: string;
  ctaLabel: string;
  analyticsHint: string;
};

const COPY_MAP: Record<GoalProgressSummary['period'], GoalCopy> = {
  MONTHLY: {
    title: '월간 목표',
    emptyTitle: '이번 달 목표가 설정되지 않았습니다.',
    emptyDescription: '잔액 흐름을 확인하고 목표 금액을 지정해 보세요.',
    achievedLabel: '이번 달 손익',
    ctaLabel: '월간 목표 설정',
    analyticsHint: '최근 손익 기반으로 목표를 조정하세요.'
  },
  ANNUAL: {
    title: '연간 목표',
    emptyTitle: '연간 목표가 설정되지 않았습니다.',
    emptyDescription: '장기 전략을 위해 연간 목표를 입력해 두세요.',
    achievedLabel: '올해 누적 손익',
    ctaLabel: '연간 목표 설정',
    analyticsHint: '분기별 성과를 검토해 장기 전략을 유지하세요.'
  }
};

const clampProgress = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

const renderGoalSection = (section: GoalProgressSummary, loading: boolean) => {
  const copy = COPY_MAP[section.period];
  const progressPercent = clampProgress(section.progressPercent);
  const hasGoal = Boolean(section.goal);

  if (!hasGoal) {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{section.timeFrame.label}</p>
        <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.title}</h3>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{copy.emptyTitle}</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{copy.emptyDescription}</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{copy.achievedLabel}</p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(section.achievedAmount)}
            </p>
          </div>
          <Link
            to="/settings"
            className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {copy.ctaLabel}
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">{copy.analyticsHint}</p>
      </article>
    );
  }

  const safeRemaining = section.remainingAmount !== null ? formatCurrency(section.remainingAmount) : '—';

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{section.timeFrame.label}</p>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.title}</h3>
        </div>
        <Link
          to="/settings"
          className="text-xs font-semibold text-slate-400 underline-offset-2 hover:underline dark:text-slate-300"
        >
          목표 관리
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>달성률</span>
          <span>{loading ? '업데이트 중...' : `${progressPercent.toFixed(1)}%`}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <p className="text-[11px]">목표 금액</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {section.goal ? formatCurrency(section.goal.targetAmount) : '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px]">{copy.achievedLabel}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(section.achievedAmount)}
            </p>
          </div>
          <div>
            <p className="text-[11px]">남은 금액</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{safeRemaining}</p>
          </div>
        </div>
      </div>
    </article>
  );
};

const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ summary, loading = false }) => {
  if (!summary) {
    return null;
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Performance Goals</p>
          <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">월간·연간 목표 요약</h2>
        </div>
        <Link
          to="/settings"
          className="text-xs font-semibold text-slate-500 underline-offset-2 hover:underline dark:text-slate-300"
        >
          목표 관리
        </Link>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {renderGoalSection(summary.monthly, loading)}
        {renderGoalSection(summary.annual, loading)}
      </div>
    </section>
  );
};

export default GoalProgressCard;
