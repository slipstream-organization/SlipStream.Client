// src/widgets/incidents-board/RaceIncidentsDashboard.tsx
import React, { useEffect, useState } from 'react';
import { TeamRadioTranscript } from './TeamRadioTranscript';

export const RaceIncidentsDashboard: React.FC = () => {
  // Імітація Live ML Data (SignalR mock)
  const [stressLevel, setStressLevel] = useState(85);
  const [trackLimitsProb, setTrackLimitsProb] = useState(98);

  useEffect(() => {
    const interval = setInterval(() => {
      setStressLevel(prev => Math.max(60, Math.min(99, prev + (Math.random() > 0.5 ? 3 : -3))));
      setTrackLimitsProb(prev => Math.max(70, Math.min(99, prev + (Math.random() > 0.5 ? 1 : -2))));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-black p-4 md:p-6 rounded-sm font-sport shadow-md transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-gray-200 dark:border-f1-carbon pb-3 gap-4">
        <h2 className="text-2xl text-f1-dark dark:text-white font-bold italic uppercase">
          Incident Analysis
        </h2>
        
        <div className="flex gap-3">
          <div className="bg-f1-red text-white px-4 py-1 skew-x-[-12deg] shadow-sm">
            <span className="block skew-x-[12deg] font-bold italic text-sm">
              Track Limits: {trackLimitsProb}%
            </span>
          </div>
          <div className={`text-white px-4 py-1 skew-x-[-12deg] shadow-sm transition-colors duration-500 ${stressLevel > 90 ? 'bg-team-ferrari' : 'bg-team-aston'}`}>
            <span className="block skew-x-[12deg] font-bold italic text-sm">
              Stress ML: {Math.round(stressLevel)}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 relative aspect-video bg-f1-dark border-2 border-gray-300 dark:border-f1-carbon">
          <video 
            className="w-full h-full object-cover"
            controls 
            autoPlay
            muted
            loop
            poster="https://media.formula1.com/image/upload/f_auto/q_auto/v1677244984/fom-website/2023/Bahrain/Bahrain%20Test%20Day%202/GettyImages-1469075736.jpg"
          >
            <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
          </video>
          
          <div className="absolute top-4 left-4 bg-black/90 px-3 py-1 border-l-4 border-f1-red text-white uppercase italic font-bold text-xs backdrop-blur-sm">
            LIVE / LAP 42 / TURN 4
          </div>
        </div>

        <div className="xl:col-span-1">
          <TeamRadioTranscript />
        </div>
      </div>
    </div>
  );
};