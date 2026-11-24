// Live hero: the same Langevin walker and well-tempered metadynamics the static
// figure was drawn with, run in the browser over the build-time SVG — and, under
// it, the gradient field itself made visible as a flow of tracers.
//
// The idea is that an energy landscape is a thing everything falls down. The
// contour map says where the slopes are; the flow says what the slopes do. A
// few thousand tracers released on the surface and advected by -grad(V) draw
// their own streamlines, pour over the saddles, and pile up in the three
// basins, so the shape of the surface arrives as motion rather than as a
// legend. The walker is then the one object with a name, crossing a field that
// is visibly pulling on it.
//
// Rules this file keeps:
//   - It never runs under prefers-reduced-motion, and it stops the moment the
//     preference changes.
//   - It pauses when off-screen, when the tab is hidden, and on demand.
//   - If anything throws, the static SVG is still there and still correct.
//   - The streaks are drawn into their own buffer and composited, so the
//     contours, the labels and the axes underneath are never painted over.
import { DOMAIN, V, gradV } from '../lib/landscape/mb';
import { BiasGrid, DEFAULT_PARAMS, Walker, basinOf } from '../lib/landscape/sim';

const TRAIL = 300; // trajectory points kept: about a second of history, so the
// walker reads as a comet rather than filling its basin with orange
const MAX_STEP_MS = 34; // never integrate more than ~2 frames of catch-up

// --- the flow field -------------------------------------------------------
/** Tracers per CSS px² of figure, so a phone does proportionally less work. */
const TRACE_DENSITY = 1700 / 150000;
const TRACE_MIN = 380;
const TRACE_MAX = 2100;
/** Never thin the field below this: it still has to read as a flow. */
const TRACE_FLOOR = 150;
/** How much of the population is released on the first frame. The rest arrives
 *  over the next couple of seconds, if the device turns out to afford it — so
 *  the figure is cheapest exactly while the page is still loading, which is the
 *  window that decides whether the page feels fast. */
const TRACE_OPENING = 0.3;
/** Milliseconds per frame the figure is allowed to want. Two numbers, because
 *  there are two costs and they are not the same: COST is the time spent in
 *  the frame callback, and GAP is the interval between frames, which is the
 *  one that also catches the rasterizing — and on a device with no compositing
 *  GPU, rasterizing a few thousand strokes is most of what a canvas costs.
 *  Above either ceiling the figure sheds tracers; it only takes more back when
 *  both are comfortable. */
const COST_CEIL = 8.5;
const COST_FLOOR = 5;
const GAP_CEIL = 20.5;
const GAP_FLOOR = 17.5;
/** Frames between one adjustment and the next. */
const TUNE_EVERY = 20;
/** Having shed, the figure will not climb back to the population that was too
 *  expensive: it keeps a ceiling just under it. Vertical sync quantises the
 *  frame interval — you are either at the refresh rate or you have dropped a
 *  frame, with nothing in between — so without a ceiling the governor would
 *  grow until it dropped frames, shed, and grow again for ever, and the field
 *  would be visibly breathing. The ceiling heals at this fraction of the full
 *  population per adjustment, which lets a machine that was merely busy for a
 *  moment get its density back within half a minute. */
const CEIL_HEAL = 0.01;
/** Frames between one cut of the bias contours and the next. */
const BIAS_EVERY = 7;
/** World units per frame a tracer covers on ground steep enough to saturate. */
const SPEED = 0.0165;
/** The gradient magnitude at which that top speed is reached. */
const SPEED_KNEE = 125;
/** A random walk added each frame, so the streams braid instead of collapsing
 *  onto a handful of identical lines. */
const JITTER = 0.0024;
/** Below this gradient a tracer has arrived, and is retired shortly after. */
const SETTLED = 11;
/** Fraction of the streak buffer's alpha removed per frame: the tail length. */
const DECAY = 0.055;
/** Streaks are grouped into this many alpha/width bands, so a frame costs a
 *  fixed handful of strokes rather than one per tracer. */
