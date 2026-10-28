// First load of the home page: the landscape assembles itself out of noise and
// then lands in the hero.
//
// Nothing here is drawn. The particles are integrated under the real gradient
// of the Müller-Brown potential, the same `gradV` the hero canvas and the
// build-time figure use, with the temperature annealed from hot to cold. What
// a reader watches is overdamped Langevin dynamics cooling into its basins,
// which is the thing the rest of this site is about, performed once rather
// than described.
//
// Rules this file keeps, in the same spirit as the hero and the mascot:
//   - It runs once per session, on a real document load of the home page only.
//     A client-side navigation never triggers it.
//   - It never runs under prefers-reduced-motion. The arming script in the
//     component checks first, and this checks again.
//   - The overlay is fixed, aria-hidden and pointer-events: none, so it cannot
//     shift a line of text, widen the document, or swallow a click.
//   - Only transform and opacity are animated.
//   - Any input skips it. If anything throws, the overlay is removed and the
//     page underneath is untouched and complete.
import { DOMAIN, LEVELS, MINIMA, V, gradV, isIndexLevel } from '../lib/landscape/mb';
import { isoSegments, joinSegments, sampleGrid } from '../lib/landscape/contours';

/** Beat boundaries as fractions of the whole run. */
const SCATTER_END = 0.17; // noise is all there is
const DESCEND_END = 0.63; // annealing down the gradient
const PATH_END = 0.82; // the minimum-energy path draws through the saddles
const TOTAL_MS = 2600;

// Integration. The gradient of this potential spans four orders of magnitude
// between the flats and the outer walls, so a raw step is useless: it either
// crawls in the basins or explodes on the walls. The drive is the gradient
// direction with its magnitude squashed through |g| / (|g| + SOFT), which
// keeps the physics (steep means fast, flat means slow) inside a bounded step.
//
// Near a minimum the drive vanishes and the noise term is all that is left, so
// the particles pool at a radius set by the temperature rather than collapsing
// onto a point. These numbers were fitted to put the median particle 0.34 world
// units from its basin a third of the way through the descent, 0.06 at the end
// of it, and to hold a pool whose 90th percentile is 0.11 world units wide.
const SOFT = 260;
const ACC = 0.003;
const SUBSTEPS = 2;
const DRAG = 0.91;
const T_HOT = 0.02; // jitter per frame at the top of the descent
const T_FLOOR = 0.008; // and what it anneals down to, which is what makes a pool
const ANNEAL = 2;

interface P {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  px: Float32Array; // previous position, for the motion streak
  py: Float32Array;
  n: number;
}

interface Ctx {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  p: P;
  /** the plotted box inside the overlay, in CSS pixels */
  box: { x: number; y: number; w: number; h: number };
  w: number;
  h: number;
  dpr: number;
  t0: number;
  last: number;
  frame: number;
  raf: number;
  done: boolean;
  mep: [number, number][];
  contours: { pts: [number, number][]; index: boolean }[];
  /** the contours, pre-rendered once at the current size */
  surface: HTMLCanvasElement | null;
  ink: string;
  hot: string;
  rule: string;
  paper: string;
  font: string;
}

// A fixed table of unit noise, generated from a hash so it is the same every
// run. Two Math.sin calls per particle per frame is real work at this count;
// two array reads are not.
const NOISE_N = 4096;
const NOISE = (() => {
  const a = new Float32Array(NOISE_N);
  for (let i = 0; i < NOISE_N; i++) {
    const h = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    a[i] = h - Math.floor(h) - 0.5;
  }
  return a;
})();

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Remap t from [a, b] onto [0, 1], flat outside. */
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (u: number) => 1 - Math.pow(1 - u, 3);
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * A descent path from a start point down to a minimum, integrated rather than
 * drawn. Used to trace the route over each saddle, which is the line the figure
 * in the hero marks as the minimum-energy path.
 */
function descentPath(x: number, y: number, steps: number): [number, number][] {
  const out: [number, number][] = [];
  const g: [number, number] = [0, 0];
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < steps; i++) {
    gradV(x, y, g);
    const m = Math.sqrt(g[0] * g[0] + g[1] * g[1]) + SOFT;
    vx = vx * 0.86 - (g[0] / m) * 0.004;
    vy = vy * 0.86 - (g[1] / m) * 0.004;
    x += vx;
    y += vy;
    out.push([x, y]);
  }
  return out;
}

