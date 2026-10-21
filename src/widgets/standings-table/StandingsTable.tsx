import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export interface DriverStanding {
  position: number;
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  nationality: string;
  points: number;
  headshot_url?: string;
}

export const StandingsTable: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');
  const [standings, setStandings] = useState<DriverStanding[]>([]);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const { data } = await axios.get('https://api.openf1.org/v1/drivers?session_key=latest');
        
        // Мапимо дані OpenF1 під структуру таблиці. Очки згенеровані для демо, 
        // оскільки OpenF1 віддає телеметрію, а не турнірне становище.
        const mappedData = data.slice(0, 10).map((d: any, index: number) => ({
          position: index + 1,
          driver_number: d.driver_number,
          full_name: d.full_name,
          name_acronym: d.name_acronym,
          team_name: d.team_name,
          nationality: d.country_code || 'UNK',
          points: 300 - (index * 25), 
          headshot_url: d.headshot_url,
        }));
        setStandings(mappedData);
      } catch (error) {
        console.error('Error fetching drivers', error);
      }
    };
    fetchStandings();
  }, []);

  // Дані для графіку (на основі твого скетчу)
  const chartData = {
    labels: ['BHR', 'SAU', 'AUS', 'JPN', 'CHN', 'MIA', 'EMI', 'MON', 'CAN', 'ESP', 'AUT', 'GBR', 'HUN', 'BEL', 'NED', 'ITA', 'AZE (BAKU)'],
    datasets: [
      {
        label: 'K. Antonelli (ANT)',
        data: [15, 33, 58, 83, 108, 133, 158, 168, 193, 218, 226, 241, 266, 276, 288, 300, 315],
        borderColor: '#27F4D2', // Mercedes
        backgroundColor: '#27F4D2',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
      },
      {
        label: 'G. Russell (RUS)',
        data: [18, 30, 45, 60, 78, 93, 111, 136, 148, 163, 188, 213, 228, 253, 268, 283, 290],
        borderColor: '#27F4D2', // Mercedes (інший відтінок або стиль для розрізнення можна додати)
        backgroundColor: '#27F4D2',
        borderDash: [5, 5],
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
      },
      {
        label: 'L. Norris (NOR)',
        data: [10, 22, 37, 52, 70, 95, 113, 128, 143, 158, 170, 185, 203, 218, 243, 268, 286],
        borderColor: '#FF8000', // McLaren
        backgroundColor: '#FF8000',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        title: { display: true, text: 'PTS', color: '#fff', font: { weight: 'bold' as const } },
        ticks: { color: '#a3a3a3' },
        grid: { color: '#333338' }
      },
      x: {
        ticks: { color: '#a3a3a3', maxRotation: 45, minRotation: 45 },
        grid: { color: '#333338' }
      }
    },
    plugins: {
      legend: { labels: { color: '#fff', font: { family: '"Titillium Web", sans-serif' } } },
      tooltip: { mode: 'index' as const, intersect: false }
    }
  };

  return (
    <div className="bg-[#15151e] text-white font-sport min-h-screen">
      
      {/* Заголовок */}
      <div className="p-6 pb-0">
        <h1 className="text-3xl font-black italic uppercase mb-6 tracking-wide text-white">
          2026 Drivers' Standings
        </h1>
        
        {/* Таби навігації */}
        <div className="flex gap-8 border-b border-gray-800">
          <button 
            onClick={() => setActiveTab('table')}
            className={`pb-3 uppercase font-bold tracking-widest text-sm transition-colors relative ${
              activeTab === 'table' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Table
            {activeTab === 'table' && (
              <span className="absolute bottom-0 left-0 w-full h-1 bg-white"></span>
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('chart')}
            className={`pb-3 uppercase font-bold tracking-widest text-sm transition-colors relative ${
              activeTab === 'chart' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Chart
            {activeTab === 'chart' && (
              <span className="absolute bottom-0 left-0 w-full h-1 bg-white"></span>
            )}
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'table' ? (
          /* Відмальовка таблиці */
          <div className="bg-black rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-widest bg-[#15151e]">
                  <th className="py-4 px-6 w-16">Pos.</th>
                  <th className="py-4 px-6">Driver</th>
                  <th className="py-4 px-6">Nationality</th>
                  <th className="py-4 px-6">Team</th>
                  <th className="py-4 px-6 text-right">Pts.</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((driver) => (
                  <tr 
                    key={driver.driver_number} 
                    className="border-b border-gray-900 hover:bg-[#1a1a24] transition-colors"
                  >
                    <td className="py-4 px-6 font-bold text-lg">{driver.position}</td>
                    <td className="py-4 px-6 flex items-center gap-3">
                      {driver.headshot_url ? (
                        <img src={driver.headshot_url} alt={driver.full_name} className="w-10 h-10 rounded-full object-cover bg-gray-800" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-800" />
                      )}
                      <span className="font-bold text-base uppercase">{driver.full_name}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-400 font-bold uppercase">{driver.nationality}</td>
                    <td className="py-4 px-6 text-gray-300">{driver.team_name}</td>
                    <td className="py-4 px-6 text-right font-bold text-xl">{driver.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Відмальовка графіку */
          <div className="bg-black rounded-lg border border-gray-800 p-6 h-[500px]">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>
    </div>
  );
};