const BANDS = 6;

const G: [number, number] = [0, 0];

interface Ctx {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** The flow's own canvas, under the main one. Streaks accumulate here and
   *  decay in place, so it is never cleared and never composited by hand. */
  buf: HTMLCanvasElement;
  bctx: CanvasRenderingContext2D;
  walker: Walker;
  bias: BiasGrid;
  trail: Float32Array;
  trailN: number;
  trailHead: number;
  /** tracer state, parallel arrays rather than objects */
  tx: Float32Array;
  ty: Float32Array;
  tage: Float32Array;
  tlife: Float32Array;
  tn: number;
  /** Tracers are stepped in a prefix of those arrays; this is its length, and
   *  it is what the frame-cost governor actually moves. */
  active: number;
  /** Exponential mean of the milliseconds spent inside frame(). */
  cost: number;
  /** Exponential mean of the interval between frames. */
  gap: number;
  /** The most tracers this device has shown it can afford. */
  cap: number;
  tune: number;
  /** Bias contours, cut a few times a second and stroked from here between. */
  biasPaths: { path: Path2D; t: number }[];
  biasAt: number;
  /** one coordinate buffer per alpha band, refilled every frame */
  band: Float32Array[];
  bandN: number[];
  raf: number;
  last: number;
  running: boolean;
  visible: boolean;
  wanted: boolean;
  hills: HTMLElement | null;
  energy: HTMLElement | null;
  basin: HTMLElement | null;
  lastReadout: number;
  w: number;
  h: number;
  dpr: number;
  /** palette, re-read whenever the theme changes */
  paper: string;
  blue: string;
}

/** A palette value as the browser has resolved it under the current theme. */
function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function setup(root: HTMLElement): Ctx | null {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-landscape-canvas]');
  const ctx = canvas?.getContext('2d', { alpha: true });
  const buf = root.querySelector<HTMLCanvasElement>('[data-landscape-flow]');
  const bctx = buf?.getContext('2d', { alpha: true });
  if (!canvas || !ctx || !buf || !bctx) return null;
  const bias = new BiasGrid(121, 110);
  const walker = new Walker(0.623, 0.028, DEFAULT_PARAMS, bias, 19);
  return {
    root,
    canvas,
    ctx,
    buf,
    bctx,
    walker,
    bias,
    trail: new Float32Array(TRAIL * 2),
    trailN: 0,
    trailHead: 0,
    tx: new Float32Array(0),
    ty: new Float32Array(0),
    tage: new Float32Array(0),
    tlife: new Float32Array(0),
    tn: 0,
    active: 0,
    cost: 0,
    gap: 0,
    cap: 0,
    tune: TUNE_EVERY,
    biasPaths: [],
    biasAt: 0,
    band: [],
    bandN: [],
    raf: 0,
    last: 0,
    running: false,
    visible: false,
    wanted: true,
    hills: root.querySelector('[data-r-hills]'),
    energy: root.querySelector('[data-r-energy]'),
    basin: root.querySelector('[data-r-basin]'),
    lastReadout: 0,
    w: 0,
    h: 0,
    dpr: 1,
    paper: token('--paper', '#f6f1e5'),
    blue: token('--blue', '#1772d0'),
  };
}

/**
 * Put a tracer somewhere on the surface, preferring steep ground.
 *
 * A uniform scatter wastes most of its tracers in the basins, where they arrive
 * at once and have nothing left to draw. Taking the steepest of a few candidate
 * points biases the release onto the slopes, which is where a streamline is
 * worth seeing, without ever excluding the flats.
 */
