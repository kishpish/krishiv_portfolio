// Build-time geometry for the per-page stills. Each one is a different view of
// the same Müller-Brown surface the hero draws, computed from the same
// functions, so no page gets a reprint of the front-page figure and nothing
// here is hand-drawn.
//
// This module only composes what mb.ts, contours.ts, string-method.ts and
// sim.ts already provide. The maths lives there.
import { V, DOMAIN, MINIMA, SADDLES, isIndexLevel } from './mb';
import { sampleGrid, isoSegments, joinSegments } from './contours';
import { Walker, DEFAULT_PARAMS } from './sim';
import { buildLandscape, toView, VIEW } from './figure';

const f1 = (n: number) => (Math.round(n * 2) / 2).toString();
const polyline = (pts: [number, number][]) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('');

export interface ViewContour {
  level: number;
  index: boolean;
  d: string;
}

/* ------------------------------------------------------------------ profile */

export interface ProfileMark {
  label: string;
  px: number;
  py: number;
  E: number;
}

export interface ProfileView {
  w: number;
  h: number;
  /** the energy curve along the minimum-energy path */
  d: string;
  /** the same curve closed to the baseline, for a soft fill under it */
  fill: string;
  marks: ProfileMark[];
  /** energy axis ticks, in view units */
  ticks: { v: number; py: number }[];
  lo: number;
  hi: number;
}

/**
 * Energy along the minimum-energy path, at reading scale rather than at the
 * 196 by 46 of the section-break motif, with the stationary points labelled.
 *
 * Drawn B to A, left to right, the same direction the dividers advance.
 */
export function profileView(w = 680, h = 230): ProfileView {
  const pad = { l: 34, r: 16, t: 20, b: 26 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const pts = buildLandscape().mepPoints;
  const Es = pts.map((p) => p.E);
  const lo = Math.min(...Es);
  const hi = Math.max(...Es);
  const px = (s: number) => pad.l + (1 - s) * iw;
  const py = (E: number) => pad.t + (1 - (E - lo) / (hi - lo)) * ih;

  const mapped = pts.map((p) => [px(p.s), py(p.E)] as [number, number]);
  const d = polyline(mapped);
  const fill = `${d}L${f1(mapped[mapped.length - 1][0])} ${f1(pad.t + ih)}L${f1(mapped[0][0])} ${f1(pad.t + ih)}Z`;

  // Label each stationary point at the path point nearest to it.
  const stationary = [MINIMA.B, SADDLES.S2, MINIMA.C, SADDLES.S1, MINIMA.A];
  const marks = stationary.map((sp) => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dist = Math.hypot(pts[i].x - sp.x, pts[i].y - sp.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return { label: sp.label, px: px(pts[best].s), py: py(pts[best].E), E: Math.round(pts[best].E) };
  });

  const ticks: { v: number; py: number }[] = [];
  for (let e = Math.ceil(lo / 25) * 25; e <= hi; e += 25) ticks.push({ v: e, py: py(e) });

  return { w, h, d, fill, marks, ticks, lo, hi };
}

/* --------------------------------------------------------------------- crop */

export interface CropView {
  w: number;
  h: number;
  contours: ViewContour[];
  points: { label: string; x: number; y: number }[];
  domain: { x0: number; x1: number; y0: number; y1: number };
  /** contour spacing, for the caption */
  step: number;
}

/**
 * A close crop on the global minimum and the saddle above it, contoured at
 * finer spacing than the full surface and drawn as lines only. Same function,
 * different window: what you would put in an inset.
 */
export function cropView(w = 560): CropView {
  const domain = { x0: -1.08, x1: -0.1, y0: 0.32, y1: 1.78 };
  const h = Math.round((w * (domain.y1 - domain.y0)) / (domain.x1 - domain.x0));
  const step = 5;
  const nx = 161;
  const ny = Math.round((nx * h) / w);
  const grid = sampleGrid(V, nx, ny, domain);
  const sx = w / (nx - 1);
  const sy = h / (ny - 1);

  const levels: number[] = [];
  for (let e = -150; e <= 60; e += step) levels.push(e);

  const contours: ViewContour[] = levels
    .map((level) => {
      const d = joinSegments(isoSegments(grid.values, nx, ny, level))
        .filter((l) => l.length >= 6)
        .map((l) => {
          const p: [number, number][] = [];
          for (let k = 0; k < l.length; k += 2) p.push([l[k] * sx, h - l[k + 1] * sy]);
          return polyline(p);
        })
        .join('');
      return { level, index: isIndexLevel(level), d };
    })
    .filter((c) => c.d.length > 0);

  const inside = (p: { x: number; y: number }) =>
    p.x > domain.x0 && p.x < domain.x1 && p.y > domain.y0 && p.y < domain.y1;
  const toCrop = (p: { x: number; y: number; label: string }) => ({
    label: p.label,
    x: ((p.x - domain.x0) / (domain.x1 - domain.x0)) * w,
    y: h - ((p.y - domain.y0) / (domain.y1 - domain.y0)) * h,
  });
  const points = [MINIMA.A, MINIMA.C, SADDLES.S1].filter(inside).map(toCrop);

  return { w, h, contours, points, domain, step };
}

/* ----------------------------------------------------------------- unsettled */

export interface WanderView {
  w: number;
  h: number;
  contours: ViewContour[];
  paths: { d: string; opacity: number }[];
  /** where each walker still was when the clock ran out */
  ends: [number, number][];
}

/**
 * Five walkers at a temperature high enough that none of them commit to a
 * basin. They are integrated for the same number of steps as the hero's
 * trajectory and simply do not arrive, which is the point.
 */
export function wanderView(): WanderView {
  const base = buildLandscape();
  const starts: [number, number, number][] = [
    [-0.9, 1.2, 3],
    [0.4, 0.2, 17],
    [-0.2, 1.7, 29],
    [0.75, 1.1, 41],
    [-1.2, 0.6, 53],
  ];
  const paths: { d: string; opacity: number }[] = [];
  const ends: [number, number][] = [];

  for (const [x0, y0, seed] of starts) {
    // Hot, so kT dominates the barriers it meets and it keeps being knocked
    // back out of whatever basin it falls into.
    const wk = new Walker(x0, y0, { ...DEFAULT_PARAMS, hillHeight: 0, kT: 48, gamma: 4 }, null, seed);
    const pts: [number, number][] = [toView(wk.x, wk.y)];
    for (let s = 0; s < 1400; s++) {
      wk.step();
      if (s % 5 === 0) pts.push(toView(wk.x, wk.y));
    }
    paths.push({ d: polyline(pts), opacity: 0.5 });
    ends.push(toView(wk.x, wk.y));
  }

  return { w: VIEW.w, h: VIEW.h, contours: base.contours, paths, ends };
}

export { DOMAIN, VIEW };
