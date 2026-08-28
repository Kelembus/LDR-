import React from 'react';
import { TelemetryStats } from '../types/traffic';

interface TelemetryPanelProps {
  vehicleCount: number;
  avgCycle: number;
  congestion: number;
  avgWait: number;
  stats: TelemetryStats;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  vehicleCount,
  avgCycle,
  congestion,
  avgWait,
  stats,
}) => {
  const congestionColor =
    congestion > 70
      ? 'text-red-400 border-red-500/40'
      : congestion > 40
      ? 'text-amber-400 border-amber-500/40'
      : 'text-emerald-400 border-emerald-500/40';

  const congestionBarColor =
    congestion > 70 ? 'bg-red-400' : congestion > 40 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <section className="p-4.5 rounded-2xl bg-white/[0.045] border border-white/[0.085] backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-white/10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
          Network Telemetry
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Active Vehicles */}
        <div className="relative overflow-hidden p-3.5 rounded-xl bg-white/[0.03] border border-white/10 border-l-3 border-l-blue-400">
          <span className="block text-[9.5px] font-bold tracking-widest uppercase text-[#64748b] mb-1.5">
            Active Vehicles
          </span>
          <div className="font-mono text-2xl font-semibold text-blue-400 tracking-tight leading-none">
            {vehicleCount}
          </div>
          <div className="h-1 rounded-full bg-white/10 mt-2.5 overflow-hidden">
            <div
              className="h-full bg-blue-400 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (vehicleCount / 80) * 100)}%` }}
            />
          </div>
        </div>

        {/* Avg Cycle */}
        <div className="relative overflow-hidden p-3.5 rounded-xl bg-white/[0.03] border border-white/10 border-l-3 border-l-purple-400">
          <span className="block text-[9.5px] font-bold tracking-widest uppercase text-[#64748b] mb-1.5">
            Avg Cycle
          </span>
          <div className="font-mono text-2xl font-semibold text-purple-400 tracking-tight leading-none flex items-baseline gap-1">
            {avgCycle.toFixed(0)}
            <span className="text-xs text-[#64748b] font-normal">s</span>
          </div>
          <div className="h-1 rounded-full bg-white/10 mt-2.5 overflow-hidden">
            <div
              className="h-full bg-purple-400 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, Math.max(5, ((avgCycle - 15) / 35) * 100))}%` }}
            />
          </div>
        </div>

        {/* Congestion */}
        <div
          className={`relative overflow-hidden p-3.5 rounded-xl bg-white/[0.03] border border-white/10 border-l-3 ${congestionColor}`}
        >
          <span className="block text-[9.5px] font-bold tracking-widest uppercase text-[#64748b] mb-1.5">
            Congestion
          </span>
          <div className="font-mono text-2xl font-semibold tracking-tight leading-none flex items-baseline gap-1">
            {Math.round(congestion)}
            <span className="text-xs text-[#64748b] font-normal">%</span>
          </div>
          <div className="h-1 rounded-full bg-white/10 mt-2.5 overflow-hidden">
            <div
              className={`h-full ${congestionBarColor} transition-all duration-300 rounded-full`}
              style={{ width: `${congestion}%` }}
            />
          </div>
        </div>

        {/* Avg Wait */}
        <div className="relative overflow-hidden p-3.5 rounded-xl bg-white/[0.03] border border-white/10 border-l-3 border-l-amber-400">
          <span className="block text-[9.5px] font-bold tracking-widest uppercase text-[#64748b] mb-1.5">
            Avg Wait
          </span>
          <div className="font-mono text-2xl font-semibold text-amber-400 tracking-tight leading-none flex items-baseline gap-1">
            {avgWait.toFixed(1)}
            <span className="text-xs text-[#64748b] font-normal">s</span>
          </div>
          <div className="h-1 rounded-full bg-white/10 mt-2.5 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (avgWait / 12) * 100)}%` }}
            />
          </div>
        </div>

        {/* Total Spawned */}
        <div className="relative overflow-hidden p-3 rounded-xl bg-white/[0.03] border border-white/10 border-l-3 border-l-cyan-400">
          <span className="block text-[9.5px] font-bold tracking-widest uppercase text-[#64748b] mb-1">
            Vehicles Spawned
          </span>
          <div className="font-mono text-xl font-semibold text-cyan-300 leading-none">
            {stats.spawned}
          </div>
        </div>

        {/* Signal Preempts */}
        <div className="relative overflow-hidden p-3 rounded-xl bg-white/[0.03] border border-white/10 border-l-3 border-l-violet-400">
          <span className="block text-[9.5px] font-bold tracking-widest uppercase text-[#64748b] mb-1">
            Signal Preempts
          </span>
          <div className="font-mono text-xl font-semibold text-violet-300 leading-none">
            {stats.preempts}
          </div>
        </div>
      </div>
    </section>
  );
};