function spawn(c: Ctx, i: number): void {
  let bx = 0;
  let by = 0;
  let best = -1;
  for (let k = 0; k < 5; k++) {
    const x = DOMAIN.x0 + Math.random() * (DOMAIN.x1 - DOMAIN.x0);
    const y = DOMAIN.y0 + Math.random() * (DOMAIN.y1 - DOMAIN.y0);
    gradV(x, y, G);
    const m = Math.hypot(G[0], G[1]);
    if (m > best) {
      best = m;
      bx = x;
      by = y;
    }
    if (m > 90) break; // steep enough; no need to keep looking
  }
  c.tx[i] = bx;
  c.ty[i] = by;
  c.tage[i] = 0;
  c.tlife[i] = 55 + Math.random() * 170;
}

/** Size the tracer population to the figure and release it. */
function seed(c: Ctx): void {
  const want = Math.max(TRACE_MIN, Math.min(TRACE_MAX, Math.round(c.w * c.h * TRACE_DENSITY)));
  if (want === c.tn) return;
  c.tn = want;
  c.tx = new Float32Array(want);
  c.ty = new Float32Array(want);
  c.tage = new Float32Array(want);
  c.tlife = new Float32Array(want);
  c.band = [];
  c.bandN = [];
  for (let b = 0; b < BANDS; b++) {
    c.band.push(new Float32Array(want * 4));
    c.bandN.push(0);
  }
  for (let i = 0; i < want; i++) {
    spawn(c, i);
    // Stagger the first generation's ages so they do not all retire together.
    c.tage[i] = Math.random() * c.tlife[i];
  }
  c.active = Math.max(TRACE_FLOOR, Math.min(want, Math.round(want * TRACE_OPENING)));
  c.cost = 0;
  c.gap = 0;
  c.cap = want;
  c.tune = TUNE_EVERY;
}

/**
 * Spend as much of the frame on tracers as the device can actually give.
 *
 * A fixed population is a guess about a machine this code has never seen: the
 * count that holds sixty frames on a laptop is the count that janks a phone,
 * and a phone is also where it matters most. So the figure measures what its
 * own frame costs and moves the population until that cost sits in a band.
 * It opens low and grows, rather than opening high and shedding, because the
 * expensive first second is the one the reader feels.
 */
function govern(c: Ctx, spent: number, interval: number): void {
  c.cost = c.cost ? c.cost * 0.85 + spent * 0.15 : spent;
  c.gap = c.gap ? c.gap * 0.85 + interval * 0.15 : interval;
  if (--c.tune > 0) return;
  c.tune = TUNE_EVERY;
  if (c.gap > GAP_CEIL || c.cost > COST_CEIL) {
    c.cap = Math.max(TRACE_FLOOR, Math.min(c.cap, Math.round(c.active * 0.9)));
    c.active = Math.max(TRACE_FLOOR, Math.round(c.active * 0.78));
    return;
  }
  c.cap = Math.min(c.tn, c.cap + c.tn * CEIL_HEAL);
  if (c.gap < GAP_FLOOR && c.cost < COST_FLOOR && c.active < c.cap) {
    const was = c.active;
    c.active = Math.min(Math.floor(c.cap), Math.round(c.active * 1.2) + 8);
    // The ones coming back have stale positions, most of them settled in a
    // basin from before they were parked. Release them afresh.
    for (let i = was; i < c.active; i++) spawn(c, i);
  }
}

function resize(c: Ctx): void {
  const rect = c.canvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (w === c.canvas.width && h === c.canvas.height) return;
  c.canvas.width = w;
  c.canvas.height = h;
  c.buf.width = w;
  c.buf.height = h;
  c.w = rect.width;
  c.h = rect.height;
  c.dpr = dpr;
  // The cached contours are in CSS pixels, so a new box invalidates them.
  c.biasAt = 0;
  seed(c);
}

const toPx = (c: Ctx, x: number, y: number): [number, number] => [
  ((x - DOMAIN.x0) / (DOMAIN.x1 - DOMAIN.x0)) * c.w,
  c.h - ((y - DOMAIN.y0) / (DOMAIN.y1 - DOMAIN.y0)) * c.h,
];

