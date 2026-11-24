// Live hero: the same Langevin walker and well-tempered metadynamics that the
// static figure was drawn with, run in the browser over the build-time SVG.
//
// Rules this file keeps:
//   - It never runs under prefers-reduced-motion, and it stops the moment the
//     preference changes.
//   - It pauses when off-screen, when the tab is hidden, and on demand.
//   - If anything throws, the static SVG is still there and still correct.
import { DOMAIN, LEVELS, MINIMA, SADDLES, V, isIndexLevel } from '../lib/landscape/mb';
import { BiasGrid, DEFAULT_PARAMS, Walker, basinOf } from '../lib/landscape/sim';
import { isoSegments, joinSegments, sampleGrid } from '../lib/landscape/contours';
import { stringMethod } from '../lib/landscape/string-method';
import { depthFraction, fitView, project, shade, solidity, type Projected, type View } from '../lib/landscape/surface3d';

const TRAIL = 900; // trajectory points kept
const MAX_STEP_MS = 34; // never integrate more than ~2 frames of catch-up

interface Ctx {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  walker: Walker;
  bias: BiasGrid;
  trail: Float32Array;
  trailN: number;
  trailHead: number;
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
  /** the page colour, re-read whenever the theme changes */
  paper: string;

  // ---- the surface
  view: View;
  /** where the view is easing to, so the pointer never yanks the camera */
  wantYaw: number;
  wantPitch: number;
  /** the terrain, contours, path and markers, redrawn only when the view moves */
  relief: HTMLCanvasElement | null;
  reliefYaw: number;
  reliefPitch: number;
  reliefW: number;
  reliefH: number;
  /** contour polylines in world coordinates, with the level each sits at.
   *  Built on the first frame that needs them rather than at startup: a page
   *  that never scrolls to the figure, or a reader with motion off, should not
   *  pay for marching squares and a string relaxation. */
  contours: { level: number; index: boolean; pts: Float64Array }[] | null;
  /** the minimum-energy path, A over both saddles to B */
  mep: Float64Array | null;
  palette: Palette;
}

interface Palette {
  paper: string;
  ink: string;
  deep: [number, number, number];
  high: [number, number, number];
  hot: string;
  rule: string;
}

/** The page colour as the browser has resolved it under the current theme. */
function surfaceColour(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#f6f1e5';
}

function setup(root: HTMLElement): Ctx | null {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-landscape-canvas]');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !ctx) return null;
  const bias = new BiasGrid(121, 110);
  const walker = new Walker(0.623, 0.028, DEFAULT_PARAMS, bias, 19);
  return {
    root,
    canvas,
    ctx,
    walker,
    bias,
    trail: new Float32Array(TRAIL * 2),
    trailN: 0,
    trailHead: 0,
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
    paper: surfaceColour(),
    // Looking down at the surface from the front left, which is where the
    // light comes from and where a relief map is conventionally lit.
    view: { yaw: 0.85, pitch: 1.0, w: 0, h: 0, relief: 0.46, fit: { scale: 1, dx: 0, dy: 0 } },
    wantYaw: 0.85,
    wantPitch: 1.0,
    relief: null,
    reliefYaw: NaN,
    reliefPitch: NaN,
    reliefW: 0,
    reliefH: 0,
    contours: null,
    mep: null,
    palette: readPalette(),
  };
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
  c.w = rect.width;
  c.h = rect.height;
  c.dpr = dpr;
  c.view.w = rect.width;
  c.view.h = rect.height;
}

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

/** Read the palette out of the stylesheet, so all three themes drive it. */
function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const tok = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
  const rgb = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  };
  const blue = rgb(tok('--blue', '#1772d0'));
  const paper = tok('--paper', '#f6f1e5');
  // The deepest ground is the brand blue; the high ground fades towards the
  // page, so the surface sits in the paper rather than on it.
  return {
    paper,
    ink: tok('--ink-2', '#45433d'),
    deep: blue,
    high: rgb(paper),
    hot: tok('--orange', '#f09228'),
    rule: tok('--rule-2', '#c4b89c'),
  };
}

