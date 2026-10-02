// Energy to shading opacity. Kept in its own module because the hero's client
// script imports it, and the rest of figure.ts is build-only (it uses node:zlib
// to encode the shading raster as a PNG).
export const SHADE = { lo: -150, hi: 45, maxAlpha: 0.2, gamma: 1.35 } as const;

export function shadeAlpha(E: number): number {
  const t = Math.min(1, Math.max(0, (E - SHADE.lo) / (SHADE.hi - SHADE.lo)));
  return SHADE.maxAlpha * Math.pow(1 - t, SHADE.gamma);
}