const toWorld = (c: Ctx, px: number, py: number): [number, number] => [
  DOMAIN.x0 + (px / c.w) * (DOMAIN.x1 - DOMAIN.x0),
  DOMAIN.y0 + (1 - py / c.h) * (DOMAIN.y1 - DOMAIN.y0),
];

function pushTrail(c: Ctx, x: number, y: number): void {
  c.trail[c.trailHead * 2] = x;
  c.trail[c.trailHead * 2 + 1] = y;
  c.trailHead = (c.trailHead + 1) % TRAIL;
  if (c.trailN < TRAIL) c.trailN++;
}

/**
 * Advance every tracer one step and record the segment it covered.
 *
 * Velocity is -grad(V) with its magnitude saturated, so a tracer is fast on a
 * steep face and slow on a shallow one — the field's own structure, legible as
 * speed — without the integrator exploding on the walls where the potential
 * climbs into the thousands. The cursor's repulsive Gaussian, the same one that
 * pushes the walker, is added here too: push on the surface and the flow parts
 * around your hand.
 */
function advect(c: Ctx, dtf: number): void {
  for (let b = 0; b < BANDS; b++) c.bandN[b] = 0;
  const e = c.walker.external;
  for (let i = 0; i < c.active; i++) {
    const x = c.tx[i];
    const y = c.ty[i];
    gradV(x, y, G);
    const m = Math.hypot(G[0], G[1]) || 1e-6;
    // speed/magnitude, so direction is -grad and |v| = min(SPEED, m * k)
    const k = Math.min(SPEED, (m / SPEED_KNEE) * SPEED) / m;
    let vx = -G[0] * k;
    let vy = -G[1] * k;
    if (e && e.h !== 0) {
      const dx = x - e.x;
      const dy = y - e.y;
      const g = (0.6 * Math.exp(-(dx * dx + dy * dy) / (2 * e.s * e.s))) / (e.s * e.s);
      vx += g * dx * 0.012;
      vy += g * dy * 0.012;
    }
    const nx = x + vx * dtf + (Math.random() - 0.5) * JITTER * dtf;
    const ny = y + vy * dtf + (Math.random() - 0.5) * JITTER * dtf;

    const t = Math.min(1, Math.hypot(vx, vy) / SPEED);
    const bi = Math.min(BANDS - 1, (t * BANDS) | 0);
    const buf = c.band[bi];
    let n = c.bandN[bi];
    const [ax, ay] = toPx(c, x, y);
    const [bx2, by2] = toPx(c, nx, ny);
    buf[n] = ax;
    buf[n + 1] = ay;
    buf[n + 2] = bx2;
    buf[n + 3] = by2;
    c.bandN[bi] = n + 4;

    c.tx[i] = nx;
    c.ty[i] = ny;
    c.tage[i] += dtf;
    const out =
      nx < DOMAIN.x0 || nx > DOMAIN.x1 || ny < DOMAIN.y0 || ny > DOMAIN.y1 || !Number.isFinite(nx);
    // A tracer that has arrived keeps drawing for a moment — that is what makes
    // the three wells glow — and is then recycled onto a slope.
    if (out || c.tage[i] > c.tlife[i] || (m < SETTLED && Math.random() < 0.035 * dtf)) {
      spawn(c, i);
    }
  }
}

/** Decay what is already in the streak buffer, then stroke this frame's step. */
function paintFlow(c: Ctx, dtf: number): void {
  const { bctx, buf } = c;
  bctx.save();
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.globalCompositeOperation = 'destination-out';
  bctx.fillStyle = '#000';
  bctx.globalAlpha = Math.min(0.35, DECAY * dtf);
  bctx.fillRect(0, 0, buf.width, buf.height);
  bctx.restore();

  bctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
  bctx.globalCompositeOperation = 'source-over';
  bctx.strokeStyle = c.blue;
  bctx.lineCap = 'round';
  for (let b = 0; b < BANDS; b++) {
    const n = c.bandN[b];
    if (n === 0) continue;
    const t = (b + 0.5) / BANDS;
    bctx.globalAlpha = 0.075 + 0.3 * t;
    bctx.lineWidth = 0.7 + 0.55 * t;
    const arr = c.band[b];
    bctx.beginPath();
    for (let k = 0; k < n; k += 4) {
      bctx.moveTo(arr[k], arr[k + 1]);
      bctx.lineTo(arr[k + 2], arr[k + 3]);
    }
    bctx.stroke();
  }
  bctx.globalAlpha = 1;
}