/** Contour polylines in world coordinates, computed once. */
function buildContours(): { level: number; index: boolean; pts: Float64Array }[] {
  const nx = 121;
  const ny = Math.round((nx * (DOMAIN.y1 - DOMAIN.y0)) / (DOMAIN.x1 - DOMAIN.x0));
  const grid = sampleGrid(V, nx, ny, DOMAIN);
  const sx = (DOMAIN.x1 - DOMAIN.x0) / (nx - 1);
  const sy = (DOMAIN.y1 - DOMAIN.y0) / (ny - 1);
  const out: { level: number; index: boolean; pts: Float64Array }[] = [];
  for (const level of LEVELS) {
    const seg = isoSegments(grid.values, nx, ny, level);
    if (!seg.length) continue;
    for (const line of joinSegments(seg)) {
      if (line.length < 4) continue;
      const pts = new Float64Array(line.length);
      for (let i = 0; i < line.length; i += 2) {
        pts[i] = DOMAIN.x0 + line[i] * sx;
        pts[i + 1] = DOMAIN.y0 + line[i + 1] * sy;
      }
      out.push({ level, index: isIndexLevel(level), pts });
    }
  }
  return out;
}

/** A over the first saddle, through C, over the second, down into B. */
function buildMep(): Float64Array {
  const legs = [
    stringMethod(MINIMA.A, MINIMA.C, { images: 36, steps: 900 }),
    stringMethod(MINIMA.C, MINIMA.B, { images: 36, steps: 900 }),
  ];
  const pts: number[] = [];
  legs.forEach((leg, i) => {
    for (const p of leg.slice(i ? 1 : 0)) pts.push(p.x, p.y);
  });
  return Float64Array.from(pts);
}

const P0: Projected = { sx: 0, sy: 0, depth: 0 };
const P1: Projected = { sx: 0, sy: 0, depth: 0 };

/** Blend by energy, then light, and return one colour. Doing the light as a
 *  second translucent fill over the same path double-blends every shared edge
 *  and leaves the tessellation visible as a lattice. */
function faceColour(pal: Palette, t: number, lum: number, solid: number): string {
  const k = Math.pow(t, 0.72);
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    const base = pal.deep[i] + (pal.high[i] - pal.deep[i]) * k;
    const lit = lum > 0.62 ? base + (255 - base) * (lum - 0.62) * 0.9 : base * (1 - (0.62 - lum) * 0.9);
    // Fading is done by mixing towards the page rather than by lowering the
    // alpha. Every face is filled AND hairline-stroked to close the seam
    // between neighbours, and at alpha below one those two passes composite
    // twice along every shared edge, which turns the whole surface into a
    // visible weave. Mixing keeps each face opaque, and the page is what is
    // behind it anyway, so the result on screen is the same fade.
    out.push(Math.max(0, Math.min(255, Math.round(lit + (pal.high[i] - lit) * (1 - solid)))));
  }
  return `rgb(${out[0]} ${out[1]} ${out[2]})`;
}

/**
 * The terrain itself: quads over a grid, drawn back to front so nearer ground
 * covers what is behind it, each face flat-shaded from the analytic gradient.
 * Contour lines, the minimum-energy path and the stationary points go on in
 * the same pass because they move only when the view does.
 */
