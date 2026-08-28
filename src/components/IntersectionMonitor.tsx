import React from 'react';
import { IntersectionViewData, SignalState } from '../types/traffic';

interface IntersectionMonitorProps {
  intersections: IntersectionViewData[];
}

const DIR_GLYPHS = ['↓', '↑', '→', '←'];
const DIR_NAMES = ['Southbound', 'Northbound', 'Eastbound', 'Westbound'];

export const IntersectionMonitor: React.FC<IntersectionMonitorProps> = ({ intersections }) => {
  return (
    <section className="p-4.5 rounded-2xl bg-white/[0.045] border border-white/[0.085] backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
          Intersection Monitor
        </h2>
      </div>

      <div className="space-y-2.5">
        {intersections.map((inter) => (
          <div
            key={inter.id}
            id={`intersection-row-${inter.id}`}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-300 ${
              inter.isCrashed
                ? 'bg-red-500/10 border-red-500/40'
                : 'bg-white/[0.025] border-white/10'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex-none grid place-items-center font-mono font-bold text-xs border ${
                inter.isCrashed
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-white/10 text-gray-300 border-white/10'
              }`}
            >
              {inter.id}
            </div>

            <div className="flex gap-1.5 ml-auto">
              {[0, 1, 2, 3].map((i) => {
                const aspect = inter.aspects[i] as SignalState;
                const cd = inter.countdowns[i];
                const cdText =
                  aspect === 'fault'
                    ? 'XX'
                    : cd >= 0
                    ? String(Math.max(1, Math.ceil(cd / 60))).padStart(2, '0')
                    : '--';

                return (
                  <div
                    key={i}
                    title={`${DIR_NAMES[i]} approach`}
                    className="flex flex-col items-center gap-1 w-9 py-1 px-0.5 rounded-lg bg-black/40 border border-white/5"
                  >
                    <span className="text-[10px] text-[#64748b] leading-none">
                      {DIR_GLYPHS[i]}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        aspect === 'green'
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]'
                          : aspect === 'amber'
                          ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.85)]'
                          : aspect === 'fault'
                          ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]'
                          : 'bg-[#6b2121]'
                      }`}
                    />
                    <span
                      className={`font-mono text-[9px] leading-none ${
                        aspect === 'green' || aspect === 'amber'
                          ? 'text-gray-200'
                          : 'text-[#64748b]'
                      }`}
                    >
                      {cdText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