/**
 * The route A to B over both saddles, built by rolling downhill from just off
 * each saddle. Close enough to the string-method path to read as the same line,
 * and it costs no build-time data.
 */
function buildRoute(): [number, number][] {
  // S1 sits between A and C; S2 between C and B. Nudging off each saddle along
  // the unstable direction and integrating down gives the two halves.
  const a = descentPath(-0.84, 0.66, 260).reverse(); // down into A
  const c1 = descentPath(-0.8, 0.59, 260); // down into C
  const c2 = descentPath(0.18, 0.32, 240).reverse(); // back up out of C
  const b = descentPath(0.24, 0.27, 300); // down into B
  return [...a, ...c1, ...c2, ...b];
}

function makeParticles(n: number): P {
  const p: P = {
    x: new Float32Array(n),
    y: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    px: new Float32Array(n),
    py: new Float32Array(n),
    n,
  };
  // Deterministic scatter: a low-discrepancy sequence covers the window evenly
  // without clumps, and it is the same every time, which makes the first beat
  // reproducible between loads and between machines.
  const g = 1.3247179572447458; // plastic number, the 2D analogue of the golden ratio
  const a1 = 1 / g;
  const a2 = 1 / (g * g);
  for (let i = 0; i < n; i++) {
    const u = (0.5 + a1 * (i + 1)) % 1;
    const v = (0.5 + a2 * (i + 1)) % 1;
    p.x[i] = DOMAIN.x0 + u * (DOMAIN.x1 - DOMAIN.x0);
    p.y[i] = DOMAIN.y0 + v * (DOMAIN.y1 - DOMAIN.y0);
    p.px[i] = p.x[i];
    p.py[i] = p.y[i];
  }
  return p;
}

/** One frame of the dynamics at temperature `temp`. */
function step(p: P, temp: number, frame: number, drive: number): void {
  const g: [number, number] = [0, 0];
  for (let i = 0; i < p.n; i++) {
    p.px[i] = p.x[i];
    p.py[i] = p.y[i];
    let x = p.x[i];
    let y = p.y[i];
    let vx = p.vx[i];
    let vy = p.vy[i];
    for (let s = 0; s < SUBSTEPS; s++) {
      gradV(x, y, g);
      const m = Math.sqrt(g[0] * g[0] + g[1] * g[1]) + SOFT;
      vx = vx * DRAG - (g[0] / m) * ACC * drive;
      vy = vy * DRAG - (g[1] / m) * ACC * drive;
      x += vx;
      y += vy;
    }
    if (temp > 0.0001) {
      // Deterministic jitter, read out of the table above. Two coprime strides
      // keep the x and y draws from marching in step, and no Math.random means
      // two loads of the page produce the same run.
      vx += NOISE[(i * 7 + frame * 131) & (NOISE_N - 1)] * temp;
      vy += NOISE[(i * 13 + frame * 523 + 1021) & (NOISE_N - 1)] * temp;
    }
    // The outer walls of this potential climb steeply, so a reflection off the
    // edge of the plotted window is both cheap and roughly what the surface
    // would have done anyway.
    if (x < DOMAIN.x0) {
      x = DOMAIN.x0;
      vx = Math.abs(vx) * 0.3;
    } else if (x > DOMAIN.x1) {
      x = DOMAIN.x1;
      vx = -Math.abs(vx) * 0.3;
    }
    if (y < DOMAIN.y0) {
      y = DOMAIN.y0;
      vy = Math.abs(vy) * 0.3;
    } else if (y > DOMAIN.y1) {
      y = DOMAIN.y1;
      vy = -Math.abs(vy) * 0.3;
    }
    p.x[i] = x;
    p.y[i] = y;
    p.vx[i] = vx;
    p.vy[i] = vy;
  }
}

/**
 * The contour lines, marched in the browser from the same modules the
 * build-time figure uses, so the shape under the particles is the real surface
 * and not a decoration drawn to look like one.
 */
function buildContours(): { pts: [number, number][]; index: boolean }[] {
  const nx = 97;
  const ny = Math.round((nx * (DOMAIN.y1 - DOMAIN.y0)) / (DOMAIN.x1 - DOMAIN.x0));
  const grid = sampleGrid(V, nx, ny, DOMAIN);
  const out: { pts: [number, number][]; index: boolean }[] = [];
  const sx = (DOMAIN.x1 - DOMAIN.x0) / (nx - 1);
  const sy = (DOMAIN.y1 - DOMAIN.y0) / (ny - 1);
  for (const level of LEVELS) {
    const seg = isoSegments(grid.values, nx, ny, level);
    if (!seg.length) continue;
    for (const line of joinSegments(seg)) {
      const pts: [number, number][] = [];
      for (let i = 0; i < line.length; i += 2) {
        pts.push([DOMAIN.x0 + line[i] * sx, DOMAIN.y0 + line[i + 1] * sy]);
      }
      if (pts.length > 1) out.push({ pts, index: isIndexLevel(level) });
    }
  }
  return out;
}

