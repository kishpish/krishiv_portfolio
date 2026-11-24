// Projection and shading for the hero landscape, drawn as the surface it is.
//
// The figure has always been a contour map of the Müller-Brown potential,
// which is the honest way to print a surface on paper. On a screen there is no
// reason to flatten it: the thing the whole site is about is a particle moving
// over terrain, paying energy to cross a pass, and terrain is easier to read as
// terrain. So this projects the same potential as a height field.
//
// Nothing here is decoration standing in for the physics. The height is V, the
// normal used for shading is the analytic gradient of V, and a contour at
// level L is drawn at height L, so it lies on the surface exactly rather than
// being draped over it approximately.

import { DOMAIN, gradV } from './mb';

/** The band of energy the surface occupies. V runs far higher than this on the
 *  outer walls; clamping keeps the interesting range legible instead of
 *  spending all the height on a corner nobody looks at. */
export const Z_LO = -150;
/* The outer walls of this potential climb into the hundreds, and giving them
   room spends the whole vertical range on ground nobody reads. Everything
   above zero is flattened into a rim instead, which leaves the full height for
   the band the basins and the passes actually occupy: A at -147, B at -108,
   C at -81, and the two saddles at -72 and -41. */
export const Z_HI = 0;

export interface View {
  /** rotation about the vertical axis, radians */
  yaw: number;
  /** tilt towards the viewer, radians: 0 is edge on, PI/2 is straight down */
  pitch: number;
  /** pixels of the plot box */
  w: number;
  h: number;
  /** how tall the relief stands relative to the plan, 0 is flat */
  relief: number;
  /** solved by fitView so the projected surface fills its box and no more */
  fit: { scale: number; dx: number; dy: number };
}

export interface Projected {
  sx: number;
  sy: number;
  /** larger is further from the viewer; only used for ordering */
  depth: number;
}

const SPAN_X = DOMAIN.x1 - DOMAIN.x0;
const SPAN_Y = DOMAIN.y1 - DOMAIN.y0;
const MID_X = (DOMAIN.x0 + DOMAIN.x1) / 2;
const MID_Y = (DOMAIN.y0 + DOMAIN.y1) / 2;
/** Weak perspective. Enough that the far edge narrows and the near edge leans
 *  out, not enough to make a scientific surface look like a game. */
const PERSP = 0.16;

/**
 * World point to screen. `z` is an energy, not a normalized height, so callers
 * can pass V, a contour level or V plus a bias and get a point that sits on the
 * same surface.
 */
export function project(v: View, x: number, y: number, z: number, out: Projected): Projected {
  const nx = (x - MID_X) / (SPAN_X / 2);
  const ny = (y - MID_Y) / (SPAN_Y / 2);
  const nz = (heightOf(z) - 0.42) * 2;

  const cy = Math.cos(v.yaw);
  const sy = Math.sin(v.yaw);
  const rx = nx * cy - ny * sy;
  const ry = nx * sy + ny * cy;

  // Tilt: at pitch 0 the surface is seen edge on and the relief is all of the
  // vertical; at pitch PI/2 it is seen from above and the relief vanishes,
  // which is the contour map the figure used to be.
  const cp = Math.cos(v.pitch);
  const sp = Math.sin(v.pitch);
  const depth = ry * sp;
  const up = ry * cp;

  const k = 1 / (1 + PERSP * (depth + 1));
  const halfSpan = Math.min(v.w, v.h * 1.55) * 0.5;
  const scale = halfSpan * 0.92 * k;

  out.sx = v.fit.dx + (v.w / 2 + rx * scale) * v.fit.scale;
  out.sy = v.fit.dy + (v.h / 2 - (-up * 0.5 + nz * v.relief) * scale) * v.fit.scale;
  out.depth = depth;
  return out;
}

const FP: Projected = { sx: 0, sy: 0, depth: 0 };

/**
 * Solve the scale and offset that put the whole projected surface inside its
 * box with a small margin.
 *
 * Without this the extent depends on the view angle and the relief, so the
 * terrain grows out of the figure as soon as the camera moves. A coarse
 * lattice is enough: the surface is smooth, and the extremes are at the walls.
 */
