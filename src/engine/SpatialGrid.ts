import { clamp, WORLD } from './config';
import { Vehicle } from './Vehicle';

/**
 * Uniform spatial hash grid for 2D vehicle proximity queries.
 */
export class SpatialGrid {
  private cellSize: number;
  private origin: number;
  private cols: number;
  private buckets: Vehicle[][];
  private scratch: Vehicle[];

  constructor(cellSize = 100, padCells = 2) {
    this.cellSize = cellSize;
    this.origin = -padCells * cellSize;
    this.cols = Math.ceil(WORLD.size / cellSize) + padCells * 2;
    this.buckets = Array.from({ length: this.cols * this.cols }, () => []);
    this.scratch = [];
  }

  private col(v: number): number {
    return clamp(((v - this.origin) / this.cellSize) | 0, 0, this.cols - 1);
  }

  clear(): void {
    for (let i = 0; i < this.buckets.length; i++) {
      this.buckets[i].length = 0;
    }
  }

  insert(item: Vehicle): void {
    const r = this.col(item.y);
    const c = this.col(item.x);
    this.buckets[r * this.cols + c].push(item);
  }

  /**
   * Fast bounding circle query.
   * Returns a reference to the reusable scratch buffer.
   */
  query(x: number, y: number, radius: number): Vehicle[] {
    const out = this.scratch;
    out.length = 0;
    const c0 = this.col(x - radius);
    const c1 = this.col(x + radius);
    const r0 = this.col(y - radius);
    const r1 = this.col(y + radius);

    for (let r = r0; r <= r1; r++) {
      const row = r * this.cols;
      for (let c = c0; c <= c1; c++) {
        const bucket = this.buckets[row + c];
        for (let i = 0; i < bucket.length; i++) {
          out.push(bucket[i]);
        }
      }
    }
    return out;
  }
}