function layout(c: Ctx): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.w = w;
  c.h = h;
  c.dpr = dpr;
  c.canvas.width = Math.round(w * dpr);
  c.canvas.height = Math.round(h * dpr);
  c.canvas.style.width = `${w}px`;
  c.canvas.style.height = `${h}px`;

  // The plotted box keeps the potential's own aspect ratio, so the landing
  // transform onto the hero figure is a pure uniform scale.
  const ar = (DOMAIN.x1 - DOMAIN.x0) / (DOMAIN.y1 - DOMAIN.y0);
  const maxW = Math.min(w * 0.82, h * 0.82 * ar);
  const bw = maxW;
  const bh = bw / ar;
  c.box = { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh };
  c.surface = renderSurface(c);
}

/** Stroke every contour once into its own canvas, at the current size. */
function renderSurface(c: Ctx): HTMLCanvasElement | null {
  if (c.w < 1 || c.h < 1) return null;
  const off = document.createElement('canvas');
  off.width = Math.round(c.w * c.dpr);
  off.height = Math.round(c.h * c.dpr);
  const g = off.getContext('2d');
  if (!g) return null;
  g.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = c.rule;
  for (const line of c.contours) {
    g.globalAlpha = line.index ? 0.95 : 0.5;
    g.lineWidth = line.index ? 1.5 : 0.85;
    g.beginPath();
    for (let i = 0; i < line.pts.length; i++) {
      const [px, py] = toPx(c, line.pts[i][0], line.pts[i][1]);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
  }
  return off;
}

const toPx = (c: Ctx, x: number, y: number): [number, number] => [
  c.box.x + ((x - DOMAIN.x0) / (DOMAIN.x1 - DOMAIN.x0)) * c.box.w,
  c.box.y + c.box.h - ((y - DOMAIN.y0) / (DOMAIN.y1 - DOMAIN.y0)) * c.box.h,
];

function draw(c: Ctx, t: number): void {
  const g = c.g;
  g.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
  g.clearRect(0, 0, c.w, c.h);

  const scatter = span(t, 0, SCATTER_END * 0.42);
  const descend = span(t, SCATTER_END, DESCEND_END);
  const path = span(t, DESCEND_END, PATH_END);
  const land = span(t, PATH_END, 1);
  const leaving = easeInOut(land);

  // The surface comes up under the particles during the descent, so a reader
  // sees what they are falling into rather than only that they fell. It is
  // static geometry, so it is rendered once and then composited.
  const surf = easeOut(span(t, SCATTER_END * 0.6, DESCEND_END * 0.95)) * (1 - 0.3 * leaving);
  if (surf > 0.01 && c.surface) {
    g.globalAlpha = surf;
    g.drawImage(c.surface, 0, 0, c.w, c.h);
    g.globalAlpha = 1;
  }

  // The particles fade in, burn through the descent, and dim once the path
  // takes over as the subject.
  const fieldAlpha = easeOut(scatter) * (1 - 0.45 * easeInOut(path)) * (1 - 0.2 * leaving);
  // Motion streaks. Through the descent a particle is drawn as the segment it
  // just travelled, which is what makes the flow read as flow rather than as a
  // cloud of dots rearranging itself.
  const streaking = easeOut(descend) * (1 - easeInOut(path));
  const p = c.p;

  g.lineCap = 'round';
  for (let i = 0; i < p.n; i++) {
    const [x1, y1] = toPx(c, p.x[i], p.y[i]);
    const sdx = p.x[i] - p.px[i];
    const sdy = p.y[i] - p.py[i];
    const speed = Math.sqrt(sdx * sdx + sdy * sdy);
    // Fast particles read warm and slow ones read as ink: the energy is in the
    // colour, with no legend to read.
    // Speeds run to about 0.04 world units a frame on the steep walls. Mapping
    // the top half of that range onto the warm end keeps the field mostly ink,
    // with heat only where the surface is actually steep.
    const hot = clamp01((speed - 0.013) * 42);
    const a = fieldAlpha * (0.5 + 0.5 * hot);
    if (a <= 0.004) continue;
    g.globalAlpha = a;
    g.fillStyle = g.strokeStyle = hot > 0.55 ? c.hot : c.ink;
    if (streaking > 0.05 && speed > 0.006) {
      // The streak is stretched past the real step so the trail is legible at
      // this scale. It is an exaggeration of length, never of direction.
      const [x0, y0] = toPx(c, p.px[i], p.py[i]);
      const k = 1.5;
      g.lineWidth = 0.75 + 0.95 * hot;
      g.beginPath();
      g.moveTo(x1 - (x1 - x0) * k, y1 - (y1 - y0) * k);
      g.lineTo(x1, y1);
      g.stroke();
    } else {
      g.beginPath();
      g.arc(x1, y1, 1.05 + 0.75 * hot, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;

  // The route over the two saddles, drawn once the field has settled. It is the
  // line the hero figure marks with a dashed stroke, arriving here first.
  if (path > 0) {
    const u = easeInOut(path);
    const n = Math.max(2, Math.floor(c.mep.length * u));
    g.globalAlpha = (1 - 0.3 * leaving) * 0.95;
    g.strokeStyle = c.hot;
    g.lineWidth = 2.2;
    g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const [px, py] = toPx(c, c.mep[i][0], c.mep[i][1]);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    // The leading end carries a dot, so the line reads as being traced rather
    // than wiped in.
    const [hx, hy] = toPx(c, c.mep[n - 1][0], c.mep[n - 1][1]);
    g.fillStyle = c.hot;
    g.beginPath();
    g.arc(hx, hy, 3.4, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    // Each basin names itself as the path reaches it. Same letters, same
    // order, same meaning as the figure the overlay is about to land in.
    const labels: [string, number, number, number][] = [
      ['A', MINIMA.A.x, MINIMA.A.y, 0.06],
      ['C', MINIMA.C.x, MINIMA.C.y, 0.44],
      ['B', MINIMA.B.x, MINIMA.B.y, 0.78],
    ];
    const r = Math.max(10, Math.round(c.box.w * 0.016));
    g.font = `700 ${Math.round(r * 1.12)}px ${c.font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const [name, mx, my, at] of labels) {
      const a = clamp01((u - at) * 7) * (1 - leaving);
      if (a <= 0.01) continue;
      const [lx, ly] = toPx(c, mx, my);
      g.globalAlpha = a;
      g.fillStyle = c.ink;
      g.beginPath();
      g.arc(lx, ly, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = c.paper;
      g.fillText(name, lx, ly + 0.5);
    }
    g.globalAlpha = 1;
  }
}

/**
 * The landing. The overlay scales and translates so its plotted box comes to
 * rest exactly on the hero figure's own plot area, then fades out. The figure
 * underneath is arriving at the same time, so the big surface becomes the small
 * one rather than being replaced by it.
 */
function landTransform(c: Ctx): { s: number; dx: number; dy: number } | null {
  // The hero's own canvas, not its stage: the stage includes the axis furniture
  // around the plot, and this overlay draws the plotted square alone. The
  // component already positions that canvas exactly over the square, so using
  // it as the target makes the landing a pure uniform scale with no padding
  // arithmetic to keep in step with the figure.
  const target = document.querySelector<HTMLElement>('[data-landscape] [data-landscape-canvas]');
  if (!target) return null;
  const r = target.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return null;
  const s = r.width / c.box.w;
  const cx = c.box.x + c.box.w / 2;
  const cy = c.box.y + c.box.h / 2;
  const tx = r.left + r.width / 2;
  const ty = r.top + r.height / 2;
  return { s, dx: tx - cx, dy: ty - cy };
}

function finish(c: Ctx): void {
  if (c.done) return;
  c.done = true;
  cancelAnimationFrame(c.raf);
  document.documentElement.removeAttribute('data-intro');
  c.root.remove();
  // The home mascot waits for this rather than waving behind the overlay.
  document.dispatchEvent(new CustomEvent('intro:done'));
}

export function initIntro(): void {
  const root = document.querySelector<HTMLElement>('[data-intro-root]');
  if (!root) return;
  // The arming script already checked, but a preference can change between then
  // and now, and this module can in principle be reached another way.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.removeAttribute('data-intro');
    root.remove();
    return;
  }
  if (document.documentElement.getAttribute('data-intro') !== 'armed') {
    root.remove();
    return;
  }

  const canvas = root.querySelector<HTMLCanvasElement>('[data-intro-canvas]');
  const g = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !g) {
    document.documentElement.removeAttribute('data-intro');
    root.remove();
    return;
  }

  // Fewer points on a phone and on a machine that has told us it is small.
  const wide = window.innerWidth >= 900;
  const cores = navigator.hardwareConcurrency || 4;
  const n = wide && cores >= 4 ? 2200 : wide ? 1400 : 900;

  const c: Ctx = {
    root,
    canvas,
    g,
    p: makeParticles(n),
    box: { x: 0, y: 0, w: 1, h: 1 },
    w: 0,
    h: 0,
    dpr: 1,
    t0: 0,
    last: 0,
    frame: 0,
    raf: 0,
    done: false,
    mep: buildRoute(),
    contours: buildContours(),
    surface: null,
    ink: token('--ink-2', '#45433d'),
    hot: token('--orange', '#f09228'),
    rule: token('--rule-2', '#c4b89c'),
    paper: token('--paper', '#f6f1e5'),
    // Canvas cannot resolve a custom property, so the stack is read out once.
    font: token('--sans', 'system-ui, sans-serif'),
  };

  layout(c);

  // Four colours are read out of the stylesheet once, so a theme switched
  // while this is still running has to say so.
  document.addEventListener('theme:change', () => {
    if (c.done) return;
    c.ink = token('--ink-2', '#45433d');
    c.hot = token('--orange', '#f09228');
    c.rule = token('--rule-2', '#c4b89c');
    c.paper = token('--paper', '#f6f1e5');
    c.surface = renderSurface(c);
  });

  // Any input ends it. The overlay never takes pointer events, so these are
  // read off the window and the click still reaches whatever is underneath.
  // Skipping pulls the clock forward to the landing beat rather than cutting
  // the overlay off, so it always leaves the same way.
  const skip = (): void => {
    if (c.done || !c.t0) return;
    const elapsed = performance.now() - c.t0;
    if (elapsed < PATH_END * TOTAL_MS) c.t0 = performance.now() - PATH_END * TOTAL_MS;
  };
  const opts = { passive: true, once: true } as AddEventListenerOptions;
  window.addEventListener('pointerdown', skip, opts);
  window.addEventListener('keydown', skip, opts);
  window.addEventListener('wheel', skip, opts);
  window.addEventListener('touchstart', skip, opts);

  const frame = (now: number): void => {
    if (c.done) return;
    if (!c.t0) {
      c.t0 = now;
      c.last = now;
    }
    const t = (now - c.t0) / TOTAL_MS;
    if (t >= 1) {
      finish(c);
      return;
    }

    // Integrate only during the descent, and never more than a couple of frames
    // of catch-up if the tab was busy.
    if (t < PATH_END) {
      const u = span(t, SCATTER_END, DESCEND_END);
      const temp = T_FLOOR + (T_HOT - T_FLOOR) * Math.pow(1 - u, ANNEAL);
      // Through the first beat the surface is not pulling yet: the field only
      // shimmers, so what a reader sees is noise before it is anything else.
      // The drive then eases in over the last third of that beat.
      const drive = easeInOut(span(t, SCATTER_END * 0.62, SCATTER_END * 1.25));
      const frames = Math.min(2, Math.max(1, Math.round((now - c.last) / 16.7) || 1));
      for (let k = 0; k < frames; k++) step(c.p, temp, c.frame++, drive);
    }
    c.last = now;

    draw(c, t);

    if (t >= PATH_END) {
      const u = easeInOut(span(t, PATH_END, 1));
      const to = landTransform(c);
      if (to) {
        const s = 1 + (to.s - 1) * u;
        canvas.style.transform = `translate(${(to.dx * u).toFixed(2)}px, ${(to.dy * u).toFixed(2)}px) scale(${s.toFixed(4)})`;
      }
      root.style.opacity = String(1 - u);
      // The cream backdrop clears first, so the page is already readable while
      // the figure is still coming down.
      root.style.setProperty('--intro-veil', String(1 - clamp01(u * 1.6)));
    }

    c.raf = requestAnimationFrame(frame);
  };

  // A hard ceiling, in case a frame never arrives.
  window.setTimeout(() => finish(c), TOTAL_MS + 1400);
  window.addEventListener('resize', () => !c.done && layout(c), { passive: true });
  c.raf = requestAnimationFrame(frame);
}
