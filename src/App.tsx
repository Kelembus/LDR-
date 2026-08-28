import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ControlBar } from './components/ControlBar';
import { Header } from './components/Header';
import { IncidentLog } from './components/IncidentLog';
import { IntersectionMonitor } from './components/IntersectionMonitor';
import { Legend } from './components/Legend';
import { TelemetryPanel } from './components/TelemetryPanel';
import { TrafficCanvas } from './components/TrafficCanvas';
import { Simulation } from './engine/Simulation';
import { IncidentRecord, IntersectionViewData, TelemetryStats } from './types/traffic';

export default function App() {
  const sim = useMemo(() => new Simulation(), []);

  const [isRunning, setIsRunning] = useState(false);
  const [spawnRate, setSpawnRate] = useState(0.03);
  const [showSensors, setShowSensors] = useState(true);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);

  // Live telemetry state updated periodically from the simulation loop
  const [vehicleCount, setVehicleCount] = useState(0);
  const [avgCycle, setAvgCycle] = useState(20);
  const [congestion, setCongestion] = useState(0);
  const [avgWait, setAvgWait] = useState(0);
  const [stats, setStats] = useState<TelemetryStats>({ waitSeconds: 0, spawned: 0, preempts: 0 });
  const [intersections, setIntersections] = useState<IntersectionViewData[]>([]);

  // Update spawn rate on simulation engine
  const handleSpawnRateChange = useCallback(
    (rate: number) => {
      setSpawnRate(rate);
      sim.spawnRate = rate;
    },
    [sim]
  );

  const handleToggleRun = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    sim.reset();
    setIncidents([]);
    setVehicleCount(0);
    setAvgCycle(sim.averageCycleSeconds);
    setCongestion(0);
    setAvgWait(0);
    setStats({ waitSeconds: 0, spawned: 0, preempts: 0 });
    setIntersections(sim.intersections.map((i) => i.getViewData()));
  }, [sim]);

  const handleCrash = useCallback((record: IncidentRecord) => {
    setIncidents((prev) => [record, ...prev]);
  }, []);

  const handleTickSummary = useCallback(() => {
    setVehicleCount(sim.vehicles.length);
    setAvgCycle(sim.averageCycleSeconds);
    setCongestion(sim.congestion);
    setAvgWait(sim.averageWaitSeconds);
    setStats({ ...sim.stats });
    setIntersections(sim.intersections.map((i) => i.getViewData()));
  }, [sim]);

  // Initial load
  useEffect(() => {
    setIntersections(sim.intersections.map((i) => i.getViewData()));
  }, [sim]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning((prev) => !prev);
      } else if (key === 'r') {
        handleReset();
      } else if (key === 's') {
        setShowSensors((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReset]);

  return (
    <div className="min-h-screen text-[#e9edf5] bg-[#07090d] relative overflow-x-hidden selection:bg-blue-500/30 selection:text-white font-sans">
      {/* Background ambient lighting effects */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[10%] w-[900px] h-[600px] bg-blue-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[5%] right-[-5%] w-[800px] h-[550px] bg-purple-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[40%] w-[700px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
      </div>

      <main className="max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-7">
        <Header isRunning={isRunning} incidentCount={incidents.length} />

        <ControlBar
          isRunning={isRunning}
          onToggleRun={handleToggleRun}
          onReset={handleReset}
          spawnRate={spawnRate}
          onSpawnRateChange={handleSpawnRateChange}
          showSensors={showSensors}
          onToggleSensors={setShowSensors}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px] gap-5 items-start">
          {/* Simulation Viewport Stage */}
          <div className="p-3.5 sm:p-4.5 rounded-2xl bg-white/[0.045] border border-white/[0.085] backdrop-blur-xl shadow-2xl">
            <TrafficCanvas
              sim={sim}
              isRunning={isRunning}
              showSensors={showSensors}
              onCrash={handleCrash}
              onTickSummary={handleTickSummary}
            />
          </div>

          {/* Telemetry and Controls Sidebar */}
          <aside className="space-y-4.5">
            <TelemetryPanel
              vehicleCount={vehicleCount}
              avgCycle={avgCycle}
              congestion={congestion}
              avgWait={avgWait}
              stats={stats}
            />

            <IntersectionMonitor intersections={intersections} />

            <IncidentLog incidents={incidents} />

            <Legend />
          </aside>
        </div>
      </main>
    </div>
  );
}
