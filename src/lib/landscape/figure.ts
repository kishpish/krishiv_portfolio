// Build-time geometry for the landscape figure: contour paths, the
// minimum-energy path, stationary points, a shading raster, and a
// reproducible static trajectory. The Astro component turns this into SVG;
// the browser script reuses the same modules to animate it.
import { deflateSync } from 'node:zlib';
import { V, DOMAIN, LEVELS, MINIMA, SADDLES, isIndexLevel } from './mb';
import { sampleGrid, isoSegments, joinSegments } from './contours';
import { shadeAlpha } from './shade';
import { stringMethod, type PathPoint } from './string-method';
import { Walker, DEFAULT_PARAMS } from './sim';

export const VIEW = { w: 600, h: Math.round((600 * (DOMAIN.y1 - DOMAIN.y0)) / (DOMAIN.x1 - DOMAIN.x0)) };

export const toView = (x: number, y: number): [number, number] => [
  ((x - DOMAIN.x0) / (DOMAIN.x1 - DOMAIN.x0)) * VIEW.w,
  VIEW.h - ((y - DOMAIN.y0) / (DOMAIN.y1 - DOMAIN.y0)) * VIEW.h,
];

// Path coordinates are rounded to a half pixel in the 600-unit view box. At the
// sizes this figure is ever displayed that is below a device pixel, and it cuts
// the inline SVG roughly in half.
const f1 = (n: number) => (Math.round(n * 2) / 2).toString();

function polyline(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('');
}

export interface ContourPath {
  level: number;
  index: boolean;
  d: string;
}

