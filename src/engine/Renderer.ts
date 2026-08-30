import { SignalState, VehicleType } from '../types/traffic';
import {
  clamp,
  CROSSWALK_INNER,
  CROSSWALK_OUTER,
  DETECTOR,
  DIRECTIONS,
  DIR_KEYS,
  mulberry32,
  PALETTE,
  STOP_BAR_OFFSET,
  TICK_HZ,
  VEHICLE_SPECS,
  WORLD,
} from './config';
import { Intersection } from './Intersection';
import { Simulation } from './Simulation';

const FONT_STACK = '"Segoe UI Variable Display","Segoe UI",Inter,system-ui,sans-serif';
const MONO_STACK = '"JetBrains Mono","Cascadia Code",ui-monospace,Consolas,monospace';

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public sim: Simulation;
  public showSensors = true;
  public hoveredId = -1;
  public dpr = 1;

  private spriteCache = new Map<string, HTMLCanvasElement>();
  private glowCache = new Map<string, HTMLCanvasElement>();
  private shadowSprite: HTMLCanvasElement | null = null;
  private staticLayer: HTMLCanvasElement | null = null;
  private vignetteGrad: CanvasGradient | null = null;
  private flashGrad: CanvasGradient | null = null;

  constructor(canvas: HTMLCanvasElement, sim: Simulation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.sim = sim;
    this.resize();
  }

  resize(): void {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    this.dpr = dpr;
    this.canvas.width = WORLD.size * dpr;
    this.canvas.height = WORLD.size * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.spriteCache.clear();
    this.glowCache.clear();
    this.vignetteGrad = null;
    this.flashGrad = null;

    this.shadowSprite = this.buildShadow();
    this.staticLayer = this.buildStaticLayer();
  }

  /* ------------------------------------------------ Static Baked Scenery */

  private buildStaticLayer(): HTMLCanvasElement {
    const layer = document.createElement('canvas');
    layer.width = WORLD.size * this.dpr;
    layer.height = WORLD.size * this.dpr;
    const g = layer.getContext('2d')!;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.paintCityBlocks(g);
    this.paintRoads(g);
    this.paintBusLanes(g);
    this.paintIntersectionPads(g);
    this.paintMarkings(g);
    return layer;
  }

  private static roadCentres(): number[] {
    const centres: number[] = [];
    for (let i = 0; i < WORLD.gridSize; i++) {
      centres.push((i + 0.5) * WORLD.cell);
    }
    return centres;
  }

  private static openSpans(centres: number[], keepOut: number): [number, number][] {
    const spans: [number, number][] = [];
    let cursor = 0;
    for (const centre of centres) {
      const from = centre - keepOut;
      const to = centre + keepOut;
      if (from > cursor) spans.push([cursor, from]);
      cursor = Math.max(cursor, to);
    }
    if (cursor < WORLD.size) spans.push([cursor, WORLD.size]);
    return spans;
  }

  private paintCityBlocks(g: CanvasRenderingContext2D): void {
    const rand = mulberry32(20260804);
    const centres = Renderer.roadCentres();
    const blocks = Renderer.openSpans(centres, WORLD.halfRoad);

    g.fillStyle = PALETTE.ground;
    g.fillRect(0, 0, WORLD.size, WORLD.size);

    for (const [x0, x1] of blocks) {
      for (const [y0, y1] of blocks) {
        const w = x1 - x0;
        const h = y1 - y0;
        if (w < 8 || h < 8) continue;

        g.fillStyle = PALETTE.block;
        this.roundRect(g, x0 + 5, y0 + 5, w - 10, h - 10, 12);
        g.fill();
        g.strokeStyle = PALETTE.blockEdge;
        g.lineWidth = 1;
        g.stroke();

        const count = 3 + ((rand() * 4) | 0);
        for (let i = 0; i < count; i++) {
          const bw = 24 + rand() * Math.max(24, w * 0.32);
          const bh = 24 + rand() * Math.max(24, h * 0.32);
          const bx = x0 + 12 + rand() * Math.max(1, w - bw - 24);
          const by = y0 + 12 + rand() * Math.max(1, h - bh - 24);
          g.fillStyle = rand() > 0.82 ? PALETTE.park : PALETTE.building;
          this.roundRect(g, bx, by, bw, bh, 5);
          g.fill();
          if (rand() > 0.55) {
            g.strokeStyle = 'rgba(255,255,255,.035)';
            g.lineWidth = 1;
            g.stroke();
          }
        }
      }
    }
  }

  private paintRoads(g: CanvasRenderingContext2D): void {
    const centres = Renderer.roadCentres();
    for (const centre of centres) {
      // Vertical road
      const vertical = g.createLinearGradient(
        centre - WORLD.halfRoad,
        0,
        centre + WORLD.halfRoad,
        0
      );
      vertical.addColorStop(0, PALETTE.asphalt);
      vertical.addColorStop(0.5, PALETTE.asphaltHi);
      vertical.addColorStop(1, PALETTE.asphalt);
      g.fillStyle = vertical;
      g.fillRect(centre - WORLD.halfRoad, 0, WORLD.roadWidth, WORLD.size);

      // Horizontal road
      const horizontal = g.createLinearGradient(
        0,
        centre - WORLD.halfRoad,
        0,
        centre + WORLD.halfRoad
      );
      horizontal.addColorStop(0, PALETTE.asphalt);
      horizontal.addColorStop(0.5, PALETTE.asphaltHi);
      horizontal.addColorStop(1, PALETTE.asphalt);
      g.fillStyle = horizontal;
      g.fillRect(0, centre - WORLD.halfRoad, WORLD.size, WORLD.roadWidth);
    }

    // Asphalt grain texture
    const rand = mulberry32(77345);
    g.save();
    g.beginPath();
    for (const centre of centres) {
      g.rect(centre - WORLD.halfRoad, 0, WORLD.roadWidth, WORLD.size);
      g.rect(0, centre - WORLD.halfRoad, WORLD.size, WORLD.roadWidth);
    }
    g.clip();
    for (let i = 0; i < 5000; i++) {
      const shade = rand();
      g.fillStyle =
        shade > 0.5
          ? `rgba(255,255,255,${0.012 + rand() * 0.02})`
          : `rgba(0,0,0,${0.05 + rand() * 0.08})`;
      g.fillRect(rand() * WORLD.size, rand() * WORLD.size, 1.4, 1.4);
    }
    g.restore();
  }

  /**
   * Prominently paints high-contrast, dedicated transit Bus Lanes:
   * - Distinct terracotta/transit red asphalt surface.
   * - Thick yellow dashed/solid separation lines.
   * - Crisp, bold "BUS LANE" / "BUS ONLY" stenciled pavement markings.
   * - Directional transit arrows and diamonds.
   */
  private paintBusLanes(g: CanvasRenderingContext2D): void {
    const centres = Renderer.roadCentres();
    const spans = Renderer.openSpans(centres, CROSSWALK_OUTER);
    const inner = WORLD.laneDivider;
    const outer = WORLD.halfRoad - 2;

    for (const centre of centres) {
      for (const [from, to] of spans) {
        for (const laneSign of [-1, 1]) {
          const bandNear = centre + laneSign * inner;
          const bandFar = centre + laneSign * outer;
          const x0 = Math.min(bandNear, bandFar);
          const x1 = Math.max(bandNear, bandFar);
          const laneWidth = x1 - x0;

          // 1. High-visibility red/terracotta road surface
          g.fillStyle = PALETTE.busLaneSurface;
          g.fillRect(x0, from, laneWidth, to - from);
          g.fillRect(from, x0, to - from, laneWidth);

          // Subtle side highlight for depth
          g.fillStyle = 'rgba(255,255,255,0.025)';
          g.fillRect(x0, from, 2, to - from);
          g.fillRect(from, x0, to - from, 2);

          // 2. Thick bright dashed transit divider
          g.strokeStyle = PALETTE.busLaneSurfaceBorder;
          g.lineWidth = 2.2;
          g.setLineDash([9, 6]);
          this.line(g, bandNear, from, bandNear, to);
          this.line(g, from, bandNear, to, bandNear);
          g.setLineDash([]);

          // 3. Stenciled "BUS ONLY" / "BUS LANE" text markings along the block
          const spanLength = to - from;
          const midPos = (from + to) / 2;

          if (spanLength > 80) {
            // Text on vertical road
            this.paintBusLaneText(
              g,
              (x0 + x1) / 2,
              midPos,
              laneSign === -1 ? Math.PI : 0,
              'BUS ONLY'
            );

            // Text on horizontal road
            this.paintBusLaneText(
              g,
              midPos,
              (x0 + x1) / 2,
              laneSign === -1 ? -Math.PI / 2 : Math.PI / 2,
              'BUS ONLY'
            );
          }
        }
      }
    }
  }

  private paintBusLaneText(
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    text: string
  ): void {
    g.save();
    g.translate(x, y);
    g.rotate(angle);

    // Stencil text background badge
    g.fillStyle = 'rgba(0,0,0,0.3)';
    this.roundRect(g, -13, -26, 26, 52, 4);
    g.fill();

    // Road marking stencil text
    g.fillStyle = PALETTE.busLaneText;
    g.font = '900 10px ' + MONO_STACK;
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    // Lettering stacked vertically for road readability
    const letters = text.split(' ');
    if (letters.length === 2) {
      g.fillText(letters[0], 0, -8);
      g.fillText(letters[1], 0, 8);
    } else {
      g.fillText(text, 0, 0);
    }

    g.restore();
  }

  private paintIntersectionPads(g: CanvasRenderingContext2D): void {
    for (const intersection of this.sim.intersections) {
      const { x, y } = intersection;
      g.fillStyle = PALETTE.pad;
      g.fillRect(x - WORLD.halfRoad, y - WORLD.halfRoad, WORLD.roadWidth, WORLD.roadWidth);

      // Subtle border
      g.strokeStyle = 'rgba(255,255,255,.05)';
      g.lineWidth = 1;
      g.strokeRect(
        x - WORLD.halfRoad + 0.5,
        y - WORLD.halfRoad + 0.5,
        WORLD.roadWidth - 1,
        WORLD.roadWidth - 1
      );

      // Bus lane path continuation dashes across intersection
      g.save();
      g.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      g.lineWidth = 1.6;
      g.setLineDash([5, 5]);

      // N-S bus lane guides
      this.line(
        g,
        x - WORLD.busLaneOffset,
        y - WORLD.halfRoad,
        x - WORLD.busLaneOffset,
        y + WORLD.halfRoad
      );
      this.line(
        g,
        x + WORLD.busLaneOffset,
        y - WORLD.halfRoad,
        x + WORLD.busLaneOffset,
        y + WORLD.halfRoad
      );

      // E-W bus lane guides
      this.line(
        g,
        x - WORLD.halfRoad,
        y - WORLD.busLaneOffset,
        x + WORLD.halfRoad,
        y - WORLD.busLaneOffset
      );
      this.line(
        g,
        x - WORLD.halfRoad,
        y + WORLD.busLaneOffset,
        x + WORLD.halfRoad,
        y + WORLD.busLaneOffset
      );

      g.restore();

      // Big junction ID watermark
      g.fillStyle = PALETTE.label;
      g.font = '700 48px ' + FONT_STACK;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(intersection.id), x, y + 1);
    }
  }

  private paintMarkings(g: CanvasRenderingContext2D): void {
    const centres = Renderer.roadCentres();
    const spans = Renderer.openSpans(centres, CROSSWALK_OUTER);

    for (const centre of centres) {
      for (const [from, to] of spans) {
        // Solid white outer curb lines
        g.strokeStyle = PALETTE.edgeLine;
        g.lineWidth = 2;
        this.line(g, centre - WORLD.halfRoad + 2, from, centre - WORLD.halfRoad + 2, to);
        this.line(g, centre + WORLD.halfRoad - 2, from, centre + WORLD.halfRoad - 2, to);
        this.line(g, from, centre - WORLD.halfRoad + 2, to, centre - WORLD.halfRoad + 2);
        this.line(g, from, centre + WORLD.halfRoad - 2, to, centre + WORLD.halfRoad - 2);

        // Double yellow centreline
        g.strokeStyle = PALETTE.centre;
        g.lineWidth = 1.6;
        this.line(g, centre - 2.5, from, centre - 2.5, to);
        this.line(g, centre + 2.5, from, centre + 2.5, to);
        this.line(g, from, centre - 2.5, to, centre - 2.5);
        this.line(g, from, centre + 2.5, to, centre + 2.5);
      }
    }

    for (const intersection of this.sim.intersections) {
      this.paintCrosswalks(g, intersection);
      this.paintStopBars(g, intersection);
      this.paintLaneArrows(g, intersection);
    }
  }

  private paintCrosswalks(g: CanvasRenderingContext2D, { x, y }: { x: number; y: number }): void {
    const stripe = 7.5;
    const step = 13.5;
    const band = CROSSWALK_OUTER - CROSSWALK_INNER; // 16px band width
    const halfRoad = WORLD.halfRoad;
    const roadW = WORLD.roadWidth;

    // 1. High-contrast dark asphalt underlay backing for crisp street visibility
    g.fillStyle = PALETTE.zebraBack;
    g.fillRect(x - halfRoad, y - CROSSWALK_OUTER - 1, roadW, band + 2); // North
    g.fillRect(x - halfRoad, y + CROSSWALK_INNER - 1, roadW, band + 2); // South
    g.fillRect(x - CROSSWALK_OUTER - 1, y - halfRoad, band + 2, roadW); // West
    g.fillRect(x + CROSSWALK_INNER - 1, y - halfRoad, band + 2, roadW); // East

    // 2. Bright high-visibility zebra crossing bars
    g.fillStyle = PALETTE.zebra;
    for (let offset = -halfRoad + 3; offset < halfRoad - 5; offset += step) {
      g.fillRect(x + offset, y - CROSSWALK_OUTER, stripe, band); // North
      g.fillRect(x + offset, y + CROSSWALK_INNER, stripe, band); // South
      g.fillRect(x - CROSSWALK_OUTER, y + offset, band, stripe); // West
      g.fillRect(x + CROSSWALK_INNER, y + offset, band, stripe); // East
    }

    // 3. Crisp white crosswalk boundary corridor lines
    g.strokeStyle = PALETTE.crosswalkBorder;
    g.lineWidth = 1.4;
    // North crosswalk boundaries
    this.line(g, x - halfRoad, y - CROSSWALK_OUTER, x + halfRoad, y - CROSSWALK_OUTER);
    this.line(g, x - halfRoad, y - CROSSWALK_INNER, x + halfRoad, y - CROSSWALK_INNER);
    // South crosswalk boundaries
    this.line(g, x - halfRoad, y + CROSSWALK_OUTER, x + halfRoad, y + CROSSWALK_OUTER);
    this.line(g, x - halfRoad, y + CROSSWALK_INNER, x + halfRoad, y + CROSSWALK_INNER);
    // West crosswalk boundaries
    this.line(g, x - CROSSWALK_OUTER, y - halfRoad, x - CROSSWALK_OUTER, y + halfRoad);
    this.line(g, x - CROSSWALK_INNER, y - halfRoad, x - CROSSWALK_INNER, y + halfRoad);
    // East crosswalk boundaries
    this.line(g, x + CROSSWALK_OUTER, y - halfRoad, x + CROSSWALK_OUTER, y + halfRoad);
    this.line(g, x + CROSSWALK_INNER, y - halfRoad, x + CROSSWALK_INNER, y + halfRoad);

    // 4. Yellow textured tactile warning pads at sidewalk curbs
    g.fillStyle = PALETTE.tactilePaving;
    const padDepth = 6;
    // North curbs
    g.fillRect(x - halfRoad - padDepth, y - CROSSWALK_OUTER, padDepth, band);
    g.fillRect(x + halfRoad, y - CROSSWALK_OUTER, padDepth, band);
    // South curbs
    g.fillRect(x - halfRoad - padDepth, y + CROSSWALK_INNER, padDepth, band);
    g.fillRect(x + halfRoad, y + CROSSWALK_INNER, padDepth, band);
    // West curbs
    g.fillRect(x - CROSSWALK_OUTER, y - halfRoad - padDepth, band, padDepth);
    g.fillRect(x - CROSSWALK_OUTER, y + halfRoad, band, padDepth);
    // East curbs
    g.fillRect(x + CROSSWALK_INNER, y - halfRoad - padDepth, band, padDepth);
    g.fillRect(x + CROSSWALK_INNER, y + halfRoad, band, padDepth);
  }

  private paintStopBars(g: CanvasRenderingContext2D, intersection: Intersection): void {
    g.fillStyle = PALETTE.stopBar;
    const { x, y } = intersection;
    const lane = WORLD.halfRoad - 2;

    for (const key of DIR_KEYS) {
      const dir = DIRECTIONS[key];
      const stopCoord =
        dir.axis === 'y'
          ? y - dir.sign * (STOP_BAR_OFFSET + 1)
          : x - dir.sign * (STOP_BAR_OFFSET + 1);
      const laneStart = dir.lane < 0 ? -lane : 3;

      if (dir.axis === 'y') {
        g.fillRect(x + laneStart, stopCoord - 2, lane - 3, 4);
      } else {
        g.fillRect(stopCoord - 2, y + laneStart, 4, lane - 3);
      }
    }
  }

  private paintLaneArrows(g: CanvasRenderingContext2D, intersection: Intersection): void {
    for (const key of DIR_KEYS) {
      const dir = DIRECTIONS[key];
      const alongPos = intersection[dir.axis] - dir.sign * 105;

      // Car lane arrow
      this.drawArrow(g, dir, intersection, alongPos, WORLD.carLaneOffset, PALETTE.arrow, 1);
      // Bus lane arrow & BUS marking
      this.drawArrow(
        g,
        dir,
        intersection,
        alongPos,
        WORLD.busLaneOffset,
        'rgba(251,191,36,0.65)',
        0.85
      );
    }
  }

  private drawArrow(
    g: CanvasRenderingContext2D,
    dir: { axis: 'x' | 'y'; cross: 'x' | 'y'; sign: 1 | -1; lane: 1 | -1; angle: number },
    intersection: Intersection,
    alongPos: number,
    laneOffset: number,
    color: string,
    scale: number
  ): void {
    const lanePos = intersection[dir.cross] + dir.lane * laneOffset;
    const cx = dir.axis === 'y' ? lanePos : alongPos;
    const cy = dir.axis === 'y' ? alongPos : lanePos;

    g.save();
    g.translate(cx, cy);
    g.rotate(dir.angle);
    g.scale(scale, scale);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, -13);
    g.lineTo(6.5, -3);
    g.lineTo(2.2, -3);
    g.lineTo(2.2, 13);
    g.lineTo(-2.2, 13);
    g.lineTo(-2.2, -3);
    g.lineTo(-6.5, -3);
    g.closePath();
    g.fill();
    g.restore();
  }

  /* ------------------------------------------------ Sprite Building */

  private vehicleSprite(type: VehicleType, paint: string, braking: boolean): HTMLCanvasElement {
    const key = `${type}|${paint}|${braking ? 'b' : 'n'}`;
    let sprite = this.spriteCache.get(key);
    if (sprite) return sprite;

    const spec = VEHICLE_SPECS[type];
    const W = spec.width;
    const H = spec.length;
    const S = 4 * this.dpr;

    sprite = document.createElement('canvas');
    sprite.width = W * S;
    sprite.height = H * S;
    const g = sprite.getContext('2d')!;
    g.setTransform(S, 0, 0, S, 0, 0);

    if (type === 'truck') {
      this.paintTruckSprite(g, W, H, paint, braking);
    } else if (type === 'bus') {
      this.paintBusSprite(g, W, H, paint, braking);
    } else if (type === 'motorcycle') {
      this.paintMotorcycleSprite(g, W, H, paint, braking);
    } else {
      this.paintCarSprite(g, W, H, paint, braking);
    }

    this.spriteCache.set(key, sprite);
    return sprite;
  }

  private paintCarSprite(
    g: CanvasRenderingContext2D,
    W: number,
    H: number,
    paint: string,
    braking: boolean
  ): void {
    const body = g.createLinearGradient(0, 0, W, H);
    body.addColorStop(0, paint);
    body.addColorStop(0.45, this.shade(paint, -0.14));
    body.addColorStop(1, this.shade(paint, -0.42));
    g.fillStyle = body;
    this.roundRect(g, 1.6, 1.2, W - 3.2, H - 2.4, 4.6);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)';
    g.lineWidth = 0.9;
    g.stroke();

    // Windshield & rear glass
    g.fillStyle = 'rgba(9,13,20,.8)';
    this.roundRect(g, W * 0.2, H * 0.2, W * 0.6, H * 0.24, 2.4);
    g.fill();
    this.roundRect(g, W * 0.2, H * 0.58, W * 0.6, H * 0.2, 2.2);
    g.fill();

    // Roof highlight
    g.fillStyle = 'rgba(255,255,255,.12)';
    this.roundRect(g, W * 0.24, H * 0.47, W * 0.52, H * 0.09, 1.2);
    g.fill();

    this.drawHeadTailLights(g, W, H, braking);
  }

  private paintTruckSprite(
    g: CanvasRenderingContext2D,
    W: number,
    H: number,
    paint: string,
    braking: boolean
  ): void {
    const cabH = H * 0.24;
    g.fillStyle = this.shade(paint, -0.08);
    this.roundRect(g, 1.2, 1, W - 2.4, cabH, 3);
    g.fill();

    g.fillStyle = 'rgba(9,13,20,.8)';
    this.roundRect(g, W * 0.18, H * 0.05, W * 0.64, cabH * 0.55, 1.6);
    g.fill();

    const cargo = g.createLinearGradient(0, cabH, 0, H);
    cargo.addColorStop(0, this.shade(paint, 0.05));
    cargo.addColorStop(1, this.shade(paint, -0.3));
    g.fillStyle = cargo;
    this.roundRect(g, 1, cabH, W - 2, H - cabH - 1, 2.4);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.4)';
    g.lineWidth = 0.9;
    g.strokeRect(1, cabH, W - 2, H - cabH - 1);

    // Ribbing lines
    g.strokeStyle = 'rgba(0,0,0,.18)';
    g.lineWidth = 0.6;
    for (let y = cabH + 5; y < H - 4; y += 6) {
      this.line(g, 2, y, W - 2, y);
    }

    this.drawHeadTailLights(g, W, H, braking, 0.85);
  }

  private paintBusSprite(
    g: CanvasRenderingContext2D,
    W: number,
    H: number,
    paint: string,
    braking: boolean
  ): void {
    // Bus outer body
    g.fillStyle = paint;
    this.roundRect(g, 1, 1, W - 2, H - 2, 3.8);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)';
    g.lineWidth = 0.9;
    g.stroke();

    // Large panoramic roof & windows
    g.fillStyle = 'rgba(96,165,250,.24)';
    this.roundRect(g, W * 0.12, H * 0.08, W * 0.76, H * 0.74, 2);
    g.fill();

    // Passenger windows
    g.fillStyle = 'rgba(9,13,20,.85)';
    const winTop = H * 0.14;
    const winH = H * 0.6;
    const count = 5;
    for (let i = 0; i < count; i++) {
      const wx = W * 0.14 + i * ((W * 0.72) / count);
      this.roundRect(g, wx, winTop, (W * 0.72) / count - 1.4, winH, 1);
      g.fill();
    }

    // High-visibility transit route stripe
    g.fillStyle = 'rgba(52,211,153,.75)';
    g.fillRect(0, H * 0.82, W, 1.8);

    // Destination display sign
    g.fillStyle = '#0f172a';
    this.roundRect(g, W * 0.2, H * 0.04, W * 0.6, 2.5, 0.5);
    g.fill();
    g.fillStyle = '#fbbf24';
    g.fillRect(W * 0.25, H * 0.045, W * 0.5, 1.5);

    this.drawHeadTailLights(g, W, H, braking, 0.9);
  }

  private paintMotorcycleSprite(
    g: CanvasRenderingContext2D,
    W: number,
    H: number,
    paint: string,
    braking: boolean
  ): void {
    g.fillStyle = paint;
    this.roundRect(g, W * 0.22, H * 0.08, W * 0.56, H * 0.66, W * 0.28);
    g.fill();

    // Rider silhouette
    g.fillStyle = 'rgba(20,22,26,.9)';
    g.beginPath();
    g.ellipse(W / 2, H * 0.36, W * 0.16, H * 0.1, 0, 0, Math.PI * 2);
    g.fill();

    // Headlamp
    g.fillStyle = '#fff8e0';
    g.beginPath();
    g.ellipse(W / 2, H * 0.08, W * 0.16, H * 0.05, 0, 0, Math.PI * 2);
    g.fill();

    // Taillamp
    g.fillStyle = braking ? '#ff4d4d' : '#8f2222';
    g.beginPath();
    g.ellipse(W / 2, H * 0.9, W * 0.12, H * 0.04, 0, 0, Math.PI * 2);
    g.fill();
  }

  private drawHeadTailLights(
    g: CanvasRenderingContext2D,
    W: number,
    H: number,
    braking: boolean,
    inset = 1
  ): void {
    const lw = Math.max(2.6, W * 0.22) * inset;
    g.fillStyle = '#fff8e0';
    this.roundRect(g, W * 0.14, H * 0.02, lw, H * 0.045, 1);
    g.fill();
    this.roundRect(g, W - W * 0.14 - lw, H * 0.02, lw, H * 0.045, 1);
    g.fill();

    g.fillStyle = braking ? '#ff4d4d' : '#8f2222';
    this.roundRect(g, W * 0.14, H - H * 0.06, lw, H * 0.045, 1);
    g.fill();
    this.roundRect(g, W - W * 0.14 - lw, H - H * 0.06, lw, H * 0.045, 1);
    g.fill();

    if (braking) {
      g.fillStyle = 'rgba(255,77,77,.45)';
      this.roundRect(g, W * 0.08, H - H * 0.09, W * 0.84, H * 0.07, 2);
      g.fill();
    }
  }

  private buildShadow(): HTMLCanvasElement {
    const R = 36;
    const S = 2 * this.dpr;
    const sprite = document.createElement('canvas');
    sprite.width = R * S;
    sprite.height = R * S;
    const g = sprite.getContext('2d')!;
    g.setTransform(S, 0, 0, S, 0, 0);

    const grad = g.createRadialGradient(R / 2, R / 2, 1, R / 2, R / 2, R / 2);
    grad.addColorStop(0, 'rgba(0,0,0,.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, R, R);
    return sprite;
  }

  private glowSprite(color: string): HTMLCanvasElement {
    let sprite = this.glowCache.get(color);
    if (sprite) return sprite;

    const R = 56;
    const S = this.dpr;
    sprite = document.createElement('canvas');
    sprite.width = R * S;
    sprite.height = R * S;
    const g = sprite.getContext('2d')!;
    g.setTransform(S, 0, 0, S, 0, 0);

    const grad = g.createRadialGradient(R / 2, R / 2, 0, R / 2, R / 2, R / 2);
    grad.addColorStop(0, this.alpha(color, 0.55));
    grad.addColorStop(0.35, this.alpha(color, 0.18));
    grad.addColorStop(1, this.alpha(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, R, R);
    this.glowCache.set(color, sprite);
    return sprite;
  }

  /* ------------------------------------------------ Dynamic Per-Frame Pass */

  draw(alpha: number): void {
    const ctx = this.ctx;
    if (this.staticLayer) {
      ctx.drawImage(this.staticLayer, 0, 0, WORLD.size, WORLD.size);
    }

    if (this.showSensors) {
      this.drawDetectors(ctx);
    }
    this.drawCrosswalkSignals(ctx);
    this.drawSignals(ctx);
    this.drawPedestrians(ctx, alpha);
    this.drawVehicles(ctx, alpha);
    this.drawFaults(ctx);
    this.drawHover(ctx);
    this.drawVignette(ctx);
  }

  private drawCrosswalkSignals(ctx: CanvasRenderingContext2D): void {
    for (const intersection of this.sim.intersections) {
      if (!intersection.crosswalks) continue;
      const isActive = intersection.isPedestrianPhase;
      const countdown = intersection.pedestrianCountdown;

      for (const crosswalk of intersection.crosswalks) {
        const { isVerticalRoad, x, y, startX, startY, endX, endY } = crosswalk;

        // 1. If active, draw illuminated green crossing corridor highlight
        if (isActive) {
          ctx.save();
          ctx.fillStyle = 'rgba(52, 211, 153, 0.14)';
          if (isVerticalRoad) {
            ctx.fillRect(x - WORLD.halfRoad, y - 8, WORLD.roadWidth, 16);
          } else {
            ctx.fillRect(x - 8, y - WORLD.halfRoad, 16, WORLD.roadWidth);
          }
          ctx.restore();
        }

        // 2. Draw pedestrian signal heads and countdown indicators at both sidewalk ends
        const posts = [
          { px: startX, py: startY },
          { px: endX, py: endY },
        ];

        for (let idx = 0; idx < posts.length; idx++) {
          const { px, py } = posts[idx];

          // Pedestrian signal housing
          const boxW = 10;
          const boxH = 16;
          ctx.fillStyle = '#0f172a';
          this.roundRect(ctx, px - boxW / 2, py - boxH / 2, boxW, boxH, 3);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.18)';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Top lamp: Red Don't Walk (✋)
          ctx.beginPath();
          ctx.arc(px, py - 3.8, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = !isActive ? PALETTE.red : 'rgba(248, 113, 113, 0.15)';
          ctx.fill();

          // Bottom lamp: Green Walk (🚶)
          ctx.beginPath();
          ctx.arc(px, py + 3.8, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = isActive ? PALETTE.green : 'rgba(52, 211, 153, 0.15)';
          ctx.fill();

          // Active 4-second fixed timer countdown badge (4 -> 3 -> 2 -> 1 -> 0)
          if (isActive && idx === 0) {
            const badgeOffset = isVerticalRoad ? (y < intersection.y ? -16 : 16) : (x < intersection.x ? -16 : 16);
            const bx = isVerticalRoad ? px : px + badgeOffset;
            const by = isVerticalRoad ? py + badgeOffset : py;

            ctx.save();
            ctx.font = '700 10px ' + MONO_STACK;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            this.roundRect(ctx, bx - 11, by - 7, 22, 14, 4);
            ctx.fill();
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.fillStyle = PALETTE.green;
            ctx.fillText(`${countdown}`, bx, by + 0.5);
            ctx.restore();
          }
        }
      }
    }
  }

  private drawPedestrians(ctx: CanvasRenderingContext2D, alpha: number): void {
    for (const p of this.sim.pedestrians) {
      p.syncRender(alpha);

      ctx.save();
      ctx.translate(p.renderX, p.renderY);

      // Drop shadow under pedestrian
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 1.2, 3.8, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rotate to walking direction
      ctx.rotate(p.angle + Math.PI / 2);

      // Stride leg swing
      const swing = Math.sin(p.stridePhase) * 2.4;

      // Legs / Pants
      ctx.fillStyle = '#1e293b';
      // Left leg
      this.roundRect(ctx, -2.2, swing - 1.2, 1.8, 3.2, 0.8);
      ctx.fill();
      // Right leg
      this.roundRect(ctx, 0.4, -swing - 1.2, 1.8, 3.2, 0.8);
      ctx.fill();

      // Torso / Shirt with vibrant clothing color
      ctx.fillStyle = p.color;
      this.roundRect(ctx, -2.8, -2.2, 5.6, 4.4, 1.6);
      ctx.fill();

      // Arms swinging opposite to legs
      ctx.fillStyle = p.skinColor;
      ctx.beginPath();
      ctx.arc(-3.2, -swing * 0.6, 1.0, 0, Math.PI * 2);
      ctx.arc(3.2, swing * 0.6, 1.0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = p.skinColor;
      ctx.beginPath();
      ctx.arc(0, -0.6, 2.1, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, -1.1, 1.7, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawDetectors(ctx: CanvasRenderingContext2D): void {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);

    for (const intersection of this.sim.intersections) {
      for (let i = 0; i < 4; i++) {
        const dir = DIRECTIONS[DIR_KEYS[i]];
        const lanePos = intersection[dir.cross] + dir.lane * WORLD.laneDivider;

        // Approach loop
        this.drawDetectorLoop(
          ctx,
          intersection,
          dir,
          lanePos,
          DETECTOR.approachNear,
          DETECTOR.approachFar,
          PALETTE.green,
          intersection.frameApproach[i],
          false,
          pulse
        );

        // Queue loop
        this.drawDetectorLoop(
          ctx,
          intersection,
          dir,
          lanePos,
          DETECTOR.queueNear,
          DETECTOR.queueFar,
          PALETTE.amber,
          intersection.frameQueue[i],
          intersection.queueBlocked[i],
          pulse
        );

        // Box loop
        this.drawDetectorLoop(
          ctx,
          intersection,
          dir,
          lanePos,
          0,
          DETECTOR.boxDepth,
          intersection.crashed[i] ? PALETTE.red : PALETTE.blue,
          intersection.frameBox[i],
          intersection.boxBlocked[i] || intersection.crashed[i],
          pulse
        );
      }
    }
  }

  private drawDetectorLoop(
    ctx: CanvasRenderingContext2D,
    intersection: Intersection,
    dir: { axis: 'x' | 'y'; sign: 1 | -1 },
    lanePos: number,
    near: number,
    far: number,
    color: string,
    active: boolean,
    alarming: boolean,
    pulse: number
  ): void {
    const halfLane = (WORLD.busLaneOffset - WORLD.carLaneOffset) / 2 + 11;
    const a = intersection[dir.axis] - dir.sign * far;
    const b = intersection[dir.axis] - dir.sign * near;
    const from = Math.min(a, b);
    const to = Math.max(a, b);

    let x: number, y: number, w: number, h: number;
    if (dir.axis === 'y') {
      x = lanePos - halfLane;
      y = from;
      w = halfLane * 2;
      h = to - from;
    } else {
      x = from;
      y = lanePos - halfLane;
      w = to - from;
      h = halfLane * 2;
    }

    const intensity = alarming ? 0.3 + pulse * 0.34 : active ? 0.26 : 0.1;
    ctx.fillStyle = this.alpha(color, intensity * 0.3);
    ctx.fillRect(x, y, w, h);

    ctx.save();
    ctx.setLineDash(active || alarming ? [] : [5, 4]);
    ctx.lineWidth = alarming ? 2 : 1.2;
    ctx.strokeStyle = this.alpha(color, alarming ? 0.55 + pulse * 0.4 : active ? 0.8 : 0.34);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();
  }

  private drawSignals(ctx: CanvasRenderingContext2D): void {
    const glows: [number, number, string][] = [];

    for (const intersection of this.sim.intersections) {
      for (let i = 0; i < 4; i++) {
        const dir = DIRECTIONS[DIR_KEYS[i]];
        const cx = intersection.x + (dir.axis === 'y' ? dir.lane * 58 : dir.sign * -58);
        const cy = intersection.y + (dir.axis === 'y' ? dir.sign * -58 : dir.lane * 58);
        const aspect = intersection.aspectFor(i);
        const vertical = dir.axis === 'y';

        this.drawSignalHead(ctx, cx, cy, vertical, aspect);

        const lit =
          aspect === 'green'
            ? PALETTE.green
            : aspect === 'amber'
            ? PALETTE.amber
            : PALETTE.red;
        const litOffset = aspect === 'green' ? 12 : aspect === 'amber' ? 0 : -12;

        glows.push([
          vertical ? cx : cx + litOffset,
          vertical ? cy + litOffset : cy,
          lit,
        ]);

        const remaining = intersection.countdownFor(i);
        if (remaining >= 0 && aspect !== 'fault') {
          const seconds = Math.max(1, Math.ceil(remaining / TICK_HZ));
          const outward = cy < intersection.y ? -32 : 32;
          ctx.font = '600 12px ' + MONO_STACK;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(0,0,0,.68)';
          this.roundRect(ctx, cx - 13, cy + outward - 9, 26, 18, 6);
          ctx.fill();
          ctx.fillStyle = this.alpha(lit, 0.95);
          ctx.fillText(String(seconds), cx, cy + outward + 1);
        }
      }
    }

    // Additive glow bloom pass
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [gx, gy, color] of glows) {
      ctx.drawImage(this.glowSprite(color), gx - 28, gy - 28, 56, 56);
    }
    ctx.restore();
  }

  private drawSignalHead(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    vertical: boolean,
    aspect: SignalState
  ): void {
    const long = 40;
    const thick = 16;
    const w = vertical ? thick : long;
    const h = vertical ? long : thick;

    ctx.fillStyle = 'rgba(0,0,0,.42)';
    this.roundRect(ctx, cx - w / 2 + 1.5, cy - h / 2 + 2.5, w, h, 6);
    ctx.fill();

    const shell = vertical
      ? ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0)
      : ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    shell.addColorStop(0, '#2b323d');
    shell.addColorStop(0.5, '#161b22');
    shell.addColorStop(1, '#0c1015');
    ctx.fillStyle = shell;
    this.roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const lamps = [
      { offset: -12, color: PALETTE.red, on: aspect === 'red' || aspect === 'fault' },
      { offset: 0, color: PALETTE.amber, on: aspect === 'amber' },
      { offset: 12, color: PALETTE.green, on: aspect === 'green' },
    ];
    const faultBlink = aspect === 'fault' && (performance.now() % 900) > 450;

    for (const lamp of lamps) {
      const lx = vertical ? cx : cx + lamp.offset;
      const ly = vertical ? cy + lamp.offset : cy;
      const on = lamp.on && !(aspect === 'fault' && faultBlink);

      ctx.beginPath();
      ctx.arc(lx, ly, 5.4, 0, Math.PI * 2);
      ctx.fillStyle = on ? lamp.color : this.alpha(lamp.color, 0.14);
      ctx.fill();

      if (on) {
        ctx.beginPath();
        ctx.arc(lx - 1.4, ly - 1.5, 1.9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.62)';
        ctx.fill();
      }
    }
  }

  private drawVehicles(ctx: CanvasRenderingContext2D, alpha: number): void {
    const shadow = this.shadowSprite;
    for (const vehicle of this.sim.vehicles) {
      vehicle.syncRender(alpha);
      const w = vehicle.width;
      const h = vehicle.length;
      const shadowSize = Math.max(w, h) * 1.5;

      ctx.save();
      ctx.translate(vehicle.renderX, vehicle.renderY);
      if (shadow) {
        ctx.drawImage(shadow, -shadowSize / 2, -shadowSize / 2.4, shadowSize, shadowSize);
      }
      ctx.rotate(vehicle.angle);
      ctx.drawImage(
        this.vehicleSprite(
          vehicle.type,
          vehicle.paint,
          vehicle.braking && vehicle.speed > 0.05
        ),
        -w / 2,
        -h / 2,
        w,
        h
      );
      ctx.restore();
    }
  }

  private drawFaults(ctx: CanvasRenderingContext2D): void {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 210);
    for (const intersection of this.sim.intersections) {
      if (!intersection.anyCrash()) continue;

      ctx.save();
      ctx.strokeStyle = this.alpha(PALETTE.red, 0.35 + pulse * 0.45);
      ctx.lineWidth = 2.5;
      ctx.setLineDash([9, 6]);
      ctx.lineDashOffset = -(performance.now() / 40) % 15;
      ctx.strokeRect(
        intersection.x - WORLD.halfRoad - 4,
        intersection.y - WORLD.halfRoad - 4,
        WORLD.roadWidth + 8,
        WORLD.roadWidth + 8
      );
      ctx.restore();

      const hx = intersection.x;
      const hy = intersection.y - WORLD.halfRoad - 26;
      ctx.save();
      ctx.globalAlpha = 0.65 + pulse * 0.35;
      ctx.fillStyle = PALETTE.red;
      ctx.beginPath();
      ctx.moveTo(hx, hy - 10);
      ctx.lineTo(hx + 11, hy + 8);
      ctx.lineTo(hx - 11, hy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a0808';
      ctx.font = '800 11px ' + FONT_STACK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', hx, hy + 2.5);
      ctx.restore();
    }
  }

  private drawHover(ctx: CanvasRenderingContext2D): void {
    if (this.hoveredId < 0) return;
    const intersection = this.sim.intersections.find((i) => i.id === this.hoveredId);
    if (!intersection) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(96,165,250,.55)';
    ctx.lineWidth = 1.6;
    this.roundRect(ctx, intersection.x - 74, intersection.y - 74, 148, 148, 14);
    ctx.stroke();
    ctx.restore();
  }

  private drawVignette(ctx: CanvasRenderingContext2D): void {
    if (!this.vignetteGrad) {
      const grad = ctx.createRadialGradient(400, 400, 240, 400, 400, 620);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,.45)');
      this.vignetteGrad = grad;
    }
    ctx.fillStyle = this.vignetteGrad;
    ctx.fillRect(0, 0, WORLD.size, WORLD.size);

    const flash = this.sim.crashFlash;
    if (flash > 0) {
      if (!this.flashGrad) {
        const grad = ctx.createRadialGradient(400, 400, 180, 400, 400, 600);
        grad.addColorStop(0, 'rgba(248,113,113,0)');
        grad.addColorStop(1, 'rgba(248,113,113,1)');
        this.flashGrad = grad;
      }
      ctx.save();
      ctx.globalAlpha = flash * 0.34;
      ctx.fillStyle = this.flashGrad;
      ctx.fillRect(0, 0, WORLD.size, WORLD.size);
      ctx.restore();
    }
  }

  /* ------------------------------------------------ Helpers */

  private line(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }

  private roundRect(
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    g.beginPath();
    g.moveTo(x + radius, y);
    g.arcTo(x + w, y, x + w, y + h, radius);
    g.arcTo(x + w, y + h, x, y + h, radius);
    g.arcTo(x, y + h, x, y, radius);
    g.arcTo(x, y, x + w, y, radius);
    g.closePath();
  }

  private alpha(hex: string, a: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  private shade(hex: string, amount: number): string {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c: number) =>
      clamp(Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount), 0, 255);
    return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  }
}
