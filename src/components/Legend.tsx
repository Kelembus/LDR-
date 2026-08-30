import React from 'react';

export const Legend: React.FC = () => {
  return (
    <section className="p-4.5 rounded-2xl bg-white/[0.045] border border-white/[0.085] backdrop-blur-xl shadow-2xl space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
          Simulation Legend
        </h2>
      </div>

      {/* Dedicated Transit Bus Lane */}
      <div>
        <div className="text-[9.5px] font-bold uppercase tracking-widest text-[#64748b] mb-2">
          Dedicated Bus Lane
        </div>
        <div className="space-y-1.5 text-xs text-[#94a3b8]">
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-3 rounded-sm bg-[#8a2218] border border-amber-400/60 flex-none" />
            <span>Terracotta Surface &middot; Curb-side transit lane</span>
            <span className="ml-auto font-mono text-[10px] text-[#64748b]">Outer lane</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-3 rounded-sm bg-black/40 border border-dashed border-amber-400 text-[8px] font-bold text-amber-300 grid place-items-center flex-none">
              BUS
            </span>
            <span>Pavement Stencil &middot; Buses only</span>
            <span className="ml-auto font-mono text-[10px] text-[#64748b]">Reserved</span>
          </div>
        </div>
      </div>

      {/* Pedestrian Crossings */}
      <div className="pt-3 border-t border-white/10">
        <div className="text-[9.5px] font-bold uppercase tracking-widest text-[#64748b] mb-2">
          Pedestrian Crossings
        </div>
        <div className="space-y-1.5 text-xs text-[#94a3b8]">
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-3 rounded-sm bg-[#0f172a] border border-white/40 flex items-center justify-center gap-0.5 flex-none">
              <span className="w-0.5 h-2 bg-white/90 rounded-xs" />
              <span className="w-0.5 h-2 bg-white/90 rounded-xs" />
              <span className="w-0.5 h-2 bg-white/90 rounded-xs" />
            </span>
            <span>High-Contrast Zebra Striping &middot; Intersection crosswalks</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 font-mono text-[9px] font-bold grid place-items-center flex-none">
              4s
            </span>
            <span>Fixed Crossing Timer &middot; 4.0s active cycle</span>
            <span className="ml-auto font-mono text-[10px] text-emerald-400">Fixed 4s</span>
          </div>
        </div>
      </div>

      {/* Detector Loops */}
      <div className="pt-3 border-t border-white/10">
        <div className="text-[9.5px] font-bold uppercase tracking-widest text-[#64748b] mb-2">
          Detector Loops
        </div>
        <div className="space-y-1.5 text-xs text-[#94a3b8]">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-2.5 rounded-xs border border-dashed border-emerald-400 bg-emerald-500/20 flex-none" />
            <span>Approach &middot; Occupancy sampling</span>
            <span className="ml-auto font-mono text-[10px] text-[#64748b]">80–135px</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-2.5 rounded-xs border border-dashed border-amber-400 bg-amber-500/20 flex-none" />
            <span>Queue &middot; Priority call trigger</span>
            <span className="ml-auto font-mono text-[10px] text-[#64748b]">250–310px</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-2.5 rounded-xs border border-dashed border-blue-400 bg-blue-500/20 flex-none" />
            <span>Box &middot; Anti-gridlock & clearance</span>
            <span className="ml-auto font-mono text-[10px] text-[#64748b]">&plusmn;35px</span>
          </div>
        </div>
      </div>

      {/* Signal States */}
      <div className="pt-3 border-t border-white/10">
        <div className="text-[9.5px] font-bold uppercase tracking-widest text-[#64748b] mb-2">
          Signal States
        </div>
        <div className="space-y-1.5 text-xs text-[#94a3b8]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] flex-none" />
            <span>Green &middot; Protected right-of-way</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)] flex-none" />
            <span>Amber &middot; Clearance interval</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7f3d3d] flex-none" />
            <span>Red &middot; Stop before stop line</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-none" />
            <span>Fault &middot; Incident axis lockout</span>
          </div>
        </div>
      </div>

      {/* Vehicle Fleet */}
      <div className="pt-3 border-t border-white/10">
        <div className="text-[9.5px] font-bold uppercase tracking-widest text-[#64748b] mb-2">
          Vehicle Classes
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-[#94a3b8]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-4.5 rounded-xs bg-slate-300 flex-none" />
            <span>Car (General)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded-xs bg-pink-400 flex-none" />
            <span>Motorcycle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-7 rounded-xs bg-stone-400 flex-none" />
            <span>Truck (Heavy)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-6.5 rounded-xs bg-amber-400 flex-none border border-emerald-400" />
            <span>Transit Bus</span>
          </div>
        </div>
      </div>
    </section>
  );
};
