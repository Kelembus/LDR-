/**
 * Traffic simulation domain types and interfaces.
 */

export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bus';

export type DirectionKey = 'S' | 'N' | 'E' | 'W';

export type SignalState = 'red' | 'amber' | 'green' | 'fault';

export interface DirectionConfig {
  key: DirectionKey;
  axis: 'x' | 'y';
  cross: 'x' | 'y';
  sign: 1 | -1;
  lane: 1 | -1;
  angle: number;
  index: number;
  glyph: string;
}

export interface VehicleSpec {
  label: string;
  length: number;
  width: number;
  maxSpeed: number;
  accel: number;
  decel: number;
  usesBusLane: boolean;
  weight: number;
  colors: string[];
}

export interface TelemetryStats {
  waitSeconds: number;
  spawned: number;
  preempts: number;
}

export interface IncidentRecord {
  id: string;
  time: Date;
  intersectionId: number;
  index: number;
  text: string;
}

export type PedestrianState = 'waiting' | 'crossing' | 'exited';

export interface CrosswalkViewData {
  id: string;
  intersectionId: number;
  direction: DirectionKey;
  isActive: boolean;
  remainingSeconds: number;
  totalDurationSeconds: number;
  pedestrianCount: number;
}

export interface IntersectionViewData {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  aspects: SignalState[];
  countdowns: number[];
  crosswalks?: CrosswalkViewData[];
  queueBlocked: boolean[];
  boxBlocked: boolean[];
  crashed: boolean[];
  isCrashed: boolean;
  cycleLengthSeconds: number;
}