/** Minimal PNG encoder (RGBA, no filtering), so the shading needs no image dependency. */
function encodePNG(w: number, h: number, rgba: Uint8Array): string {
  const crcTable = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Uint8Array) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', new Uint8Array(idat)), chunk('IEND', new Uint8Array())];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    png.set(p, o);
    o += p.length;
  }
  return `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
}

export interface LandscapeFigure {
  view: typeof VIEW;
  contours: ContourPath[];
  mep: string;
  mepPoints: PathPoint[];
  minima: { label: string; x: number; y: number; E: number }[];
  saddles: { label: string; x: number; y: number; E: number }[];
  shading: string;
  trajectory: { d: string; opacity: number }[];
  trajectoryEnd: [number, number];
  ticks: { x: { v: number; px: number }[]; y: { v: number; px: number }[] };
}

let cached: LandscapeFigure | null = null;

export function buildLandscape(): LandscapeFigure {
  if (cached) return cached;
  const nx = 129;
  const ny = Math.round((nx * VIEW.h) / VIEW.w);
  const grid = sampleGrid(V, nx, ny, DOMAIN);
  const sx = VIEW.w / (nx - 1);
  const sy = VIEW.h / (ny - 1);

  const contours: ContourPath[] = LEVELS.map((level) => {
    const lines = joinSegments(isoSegments(grid.values, nx, ny, level));
    const d = lines
      .filter((l) => l.length >= 6)
      .map((l) => {
        const pts: [number, number][] = [];
        for (let k = 0; k < l.length; k += 2) pts.push([l[k] * sx, VIEW.h - l[k + 1] * sy]);
        return polyline(pts);
      })
      .join('');
    return { level, index: isIndexLevel(level), d };
  });

  const mepPoints = stringMethod(MINIMA.A, MINIMA.B);
  const mep = polyline(mepPoints.map((p) => toView(p.x, p.y)));

  // shading raster at a quarter of the view resolution; the browser smooths it
  const rw = 150;
  const rh = Math.round((rw * VIEW.h) / VIEW.w);
  const rgba = new Uint8Array(rw * rh * 4);
  for (let j = 0; j < rh; j++) {
    const y = DOMAIN.y1 - ((DOMAIN.y1 - DOMAIN.y0) * (j + 0.5)) / rh;
    for (let i = 0; i < rw; i++) {
      const x = DOMAIN.x0 + ((DOMAIN.x1 - DOMAIN.x0) * (i + 0.5)) / rw;
      const a = shadeAlpha(V(x, y));
      const o = (j * rw + i) * 4;
      rgba[o] = 23;
      rgba[o + 1] = 114;
      rgba[o + 2] = 208;
      rgba[o + 3] = Math.round(a * 255);
    }
  }
  const shading = encodePNG(rw, rh, rgba);

  // A reproducible descent: dropped high on the right-hand wall, it sweeps
  // through the lower valley, climbs past the left saddle on its momentum,
  // and settles in the global minimum A. Drawn in chunks that darken with
  // time so the direction of travel reads without arrows.
  const w = new Walker(0.95, 0.75, { ...DEFAULT_PARAMS, hillHeight: 0, kT: 5 }, null, 11);
  const pts: [number, number][] = [toView(w.x, w.y)];
  for (let s = 0; s < 1400; s++) {
    w.step();
    if (s % 4 === 0) pts.push(toView(w.x, w.y));
  }
  const chunks = 7;
  const per = Math.ceil(pts.length / chunks);
  const trajectory = Array.from({ length: chunks }, (_, k) => ({
    d: polyline(pts.slice(k * per, Math.min(pts.length, (k + 1) * per + 1))),
    opacity: Math.round((0.28 + (0.72 * (k + 1)) / chunks) * 100) / 100,
  }));
  const trajectoryEnd = toView(w.x, w.y);

  const ticks = {
    x: [-1.0, -0.5, 0, 0.5, 1.0].map((v) => ({ v, px: toView(v, DOMAIN.y0)[0] })),
    y: [0, 0.5, 1.0, 1.5].map((v) => ({ v, px: toView(DOMAIN.x0, v)[1] })),
  };

  cached = {
    view: VIEW,
    contours,
    mep,
    mepPoints,
    minima: Object.values(MINIMA).map((p) => ({ label: p.label, E: p.E, x: toView(p.x, p.y)[0], y: toView(p.x, p.y)[1] })),
    saddles: Object.values(SADDLES).map((p) => ({ label: p.label, E: p.E, x: toView(p.x, p.y)[0], y: toView(p.x, p.y)[1] })),
    shading,
    trajectory,
    trajectoryEnd,
    ticks,
  };
  return cached;
}

/**
 * Energy along the minimum-energy path, as an SVG path in a w × h box. Used by
 * the section-break motif: the page is a reaction coordinate.
 */
export function profilePath(w: number, h: number, pad = 4): { d: string; points: { s: number; E: number; px: number; py: number }[] } {
  const pts = buildLandscape().mepPoints;
  const Es = pts.map((p) => p.E);
  const lo = Math.min(...Es);
  const hi = Math.max(...Es);
  const map = (p: PathPoint) => ({
    s: p.s,
    E: p.E,
    px: pad + p.s * (w - 2 * pad),
    py: pad + (1 - (p.E - lo) / (hi - lo)) * (h - 2 * pad),
  });
  const mapped = pts.map(map);
  // Catmull-Rom to cubic Bézier for a smooth curve
  let d = `M${f1(mapped[0].px)} ${f1(mapped[0].py)}`;
  for (let i = 0; i < mapped.length - 1; i++) {
    const p0 = mapped[Math.max(0, i - 1)];
    const p1 = mapped[i];
    const p2 = mapped[i + 1];
    const p3 = mapped[Math.min(mapped.length - 1, i + 2)];
    const c1x = p1.px + (p2.px - p0.px) / 6;
    const c1y = p1.py + (p2.py - p0.py) / 6;
    const c2x = p2.px - (p3.px - p1.px) / 6;
    const c2y = p2.py - (p3.py - p1.py) / 6;
    d += `C${f1(c1x)} ${f1(c1y)} ${f1(c2x)} ${f1(c2y)} ${f1(p2.px)} ${f1(p2.py)}`;
  }
  return { d, points: mapped };
}
