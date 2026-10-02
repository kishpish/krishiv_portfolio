// Marching squares over a scalar grid, plus a joiner that stitches the
// resulting segments into polylines (for compact SVG paths).

export interface Grid {
  nx: number; // samples along x
  ny: number; // samples along y
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  values: Float32Array; // row-major, values[j * nx + i]
}

export function sampleGrid(
  f: (x: number, y: number) => number,
  nx: number,
  ny: number,
  d: { x0: number; x1: number; y0: number; y1: number },
): Grid {
  const values = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = d.y0 + ((d.y1 - d.y0) * j) / (ny - 1);
    for (let i = 0; i < nx; i++) {
      const x = d.x0 + ((d.x1 - d.x0) * i) / (nx - 1);
      values[j * nx + i] = f(x, y);
    }
  }
  return { nx, ny, ...d, values };
}

/**
 * Segments for one iso-level, as a flat array [x1, y1, x2, y2, ...] in grid
 * index space (i, j). Saddle cells are disambiguated with the cell-centre mean.
 */
export function isoSegments(values: ArrayLike<number>, nx: number, ny: number, level: number, out: number[] = []): number[] {
  for (let j = 0; j < ny - 1; j++) {
    const row = j * nx;
    for (let i = 0; i < nx - 1; i++) {
      const v0 = values[row + i]; // (i, j)
      const v1 = values[row + i + 1]; // (i+1, j)
      const v2 = values[row + nx + i + 1]; // (i+1, j+1)
      const v3 = values[row + nx + i]; // (i, j+1)
      let code = 0;
      if (v0 > level) code |= 1;
      if (v1 > level) code |= 2;
      if (v2 > level) code |= 4;
      if (v3 > level) code |= 8;
      if (code === 0 || code === 15) continue;

      // edge crossing points
      const bx = i + (level - v0) / (v1 - v0); // bottom edge (j)
      const ry = j + (level - v1) / (v2 - v1); // right edge (i+1)
      const tx = i + (level - v3) / (v2 - v3); // top edge (j+1)
      const ly = j + (level - v0) / (v3 - v0); // left edge (i)

      switch (code) {
        case 1:
        case 14:
          out.push(i, ly, bx, j);
          break;
        case 2:
        case 13:
          out.push(bx, j, i + 1, ry);
          break;
        case 3:
        case 12:
          out.push(i, ly, i + 1, ry);
          break;
        case 4:
        case 11:
          out.push(i + 1, ry, tx, j + 1);
          break;
        case 6:
        case 9:
          out.push(bx, j, tx, j + 1);
          break;
        case 7:
        case 8:
          out.push(i, ly, tx, j + 1);
          break;
        case 5:
        case 10: {
          const centre = (v0 + v1 + v2 + v3) / 4;
          const high = centre > level;
          if ((code === 5) === high) {
            out.push(i, ly, tx, j + 1, bx, j, i + 1, ry);
          } else {
            out.push(i, ly, bx, j, i + 1, ry, tx, j + 1);
          }
          break;
        }
      }
    }
  }
  return out;
}

/** Stitch segments into polylines by matching endpoints (rounded keys). */
export function joinSegments(seg: number[]): number[][] {
  const key = (x: number, y: number) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`;
  const n = seg.length / 4;
  const used = new Uint8Array(n);
  const ends = new Map<string, number[]>();
  for (let s = 0; s < n; s++) {
    for (const e of [0, 1]) {
      const k = key(seg[s * 4 + e * 2], seg[s * 4 + e * 2 + 1]);
      const list = ends.get(k);
      if (list) list.push(s * 2 + e);
      else ends.set(k, [s * 2 + e]);
    }
  }
  const lines: number[][] = [];
  const otherEnd = (s: number, e: number) => [seg[s * 4 + (1 - e) * 2], seg[s * 4 + (1 - e) * 2 + 1]];
  for (let s0 = 0; s0 < n; s0++) {
    if (used[s0]) continue;
    used[s0] = 1;
    const line = [seg[s0 * 4], seg[s0 * 4 + 1], seg[s0 * 4 + 2], seg[s0 * 4 + 3]];
    // extend forward from the tail, then backward from the head
    for (const dir of ['tail', 'head'] as const) {
      for (;;) {
        const x = dir === 'tail' ? line[line.length - 2] : line[0];
        const y = dir === 'tail' ? line[line.length - 1] : line[1];
        const cands = ends.get(key(x, y)) ?? [];
        let next = -1;
        for (const c of cands) {
          if (!used[c >> 1]) {
            next = c;
            break;
          }
        }
        if (next === -1) break;
        const s = next >> 1;
        const e = next & 1;
        used[s] = 1;
        const [ox, oy] = otherEnd(s, e);
        if (dir === 'tail') line.push(ox, oy);
        else line.unshift(ox, oy);
      }
    }
    lines.push(line);
  }
  return lines;
}
