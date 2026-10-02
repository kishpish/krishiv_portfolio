// Minimal plotting helpers. Figures are plain SVG built at build time: no
// chart library, no client JavaScript, and every mark traceable to a number in
// src/data/figures/*.json.

export interface Scale {
  (v: number): number;
  domain: [number, number];
  range: [number, number];
  ticks: (count?: number) => number[];
  invert: (px: number) => number;
}

export function linear(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  const f = ((v: number) => r0 + ((v - d0) / span) * (r1 - r0)) as Scale;
  f.domain = domain;
  f.range = range;
  f.invert = (px: number) => d0 + ((px - r0) / (r1 - r0)) * span;
  f.ticks = (count = 5) => niceTicks(d0, d1, count);
  return f;
}

/** Log scale for positive domains (dose axes). */
export function log10(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const l0 = Math.log10(d0);
  const l1 = Math.log10(d1);
  const f = ((v: number) => r0 + ((Math.log10(v) - l0) / (l1 - l0)) * (r1 - r0)) as Scale;
  f.domain = domain;
  f.range = range;
  f.invert = (px: number) => 10 ** (l0 + ((px - r0) / (r1 - r0)) * (l1 - l0));
  f.ticks = () => {
    const out: number[] = [];
    for (let e = Math.floor(l0); e <= Math.ceil(l1); e++) {
      const v = 10 ** e;
      if (v >= d0 * 0.999 && v <= d1 * 1.001) out.push(v);
    }
    return out;
  };
  return f;
}

/** Tick values at 1, 2, or 5 times a power of ten, inside the domain. */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (hi === lo) return [lo];
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toFixed(10)));
  }
  return out;
}

/** Format a number for an axis label: minus sign, no trailing zeros. */
export function fmt(v: number, digits?: number): string {
  const d = digits ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);
  let s = v.toFixed(d);
  if (s.includes('.')) s = s.replace(/\.?0+$/, '');
  if (s === '-0') s = '0';
  return s.replace('-', '−'); // U+2212 MINUS SIGN lines up with digits
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Deterministic jitter in [-amount, amount], keyed by a string. */
export function jitter(key: string, amount: number): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (((h >>> 0) / 4294967296) * 2 - 1) * amount;
}

/**
 * Lay out point labels so they do not collide, by nudging them vertically.
 * Simple and good enough for the handful of labels these figures carry.
 */
export function declutter(
  items: { x: number; y: number; dy?: number }[],
  minGap = 11,
): number[] {
  const order = items.map((_, i) => i).sort((a, b) => items[a].y - items[b].y);
  const out = items.map((it) => it.y + (it.dy ?? 0));
  for (let k = 1; k < order.length; k++) {
    const prev = order[k - 1];
    const cur = order[k];
    if (Math.abs(items[cur].x - items[prev].x) < 60 && out[cur] - out[prev] < minGap) {
      out[cur] = out[prev] + minGap;
    }
  }
  return out;
}

/** The figure palette: blue for the surface, orange for what moves on it. */
export const PALETTE = {
  blue: '#1772d0',
  orange: '#f09228',
  ink: '#1b1a17',
  ink2: '#45433d',
  ink3: '#66635b',
  rule: '#cdc8b9',
  highlight: '#ffffd0',
  /** Series colours, ordered. Checked for AA contrast on #fbfaf6 paper. */
  series: ['#1772d0', '#a85a00', '#4a7f3f', '#8a4b8a', '#66635b'],
} as const;
