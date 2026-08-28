import { DirectionConfig, DirectionKey, IncidentRecord, TelemetryStats, VehicleType } from '../types/traffic';
import {
  clamp,
  CROSS_CHOICES,
  DIRECTIONS,
  DIR_KEYS,
  DRIVER,
  pickVehicleType,
  STOP_BAR_OFFSET,
  TICK_HZ,
  VEHICLE_SPECS,
  WORLD,
} from './config';
import { Intersection } from './Intersection';
import { SpatialGrid } from './SpatialGrid';
import { Vehicle } from './Vehicle';

export interface Obstacle {
  gap: number;
  leadSpeed: number;
}

export class Simulation {
  public intersections: Intersection[];
  public grid: SpatialGrid;
  public vehicles: Vehicle[];
  public crashes: IncidentRecord[];
  public onCrash: ((record: IncidentRecord) => void) | null = null;
  public spawnRate = 0.03;

  public masterTimer = 0;
  public crashFlash = 0;
  public stats: TelemetryStats = { waitSeconds: 0, spawned: 0, preempts: 0 };

  constructor() {
    this.intersections = [];
    for (let row = 0; row < WORLD.gridSize; row++) {
      for (let col = 0; col < WORLD.gridSize; col++) {
        this.intersections.push(new Intersection(row, col));
      }
    }
    this.grid = new SpatialGrid(100);
    this.vehicles = [];
    this.crashes = [];
    this.reset();
  }

  reset(): void {
    this.vehicles.length = 0;
    this.crashes.length = 0;
    this.masterTimer = 0;
    this.crashFlash = 0;
    this.stats = { waitSeconds: 0, spawned: 0, preempts: 0 };
    for (const intersection of this.intersections) {
      intersection.reset();
    }
    Vehicle.resetSerial();
  }

  reportCrash(intersection: Intersection, index: number): void {
    const SIDE = ['LEFT SIDE', 'RIGHT SIDE', 'LEFT SIDE', 'RIGHT SIDE'];
    const PART = ['TOP', 'BOTTOM', 'BOTTOM', 'TOP'];
    const record: IncidentRecord = {
      id: `${Date.now()}-${Math.random()}`,
      time: new Date(),
      intersectionId: intersection.id,
      index,
      text: `Collision sensed at Junction #${intersection.id} (${SIDE[index]}, ${PART[index]} loop)`,
    };
    this.crashes.push(record);
    this.crashFlash = 1;
    if (this.onCrash) {
      this.onCrash(record);
    }
  }