function renderRelief(c: Ctx): void {
  const { view } = c;
  if (view.w < 2 || view.h < 2) return;
  // Everything projected this frame, here and in draw(), shares this fit.
  fitView(view, V);
  c.contours ??= buildContours();
  c.mep ??= buildMep();
  const contours = c.contours;
  const mep = c.mep;
  const off = c.relief ?? document.createElement('canvas');
  off.width = Math.round(view.w * c.dpr);
  off.height = Math.round(view.h * c.dpr);
  const g = off.getContext('2d');
  if (!g) return;
  g.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
  g.clearRect(0, 0, view.w, view.h);

  // Coarser where there is less to spend: a phone does not need 3,500 faces.
  const wide = view.w >= 520;
  const NX = wide ? 58 : 40;
  const NY = Math.max(24, Math.round((NX * (DOMAIN.y1 - DOMAIN.y0)) / (DOMAIN.x1 - DOMAIN.x0)));
  const dx = (DOMAIN.x1 - DOMAIN.x0) / NX;
  const dy = (DOMAIN.y1 - DOMAIN.y0) / NY;
  g.lineWidth = 0.6;
  g.lineJoin = 'round';

  // Project the whole lattice once; every face then reads four corners out of
  // it instead of projecting its own.
  const px = new Float64Array((NX + 1) * (NY + 1));
  const py = new Float64Array((NX + 1) * (NY + 1));
  const pv = new Float64Array((NX + 1) * (NY + 1));
  const pd = new Float64Array((NX + 1) * (NY + 1));
  for (let j = 0; j <= NY; j++) {
    const y = DOMAIN.y0 + j * dy;
    for (let i = 0; i <= NX; i++) {
      const x = DOMAIN.x0 + i * dx;
      const v = V(x, y);
      project(view, x, y, v, P0);
      const k = j * (NX + 1) + i;
      px[k] = P0.sx;
      py[k] = P0.sy;
      pv[k] = v;
      pd[k] = P0.depth;
    }
  }

  // Back to front, by the depth each face actually projects to.
  //
  // Walking the rows and columns in the right order is almost right, and the
  // "almost" shows: where the surface folds over itself, as the near wall of
  // A's well does, a face can be nearer than one in the row behind it and the
  // wrong one wins, which punched white notches along that rim. Sorting costs
  // one pass over a few thousand faces and only happens when the view moves.
  const faces = new Int32Array(NX * NY);
  const fd = new Float64Array(NX * NY);
  for (let j = 0, n = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++, n++) {
      const a = j * (NX + 1) + i;
      faces[n] = a;
      fd[n] = pd[a] + pd[a + 1] + pd[a + NX + 1] + pd[a + NX + 2];
    }
  }
  const order = Array.from(faces.keys()).sort((m, n) => fd[n] - fd[m]);
  for (const n of order) {
    {
      const a = faces[n];
      const i = a % (NX + 1);
      const j = (a - i) / (NX + 1);
      const b = a + 1;
      const d = a + NX + 1;
      const e = d + 1;
      const vm = (pv[a] + pv[b] + pv[d] + pv[e]) / 4;
      const lum = shade(view, DOMAIN.x0 + (i + 0.5) * dx, DOMAIN.y0 + (j + 0.5) * dy);
      const t = depthFraction(vm);
      // Deep ground is saturated and dark, high ground washes out towards the
      // page. Light is applied on top, so the shape reads even where the
      // energy is flat.
      const solid = solidity(vm);
      if (solid <= 0.004) continue;
      const col = faceColour(c.palette, t, lum, solid);
      g.fillStyle = col;
      g.strokeStyle = col;
      g.beginPath();
      g.moveTo(px[a], py[a]);
      g.lineTo(px[b], py[b]);
      g.lineTo(px[e], py[e]);
      g.lineTo(px[d], py[d]);
      g.closePath();
      g.fill();
      // A hairline in the fill's own colour closes the sub-pixel gap between
      // neighbouring faces, which otherwise shows the page through as a mesh.
      g.stroke();
    }
  }
  g.globalAlpha = 1;

  // Contours, each at its own level, so they lie on the surface exactly.
  g.lineJoin = 'round';
  g.lineCap = 'round';
  for (const line of contours) {
    const fade = solidity(line.level);
    if (fade <= 0.02) continue;
    g.globalAlpha = (line.index ? 0.5 : 0.26) * fade;
    g.strokeStyle = c.palette.ink;
    g.lineWidth = line.index ? 1.15 : 0.7;
    g.beginPath();
    for (let i = 0; i < line.pts.length; i += 2) {
      project(view, line.pts[i], line.pts[i + 1], line.level, P0);
      if (i === 0) g.moveTo(P0.sx, P0.sy);
      else g.lineTo(P0.sx, P0.sy);
    }
    g.stroke();
  }
  g.globalAlpha = 1;

  // The minimum-energy path, lying in the valleys and over both passes.
  g.setLineDash([2, 5]);
  g.strokeStyle = c.palette.ink;
  g.lineWidth = 1.5;
  g.globalAlpha = 0.85;
  g.beginPath();
  for (let i = 0; i < mep.length; i += 2) {
    const x = mep[i];
    const y = mep[i + 1];
    project(view, x, y, V(x, y), P0);
    if (i === 0) g.moveTo(P0.sx, P0.sy);
    else g.lineTo(P0.sx, P0.sy);
  }
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 1;

  // The stationary points the path runs between.
  g.font = `600 ${Math.max(10, Math.round(view.w * 0.021))}px ${
    getComputedStyle(document.documentElement).getPropertyValue('--sans') || 'system-ui'
  }`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const marks: [string, number, number][] = [
    ['A', MINIMA.A.x, MINIMA.A.y],
    ['B', MINIMA.B.x, MINIMA.B.y],
    ['C', MINIMA.C.x, MINIMA.C.y],
    ['\u2021', SADDLES.S1.x, SADDLES.S1.y],
    ['\u2021', SADDLES.S2.x, SADDLES.S2.y],
  ];
  for (const [label, x, y] of marks) {
    project(view, x, y, V(x, y), P0);
    const r = Math.max(8, view.w * 0.015);
    g.fillStyle = c.palette.ink;
    g.beginPath();
    g.arc(P0.sx, P0.sy, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = c.palette.paper;
    g.fillText(label, P0.sx, P0.sy + 0.5);
  }

  c.relief = off;
  c.reliefYaw = view.yaw;
  c.reliefPitch = view.pitch;
  c.reliefW = view.w;
  c.reliefH = view.h;
}

