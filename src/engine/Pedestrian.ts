import { PEDESTRIAN } from './config';

export class Pedestrian {
  private static serial = 0;

  public id: number;
  public crosswalkId: string;

  public x: number;
  public y: number;
  public prevX: number;
  public prevY: number;
  public renderX: number;
  public renderY: number;

  public startX: number;
  public startY: number;
  public targetX: number;
  public targetY: number;

  public angle: number;
  public speed: number;
  public progress = 0;
  public totalDistance: number;

  public color: string;
  public skinColor: string;
  public stridePhase = 0;
  public isFinished = false;

  constructor(
    crosswalkId: string,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    speed?: number
  ) {
    this.id = ++Pedestrian.serial;
    this.crosswalkId = crosswalkId;

    this.startX = startX;
    this.startY = startY;
    this.targetX = targetX;
    this.targetY = targetY;

    this.x = startX;
    this.y = startY;
    this.prevX = startX;
    this.prevY = startY;
    this.renderX = startX;
    this.renderY = startY;

    const dx = targetX - startX;
    const dy = targetY - startY;
    this.totalDistance = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);

    // Speed calibrated to comfortably cross the road within the 4-second active window (~3.7s)
    this.speed = speed ?? (this.totalDistance / (215 + Math.random() * 16));

    this.color = PEDESTRIAN.colors[Math.floor(Math.random() * PEDESTRIAN.colors.length)];
    this.skinColor = ['#fcd34d', '#fed7aa', '#fbcfe8', '#d6d3d1', '#e2e8f0'][
      Math.floor(Math.random() * 5)
    ];
    this.stridePhase = Math.random() * Math.PI * 2;
  }

  static resetSerial(): void {
    Pedestrian.serial = 0;
  }

  tick(): void {
    this.prevX = this.x;
    this.prevY = this.y;

    if (this.isFinished) return;

    const step = this.speed;
    const currentDist = this.progress * this.totalDistance + step;
    this.progress = Math.min(1, currentDist / this.totalDistance);

    this.x = this.startX + (this.targetX - this.startX) * this.progress;
    this.y = this.startY + (this.targetY - this.startY) * this.progress;

    // Stride animation cycle
    this.stridePhase += this.speed * 0.35;

    if (this.progress >= 1) {
      this.isFinished = true;
    }
  }

  syncRender(alpha: number): void {
    this.renderX = this.prevX + (this.x - this.prevX) * alpha;
    this.renderY = this.prevY + (this.y - this.prevY) * alpha;
  }
}
