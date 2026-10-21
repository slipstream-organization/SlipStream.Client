import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip, type ChartOptions } from 'chart.js';
import type { StandingsHistory } from '../../shared/model/types';
import { useTheme } from '../../app/providers/ThemeProvider';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  dashed?: boolean;
}

interface Props {
  history: StandingsHistory;
  series: ChartSeries[];
  mode: 'points' | 'positions';
  maxPosition: number;
}

export function StandingsChart({ history, series, mode, maxPosition }: Props) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const ink = dark ? '#ffffff' : '#15151e';
  const muted = dark ? '#9b9ba8' : '#6b6b76';
  const grid = dark ? 'rgba(255,255,255,0.06)' : 'rgba(21,21,30,0.08)';
  const surface = dark ? '#15151e' : '#ffffff';

  const data = useMemo(
    () => ({
      labels: history.rounds.map((r) => r.label),
      datasets: series.map((s) => ({
        label: s.label,
        data: history.series[s.id][mode],
        borderColor: s.color,
        backgroundColor: s.color,
        borderDash: s.dashed ? [6, 4] : undefined,
        borderWidth: 2,
        tension: mode === 'points' ? 0.3 : 0.15,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBorderColor: surface,
        pointBorderWidth: 2,
        stepped: false as const,
      })),
    }),
    [history, series, mode, surface],
  );

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: ink, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 16, font: { family: 'Titillium Web', weight: 'bold', size: 12 } },
      },
      tooltip: {
        backgroundColor: dark ? '#1f1f2a' : '#ffffff',
        titleColor: ink,
        bodyColor: ink,
        borderColor: grid,
        borderWidth: 1,
        padding: 10,
        titleFont: { family: 'Titillium Web', weight: 'bold' },
        bodyFont: { family: 'JetBrains Mono' },
        itemSort: (a, b) => (mode === 'points' ? (b.parsed.y ?? 0) - (a.parsed.y ?? 0) : (a.parsed.y ?? 0) - (b.parsed.y ?? 0)),
        callbacks: {
          label: (c) => ` ${c.dataset.label}: ${mode === 'points' ? `${c.parsed.y} pts` : `P${c.parsed.y}`}`,
        },
      },
    },
    scales: {
      x: { grid: { color: grid }, ticks: { color: muted, font: { family: 'JetBrains Mono', size: 11 } }, border: { display: false } },
      y:
        mode === 'points'
          ? { beginAtZero: true, grid: { color: grid }, ticks: { color: muted, font: { family: 'JetBrains Mono', size: 11 } }, border: { display: false } }
          : {
              reverse: true,
              min: 1,
              max: Math.min(maxPosition, Math.max(3, ...series.flatMap((s) => history.series[s.id].positions)) + 1),
              grid: { color: grid },
              ticks: { color: muted, stepSize: 1, callback: (v) => `P${v}`, font: { family: 'JetBrains Mono', size: 11 } },
              border: { display: false },
            },
    },
  };

  return (
    <div className="h-[460px] w-full">
      <Line key={mode} data={data} options={options} />
    </div>
  );
}