/**
 * Draw the metadynamics bias as filled contours. This is the point of the
 * animation: you watch the basin the walker is sitting in fill up with hills
 * until it is shallow enough to escape over a saddle.
 */
function drawBias(c: Ctx): void {
  const { ctx, bias } = c;
  if (bias.hills === 0) return;
  // Wider apart than the flat figure used. In plan the rings nested tidily;
  // in relief they stack into the basin and a 7-unit interval reads as
  // scribble rather than as filling.
  const step = 16; // bias contour interval, in potential units
  const max = Math.max(...bias.values);
  if (max < step) return;
  const cols = bias.nx;
  const rows = bias.ny;
  ctx.save();
  ctx.lineWidth = 1;
  for (let level = step; level <= max; level += step) {
    ctx.beginPath();
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
        const X = (gi: number) => DOMAIN.x0 + (gi / (cols - 1)) * (DOMAIN.x1 - DOMAIN.x0);
        const Y = (gj: number) => DOMAIN.y0 + (gj / (rows - 1)) * (DOMAIN.y1 - DOMAIN.y0);
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
        // Metadynamics raises the floor of whatever basin the walker is in,
        // so each ring is drawn at the height the bias has actually reached:
        // the ground under it plus the level it encloses. They stack up the
        // inside of the well, and when the pile reaches a saddle the walker
        // leaves over it, which is the whole thing the figure is showing.
        for (let k = 0; k < seg.length; k += 4) {
          project(c.view, seg[k], seg[k + 1], V(seg[k], seg[k + 1]) + level, P0);
          project(c.view, seg[k + 2], seg[k + 3], V(seg[k + 2], seg[k + 3]) + level, P1);
          ctx.moveTo(P0.sx, P0.sy);
          ctx.lineTo(P1.sx, P1.sy);
        }
      }
    }
    const t = Math.min(1, level / 110);
    ctx.strokeStyle = `rgba(240, 146, 40, ${(0.16 + 0.3 * (1 - t)).toFixed(3)})`;
    ctx.stroke();
  }
  ctx.restore();
}

