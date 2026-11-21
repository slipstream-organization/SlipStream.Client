// src/widgets/driver-stats/DriverStatsModal.tsx
import React from 'react';
import { Line } from 'react-chartjs-2';
import { useThemeVars } from '../../shared/lib/themeVars';

const CHART_VARS = { ink: '--c-ink', muted: '--c-muted', grid: '--c-line', accent: '--c-accent' } as const;
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import type { DriverStanding } from '../standings-table/StandingsTable';
import { Dialog } from '../../shared/ui/Dialog';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props {
  driver: DriverStanding;
  onClose: () => void;
}

export const DriverStatsModal: React.FC<Props> = ({ driver, onClose }) => {
  const tc = useThemeVars(CHART_VARS);
  // Мокові дані для графіку позицій по Гран-прі
  const chartData = {
    labels: ['BHR', 'SAU', 'AUS', 'JPN', 'CHN', 'MIA', 'EMI', 'MON'],
    datasets: [
      {
        label: 'Championship Position',
        data: [3, 2, 1, 1, 1, 2, 1, 1], // Приклад зміни позиції
        borderColor: tc.accent,
        backgroundColor: tc.accent,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        reverse: true, // 1 місце має бути зверху
        min: 1,
        max: 20,
        ticks: { stepSize: 1, color: tc.muted },
        grid: { color: tc.grid }
      },
      x: {
        ticks: { color: tc.muted },
        grid: { color: tc.grid }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  return (
    <Dialog label={`Статистика: ${driver.full_name}`} onClose={onClose} panelClassName="max-w-3xl overflow-hidden border-line bg-surface text-ink">
      <div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="press absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full text-2xl text-muted hover:text-ink"
        >
          &times;
        </button>
        
        <div className="p-8 border-b border-line bg-surface-2 flex gap-6 items-end">
          {driver.headshot_url && (
            <img src={driver.headshot_url} alt={driver.full_name} className="w-32 h-32 object-contain drop-shadow-[0_8px_16px_var(--c-shadow)]" />
          )}
          <div>
            <div className="text-accent-ink font-bold text-xl mb-1">{driver.driver_number}</div>
            <h2 className="text-4xl font-black italic uppercase text-ink mb-2">{driver.full_name}</h2>
            <div className="text-muted font-bold tracking-widest uppercase">{driver.team_name}</div>
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-bold italic uppercase mb-4 text-ink">Championship Progression</h3>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </Dialog>
  );
};