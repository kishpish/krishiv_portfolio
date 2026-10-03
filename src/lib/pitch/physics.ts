// Flight of a thrown baseball: gravity, quadratic drag, and the Magnus force
// that a spinning ball generates across its own direction of travel.
//
// This is the module both sides share. The build imports it to draw the static
// figure; the browser imports the same functions to redraw as the reader moves
// a control, so the picture before and after the script loads is computed by
// identical code.
//
// Everything is SI. Coordinates: x runs from the pitcher toward the plate, y is
// lateral (positive toward the pitcher's own right, which is the arm side for a
// right-handed pitcher and the catcher's left as he looks out), z is up.

export const BALL = {
  /** regulation mass, 5.125 oz */
  m: 0.145,
  /** regulation radius, from a 9.125 inch circumference */
  r: 0.0368,
  /** drag coefficient of a baseball in the range these speeds live in */
  cd: 0.33,
} as const;

export const AIR = { rho: 1.225, g: 9.81 } as const;

/** Cross-sectional area, m^2. */
const AREA = Math.PI * BALL.r * BALL.r;

/** Release point: a right-handed pitcher, roughly six feet of extension. */
export const RELEASE = { x: 0, y: 0.35, z: 1.85 } as const;

/** Distance from release to the front of the plate, metres. */
export const PLATE_X = 16.8;

/** The rule-book zone: 17 inches wide, knees to letters for an average hitter. */
export const ZONE = { halfWidth: 0.2159, zLow: 0.47, zHigh: 1.06 } as const;

export interface PitchParams {
  /** release speed, m/s */
  speed: number;
  /** spin rate, revolutions per minute */
  rpm: number;
  /**
   * Direction of the spin axis in the plane across the flight path, in degrees.
   * 180 is pure backspin, which lifts. 0 is pure topspin, which drops. 90 and
   * 270 are sidespin, which runs the ball left or right.
   */
  axisDeg: number;
  /**
   * Spin efficiency: the fraction of the spin that lies across the flight path
   * and therefore does any work. The rest is gyroscopic, spinning about the
   * direction of travel, and produces no force at all. A four-seam fastball is
   * almost all transverse; a slider is mostly gyro, which is why it spins fast
   * and still breaks less than its spin rate suggests.
   */
  eff: number;
  /** vertical launch angle, radians */
  pitch: number;
  /** horizontal launch angle, radians */
  yaw: number;
}

export interface Sample {
  x: number;
  y: number;
  z: number;
  t: number;
}

/**
 * Lift coefficient as a function of the spin factor S = r*omega/v.
 *
 * The piecewise fit used throughout the baseball-aerodynamics literature
 * (Sawicki, Hubbard and Stronge; reproduced in Nathan 2008): linear in S while
 * the spin is slow, then flattening once the boundary layer is fully engaged.
 */
export function liftCoefficient(S: number): number {
  return S < 0.1 ? 1.5 * S : 0.09 + 0.6 * S;
}

/** Acceleration at a given velocity, for a fixed spin axis and rate. */
function accel(vx: number, vy: number, vz: number, omega: number, ax: number, ay: number, az: number): [number, number, number] {
  const v = Math.hypot(vx, vy, vz);
  if (v < 1e-6) return [0, 0, -AIR.g];

  const k = (0.5 * AIR.rho * AREA) / BALL.m;

  // drag, straight back along the velocity
  const drag = -k * BALL.cd * v;

  // Magnus, across both the spin axis and the velocity
  const S = (BALL.r * omega) / v;
  const cl = liftCoefficient(S);
  // omega_hat x v_hat
  const cx = (ay * vz - az * vy) / v;
  const cy = (az * vx - ax * vz) / v;
  const cz = (ax * vy - ay * vx) / v;
  const mag = k * cl * v * v;

  return [drag * vx + mag * cx, drag * vy + mag * cy, drag * vz + mag * cz - AIR.g];
}

/**
 * Integrate one pitch from release until it reaches the plate. RK4 at a fixed
 * step; the whole flight is under half a second, so this is a few hundred
 * evaluations and runs comfortably inside a pointer move.
 */
export function simulate(p: PitchParams, dt = 0.0015): Sample[] {
  // Only the transverse part of the spin enters the Magnus term, and it is the
  // transverse part the lift correlation was fit against.
  const omega = ((p.rpm * 2 * Math.PI) / 60) * p.eff;
  // Spin axis in the plane transverse to the flight path.
  const a = (p.axisDeg * Math.PI) / 180;
  const ax = 0;
  const ay = Math.cos(a);
  const az = Math.sin(a);

  // state = [x, y, z, vx, vy, vz]
  let s: number[] = [
    RELEASE.x,
    RELEASE.y,
    RELEASE.z,
    p.speed * Math.cos(p.pitch) * Math.cos(p.yaw),
    p.speed * Math.cos(p.pitch) * Math.sin(p.yaw),
    p.speed * Math.sin(p.pitch),
  ];

  const deriv = (u: number[]): number[] => {
    const [, , , vx, vy, vz] = u;
    const [axx, ayy, azz] = accel(vx, vy, vz, omega, ax, ay, az);
    return [vx, vy, vz, axx, ayy, azz];
  };
  const add = (u: number[], d: number[], h: number) => u.map((v, i) => v + h * d[i]);

  const out: Sample[] = [{ x: s[0], y: s[1], z: s[2], t: 0 }];
  let t = 0;

  for (let step = 0; step < 4000; step++) {
    const k1 = deriv(s);
    const k2 = deriv(add(s, k1, dt / 2));
    const k3 = deriv(add(s, k2, dt / 2));
    const k4 = deriv(add(s, k3, dt));
    s = s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    t += dt;

    out.push({ x: s[0], y: s[1], z: s[2], t });
    if (s[0] >= PLATE_X) break;
    // A pitch can finish in the dirt, and when it does the picture should show
    // it ending there rather than continuing underground to the plate.
    if (s[2] <= 0) break;
  }
  return out;
}