function draw(c: Ctx): void {
  const { ctx } = c;
  ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
  ctx.clearRect(0, 0, c.w, c.h);

  // The terrain is the expensive part and only changes when the view does, so
  // it is drawn once into its own canvas and composited from there.
  if (
    !c.relief ||
    c.reliefW !== c.view.w ||
    c.reliefH !== c.view.h ||
    Math.abs(c.reliefYaw - c.view.yaw) > 0.014 ||
    Math.abs(c.reliefPitch - c.view.pitch) > 0.014
  ) {
    renderRelief(c);
  }
  if (c.relief) ctx.drawImage(c.relief, 0, 0, c.w, c.h);

  drawBias(c);

  // trail, fading from old to new
  if (c.trailN > 1) {
    ctx.lineWidth = 1.7;
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
        const tx = c.trail[idx * 2];
        const ty = c.trail[idx * 2 + 1];
        project(c.view, tx, ty, V(tx, ty), P0);
        if (k === from) ctx.moveTo(P0.sx, P0.sy);
        else ctx.lineTo(P0.sx, P0.sy);
      }
      ctx.strokeStyle = `rgba(240, 146, 40, ${(0.06 + 0.72 * ((s + 1) / segments)).toFixed(3)})`;
      ctx.stroke();
    }
  }

  // the walker, standing on the ground rather than floating over a map
  project(c.view, c.walker.x, c.walker.y, V(c.walker.x, c.walker.y), P0);
  const px = P0.sx;
  const py = P0.sy;
  ctx.beginPath();
  ctx.arc(px, py, 4.6, 0, Math.PI * 2);
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
  const dtMs = Math.min(MAX_STEP_MS, c.last ? now - c.last : 16);
  c.last = now;
  // integrate a fixed number of substeps per millisecond of wall clock, so the
  // motion looks the same on a 60Hz and a 120Hz display
  const steps = Math.round(dtMs * 2.6);
  for (let s = 0; s < steps; s++) {
    c.walker.step();
    if (s % 9 === 0) pushTrail(c, c.walker.x, c.walker.y);
  }
  // Keep the bias bounded: once it is deep enough that the walker roams freely,
  // relax it so the figure keeps breathing instead of flattening the surface.
  if (c.bias.hills > 2600) {
    c.bias.scale(0.55);
    c.bias.hills = Math.round(c.bias.hills * 0.55);
  }
  // The camera eases towards where the pointer asked it to be, rather than
  // tracking it. A surface that snapped to the cursor would be a toy; one that
  // drifts a few degrees behind reads as something with weight.
  const ease = 1 - Math.pow(0.0016, dtMs / 1000);
  c.view.yaw += (c.wantYaw - c.view.yaw) * ease;
  c.view.pitch += (c.wantPitch - c.view.pitch) * ease;
  draw(c);
  readout(c, now);
  c.raf = requestAnimationFrame((t) => frame(c, t));
}

function start(c: Ctx): void {
  if (c.running || !c.visible || !c.wanted) return;
  resize(c);
  if (c.w < 1) return;
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

  // The surface colour is read once rather than every frame, so it has to be
  // told when the palette moves under it.
  document.addEventListener('theme:change', () => {
    c.paper = surfaceColour();
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

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        c.visible = e.isIntersecting;
        if (e.isIntersecting && !motionOff.matches) start(c);
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
  // driven out of the basin it is sitting in.
  const stage = root.querySelector<HTMLElement>('.landscape__stage') ?? root;
  const BASE_YAW = 0.85;
  const BASE_PITCH = 1.0;
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerType === 'touch') return;
    const rect = c.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const fx = (ev.clientX - rect.left) / rect.width;
    const fy = (ev.clientY - rect.top) / rect.height;
    const [x, y] = toWorld(c, ev.clientX - rect.left, ev.clientY - rect.top);
    c.walker.external = { x, y, h: 520, s: 0.26 };
    // A few degrees of parallax, so moving across the figure looks around it.
    // Bounded tightly: the lighting and the labels are placed for this view.
    c.wantYaw = BASE_YAW + (fx - 0.5) * 0.5;
    c.wantPitch = Math.max(0.6, Math.min(1.22, BASE_PITCH + (fy - 0.5) * 0.42));
  };
  stage.addEventListener('pointermove', onMove, { passive: true });
  stage.addEventListener('pointerleave', () => {
    c.walker.external = null;
    c.wantYaw = BASE_YAW;
    c.wantPitch = BASE_PITCH;
  });

  // The surface is drawn from the palette, so a theme change rebuilds it.
  document.addEventListener('theme:change', () => {
    c.palette = readPalette();
    c.relief = null;
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