export function fitView(v: View, f: (x: number, y: number) => number): void {
  v.fit = { scale: 1, dx: 0, dy: 0 };
  if (v.w < 2 || v.h < 2) return;
  const N = 40;
  let lo = Infinity;
  let hi = -Infinity;
  let top = Infinity;
  let bot = -Infinity;
  for (let j = 0; j <= N; j++) {
    const y = DOMAIN.y0 + ((DOMAIN.y1 - DOMAIN.y0) * j) / N;
    for (let i = 0; i <= N; i++) {
      const x = DOMAIN.x0 + ((DOMAIN.x1 - DOMAIN.x0) * i) / N;
      const z = f(x, y);
      // Only ground that is actually drawn counts. The high corners fade out
      // to nothing, and letting them set the extent shrinks the visible
      // terrain into the middle of its box to make room for geometry no one
      // can see.
      if (solidity(z) < 0.15) continue;
      project(v, x, y, z, FP);
      if (FP.sx < lo) lo = FP.sx;
      if (FP.sx > hi) hi = FP.sx;
      if (FP.sy < top) top = FP.sy;
      if (FP.sy > bot) bot = FP.sy;
    }
  }
  if (!Number.isFinite(lo)) return;
  // Room for the marker discs, which are drawn at the stationary points and
  // stick out past the lattice the extent was measured from.
  const pad = 0.045;
  const sw = hi - lo;
  const sh = bot - top;
  if (sw < 1 || sh < 1) return;
  const scale = Math.min((v.w * (1 - pad * 2)) / sw, (v.h * (1 - pad * 2)) / sh);
  v.fit = {
    scale,
    dx: v.w / 2 - ((lo + hi) / 2) * scale,
    dy: v.h / 2 - ((top + bot) / 2) * scale,
  };
}

const G: [number, number] = [0, 0];

/**
 * Lambert shading for the surface at a point, from the analytic gradient.
 *
 * For a height field z = f(x, y) the surface normal is (-f_x, -f_y, 1), so the
 * gradient the simulation already computes is also exactly what the light
 * needs. The gradient is scaled into the same normalized height the projection
 * uses, or the shading would be set by the units of the potential rather than
 * by the shape a reader can see.
 */
export function shade(v: View, x: number, y: number): number {
  gradV(x, y, G);
  const kz = (2 * v.relief) / (Z_HI - Z_LO);
  const fx = (G[0] * kz) / (2 / SPAN_X);
  const fy = (G[1] * kz) / (2 / SPAN_Y);
  const inv = 1 / Math.sqrt(fx * fx + fy * fy + 1);
  // Light over the viewer's left shoulder, the convention every relief map and
  // every shaded figure in the literature uses, so slopes read as slopes.
  const lx = -0.55;
  const ly = -0.42;
  const lz = 0.72;
  const diffuse = (-fx * lx - fy * ly + lz) * inv;
  return Math.max(0, Math.min(1, 0.34 + 0.66 * diffuse));
}

/** Where a point sits in the energy band, 0 at the deepest, 1 at the top. */
export function depthFraction(z: number): number {
  return (Math.max(Z_LO, Math.min(Z_HI, z)) - Z_LO) / (Z_HI - Z_LO);
}

/**
 * Energy to height, with the deep end compressed.
 *
 * A is far deeper than the other two wells: on this band A sits at 0.02 of the
 * range, B at 0.28 and C at 0.46. Mapped straight, A becomes a chasm that eats
 * the whole vertical and flattens B, C and both saddles into dimples on its
 * wall, which is the opposite of what the figure is for. The exponent lifts
 * the floor without touching the order, so all three wells and both passes are
 * legible at once and A is still visibly the deepest.
 */
export function heightOf(z: number): number {
  return Math.pow(depthFraction(z), 0.55);
}

/**
 * How solid the surface is at this energy.
 *
 * Everything above the band is clamped, so drawing it opaque ends the terrain
 * in a hard polygon with straight edges that are an artefact of the clamp
 * rather than anything in the potential. Fading it out instead lets the high
 * ground dissolve into the page, which is both better looking and more honest
 * about where the data stops.
 */
export function solidity(z: number): number {
  const t = depthFraction(z);
  return t <= 0.68 ? 1 : Math.max(0, 1 - (t - 0.68) / 0.3);
}