/**
 * Rebuild the bias contours.
 *
 * This is the point of the animation: you watch the basin the walker is sitting
 * in fill up with hills until it is shallow enough to escape over a saddle.
 *
 * Marching squares over the whole bias grid is far too much work to repeat
 * sixty times a second, and it is work nobody can see, because the field grows
 * by one Gaussian per deposit and barely moves between frames. So the contours
 * are cut into paths a few times a second and stroked from the cache in
 * between.
 */
function buildBias(c: Ctx): void {
  c.biasPaths.length = 0;
  const { bias } = c;
  if (bias.hills === 0) return;
  const step = 7; // bias contour interval, in potential units
  let max = 0;
  for (let i = 0; i < bias.values.length; i++) if (bias.values[i] > max) max = bias.values[i];
  if (max < step) return;
  const cols = bias.nx;
  const rows = bias.ny;
  const cw = c.w / (cols - 1);
  const ch = c.h / (rows - 1);
  for (let level = step; level <= max; level += step) {
    const path = new Path2D();
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const v0 = bias.values[j * cols + i];
        const v1 = bias.values[j * cols + i + 1];
        const v2 = bias.values[(j + 1) * cols + i + 1];
        const v3 = bias.values[(j + 1) * cols + i];
        let code = 0;
        if (v0 > level) code |= 1;
        if (v1 > level) code |= 2;
        if (v2 > level) code |= 4;
        if (v3 > level) code |= 8;
        if (code === 0 || code === 15) continue;
        const X = (gi: number) => gi * cw;
        const Y = (gj: number) => c.h - gj * ch;
        const bx = X(i + (level - v0) / (v1 - v0));
        const ry = Y(j + (level - v1) / (v2 - v1));
        const tx = X(i + (level - v3) / (v2 - v3));
        const ly = Y(j + (level - v0) / (v3 - v0));
        const seg: number[] = [];
        switch (code) {
          case 1: case 14: seg.push(X(i), ly, bx, Y(j)); break;
          case 2: case 13: seg.push(bx, Y(j), X(i + 1), ry); break;
          case 3: case 12: seg.push(X(i), ly, X(i + 1), ry); break;
          case 4: case 11: seg.push(X(i + 1), ry, tx, Y(j + 1)); break;
          case 6: case 9: seg.push(bx, Y(j), tx, Y(j + 1)); break;
          case 7: case 8: seg.push(X(i), ly, tx, Y(j + 1)); break;
          default: seg.push(X(i), ly, bx, Y(j), X(i + 1), ry, tx, Y(j + 1));
        }
        for (let k = 0; k < seg.length; k += 4) {
          path.moveTo(seg[k], seg[k + 1]);
          path.lineTo(seg[k + 2], seg[k + 3]);
        }
      }
    }
    c.biasPaths.push({ path, t: Math.min(1, level / 110) });
  }
}

function drawBias(c: Ctx): void {
  if (c.biasPaths.length === 0) return;
  const { ctx } = c;
  ctx.save();
  ctx.lineWidth = 1;
  for (const b of c.biasPaths) {
    ctx.strokeStyle = `rgba(240, 146, 40, ${0.1 + 0.26 * (1 - b.t)})`;
    ctx.stroke(b.path);
  }
  ctx.restore();
}

