import React from 'react';
import { IncidentRecord } from '../types/traffic';

interface IncidentLogProps {
  incidents: IncidentRecord[];
}

export const IncidentLog: React.FC<IncidentLogProps> = ({ incidents }) => {
  return (
    <section className="p-4.5 rounded-2xl bg-white/[0.045] border border-white/[0.085] backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
          Incident Log
        </h2>
        <span
          className={`ml-auto font-mono text-[10px] px-2 py-0.5 rounded-full border ${
            incidents.length > 0
              ? 'bg-red-500/20 text-red-400 border-red-500/40'
              : 'bg-white/5 text-[#64748b] border-white/10'
          }`}
        >
          {incidents.length} events
        </span>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {incidents.length === 0 ? (
          <div className="flex items-center gap-2.5 py-3.5 px-2 text-xs text-[#64748b]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            <span>No incidents &middot; Network flowing normally</span>
          </div>
        ) : (
          incidents.map((record) => (
            <div
              key={record.id}
              className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 border-l-3 border-l-red-500 text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-extrabold tracking-widest uppercase px-1.5 py-0.5 rounded bg-red-500/25 text-red-200">
                  Collision
                </span>
                <span className="font-mono text-[10px] text-[#94a3b8]">
                  {record.time.toLocaleTimeString()}
                </span>
              </div>
              <div className="text-red-100/90 leading-relaxed font-sans">{record.text}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
