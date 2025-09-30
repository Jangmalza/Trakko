import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TradeEntry } from '../data/portfolioTypes';
import { APP_CURRENCY } from '../config/appConfig';
import { formatCurrency } from '../utils/formatCurrency';

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

  return (
    <div className="rounded border border-slate-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">{CHART_TITLE} ({APP_CURRENCY})</h2>
        <p className="mt-1 text-xs text-slate-500">{CHART_SUBTITLE}</p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="seedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1f2937" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#1f2937" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <YAxis stroke="#94a3b8" tickFormatter={(value) => formatCurrency(value as number)} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '12px' }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Area type="monotone" dataKey="value" stroke="#1f2937" fill="url(#seedGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SeedOverviewChart;