/** Where the flight crosses the front of the plate, by linear interpolation. */
export function atPlate(path: Sample[]): Sample {
  for (let i = 1; i < path.length; i++) {
    if (path[i].x >= PLATE_X) {
      const a = path[i - 1];
      const b = path[i];
      const f = (PLATE_X - a.x) / (b.x - a.x || 1);
      return { x: PLATE_X, y: a.y + f * (b.y - a.y), z: a.z + f * (b.z - a.z), t: a.t + f * (b.t - a.t) };
    }
  }
  return path[path.length - 1];
}

/**
 * The release angles that put a ball with NO spin through the middle of the
 * zone. Every pitch is then thrown on exactly these angles, so whatever moves
 * it off that line is the Magnus force and nothing else. Two nested bisections,
 * which converge in a handful of iterations because both are monotone.
 */
export function aimAngles(speed: number): { pitch: number; yaw: number } {
  const targetZ = (ZONE.zLow + ZONE.zHigh) / 2;
  let lo = -0.12;
  let hi = 0.25;
  let pitch = 0;
  for (let i = 0; i < 40; i++) {
    pitch = (lo + hi) / 2;
    const end = atPlate(simulate({ speed, rpm: 0, axisDeg: 0, eff: 1, pitch, yaw: 0 }, 0.003));
    if (end.z < targetZ) lo = pitch;
    else hi = pitch;
  }
  let ylo = -0.08;
  let yhi = 0.08;
  let yaw = 0;
  for (let i = 0; i < 40; i++) {
    yaw = (ylo + yhi) / 2;
    const end = atPlate(simulate({ speed, rpm: 0, axisDeg: 0, eff: 1, pitch, yaw }, 0.003));
    if (end.y > 0) yhi = yaw;
    else ylo = yaw;
  }
  return { pitch, yaw };
}

/**
 * Named pitches, as a speed, a spin rate and a spin axis. All three are thrown
 * by a right-handed pitcher, so the arm side is the positive y direction and a
 * slider runs the other way.
 */
export const PRESETS = [
  { id: 'four-seam', label: 'Four-seam', mph: 94, rpm: 2300, axisDeg: 160, eff: 0.95 },
  { id: 'curveball', label: 'Curveball', mph: 79, rpm: 2600, axisDeg: 340, eff: 0.78 },
  { id: 'slider', label: 'Slider', mph: 85, rpm: 2400, axisDeg: 290, eff: 0.52 },
] as const;

export const MPH_RANGE = { min: 65, max: 104 } as const;
export const RPM_RANGE = { min: 0, max: 3200 } as const;
export const EFF_RANGE = { min: 0, max: 100 } as const;

/**
 * Which way a given spin axis pushes the ball, as a unit vector in the plane
 * across the flight path. This is the quarter turn the Magnus force takes from
 * the axis, written out once so the readouts, the words and the dial all agree.
 */
export function breakDirection(axisDeg: number): { run: number; ride: number } {
  const a = (axisDeg * Math.PI) / 180;
  // positive run is the arm side; positive ride is up
  return { run: Math.sin(a), ride: -Math.cos(a) };
}

/** The spin axis in words, which is how a pitcher would actually describe it. */
export function axisWord(axisDeg: number): string {
  const { run, ride } = breakDirection(axisDeg);
  const side = run >= 0 ? 'arm side' : 'glove side';
  const spin = ride >= 0 ? 'Backspin' : 'Topspin';
  if (Math.abs(ride) > 0.96) return spin;
  if (Math.abs(run) > 0.96) return `Sidespin, ${side}`;
  if (Math.abs(ride) >= Math.abs(run)) return `${spin}, ${side} tilt`;
  return `Sidespin ${side}, ${ride >= 0 ? 'some ride' : 'some drop'}`;
}

export const MPH = 0.44704;
const IN_PER_M = 39.3701;

/** Vertical break in words: inches, and whether the ball rode or dropped. */
export function rideWord(dz: number): string {
  const inches = Math.abs(dz) * IN_PER_M;
  if (inches < 0.5) return '0"';
  return `${inches.toFixed(0)}" ${dz >= 0 ? 'ride' : 'drop'}`;
}

/** Horizontal break in words, named by the side of the mound it came off. */
export function runWord(dy: number): string {
  const inches = Math.abs(dy) * IN_PER_M;
  if (inches < 0.5) return '0"';
  return `${inches.toFixed(0)}" ${dy >= 0 ? 'arm side' : 'glove side'}`;
}

/** Where the pitch finished, relative to the rule-book zone. */
export function zoneWord(end: Sample): string {
  if (end.x < PLATE_X - 0.05) return 'in the dirt';
  const wide = Math.abs(end.y) > ZONE.halfWidth;
  const high = end.z > ZONE.zHigh;
  const low = end.z < ZONE.zLow;
  if (!wide && !high && !low) return 'in the zone';
  const parts: string[] = [];
  if (high) parts.push('high');
  if (low) parts.push('low');
  if (wide) parts.push(end.y >= 0 ? 'arm side' : 'glove side');
  return parts.join(' and ');
}
