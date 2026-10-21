// src/widgets/incidents-board/TeamRadioTranscript.tsx
import React from 'react';

type Message = {
  id: string;
  sender: 'engineer' | 'driver';
  driverName?: string;
  text: string;
  teamClass: string; 
};

const messages: Message[] = [
  { id: '1', sender: 'engineer', text: 'Box box, track limits turn 4.', teamClass: 'bg-gray-300 dark:bg-f1-carbon text-black dark:text-gray-300' },
  { id: '2', sender: 'driver', driverName: 'Charles Leclerc', text: 'Understood, tires are gone anyway!', teamClass: 'bg-team-ferrari text-white' },
  { id: '3', sender: 'engineer', text: 'Copy that. Watch the pit lane line.', teamClass: 'bg-gray-300 dark:bg-f1-carbon text-black dark:text-gray-300' },
];

export const TeamRadioTranscript: React.FC = () => {
  return (
    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-f1-dark text-f1-dark dark:text-white font-sport h-full min-h-[300px] overflow-y-auto border-t-4 border-f1-red shadow-lg transition-colors">
      <h3 className="uppercase font-bold italic text-gray-500 dark:text-f1-light mb-2 border-b border-gray-200 dark:border-f1-carbon pb-2">
        Team Radio Live
      </h3>
      
      <div className="flex flex-col gap-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'driver' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`
                px-4 py-2 max-w-[85%]
                ${msg.teamClass}
                transform skew-x-[-12deg]
              `}
            >
              <div className="transform skew-x-[12deg] font-bold italic uppercase tracking-wide text-sm">
                <span className="block text-xs opacity-75 mb-1 normal-case not-italic font-normal">
                  {msg.sender === 'driver' ? msg.driverName : 'Pit Wall'}
                </span>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};