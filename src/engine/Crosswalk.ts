import { DirectionKey } from '../types/traffic';
import { CROSSWALK_INNER, CROSSWALK_OUTER, WORLD } from './config';
import { Pedestrian } from './Pedestrian';

export class Crosswalk {
  public id: string;
  public intersectionId: number;
  public direction: DirectionKey;

  // Geometry
  public x: number;
  public y: number;
  public startX: number;
  public startY: number;
  public endX: number;
  public endY: number;
  public isVerticalRoad: boolean;

  constructor(intersectionId: number, intersectionX: number, intersectionY: number, direction: DirectionKey) {
    this.id = `cross-${intersectionId}-${direction}`;
    this.intersectionId = intersectionId;
    this.direction = direction;

    const crosswalkMid = (CROSSWALK_INNER + CROSSWALK_OUTER) / 2; // 66px
    const curbSpan = WORLD.halfRoad + 10; // 66px from center line to sidewalk curb

    if (direction === 'N') {
      this.isVerticalRoad = true;
      this.x = intersectionX;
      this.y = intersectionY - crosswalkMid;
      this.startX = intersectionX - curbSpan;
      this.startY = this.y;
      this.endX = intersectionX + curbSpan;
      this.endY = this.y;
    } else if (direction === 'S') {
      this.isVerticalRoad = true;
      this.x = intersectionX;
      this.y = intersectionY + crosswalkMid;
      this.startX = intersectionX - curbSpan;
      this.startY = this.y;
      this.endX = intersectionX + curbSpan;
      this.endY = this.y;
    } else if (direction === 'W') {
      this.isVerticalRoad = false;
      this.x = intersectionX - crosswalkMid;
      this.y = intersectionY;
      this.startX = this.x;
      this.startY = intersectionY - curbSpan;
      this.endX = this.x;
      this.endY = intersectionY + curbSpan;
    } else {
      // 'E'
      this.isVerticalRoad = false;
      this.x = intersectionX + crosswalkMid;
      this.y = intersectionY;
      this.startX = this.x;
      this.startY = intersectionY - curbSpan;
      this.endX = this.x;
      this.endY = intersectionY + curbSpan;
    }
  }

  /**
   * Spawns 2-3 pedestrians crossing between sidewalks in both directions when the pedestrian phase activates.
   */
  spawnPedestrians(): Pedestrian[] {
    const pedestrians: Pedestrian[] = [];
    const count = 2 + (Math.random() > 0.5 ? 1 : 0); // 2 to 3 pedestrians per crosswalk

    for (let i = 0; i < count; i++) {
      // Ensure bidirectional foot traffic
      const forward = i === 0 ? true : i === 1 ? false : Math.random() > 0.5;
      const sx = forward ? this.startX : this.endX;
      const sy = forward ? this.startY : this.endY;
      const tx = forward ? this.endX : this.startX;
      const ty = forward ? this.endY : this.startY;

      // Slight lane offset so pedestrians pass each other naturally
      const lateralShift = (i - (count - 1) / 2) * 5 + (Math.random() - 0.5) * 2;
      const pStartX = this.isVerticalRoad ? sx : sx + lateralShift;
      const pStartY = this.isVerticalRoad ? sy + lateralShift : sy;
      const pTargetX = this.isVerticalRoad ? tx : tx + lateralShift;
      const pTargetY = this.isVerticalRoad ? ty + lateralShift : ty;

      pedestrians.push(new Pedestrian(this.id, pStartX, pStartY, pTargetX, pTargetY));
    }

    return pedestrians;
  }
}
