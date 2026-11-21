// src/widgets/track-info/TrackDetails.tsx
import React from 'react';

export const TrackDetails: React.FC = () => {
  const trackStats = {
    name: "Baku City Circuit",
    country: "Azerbaijan",
    lastWinner: "Oscar Piastri",
    lastPole: "Charles Leclerc",
    lastFastestLap: "Lando Norris",
    trackRecord: {
      time: "1:43.009",
      driver: "Charles Leclerc",
      car: "Ferrari SF90",
      year: "2019"
    }
  };

  return (
    <div className="bg-surface border border-line rounded-lg p-6 text-ink font-sport">
      <div className="flex justify-between items-center border-b border-line pb-4 mb-6">
        <h2 className="text-2xl font-black italic uppercase tracking-wide">
          {trackStats.name}
        </h2>
        <span className="text-accent-ink font-bold uppercase tracking-widest">{trackStats.country}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex justify-center items-center bg-surface rounded-lg p-4 border border-line">
          {/* Сюди можна додати SVG контур траси */}
          <div className="text-muted italic text-sm text-center">Track Layout Map<br/>(SVG placeholder)</div>
        </div>

        <div className="space-y-4">
          <StatRow label="Last Winner" value={trackStats.lastWinner} />
          <StatRow label="Last Pole Sitter" value={trackStats.lastPole} />
          <StatRow label="Last Fastest Lap" value={trackStats.lastFastestLap} />
          
          <div className="mt-6 p-4 bg-f1-red/10 border border-f1-red/30 rounded">
            <div className="text-xs text-accent-ink uppercase font-bold tracking-widest mb-1">Overall Track Record</div>
            <div className="text-2xl font-black italic">{trackStats.trackRecord.time}</div>
            <div className="text-sm text-ink/80 mt-1">
              {trackStats.trackRecord.driver} • {trackStats.trackRecord.car} ({trackStats.trackRecord.year})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-line">
    <span className="text-muted text-sm uppercase tracking-wider">{label}</span>
    <span className="font-bold text-lg">{value}</span>
  </div>
);