// Turning a flight path into the two pictures. Shared by the build, which draws
// the static figure, and by the browser, which redraws it live, so the before
// and after are the same geometry.
import { PLATE_X, ZONE, breakDirection, atPlate, type Sample } from './physics';

/** Side view: distance to the plate across, height up. */
export const SIDE = { w: 620, h: 250, pad: { l: 34, r: 14, t: 16, b: 28 } } as const;
/** Catcher's view: lateral across, height up. Looking back at the pitcher. */
export const FRONT = { w: 250, h: 250, pad: { l: 22, r: 22, t: 14, b: 30 } } as const;

const SIDE_Z = { lo: -0.08, hi: 2.2 };
// The catcher's view is cropped to the plate rather than to the whole flight,
// and both axes carry the same metres per pixel, so a break that is as wide as
// it is tall is drawn that way.
const FRONT_Y = { lo: -0.95, hi: 0.95 };
const FRONT_Z = { lo: -0.05, hi: 1.85 };

export const sideX = (x: number) => SIDE.pad.l + (x / PLATE_X) * (SIDE.w - SIDE.pad.l - SIDE.pad.r);
export const sideY = (z: number) =>
  SIDE.pad.t + (1 - (z - SIDE_Z.lo) / (SIDE_Z.hi - SIDE_Z.lo)) * (SIDE.h - SIDE.pad.t - SIDE.pad.b);

// The catcher looks back down the x axis, so the pitcher's own right, which is
// his arm side, appears on the viewer's left. Negating keeps that honest, and
// keeps the dial beside it pointing the same way.
export const frontX = (y: number) =>
  FRONT.pad.l + (1 - (y - FRONT_Y.lo) / (FRONT_Y.hi - FRONT_Y.lo)) * (FRONT.w - FRONT.pad.l - FRONT.pad.r);
export const frontY = (z: number) =>
  FRONT.pad.t + (1 - (z - FRONT_Z.lo) / (FRONT_Z.hi - FRONT_Z.lo)) * (FRONT.h - FRONT.pad.t - FRONT.pad.b);

const r1 = (n: number) => (Math.round(n * 10) / 10).toString();

export function sidePath(path: Sample[]): string {
  let d = '';
  for (let i = 0; i < path.length; i += 3) {
    const p = path[i];
    d += `${d ? 'L' : 'M'}${r1(sideX(p.x))} ${r1(sideY(p.z))}`;
  }
  const last = path[path.length - 1];
  return `${d}L${r1(sideX(last.x))} ${r1(sideY(last.z))}`;
}

/**
 * The catcher's view does not get the trajectory. Projected head on, a pitch is
 * a short diagonal smear from the release point down to the plate, which says
 * more about where the arm slot is than about what the ball did. What it gets
 * instead is one line from the spot the pitch was aimed at to the spot it
 * finished, which is the break and nothing else.
 */
export function breakVector(end: Sample, aim: Sample): string {
  return `M${r1(frontX(aim.y))} ${r1(frontY(aim.z))}L${r1(frontX(end.y))} ${r1(frontY(end.z))}`;
}

/** The strike zone rectangle in the catcher's view. */
export const zoneRect = {
  x: frontX(ZONE.halfWidth),
  y: frontY(ZONE.zHigh),
  w: frontX(-ZONE.halfWidth) - frontX(ZONE.halfWidth),
  h: frontY(ZONE.zLow) - frontY(ZONE.zHigh),
};

/** Ground line and plate marker for the side view. */
export const sideGround = sideY(0);
export const sidePlate = sideX(PLATE_X);

/** Convenience for the build and the browser alike. */
export const plateOf = atPlate;

// The spin-axis dial. The face is the plane across the flight path as the
// catcher sees it, which is the same orientation as the front view beside it:
// up is up, and the pitcher's arm side is on the left. The knob sits on the
// direction the ball is pushed, because that is the thing a reader wants to
// aim; the faint diameter is the spin axis itself, a quarter turn away, which
// is exactly the turn the Magnus force takes.
// The face is wider than it is tall by a margin that leaves the two side
// labels room to sit outside the circle rather than on top of it.
export const DIAL = { size: 150, c: 75, r: 44, pad: 34 } as const;

/** Knob position for a spin axis, on the break direction. */
export function dialKnob(axisDeg: number): { x: number; y: number } {
  const { run, ride } = breakDirection(axisDeg);
  return { x: DIAL.c - run * DIAL.r, y: DIAL.c - ride * DIAL.r };
}

/** The spin axis as a diameter, perpendicular to the knob. */
export function dialAxis(axisDeg: number): { x1: number; y1: number; x2: number; y2: number } {
  const a = (axisDeg * Math.PI) / 180;
  const dx = -Math.cos(a) * DIAL.r;
  const dy = -Math.sin(a) * DIAL.r;
  return { x1: DIAL.c - dx, y1: DIAL.c - dy, x2: DIAL.c + dx, y2: DIAL.c + dy };
}

/** The inverse: a point on the dial face back to a spin axis in degrees. */
export function dialAngle(dx: number, dy: number): number {
  const deg = (Math.atan2(-dx, dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}
