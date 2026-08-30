import { IntersectionViewData, SignalState } from '../types/traffic';
import { DETECTOR, DIRECTIONS, DIR_KEYS, PEDESTRIAN, SIGNAL, TICK_HZ, WORLD } from './config';
import { Crosswalk } from './Crosswalk';
import { Vehicle } from './Vehicle';

export class Intersection {
  public id: number;
  public row: number;
  public col: number;
  public x: number;
  public y: number;

  public crosswalks: Crosswalk[];

  public localTimer = 0;
  public phase = 0;

  // 6 unified synchronized phases across all 4 intersections:
  // Phase 0: North-South Green (S & N: Green, E & W: Red, Ped: Red)
  // Phase 1: North-South Amber (S & N: Amber, E & W: Red, Ped: Red)
  // Phase 2: Pedestrian Crossing (All Vehicles: Red, Ped: Green 4s countdown 4->3->2->1->0)
  // Phase 3: East-West Green (E & W: Green, S & N: Red, Ped: Red)
  // Phase 4: East-West Amber (E & W: Amber, S & N: Red, Ped: Red)
  // Phase 5: Pedestrian Crossing (All Vehicles: Red, Ped: Green 4s countdown 4->3->2->1->0)
  public durations: number[] = new Array(6);
  public occupancy: number[] = new Array(4);
  public queueTimer: number[] = new Array(4);
  public queueBlocked: boolean[] = new Array(4);
  public boxTimer: number[] = new Array(4);
  public boxBlocked: boolean[] = new Array(4);
  public boxCycles: number[] = new Array(4);
  public crashed: boolean[] = new Array(4);

  public frameApproach: boolean[] = new Array(4);
  public frameQueue: boolean[] = new Array(4);
  public frameBox: boolean[] = new Array(4);

  constructor(row: number, col: number) {
    this.id = row * WORLD.gridSize + col + 1;
    this.row = row;
    this.col = col;
    this.x = (col + 0.5) * WORLD.cell;
    this.y = (row + 0.5) * WORLD.cell;

    // Crosswalks at all four intersection approaches (N, S, W, E)
    this.crosswalks = [
      new Crosswalk(this.id, this.x, this.y, 'N'),
      new Crosswalk(this.id, this.x, this.y, 'S'),
      new Crosswalk(this.id, this.x, this.y, 'W'),
      new Crosswalk(this.id, this.x, this.y, 'E'),
    ];

    this.reset();
  }

  reset(): void {
    this.localTimer = 0;
    // All 4 intersections start at Phase 0 simultaneously
    this.phase = 0;

    // Phase 0: N-S Green (6.0s)
    this.durations[0] = SIGNAL.defaultGreen;
    // Phase 1: N-S Amber (1.5s)
    this.durations[1] = SIGNAL.yellow;
    // Phase 2: Pedestrian Crossing (4.0s fixed countdown 4->3->2->1->0)
    this.durations[2] = PEDESTRIAN.crossingTicks;
    // Phase 3: E-W Green (6.0s)
    this.durations[3] = SIGNAL.defaultGreen;
    // Phase 4: E-W Amber (1.5s)
    this.durations[4] = SIGNAL.yellow;
    // Phase 5: Pedestrian Crossing (4.0s fixed countdown 4->3->2->1->0)
    this.durations[5] = PEDESTRIAN.crossingTicks;

    for (let i = 0; i < 4; i++) {
      this.occupancy[i] = 0;
      this.queueTimer[i] = 0;
      this.queueBlocked[i] = false;
      this.boxTimer[i] = 0;
      this.boxBlocked[i] = false;
      this.boxCycles[i] = 0;
      this.crashed[i] = false;
      this.frameApproach[i] = false;
      this.frameQueue[i] = false;
      this.frameBox[i] = false;
    }
  }

  get isGreenPhase(): boolean {
    return this.phase === 0 || this.phase === 3;
  }

  get isYellowPhase(): boolean {
    return this.phase === 1 || this.phase === 4;
  }

  get isPedestrianPhase(): boolean {
    return this.phase === 2 || this.phase === 5;
  }

  get pedestrianCountdown(): number {
    if (!this.isPedestrianPhase) return 0;
    const remainingTicks = this.durations[this.phase] - this.localTimer;
    return Math.max(0, Math.ceil(remainingTicks / TICK_HZ));
  }

  get cycleLength(): number {
    let t = 0;
    for (let p = 0; p < 6; p++) t += this.durations[p];
    return t;
  }

  axisFaulted(index: number): boolean {
    return index < 2 ? this.crashed[0] || this.crashed[1] : this.crashed[2] || this.crashed[3];
  }

  anyCrash(): boolean {
    return this.crashed[0] || this.crashed[1] || this.crashed[2] || this.crashed[3];
  }