  tick(): void {
    this.spawn();
    this.masterTimer++;
    if (this.crashFlash > 0) {
      this.crashFlash = Math.max(0, this.crashFlash - 0.02);
    }

    // Advance intersection signal controllers
    for (const intersection of this.intersections) {
      intersection.advance(
        this.masterTimer,
        (inter, idx) => this.reportCrash(inter, idx),
        () => {
          this.stats.preempts++;
        }
      );
    }

    this.scanDetectors();
    this.driveVehicles();

    // In-place cull off-screen vehicles
    let write = 0;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.x > -140 && v.x < WORLD.size + 140 && v.y > -140 && v.y < WORLD.size + 140) {
        this.vehicles[write++] = v;
      }
    }
    this.vehicles.length = write;
  }

  private spawn(): void {
    if (Math.random() > this.spawnRate) return;
    const dirKey = DIR_KEYS[(Math.random() * 4) | 0];
    const roadPos = (((Math.random() * WORLD.gridSize) | 0) + 0.5) * WORLD.cell;
    const type: VehicleType = pickVehicleType();
    const candidate = new Vehicle(dirKey, roadPos, type);

    // Verify spawn clearance with safety buffer so no overlap occurs at entry
    for (let i = 0; i < this.vehicles.length; i++) {
      const other = this.vehicles[i];
      const required = (candidate.halfLength + other.halfLength) * 1.35 + 20;
      if (Math.hypot(candidate.x - other.x, candidate.y - other.y) < required) {
        Vehicle.decrementSerial();
        return;
      }
    }

    this.vehicles.push(candidate);
    this.stats.spawned++;
  }

  private scanDetectors(): void {
    for (const intersection of this.intersections) {
      intersection.beginScan();
    }
    for (const vehicle of this.vehicles) {
      for (const intersection of this.intersections) {
        intersection.sample(vehicle);
      }
    }
    for (const intersection of this.intersections) {
      intersection.commitScan();
    }
  }

  /**
   * Continuous Intelligent Driver Model (IDM) physics with anti-gridlock box clearance.
   */
  private driveVehicles(): void {
    const grid = this.grid;
    grid.clear();
    for (const vehicle of this.vehicles) {
      grid.insert(vehicle);
    }

    for (const vehicle of this.vehicles) {
      // 1. Check safe turning logic at junctions
      this.considerTurn(vehicle, grid);

      // 2. Identify lead vehicle obstacle
      const leadObstacle = this.findLeadObstacle(vehicle, grid);

      // 3. Identify traffic light & anti-gridlock stop line obstacle
      const signalObstacle = this.findSignalObstacle(vehicle, grid);

      // 4. Resolve acceleration using IDM
      let accel = this.freeRoadAccel(vehicle);
      let maxAdvance = Infinity;

      if (leadObstacle) {
        accel = Math.min(accel, this.idmAccel(vehicle, leadObstacle));
        maxAdvance = Math.min(maxAdvance, leadObstacle.gap - 1.5);
      }

      if (signalObstacle) {
        accel = Math.min(accel, this.idmAccel(vehicle, signalObstacle));
        maxAdvance = Math.min(maxAdvance, signalObstacle.gap - 1.5);
      }

      const onWait = () => {
        this.stats.waitSeconds += 1 / TICK_HZ;
      };

      vehicle.integrate(accel, onWait, maxAdvance);
    }
  }

  private freeRoadAccel(vehicle: Vehicle): number {
    const ratio = vehicle.speed / vehicle.maxSpeed;
    return vehicle.accel * (1 - ratio * ratio * ratio * ratio);
  }

  private idmAccel(vehicle: Vehicle, obstacle: Obstacle): number {
    const gap = Math.max(0.1, obstacle.gap);
    const v = vehicle.speed;
    const dv = v - obstacle.leadSpeed;
    const a = vehicle.accel;
    const b = vehicle.decel;

    // Minimum stopping gap based on vehicle footprint
    const s0 = DRIVER.minStopHeadway + vehicle.halfLength * 0.55;
    const dynamicGap =
      (v * (DRIVER.timeGap / 60) + (v * dv) / (2 * Math.sqrt(Math.max(0.001, a * b)))) || 0;
    const desiredGap = s0 + Math.max(0, dynamicGap);

    const speedTerm = Math.pow(v / vehicle.maxSpeed, 4);
    const gapTerm = Math.pow(desiredGap / gap, 2);
    const accel = a * (1 - speedTerm - gapTerm);

    return clamp(accel, -b * 3.5, a);
  }

  /**
   * Finds the nearest lead vehicle ahead in the same lane (car or bus).
   */
  private findLeadObstacle(vehicle: Vehicle, grid: SpatialGrid): Obstacle | null {
    const dir = vehicle.direction;
    const neighbours = grid.query(vehicle.x, vehicle.y, DRIVER.followRadius);

    let bestAhead = Infinity;
    let bestOther: Vehicle | null = null;

    for (let i = 0; i < neighbours.length; i++) {
      const other = neighbours[i];
      if (other.id === vehicle.id || other.dir !== vehicle.dir) continue;

      const dx = other.x - vehicle.x;
      const dy = other.y - vehicle.y;
      const lateral = Math.abs(dir.axis === 'y' ? dx : dy);

      // Must be in the exact same lane offset (strictly separating car lane and bus lane)
      if (lateral >= DRIVER.laneTolerance) continue;

      const ahead = (dir.axis === 'y' ? dy : dx) * dir.sign;
      if (ahead <= 0) continue; // Behind us

      if (ahead < bestAhead) {
        bestAhead = ahead;
        bestOther = other;
      }
    }

    if (!bestOther) return null;

    const gap = bestAhead - vehicle.halfLength - bestOther.halfLength;
    return { gap: Math.max(0.1, gap), leadSpeed: bestOther.speed };
  }

  /**
   * Evaluates traffic signals and strictly prevents vehicles from entering when they cannot exit.
   * Ensures vehicles NEVER stop inside an intersection, while allowing free flow on green.
   */
  private findSignalObstacle(vehicle: Vehicle, grid: SpatialGrid): Obstacle | null {
    const dir = vehicle.direction;
    let bestObstacle: Obstacle | null = null;
    let minGap = Infinity;

    for (const intersection of this.intersections) {
      const distToCenter = Math.hypot(intersection.x - vehicle.x, intersection.y - vehicle.y);
      if (distToCenter > DRIVER.reactionDist) continue;

      // Signed coordinate along direction of travel:
      // along < 0: upstream (approaching)
      // along = 0: intersection center
      // along > 0: downstream (leaving)
      const along = (vehicle[dir.axis] - intersection[dir.axis]) * dir.sign;

      // Front bumper position relative to intersection center
      const frontPos = along + vehicle.halfLength;

      // If the vehicle's front has already reached or crossed the stop bar (-STOP_BAR_OFFSET):
      // DO NOT apply signal stop! The vehicle is committed and MUST clear the junction.
      if (frontPos >= -STOP_BAR_OFFSET) {
        continue;
      }

      // Exact physical distance from front bumper of vehicle to the stop bar
      const distToStopBar = -STOP_BAR_OFFSET - frontPos;
      if (distToStopBar <= 0) {
        continue;
      }

      const aspect = intersection.aspectFor(dir.index);
      let mustStop = false;

      if (aspect === 'fault' || aspect === 'red') {
        // Red light or fault: stop before intersection
        mustStop = true;
      } else if (aspect === 'amber') {
        // Yellow light: check if vehicle can stop smoothly before the stop bar
        const stoppingDistance = (vehicle.speed * vehicle.speed) / (2 * vehicle.decel);
        if (distToStopBar > stoppingDistance + 2) {
          mustStop = true;
        } else {
          // Too close to stop comfortably: proceed unless box is physically blocked
          if (this.isIntersectionBlocked(intersection, vehicle, grid)) {
            mustStop = true;
          }
        }
      } else if (aspect === 'green') {
        // -------------------------------------------------------------
        // GREEN LIGHT: PROCEED SMOOTHLY
        // Only stop if the intersection or exit is genuinely blocked
        // by stationary/stalled traffic (Anti-Gridlock / Do-Not-Block-Box)
        // -------------------------------------------------------------
        if (
          this.isIntersectionBlocked(intersection, vehicle, grid) ||
          !this.hasDownstreamClearance(intersection, vehicle, grid)
        ) {
          mustStop = true;
        }
      }

      if (mustStop) {
        if (distToStopBar < minGap) {
          minGap = distToStopBar;
          bestObstacle = { gap: Math.max(0.1, distToStopBar), leadSpeed: 0 };
        }
      }
    }

    return bestObstacle;
  }

  /**
   * Verifies if any stationary or stalled vehicle is blocking the intersection box.
   * Moving vehicles ahead are handled smoothly by standard IDM car-following.
   */
  private isIntersectionBlocked(
    intersection: Intersection,
    vehicle: Vehicle,
    grid: SpatialGrid
  ): boolean {
    const dir = vehicle.direction;
    const nearby = grid.query(intersection.x, intersection.y, STOP_BAR_OFFSET + 30);

    for (let i = 0; i < nearby.length; i++) {
      const other = nearby[i];
      if (other.id === vehicle.id) continue;

      // 1. Same lane occupancy check:
      if (other.dir === vehicle.dir) {
        const dx = other.x - vehicle.x;
        const dy = other.y - vehicle.y;
        const lateral = Math.abs(dir.axis === 'y' ? dx : dy);

        if (lateral < DRIVER.laneTolerance) {
          const otherAlong = (other[dir.axis] - intersection[dir.axis]) * dir.sign;
          const otherFront = otherAlong + other.halfLength;
          const otherRear = otherAlong - other.halfLength;

          // If another vehicle is inside the intersection box and stopped/slow (< 0.6)
          if (otherFront > -STOP_BAR_OFFSET && otherRear < STOP_BAR_OFFSET + 4) {
            if (other.speed < 0.6) {
              return true;
            }
          }
        }
      } else {
        // 2. Perpendicular / cross-traffic blockage check:
        const otherAlongX = Math.abs(other.x - intersection.x);
        const otherAlongY = Math.abs(other.y - intersection.y);
        if (otherAlongX < WORLD.halfRoad + 4 && otherAlongY < WORLD.halfRoad + 4) {
          // Cross-traffic vehicle stalled inside the box across our path
          if (other.speed < 0.6) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Ensures the downstream road has enough space for this vehicle to exit safely.
   * If downstream traffic is moving normally, clearance is guaranteed.
   * If downstream traffic is stopped/queued, ensures vehicle won't be stranded in the box.
   */
  private hasDownstreamClearance(
    intersection: Intersection,
    vehicle: Vehicle,
    grid: SpatialGrid
  ): boolean {
    const dir = vehicle.direction;
    const exitAlong = STOP_BAR_OFFSET;
    const exitX = dir.axis === 'x' ? intersection.x + dir.sign * exitAlong : vehicle.x;
    const exitY = dir.axis === 'y' ? intersection.y + dir.sign * exitAlong : vehicle.y;

    const searchRadius = WORLD.cell * 0.75;
    const nearby = grid.query(exitX, exitY, searchRadius);

    let closestLeadAlong = Infinity;
    let closestLeadVehicle: Vehicle | null = null;

    for (let i = 0; i < nearby.length; i++) {
      const other = nearby[i];
      if (other.id === vehicle.id || other.dir !== vehicle.dir) continue;

      const dx = other.x - vehicle.x;
      const dy = other.y - vehicle.y;
      const lateral = Math.abs(dir.axis === 'y' ? dx : dy);
      if (lateral >= DRIVER.laneTolerance) continue;

      const otherAlong = (other[dir.axis] - intersection[dir.axis]) * dir.sign;

      // Check vehicles ahead of the intersection entry
      if (otherAlong > -STOP_BAR_OFFSET + 4) {
        if (otherAlong < closestLeadAlong) {
          closestLeadAlong = otherAlong;
          closestLeadVehicle = other;
        }
      }
    }

    // If downstream road is empty or the lead vehicle is moving freely (not queued)
    if (!closestLeadVehicle || closestLeadVehicle.speed >= 0.7) {
      return true;
    }

    // Downstream lead vehicle is stopped or creeping: check if queue extends into junction
    const leadRear = closestLeadAlong - closestLeadVehicle.halfLength;
    const availableSpace = leadRear - STOP_BAR_OFFSET;
    const requiredSpace = vehicle.length + DRIVER.minStopHeadway + 4;

    if (availableSpace < requiredSpace) {
      return false; // Downstream queue is backed up, do not enter intersection
    }

    return true;
  }

  /**
   * Safe turning decision ensuring turning vehicles never stall inside the intersection.
   */
  private considerTurn(vehicle: Vehicle, grid: SpatialGrid): void {
    const dir = vehicle.direction;
    for (const intersection of this.intersections) {
      const dist = Math.hypot(intersection.x - vehicle.x, intersection.y - vehicle.y);
      if (dist >= DRIVER.turnRadius) continue;
      if (vehicle.lastIntersectionId === intersection.id) continue;

      const along = (vehicle[dir.axis] - intersection[dir.axis]) * dir.sign;
      const aspect = intersection.aspectFor(dir.index);
      if (aspect !== 'green') continue;

      vehicle.lastIntersectionId = intersection.id;

      // Buses follow continuous dedicated transit routes more strictly
      const chance = vehicle.spec.usesBusLane ? DRIVER.turnChance * 0.35 : DRIVER.turnChance;
      if (Math.random() >= chance) break;

      const choices = CROSS_CHOICES[vehicle.dir];
      const targetKey = choices[(Math.random() * choices.length) | 0];
      const targetDir = DIRECTIONS[targetKey];
      const targetCross =
        (targetDir.cross === 'x' ? intersection.x : intersection.y) +
        targetDir.lane * vehicle.laneOffset;

      if (this.isLaneClearForTurn(vehicle, intersection, targetKey, targetDir, targetCross, grid)) {
        vehicle.turnTo(targetKey, intersection.x, intersection.y);
      }
      break;
    }
  }

  private isLaneClearForTurn(
    vehicle: Vehicle,
    intersection: Intersection,
    targetKey: DirectionKey,
    targetDir: DirectionConfig,
    targetCross: number,
    grid: SpatialGrid
  ): boolean {
    const targetExitAlong = STOP_BAR_OFFSET;
    const targetExitX =
      targetDir.axis === 'x'
        ? intersection.x + targetDir.sign * targetExitAlong
        : targetCross;
    const targetExitY =
      targetDir.axis === 'y'
        ? intersection.y + targetDir.sign * targetExitAlong
        : targetCross;

    const nearby = grid.query(targetExitX, targetExitY, 220);
    for (let i = 0; i < nearby.length; i++) {
      const other = nearby[i];
      if (other.id === vehicle.id) continue;

      if (other.dir === targetKey) {
        const lateral = Math.abs((targetDir.axis === 'y' ? other.x : other.y) - targetCross);
        if (lateral < DRIVER.laneTolerance) {
          const otherAlong = (other[targetDir.axis] - intersection[targetDir.axis]) * targetDir.sign;
          const otherRear = otherAlong - other.halfLength;
          if (otherRear < STOP_BAR_OFFSET + vehicle.length + DRIVER.minStopHeadway + 12) {
            return false;
          }
        }
      }
    }
    return true;
  }

  get averageCycleSeconds(): number {
    let total = 0;
    for (const intersection of this.intersections) {
      total += intersection.cycleLength;
    }
    return total / this.intersections.length / TICK_HZ;
  }

  get congestion(): number {
    if (this.vehicles.length === 0) return 0;
    let ratioSum = 0;
    for (const vehicle of this.vehicles) {
      ratioSum += vehicle.speed / vehicle.maxSpeed;
    }
    const flowRatio = ratioSum / this.vehicles.length;
    return clamp(100 - flowRatio * 100, 0, 100);
  }

  get averageWaitSeconds(): number {
    return this.stats.spawned > 0 ? this.stats.waitSeconds / this.stats.spawned : 0;
  }
}

