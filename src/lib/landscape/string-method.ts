// The simplified string method (E, Ren, and Vanden-Eijnden, J. Chem. Phys. 126,
// 164103, 2007): evolve a chain of images down the gradient, then
// redistribute them at equal arc length, until the chain stops moving. The
// converged chain is the minimum-energy path between its two endpoints.
import { V, gradV } from './mb';

export interface PathPoint {
  x: number;
  y: number;
  E: number;
  s: number; // normalised arc length in [0, 1]
}

function reparametrise(xs: Float64Array, ys: Float64Array): void {
  const n = xs.length;
  const L = new Float64Array(n);
  for (let i = 1; i < n; i++) L[i] = L[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  const total = L[n - 1];
  const nx = new Float64Array(n);
  const ny = new Float64Array(n);
  let k = 1;
  for (let i = 0; i < n; i++) {
    const target = (total * i) / (n - 1);
    while (k < n - 1 && L[k] < target) k++;
    const seg = L[k] - L[k - 1] || 1;
    const t = Math.min(1, Math.max(0, (target - L[k - 1]) / seg));
    nx[i] = xs[k - 1] + t * (xs[k] - xs[k - 1]);
    ny[i] = ys[k - 1] + t * (ys[k] - ys[k - 1]);
  }
  xs.set(nx);
  ys.set(ny);
}

export function stringMethod(
  start: { x: number; y: number },
  end: { x: number; y: number },
  { images = 64, steps = 4000, dt = 2e-5 } = {},
): PathPoint[] {
  const xs = new Float64Array(images);
  const ys = new Float64Array(images);
  // initial guess: a gentle arc rather than a straight line, so the string
  // starts on the correct side of the high ground between the endpoints
  for (let i = 0; i < images; i++) {
    const t = i / (images - 1);
    xs[i] = start.x + t * (end.x - start.x) + 0.25 * Math.sin(Math.PI * t);
    ys[i] = start.y + t * (end.y - start.y) - 0.05 * Math.sin(Math.PI * t);
  }
  const g: [number, number] = [0, 0];
  for (let it = 0; it < steps; it++) {
    for (let i = 0; i < images; i++) {
      gradV(xs[i], ys[i], g);
      xs[i] -= dt * g[0];
      ys[i] -= dt * g[1];
    }
    reparametrise(xs, ys);
  }
  const L = [0];
  for (let i = 1; i < images; i++) L.push(L[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  const total = L[images - 1];
  return Array.from({ length: images }, (_, i) => ({ x: xs[i], y: ys[i], E: V(xs[i], ys[i]), s: L[i] / total }));
}
