import { DirectionConfig, DirectionKey, VehicleSpec, VehicleType } from '../types/traffic';

export const WORLD = {
  size: 800,
  gridSize: 2,
  roadWidth: 112,
  carLaneOffset: 16,
  busLaneOffset: 40,
  cell: 400,
  halfRoad: 56,
  laneDivider: 28, // (16 + 40) / 2
} as const;

export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ;
export const MAX_TICKS_PER_FRAME = 5;

export const SIGNAL = {
  minGreen: 300,        // ticks (5s)
  maxGreen: 720,        // ticks (12s)
  defaultGreen: 360,    // ticks (6s)
  yellow: 60,           // ticks (1s)
  greenStep: 60,        // adaptive retiming increment
  dwellThreshold: 120,  // 2s of continuous presence = "blocked"
  crashCycles: 4,       // blocked box surviving N green services = crash
  maxHoldOnCall: 300,   // truncate a green to at most 5s once a call is queued
  glideNudge: 10,
} as const;

export const STOP_BAR_OFFSET = WORLD.halfRoad + 19; // 75px from intersection center
export const CROSSWALK_INNER = WORLD.halfRoad + 2;  // 58px
export const CROSSWALK_OUTER = WORLD.halfRoad + 18; // 74px

export const DRIVER = {
  reactionDist: 150,     // distance to start reacting to upcoming intersection
  laneTolerance: 10,     // lateral tolerance to verify same-lane occupancy (< 12)
  crossGap: 28,
  exitProbe: 75,
  exitGap: 45,
  turnRadius: 26,
  turnChance: 0.45,
  timeGap: 40,           // desired following time headway in ticks (~0.66s)
  followRadius: 180,     // spatial query radius for leading vehicles
  stopBarBuffer: 10,     // extra safety margin before the drawn stop bar
  minStopHeadway: 6,     // base standstill gap between vehicles in queue
} as const;

export const DETECTOR = {
  approachFar: 135,
  approachNear: 80,
  queueFar: 310,
  queueNear: 250,
  boxDepth: 35,
  laneTolerance: 10,
} as const;

export const VEHICLE_SPECS: Record<VehicleType, VehicleSpec> = {
  car: {
    label: 'Car',
    length: 30,
    width: 17,
    maxSpeed: 3.2,
    accel: 0.09,
    decel: 0.34,
    usesBusLane: false,
    weight: 0.52,
    colors: ['#e2e8f0', '#94a3b8', '#f8fafc', '#60a5fa', '#38bdf8', '#a78bfa', '#fb923c'],
  },
  motorcycle: {
    label: 'Motorcycle',
    length: 18,
    width: 8,
    maxSpeed: 4.0,
    accel: 0.16,
    decel: 0.46,
    usesBusLane: false,
    weight: 0.16,
    colors: ['#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#e2e8f0'],
  },
  truck: {
    label: 'Truck',
    length: 50,
    width: 20,
    maxSpeed: 2.2,
    accel: 0.05,
    decel: 0.20,
    usesBusLane: false,
    weight: 0.14,
    colors: ['#94a3b8', '#cbd5e1', '#a8a29e', '#78716c'],
  },
  bus: {
    label: 'Bus',
    length: 46,
    width: 20,
    maxSpeed: 2.5,
    accel: 0.055,
    decel: 0.24,
    usesBusLane: true,
    weight: 0.18,
    colors: ['#fbbf24', '#f59e0b', '#38bdf8', '#34d399'],
  },
};

export const VEHICLE_TYPE_KEYS: VehicleType[] = ['car', 'motorcycle', 'truck', 'bus'];

export const SPAWN_TABLE = (() => {
  let sum = 0;
  const table = VEHICLE_TYPE_KEYS.map((key) => {
    sum += VEHICLE_SPECS[key].weight;
    return { key, at: sum };
  });
  return { table, total: sum };
})();

export function pickVehicleType(): VehicleType {
  const roll = Math.random() * SPAWN_TABLE.total;
  for (const entry of SPAWN_TABLE.table) {
    if (roll <= entry.at) return entry.key;
  }
  return 'car';
}

export const DIRECTIONS: Record<DirectionKey, DirectionConfig> = {
  S: { key: 'S', axis: 'y', cross: 'x', sign: 1, lane: -1, angle: Math.PI, index: 0, glyph: '↓' },
  N: { key: 'N', axis: 'y', cross: 'x', sign: -1, lane: 1, angle: 0, index: 1, glyph: '↑' },
  E: { key: 'E', axis: 'x', cross: 'y', sign: 1, lane: 1, angle: Math.PI / 2, index: 2, glyph: '→' },
  W: { key: 'W', axis: 'x', cross: 'y', sign: -1, lane: -1, angle: -Math.PI / 2, index: 3, glyph: '←' },
};

export const DIR_KEYS: DirectionKey[] = ['S', 'N', 'E', 'W'];

export const PHASE_OF = [0, 2, 4, 6] as const;

export const CROSS_CHOICES: Record<DirectionKey, DirectionKey[]> = {
  N: ['E', 'W'],
  S: ['E', 'W'],
  E: ['N', 'S'],
  W: ['N', 'S'],
};

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export function mulberry32(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PALETTE = {
  ground: '#080b10',
  block: '#10141b',
  blockEdge: 'rgba(255,255,255,.04)',
  building: 'rgba(255,255,255,.03)',
  park: 'rgba(52,211,153,.06)',
  asphalt: '#181c24',
  asphaltHi: '#1f242d',
  busLaneSurface: 'rgba(185, 45, 30, 0.42)', // Vibrant transit red/terracotta
  busLaneSurfaceBorder: 'rgba(245, 158, 11, 0.65)',
  busLaneText: 'rgba(254, 243, 199, 0.75)',
  pad: '#1a1f28',
  edgeLine: 'rgba(232,240,255,.32)',
  centre: 'rgba(251,191,36,.55)',
  zebra: 'rgba(232,240,255,.24)',
  stopBar: 'rgba(232,240,255,.55)',
  arrow: 'rgba(232,240,255,.20)',
  label: 'rgba(255,255,255,.12)',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  blue: '#60a5fa',
  violet: '#a78bfa',
  cyan: '#22d3ee',
  dark: '#0c0f14',
} as const;