function draw(c: Ctx): void {
  const { ctx } = c;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.canvas.width, c.canvas.height);
  ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);

  drawBias(c);

  // trail, tapering and brightening towards the head
  if (c.trailN > 1) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const segments = 14;
    const per = Math.ceil(c.trailN / segments);
    for (let s = 0; s < segments; s++) {
      const from = s * per;
      const to = Math.min(c.trailN, from + per + 1);
      if (to - from < 2) continue;
      ctx.beginPath();
      for (let k = from; k < to; k++) {
        const idx = (c.trailHead - c.trailN + k + TRAIL * 2) % TRAIL;
        const [px, py] = toPx(c, c.trail[idx * 2], c.trail[idx * 2 + 1]);
        if (k === from) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      const t = (s + 1) / segments;
      ctx.lineWidth = 0.6 + 1.3 * t;
      ctx.strokeStyle = `rgba(240, 146, 40, ${(0.04 + 0.78 * t).toFixed(3)})`;
      ctx.stroke();
    }
  }

  // the walker: a soft halo so it carries across the flow, then the dot
  const [px, py] = toPx(c, c.walker.x, c.walker.y);
  const halo = ctx.createRadialGradient(px, py, 0, px, py, 15);
  halo.addColorStop(0, 'rgba(240, 146, 40, 0.42)');
  halo.addColorStop(0.45, 'rgba(240, 146, 40, 0.16)');
  halo.addColorStop(1, 'rgba(240, 146, 40, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(px, py, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px, py, 4.2, 0, Math.PI * 2);
  ctx.fillStyle = '#f09228';
  ctx.fill();
  ctx.lineWidth = 1.6;
  // The outline is the surface itself, so the dot reads as sitting on the page
  // rather than wearing a white ring once the page is dark.
  ctx.strokeStyle = c.paper;
  ctx.stroke();
}

function readout(c: Ctx, now: number): void {
  if (now - c.lastReadout < 180) return;
  c.lastReadout = now;
  if (c.energy) {
    const E = V(c.walker.x, c.walker.y);
    c.energy.textContent = E.toFixed(0);
  }
  if (c.hills) c.hills.textContent = String(c.bias.hills);
  if (c.basin) c.basin.textContent = basinOf(c.walker.x, c.walker.y);
}

function frame(c: Ctx, now: number): void {
  c.raf = 0;
  if (!c.running) return;
  const t0 = performance.now();
  // The raw interval is what the governor reads; the physics gets a capped
  // version so a long stall cannot be integrated in one jump.
  const raw = c.last ? Math.min(100, now - c.last) : 16;
  const dtMs = Math.min(MAX_STEP_MS, raw);
  c.last = now;
  // integrate a fixed number of substeps per millisecond of wall clock, so the
  // motion looks the same on a 60Hz and a 120Hz display
  const steps = Math.round(dtMs * 2.6);
  for (let s = 0; s < steps; s++) {
    c.walker.step();
    if (s % 9 === 0) pushTrail(c, c.walker.x, c.walker.y);
  }
  if (--c.biasAt <= 0) {
    c.biasAt = BIAS_EVERY;
    buildBias(c);
  }
  const dtf = Math.max(0.25, Math.min(2, dtMs / 16.7));
  advect(c, dtf);
  paintFlow(c, dtf);
  // Keep the bias bounded: once it is deep enough that the walker roams freely,
  // relax it so the figure keeps breathing instead of flattening the surface.
  if (c.bias.hills > 2600) {
    c.bias.scale(0.55);
    c.bias.hills = Math.round(c.bias.hills * 0.55);
  }
  draw(c);
  readout(c, now);
  govern(c, performance.now() - t0, raw);
  c.raf = requestAnimationFrame((t) => frame(c, t));
}

function start(c: Ctx): void {
  if (c.running || !c.visible || !c.wanted) return;
  resize(c);
  if (c.w < 1) return;
  seed(c);
  c.running = true;
  c.last = 0;
  c.root.setAttribute('data-live', '');
  c.raf = requestAnimationFrame((t) => frame(c, t));
}

