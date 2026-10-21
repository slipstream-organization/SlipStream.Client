// src/widgets/driver-stats/DriverStatsModal.tsx
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import type { DriverStanding } from '../standings-table/StandingsTable';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props {
  driver: DriverStanding;
  onClose: () => void;
}

export const DriverStatsModal: React.FC<Props> = ({ driver, onClose }) => {
  // Мокові дані для графіку позицій по Гран-прі
  const chartData = {
    labels: ['BHR', 'SAU', 'AUS', 'JPN', 'CHN', 'MIA', 'EMI', 'MON'],
    datasets: [
      {
        label: 'Championship Position',
        data: [3, 2, 1, 1, 1, 2, 1, 1], // Приклад зміни позиції
        borderColor: '#e10600',
        backgroundColor: '#e10600',
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
        ticks: { stepSize: 1, color: '#a3a3a3' },
        grid: { color: '#333338' }
      },
      x: {
        ticks: { color: '#a3a3a3' },
        grid: { color: '#333338' }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#15151e] border border-f1-carbon rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl z-10"
        >
          &times;
        </button>
        
        <div className="p-8 border-b border-f1-carbon bg-gradient-to-r from-black to-[#15151e] flex gap-6 items-end">
          {driver.headshot_url && (
            <img src={driver.headshot_url} alt={driver.full_name} className="w-32 h-32 object-contain drop-shadow-lg" />
          )}
          <div>
            <div className="text-f1-red font-bold text-xl mb-1">{driver.driver_number}</div>
            <h2 className="text-4xl font-black italic uppercase text-white mb-2">{driver.full_name}</h2>
            <div className="text-gray-400 font-bold tracking-widest uppercase">{driver.team_name}</div>
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-bold italic uppercase mb-4 text-white">Championship Progression</h3>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};