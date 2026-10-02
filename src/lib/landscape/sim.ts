// Underdamped Langevin dynamics on the Müller–Brown surface, plus a
// well-tempered metadynamics bias held on a grid. Shared by the build (to draw
// the static trajectory) and the browser (to animate the hero).
//
// Integrator: BAOAB (Leimkuhler and Matthews), unit mass.
// Bias: Gaussian hills of height w0 * exp(-Vb / dT) deposited every `stride`
// steps at the walker's position (Barducci, Bussi, Parrinello 2008).
import { V, gradV, DOMAIN } from './mb';

/** Small deterministic PRNG so static renders are reproducible. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussianFrom(rand: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = rand() * 2 - 1;
      v = rand() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const m = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * m;
    return u * m;
  };
}

export interface SimParams {
  dt: number;
  gamma: number;
  kT: number;
  /** metadynamics */
  hillHeight: number;
  hillWidth: number;
  stride: number;
  deltaT: number;
  /**
   * Soft wall keeping the walker inside the plotted window. It has to be stiff
   * enough to turn back a walker carrying the accumulated metadynamics bias,
   * which reaches a few hundred energy units, plus whatever the cursor adds.
   */
  wall: number;
}

export const DEFAULT_PARAMS: SimParams = {
  dt: 6e-4,
  gamma: 7,
  kT: 9,
  hillHeight: 2.6,
  hillWidth: 0.075,
  stride: 40,
  deltaT: 90,
  wall: 300000,
};

/** A bias grid covering the plotted domain. Hills are splatted into it locally. */
export class BiasGrid {
  readonly nx: number;
  readonly ny: number;
  readonly values: Float32Array;
  readonly hx: number;
  readonly hy: number;
  hills = 0;
  constructor(nx: number, ny: number) {
    this.nx = nx;
    this.ny = ny;
    this.values = new Float32Array(nx * ny);
    this.hx = (DOMAIN.x1 - DOMAIN.x0) / (nx - 1);
    this.hy = (DOMAIN.y1 - DOMAIN.y0) / (ny - 1);
  }
  clear(): void {
    this.values.fill(0);
    this.hills = 0;
  }
  scale(f: number): void {
    for (let k = 0; k < this.values.length; k++) this.values[k] *= f;
  }
  /** bilinear sample of the bias and its gradient */
  sample(x: number, y: number, out: [number, number, number]): [number, number, number] {
    const fx = (x - DOMAIN.x0) / this.hx;
    const fy = (y - DOMAIN.y0) / this.hy;
    const i = Math.max(0, Math.min(this.nx - 2, Math.floor(fx)));
    const j = Math.max(0, Math.min(this.ny - 2, Math.floor(fy)));
    const tx = Math.max(0, Math.min(1, fx - i));
    const ty = Math.max(0, Math.min(1, fy - j));
    const v = this.values;
    const n = this.nx;
    const v00 = v[j * n + i];
    const v10 = v[j * n + i + 1];
    const v01 = v[(j + 1) * n + i];
    const v11 = v[(j + 1) * n + i + 1];
    out[0] = v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
    out[1] = ((v10 - v00) * (1 - ty) + (v11 - v01) * ty) / this.hx;
    out[2] = ((v01 - v00) * (1 - tx) + (v11 - v10) * tx) / this.hy;
    return out;
  }
  /** add a Gaussian of height h and width s centred at (x, y); returns the touched window */
  splat(x: number, y: number, h: number, s: number): void {
    const r = 3.2 * s;
    const i0 = Math.max(0, Math.floor((x - r - DOMAIN.x0) / this.hx));
    const i1 = Math.min(this.nx - 1, Math.ceil((x + r - DOMAIN.x0) / this.hx));
    const j0 = Math.max(0, Math.floor((y - r - DOMAIN.y0) / this.hy));
    const j1 = Math.min(this.ny - 1, Math.ceil((y + r - DOMAIN.y0) / this.hy));
    const inv = 1 / (2 * s * s);
    for (let j = j0; j <= j1; j++) {
      const gy = DOMAIN.y0 + j * this.hy - y;
      for (let i = i0; i <= i1; i++) {
        const gx = DOMAIN.x0 + i * this.hx - x;
        this.values[j * this.nx + i] += h * Math.exp(-(gx * gx + gy * gy) * inv);
      }
    }
  }
}

export interface External {
  /** an external Gaussian force field (the cursor): centre, height, width */
  x: number;
  y: number;
  h: number;
  s: number;
}

