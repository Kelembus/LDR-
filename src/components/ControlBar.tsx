import React from 'react';

interface ControlBarProps {
  isRunning: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  spawnRate: number;
  onSpawnRateChange: (val: number) => void;
  showSensors: boolean;
  onToggleSensors: (val: boolean) => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isRunning,
  onToggleRun,
  onReset,
  spawnRate,
  onSpawnRateChange,
  showSensors,
  onToggleSensors,
}) => {
  const minRate = 0.005;
  const maxRate = 0.15;
  const fillPct = Math.min(100, Math.max(0, ((spawnRate - minRate) / (maxRate - minRate)) * 100));

  return (
    <section className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-white/[0.045] border border-white/[0.085] backdrop-blur-xl shadow-2xl flex items-center gap-3.5 flex-wrap">
      {/* Play/Pause Button */}
      <button
        id="toggle-btn"
        onClick={onToggleRun}
        aria-label={isRunning ? 'Pause Simulation' : 'Start Simulation'}
        className={`inline-flex items-center gap-2.5 px-4.5 py-2.5 rounded-xl border font-semibold text-[12.5px] tracking-wider uppercase cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 ${
          isRunning
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 hover:bg-amber-500/25 shadow-[0_10px_26px_-14px_rgba(251,191,36,0.8)]'
            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 shadow-[0_10px_26px_-14px_rgba(52,211,153,0.8)]'
        }`}
      >
        {isRunning ? (
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        <span>{isRunning ? 'Pause' : 'Start'}</span>
      </button>

      {/* Reset Button */}
      <button
        id="reset-btn"
        onClick={onReset}
        aria-label="Reset Simulation"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 bg-white/[0.07] text-red-300 font-semibold text-[12.5px] tracking-wider uppercase cursor-pointer transition-all duration-200 hover:bg-red-500/15 hover:border-red-500/50 hover:-translate-y-0.5 active:translate-y-0"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
        <span>Reset</span>
      </button>

      {/* Flow Density Slider */}
      <div className="flex flex-col gap-1.5 min-w-[200px] flex-1 sm:flex-initial sm:w-64">
        <div className="flex items-baseline justify-between text-[11px] font-bold tracking-wider uppercase">
          <span className="text-[#64748b]">Flow Density</span>
          <span className="font-mono text-blue-400 text-xs">{spawnRate.toFixed(3)}</span>
        </div>
        <div className="relative flex items-center">
          <input
            id="flow-slider"
            type="range"
            min={minRate}
            max={maxRate}
            step={0.005}
            value={spawnRate}
            onChange={(e) => onSpawnRateChange(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none bg-white/10"
            style={{
              background: `linear-gradient(90deg, #60a5fa ${fillPct}%, rgba(255,255,255,0.1) ${fillPct}%)`,
            }}
          />
        </div>
      </div>

      {/* Sensors Toggle */}
      <label
        id="sensors-toggle-label"
        className="inline-flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold uppercase tracking-wider text-[#94a3b8]"
      >
        <div className="relative">
          <input
            type="checkbox"
            checked={showSensors}
            onChange={(e) => onToggleSensors(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-10.5 h-6 rounded-full border transition-all duration-200 ${
              showSensors
                ? 'bg-blue-500/30 border-blue-500/60'
                : 'bg-white/10 border-white/15'
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full mt-[2px] ml-[2px] transition-transform duration-200 ${
                showSensors
                  ? 'translate-x-[18px] bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]'
                  : 'translate-x-0 bg-[#64748b]'
              }`}
            />
          </div>
        </div>
        <span>Sensors</span>
      </label>

      {/* Keyboard Shortcuts Hint */}
      <div className="ml-auto hidden md:flex items-center gap-2 text-xs text-[#5c6a80]">
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[10px] text-gray-300">
            Space
          </kbd>{' '}
          run
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[10px] text-gray-300">
            R
          </kbd>{' '}
          reset
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[10px] text-gray-300">
            S
          </kbd>{' '}
          sensors
        </span>
      </div>
    </section>
  );
};