  advance(
    _masterTimer: number,
    onCrash: (intersection: Intersection, index: number) => void
  ): boolean {
    this.localTimer++;
    this.detectCrashes(onCrash);

    let startedPedestrianPhase = false;
    if (this.localTimer >= this.durations[this.phase]) {
      this.localTimer = 0;
      this.phase = (this.phase + 1) % 6;
      if (this.isPedestrianPhase) {
        startedPedestrianPhase = true;
      }
    }

    return startedPedestrianPhase;
  }

  private detectCrashes(onCrash: (intersection: Intersection, index: number) => void): void {
    for (let i = 0; i < 4; i++) {
      if (this.boxTimer[i] <= SIGNAL.dwellThreshold) {
        this.boxCycles[i] = 0;
        continue;
      }
      const greenPhase = i < 2 ? 0 : 3;
      if (this.phase === greenPhase && this.localTimer === 1) {
        this.boxCycles[i]++;
        if (this.boxCycles[i] >= SIGNAL.crashCycles && !this.crashed[i]) {
          this.crashed[i] = true;
          onCrash(this, i);
        }
      }
    }
  }

  beginScan(): void {
    for (let i = 0; i < 4; i++) {
      this.frameApproach[i] = false;
      this.frameQueue[i] = false;
      this.frameBox[i] = false;
    }
  }

  sample(vehicle: Vehicle): void {
    const dx = vehicle.x - this.x;
    const dy = vehicle.y - this.y;
    const reach = DETECTOR.queueFar + 20;
    if (dx < -reach || dx > reach || dy < -reach || dy > reach) return;

    const dir = DIRECTIONS[vehicle.dir];
    const lateral = dir.axis === 'y' ? dx : dy;

    // Check if vehicle is in its assigned approach lane (car lane or bus lane)
    if (Math.abs(lateral - dir.lane * vehicle.laneOffset) >= DETECTOR.laneTolerance) return;

    const index = dir.index;
    const along = (dir.axis === 'y' ? dy : dx) * dir.sign;
    const greenPhase = index < 2 ? 0 : 3;

    if (
      along > -DETECTOR.approachFar &&
      along < -DETECTOR.approachNear &&
      this.phase === greenPhase
    ) {
      this.occupancy[index]++;
    }
    if (along > -DETECTOR.queueFar && along < -DETECTOR.queueNear) {
      this.frameQueue[index] = true;
    }
    if (along >= -DETECTOR.boxDepth && along <= 0) {
      this.frameBox[index] = true;
    }
    if (along > -DETECTOR.approachFar && along < -DETECTOR.approachNear) {
      this.frameApproach[index] = true;
    }
  }

  commitScan(): void {
    for (let i = 0; i < 4; i++) {
      this.queueTimer[i] = this.frameQueue[i] ? this.queueTimer[i] + 1 : 0;
      this.queueBlocked[i] = this.queueTimer[i] > SIGNAL.dwellThreshold;
      this.boxTimer[i] = this.frameBox[i] ? this.boxTimer[i] + 1 : 0;
      this.boxBlocked[i] = this.boxTimer[i] > SIGNAL.dwellThreshold;
    }
  }

  aspectFor(index: number): SignalState {
    if (this.axisFaulted(index)) return 'fault';
    if (index === 0 || index === 1) {
      // Southbound & Northbound (North-South axis)
      if (this.phase === 0) return 'green';
      if (this.phase === 1) return 'amber';
      return 'red';
    } else {
      // Eastbound & Westbound (East-West axis)
      if (this.phase === 3) return 'green';
      if (this.phase === 4) return 'amber';
      return 'red';
    }
  }

  countdownFor(index: number): number {
    if (this.axisFaulted(index)) return -1;
    if (index === 0 || index === 1) {
      // North-South approaches
      if (this.phase === 0) {
        return this.durations[0] - this.localTimer + this.durations[1];
      }
      if (this.phase === 1) {
        return this.durations[1] - this.localTimer;
      }
      return -1;
    } else {
      // East-West approaches
      if (this.phase === 3) {
        return this.durations[3] - this.localTimer + this.durations[4];
      }
      if (this.phase === 4) {
        return this.durations[4] - this.localTimer;
      }
      return -1;
    }
  }

  getViewData(): IntersectionViewData {
    return {
      id: this.id,
      row: this.row,
      col: this.col,
      x: this.x,
      y: this.y,
      aspects: DIR_KEYS.map((_, i) => this.aspectFor(i)),
      countdowns: DIR_KEYS.map((_, i) => this.countdownFor(i)),
      crosswalks: this.crosswalks.map((c) => ({
        id: c.id,
        intersectionId: this.id,
        direction: c.direction,
        isActive: this.isPedestrianPhase,
        remainingSeconds: this.pedestrianCountdown,
        totalDurationSeconds: PEDESTRIAN.crossingDurationSeconds,
        pedestrianCount: 0,
      })),
      queueBlocked: [...this.queueBlocked],
      boxBlocked: [...this.boxBlocked],
      crashed: [...this.crashed],
      isCrashed: this.anyCrash(),
      cycleLengthSeconds: this.cycleLength / 60,
    };
  }
}
