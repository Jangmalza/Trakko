import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TradeEntry } from '../data/portfolioTypes';
import { formatCurrency } from '../utils/formatCurrency';
import { usePreferencesStore } from '../store/preferencesStore';
import { useThemeStore } from '../store/themeStore';

interface SeedOverviewChartProps {
  initialSeed: number;
  trades: TradeEntry[];
}

interface ChartPoint {
  label: string;
  value: number;
}

const CHART_TITLE = '자본 추이';
const CHART_SUBTITLE = '초기 시드와 누적 손익을 기준으로 계산합니다.';

const SeedOverviewChart: React.FC<SeedOverviewChartProps> = ({ initialSeed, trades }) => {
  const currency = usePreferencesStore((state) => state.currency);
  const theme = useThemeStore((state) => state.theme);
  const data = useMemo<ChartPoint[]>(() => {
    let running = initialSeed;
    const sorted = [...trades].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
    const points: ChartPoint[] = [{ label: 'Start', value: initialSeed }];

    sorted.forEach((trade, index) => {
      running += trade.profitLoss;
      const label = trade.tradeDate || 'Entry ' + String(index + 1);
      points.push({ label, value: running });
    });

    return points;
  }, [initialSeed, trades]);

  const axisColor = theme === 'dark' ? '#cbd5f5' : '#94a3b8';
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const tooltipBackground = theme === 'dark' ? '#0f172a' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const strokeColor = theme === 'dark' ? '#38bdf8' : '#1f2937';

  return (
    <div className="rounded border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{CHART_TITLE} ({currency})</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{CHART_SUBTITLE}</p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="seedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" stroke={axisColor} tick={{ fontSize: 11, fill: axisColor }} />
          <YAxis stroke={axisColor} tickFormatter={(value) => formatCurrency(value as number)} tick={{ fontSize: 11, fill: axisColor }} />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBackground, borderRadius: 6, border: `1px solid ${tooltipBorder}`, fontSize: '12px', color: axisColor }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Area type="monotone" dataKey="value" stroke={strokeColor} fill="url(#seedGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SeedOverviewChart;
