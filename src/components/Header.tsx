import React from 'react';

interface HeaderProps {
  isRunning: boolean;
  incidentCount: number;
}

export const Header: React.FC<HeaderProps> = ({ isRunning, incidentCount }) => {
  const isAlarm = incidentCount > 0;

  return (
    <header className="flex items-center gap-4.5 flex-wrap mb-5">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10.5 h-10.5 rounded-xl flex-none grid place-items-center bg-gradient-to-br from-blue-500/25 to-emerald-500/15 border border-white/15 shadow-[0_8px_22px_-10px_rgba(96,165,250,0.7)]">
          <svg
            className="w-5.5 h-5.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9fd0ff"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <rect x="8" y="2.5" width="8" height="19" rx="3" />
            <circle cx="12" cy="7" r="1.6" fill="#f87171" stroke="none" />
            <circle cx="12" cy="12" r="1.6" fill="#fbbf24" stroke="none" />
            <circle cx="12" cy="17" r="1.6" fill="#34d399" stroke="none" />
          </svg>
        </div>
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-[#e9edf5] leading-tight">
            Adaptive Traffic Control
          </h1>
          <p className="text-[11.5px] text-[#5c6a80] tracking-wider uppercase mt-0.5">
            Sensor-Driven Signal Network &middot; Dedicated Bus Lanes &middot; Anti-Gridlock
          </p>
        </div>
      </div>

      <div
        id="status-indicator"
        className={`ml-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-full border backdrop-blur-md transition-all duration-300 text-xs font-semibold tracking-wider uppercase ${
          isAlarm
            ? 'bg-red-500/10 text-red-400 border-red-500/35'
            : isRunning
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-white/5 text-[#96a2b6] border-white/10'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isAlarm
              ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]'
              : isRunning
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
              : 'bg-[#5c6a80]'
          }`}
        />
        <span>
          {isAlarm
            ? `${incidentCount} incident${incidentCount > 1 ? 's' : ''}`
            : isRunning
            ? 'Live Simulation'
            : 'Standby'}
        </span>
      </div>
    </header>
  );
};
