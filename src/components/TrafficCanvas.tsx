import React, { useEffect, useRef, useState } from 'react';
import { MAX_TICKS_PER_FRAME, TICK_MS, WORLD } from '../engine/config';
import { Renderer } from '../engine/Renderer';
import { Simulation } from '../engine/Simulation';
import { IncidentRecord } from '../types/traffic';

interface TrafficCanvasProps {
  sim: Simulation;
  isRunning: boolean;
  showSensors: boolean;
  onCrash: (record: IncidentRecord) => void;
  onTickSummary: () => void;
}

export const TrafficCanvas: React.FC<TrafficCanvasProps> = ({
  sim,
  isRunning,
  showSensors,
  onCrash,
  onTickSummary,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    intersection: any;
  }>({
    visible: false,
    x: 0,
    y: 0,
    intersection: null,
  });

  // Setup collision listener
  useEffect(() => {
    sim.onCrash = onCrash;
  }, [sim, onCrash]);

  // Sync sensors toggle
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.showSensors = showSensors;
    }
  }, [showSensors]);

  // Initialize renderer & handle window resize
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new Renderer(canvasRef.current, sim);
    renderer.showSensors = showSensors;
    rendererRef.current = renderer;

    const handleResize = () => {
      renderer.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [sim]);

  // Main animation frame loop with fixed-timestep accumulator
  useEffect(() => {
    let animationFrameId: number;
    let lastFrame = performance.now();
    let accumulator = 0;
    let lastTelemetryPush = performance.now();

    const frame = (now: number) => {
      let elapsed = now - lastFrame;
      lastFrame = now;
      if (elapsed > 250) elapsed = 250; // clamp background tab lag

      if (isRunning) {
        accumulator += elapsed;
        let ticks = 0;
        while (accumulator >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
          sim.tick();
          accumulator -= TICK_MS;
          ticks++;
        }
        if (ticks === MAX_TICKS_PER_FRAME) {
          accumulator = 0; // drop accumulated backlog
        }
      }

      if (rendererRef.current) {
        rendererRef.current.draw(isRunning ? 0.45 : 1);
      }

      if (now - lastTelemetryPush > 100) {
        lastTelemetryPush = now;
        onTickSummary();
      }

      animationFrameId = requestAnimationFrame(frame);
    };

    animationFrameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning, sim, onTickSummary]);

  // Tooltip interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = WORLD.size / rect.width;
    const wx = (e.clientX - rect.left) * scale;
    const wy = (e.clientY - rect.top) * scale;

    let hovered: any = null;
    for (const inter of sim.intersections) {
      if (Math.abs(inter.x - wx) < 96 && Math.abs(inter.y - wy) < 96) {
        hovered = inter;
        break;
      }
    }

    if (rendererRef.current) {
      rendererRef.current.hoveredId = hovered ? hovered.id : -1;
    }

    if (hovered) {
      setTooltipData({
        visible: true,
        x: hovered.x / scale,
        y: (hovered.y - 96) / scale,
        intersection: hovered,
      });
    } else {
      setTooltipData((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    }
  };

  const handleMouseLeave = () => {
    if (rendererRef.current) {
      rendererRef.current.hoveredId = -1;
    }
    setTooltipData((prev) => ({ ...prev, visible: false }));
  };

  const DIR_LABELS = ['S-bound', 'N-bound', 'E-bound', 'W-bound'];
  const DIR_GLYPHS = ['↓', '↑', '→', '←'];
  const ASPECT_COLORS: Record<string, string> = {
    green: '#34d399',
    amber: '#fbbf24',
    red: '#f87171',
    fault: '#ef4444',
  };

  return (
    <div className="relative rounded-2xl overflow-hidden isolation-auto border border-white/10 bg-[#0d1015] shadow-2xl">
      <canvas
        id="traffic-stage"
        ref={canvasRef}
        width={800}
        height={800}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="block w-full aspect-square cursor-crosshair"
      />

      {/* Hover Tooltip */}
      {tooltipData.visible && tooltipData.intersection && (
        <div
          id="junction-tooltip"
          className="absolute z-10 pointer-events-none min-w-[200px] p-3 rounded-xl bg-[#0c0f15]/90 border border-white/20 backdrop-blur-md shadow-2xl transition-all duration-150 -translate-x-1/2 -translate-y-full"
          style={{
            left: `${tooltipData.x}px`,
            top: `${tooltipData.y}px`,
          }}
        >
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/10">
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              #{tooltipData.intersection.id}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
              Junction Details
            </span>
          </div>

          <div className="space-y-1">
            {[0, 1, 2, 3].map((i) => {
              const aspect = tooltipData.intersection.aspectFor(i);
              const cd = tooltipData.intersection.countdownFor(i);
              const queue = tooltipData.intersection.queueBlocked[i] ? ' ● (Queue)' : '';
              const timeStr =
                aspect === 'fault'
                  ? 'FAULT'
                  : cd >= 0
                  ? `${Math.max(1, Math.ceil(cd / 60))}s`
                  : '--';

              return (
                <div key={i} className="flex items-center text-xs justify-between">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <span
                      className="w-2 h-2 rounded-xs"
                      style={{ backgroundColor: ASPECT_COLORS[aspect] || '#94a3b8' }}
                    />
                    <span>
                      {DIR_GLYPHS[i]} {DIR_LABELS[i]}
                    </span>
                  </div>
                  <span className="font-mono text-gray-200">
                    {timeStr}
                    <span className="text-amber-400 font-bold">{queue}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <span>Cycle Length</span>
            <span className="font-mono text-gray-200">
              {(tooltipData.intersection.cycleLength / 60).toFixed(1)}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