function stop(c: Ctx): void {
  c.running = false;
  if (c.raf) cancelAnimationFrame(c.raf);
  c.raf = 0;
}

export function initLandscape(root: HTMLElement): void {
  const motionOff = window.matchMedia('(prefers-reduced-motion: reduce)');
  const c = setup(root);
  if (!c) return;

  // The palette is read once rather than every frame, so it has to be told when
  // it moves underneath.
  document.addEventListener('theme:change', () => {
    c.paper = token('--paper', '#f6f1e5');
    c.blue = token('--blue', '#1772d0');
  });

  const toggle = root.querySelector<HTMLButtonElement>('[data-landscape-toggle]');
  const toggleLabel = root.querySelector<HTMLElement>('[data-landscape-toggle-label]');
  const readoutEl = root.querySelector<HTMLElement>('[data-landscape-readout]');

  const teardown = () => {
    stop(c);
    c.root.removeAttribute('data-live');
    toggle?.setAttribute('hidden', '');
    readoutEl?.setAttribute('hidden', '');
  };

  if (motionOff.matches) {
    teardown();
  } else {
    toggle?.removeAttribute('hidden');
    readoutEl?.removeAttribute('hidden');
  }
  motionOff.addEventListener('change', (e) => {
    if (e.matches) teardown();
    else {
      toggle?.removeAttribute('hidden');
      readoutEl?.removeAttribute('hidden');
      start(c);
    }
  });

  // The very first start waits for the page to go quiet. The hero is in view
  // the moment the document loads, so an animation that begins there is
  // competing with the stylesheet, the fonts and the intro for one thread, in
  // exactly the second that decides whether the page feels fast. Every later
  // start — scrolling back to it, returning to the tab — is immediate.
  let opened = false;
  const opening = (fn: () => void) => {
    if (opened) return fn();
    opened = true;
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => fn(), { timeout: 1500 });
    } else {
      window.setTimeout(fn, 700);
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        c.visible = e.isIntersecting;
        // start() re-checks visibility, so scrolling away before the idle
        // callback lands simply means it never starts.
        if (e.isIntersecting && !motionOff.matches) opening(() => start(c));
        else stop(c);
      }
    },
    { threshold: 0.12 },
  );
  io.observe(root);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(c);
    else if (!motionOff.matches) start(c);
  });

  const ro = new ResizeObserver(() => {
    resize(c);
    if (c.running) draw(c);
  });
  ro.observe(root);

  toggle?.addEventListener('click', () => {
    c.wanted = !c.wanted;
    // The visible word is the accessible name, so it alone carries the state.
    if (toggleLabel) toggleLabel.textContent = c.wanted ? 'pause' : 'resume';
    if (c.wanted) start(c);
    else stop(c);
  });

  // The cursor is a repulsive Gaussian: push on the surface and the walker is
  // driven out of the basin it is sitting in, while the flow parts around it.
  const stage = root.querySelector<HTMLElement>('.landscape__stage') ?? root;
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerType === 'touch') return;
    const rect = c.canvas.getBoundingClientRect();
    const [x, y] = toWorld(c, ev.clientX - rect.left, ev.clientY - rect.top);
    c.walker.external = { x, y, h: 520, s: 0.26 };
  };
  stage.addEventListener('pointermove', onMove, { passive: true });
  stage.addEventListener('pointerleave', () => {
    c.walker.external = null;
  });
}

export function initAllLandscapes(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-landscape]')) {
    // With view transitions this runs again on every client-side navigation.
    // A figure that is already wired must not get a second set of listeners,
    // and after a navigation the node is new, so the flag comes back with it.
    if (el.dataset.landscapeReady === '') continue;
    el.dataset.landscapeReady = '';
    try {
      initLandscape(el);
    } catch {
      // the static SVG underneath is the figure; losing the animation is fine
      el.removeAttribute('data-live');
    }
  }
}
