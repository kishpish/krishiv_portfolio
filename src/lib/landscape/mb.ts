// The Müller–Brown potential (Müller and Brown, Theor. Chim. Acta 53, 75, 1979):
// a sum of four anisotropic Gaussians with three minima and two saddle points.
// It is the standard two-dimensional test surface for minimum-energy-path,
// string, and transition-path methods.
//
// V(x, y) = Σ_k A_k exp( a_k (x - x0_k)^2 + b_k (x - x0_k)(y - y0_k) + c_k (y - y0_k)^2 )

const A = [-200, -100, -170, 15];
const a = [-1, -1, -6.5, 0.7];
const b = [0, 0, 11, 0.6];
const c = [-10, -10, -6.5, 0.7];
const X0 = [1, 0, -0.5, -1];
const Y0 = [0, 0.5, 1.5, 1];

export function V(x: number, y: number): number {
  let v = 0;
  for (let k = 0; k < 4; k++) {
    const dx = x - X0[k];
    const dy = y - Y0[k];
    v += A[k] * Math.exp(a[k] * dx * dx + b[k] * dx * dy + c[k] * dy * dy);
  }
  return v;
}

/** Analytic gradient, written into `out` to avoid allocation in hot loops. */
export function gradV(x: number, y: number, out: [number, number] = [0, 0]): [number, number] {
  let gx = 0;
  let gy = 0;
  for (let k = 0; k < 4; k++) {
    const dx = x - X0[k];
    const dy = y - Y0[k];
    const e = A[k] * Math.exp(a[k] * dx * dx + b[k] * dx * dy + c[k] * dy * dy);
    gx += e * (2 * a[k] * dx + b[k] * dy);
    gy += e * (b[k] * dx + 2 * c[k] * dy);
  }
  out[0] = gx;
  out[1] = gy;
  return out;
}

/** The plotted window, in potential coordinates. */
export const DOMAIN = { x0: -1.5, x1: 1.1, y0: -0.35, y1: 2.0 } as const;

export interface Point {
  x: number;
  y: number;
  E: number;
  label: string;
}

/** Newton refinement of a stationary point (minimum or saddle) from a nearby guess. */
function refine(x: number, y: number): [number, number] {
  const h = 1e-5;
  const g = [0, 0] as [number, number];
  const gp = [0, 0] as [number, number];
  for (let it = 0; it < 60; it++) {
    gradV(x, y, g);
    gradV(x + h, y, gp);
    const hxx = (gp[0] - g[0]) / h;
    const hxy = (gp[1] - g[1]) / h;
    gradV(x, y + h, gp);
    const hyy = (gp[1] - g[1]) / h;
    const det = hxx * hyy - hxy * hxy;
    if (Math.abs(det) < 1e-12) break;
    const sx = (hyy * g[0] - hxy * g[1]) / det;
    const sy = (-hxy * g[0] + hxx * g[1]) / det;
    x -= sx;
    y -= sy;
    if (Math.hypot(sx, sy) < 1e-12) break;
  }
  return [x, y];
}

const mk = (label: string, gx: number, gy: number): Point => {
  const [x, y] = refine(gx, gy);
  return { x, y, E: V(x, y), label };
};

/** Minima, labelled A (global), B, C as in most of the literature. */
export const MINIMA = {
  A: mk('A', -0.558, 1.442),
  B: mk('B', 0.623, 0.028),
  C: mk('C', -0.05, 0.467),
};

/** Saddles: S1 between A and C, S2 between C and B. */
export const SADDLES = {
  S1: mk('‡', -0.822, 0.624),
  S2: mk('‡', 0.212, 0.293),
};

/** Contour levels used everywhere the surface is drawn. */
export const LEVELS: number[] = (() => {
  const out: number[] = [];
  for (let e = -140; e <= 40; e += 10) out.push(e);
  return out;
})();

/** Every fifth contour is drawn heavier, like an index contour on a topographic map. */
export const isIndexLevel = (e: number) => e % 50 === 0;
