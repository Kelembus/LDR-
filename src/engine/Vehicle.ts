import { DirectionConfig, DirectionKey, VehicleSpec, VehicleType } from '../types/traffic';
import { clamp, DIRECTIONS, lerp, TICK_HZ, VEHICLE_SPECS, WORLD } from './config';

let vehicleSerial = 0;

export class Vehicle {
  public id: number;
  public dir: DirectionKey;
  public type: VehicleType;
  public spec: VehicleSpec;

  public length: number;
  public width: number;
  public halfLength: number;
  public laneOffset: number;

  public maxSpeed: number;
  public accel: number;
  public decel: number;
  public focus: number;
  public paint: string;

  public speed: number;
  public lastIntersectionId: number;
  public braking: boolean;

  public x: number;
  public y: number;
  public renderX: number;
  public renderY: number;
  public angle: number;

  constructor(dirKey: DirectionKey, roadPos: number, type: VehicleType) {
    const dir = DIRECTIONS[dirKey];
    const spec = VEHICLE_SPECS[type];

    this.id = ++vehicleSerial;
    this.dir = dirKey;
    this.type = type;
    this.spec = spec;

    this.length = spec.length;
    this.width = spec.width;
    this.halfLength = spec.length / 2;

    // Buses strictly use the dedicated outer bus lane; all other vehicles strictly use the inner lane
    this.laneOffset = spec.usesBusLane ? WORLD.busLaneOffset : WORLD.carLaneOffset;

    // Individual variance for realistic platoon formation
    this.maxSpeed = spec.maxSpeed * (0.88 + Math.random() * 0.24);
    this.accel = spec.accel * (0.85 + Math.random() * 0.3);
    this.decel = spec.decel * (0.85 + Math.random() * 0.3);
    this.focus = 0.6 + Math.random() * 1.4;
    this.paint = spec.colors[(Math.random() * spec.colors.length) | 0];

    this.speed = 0;
    this.lastIntersectionId = -1;
    this.braking = false;

    // Spawn slightly outside viewport so it glides in naturally
    const entry = -75;
    const exit = WORLD.size + 75;

    if (dir.axis === 'y') {
      this.x = roadPos + dir.lane * this.laneOffset;
      this.y = dir.sign > 0 ? entry : exit;
    } else {
      this.y = roadPos + dir.lane * this.laneOffset;
      this.x = dir.sign > 0 ? entry : exit;
    }

    this.renderX = this.x;
    this.renderY = this.y;
    this.angle = dir.angle;
  }

  static resetSerial(): void {
    vehicleSerial = 0;
  }

  static decrementSerial(): void {
    vehicleSerial--;
  }

  get direction(): DirectionConfig {
    return DIRECTIONS[this.dir];
  }

  get isVertical(): boolean {
    return this.dir === 'N' || this.dir === 'S';
  }

  /**
   * Redirect onto a perpendicular road, correctly maintaining lane offset for this vehicle's class.
   */
  turnTo(dirKey: DirectionKey, intersectionX: number, intersectionY: number): void {
    const dir = DIRECTIONS[dirKey];
    this.dir = dirKey;
    if (dir.cross === 'x') {
      this.x = intersectionX + dir.lane * this.laneOffset;
    } else {
      this.y = intersectionY + dir.lane * this.laneOffset;
    }
    this.speed = Math.max(1.4, Math.min(this.speed, 2.2));
  }


  /**
   * Euler integration step with hard physical safety constraint.
   */
  integrate(accel: number, onWaitTick: () => void, maxAdvance = Infinity): void {
    this.braking = accel < -0.02;
    let nextSpeed = clamp(this.speed + accel, 0, this.maxSpeed);

    // Hard obstacle distance boundary: vehicle cannot advance more than physical gap allows
    nextSpeed = Math.min(nextSpeed, Math.max(0, maxAdvance));
    this.speed = nextSpeed;

    if (this.speed < 0.15) {
      onWaitTick();
    }

    const dir = this.direction;
    if (dir.axis === 'y') {
      this.y += this.speed * dir.sign;
    } else {
      this.x += this.speed * dir.sign;
    }
  }

  /**
   * Render pose smoothing for silky 60fps rotation/position easing.
   */
  syncRender(alpha: number): void {
    const jump = Math.abs(this.x - this.renderX) + Math.abs(this.y - this.renderY);
    if (jump > 80) {
      this.renderX = this.x;
      this.renderY = this.y;
    } else {
      this.renderX = lerp(this.renderX, this.x, alpha);
      this.renderY = lerp(this.renderY, this.y, alpha);
    }

    let delta = this.direction.angle - this.angle;
    delta = (((delta + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    this.angle += delta * 0.25;
  }
}