export class Walker {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  t = 0;
  steps = 0;
  readonly p: SimParams;
  readonly bias: BiasGrid | null;
  private readonly gauss: () => number;
  private readonly g: [number, number] = [0, 0];
  private readonly b: [number, number, number] = [0, 0, 0];
  external: External | null = null;

  constructor(x: number, y: number, p: SimParams, bias: BiasGrid | null, seed = 7) {
    this.x = x;
    this.y = y;
    this.p = p;
    this.bias = bias;
    this.gauss = gaussianFrom(mulberry32(seed));
  }

  /** total force at (x, y): -grad(V + bias + external + walls) */
  private force(x: number, y: number, out: [number, number]): [number, number] {
    gradV(x, y, this.g);
    let fx = -this.g[0];
    let fy = -this.g[1];
    if (this.bias) {
      this.bias.sample(x, y, this.b);
      fx -= this.b[1];
      fy -= this.b[2];
    }
    const e = this.external;
    if (e && e.h !== 0) {
      const dx = x - e.x;
      const dy = y - e.y;
      const k = e.h * Math.exp(-(dx * dx + dy * dy) / (2 * e.s * e.s)) / (e.s * e.s);
      fx += k * dx;
      fy += k * dy;
    }
    // soft quadratic walls just inside the plotted window
    const m = 0.04;
    const w = this.p.wall;
    if (x < DOMAIN.x0 + m) fx += w * (DOMAIN.x0 + m - x);
    if (x > DOMAIN.x1 - m) fx -= w * (x - DOMAIN.x1 + m);
    if (y < DOMAIN.y0 + m) fy += w * (DOMAIN.y0 + m - y);
    if (y > DOMAIN.y1 - m) fy -= w * (y - DOMAIN.y1 + m);
    // cap the force so an occasional excursion up a steep wall cannot blow up the integrator
    const mag = Math.hypot(fx, fy);
    const cap = 2500;
    if (mag > cap) {
      fx *= cap / mag;
      fy *= cap / mag;
    }
    out[0] = fx;
    out[1] = fy;
    return out;
  }

  private f: [number, number] = [0, 0];
  private primed = false;

  step(): void {
    const { dt, gamma, kT } = this.p;
    if (!this.primed) {
      this.force(this.x, this.y, this.f);
      this.primed = true;
    }
    // B
    this.vx += 0.5 * dt * this.f[0];
    this.vy += 0.5 * dt * this.f[1];
    // A
    this.x += 0.5 * dt * this.vx;
    this.y += 0.5 * dt * this.vy;
    // O
    const c1 = Math.exp(-gamma * dt);
    const c2 = Math.sqrt((1 - c1 * c1) * kT);
    this.vx = c1 * this.vx + c2 * this.gauss();
    this.vy = c1 * this.vy + c2 * this.gauss();
    // A
    this.x += 0.5 * dt * this.vx;
    this.y += 0.5 * dt * this.vy;
    // B
    this.force(this.x, this.y, this.f);
    this.vx += 0.5 * dt * this.f[0];
    this.vy += 0.5 * dt * this.f[1];

    this.t += dt;
    this.steps++;

    if (this.bias && this.p.hillHeight > 0 && this.steps % this.p.stride === 0) {
      this.bias.sample(this.x, this.y, this.b);
      const h = this.p.hillHeight * Math.exp(-this.b[0] / this.p.deltaT);
      this.bias.splat(this.x, this.y, h, this.p.hillWidth);
      this.bias.hills++;
    }
  }

  /** energy on the unbiased surface */
  energy(): number {
    return V(this.x, this.y);
  }
}

/** Which basin a point belongs to, by steepest descent on the unbiased surface. */
export function basinOf(x: number, y: number): 'A' | 'B' | 'C' {
  const g: [number, number] = [0, 0];
  for (let k = 0; k < 400; k++) {
    gradV(x, y, g);
    const n = Math.hypot(g[0], g[1]) || 1;
    const step = Math.min(0.01, 0.002 * n) / n;
    x -= step * g[0];
    y -= step * g[1];
  }
  const d = (px: number, py: number) => Math.hypot(x - px, y - py);
  const dA = d(-0.558, 1.442);
  const dB = d(0.623, 0.028);
  const dC = d(-0.05, 0.467);
  return dA < dB && dA < dC ? 'A' : dB < dC ? 'B' : 'C';
}
