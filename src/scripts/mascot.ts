// The flight path of the thing that crosses the screen when you arrive.
//
// Each object gets its own trajectory rather than one slide with the glyph
// swapped, because a falling sheet of paper and a thrown baseball do not move
// alike and using one curve for both is what makes a flourish look canned.
//
// Every path is sampled here into a list of transforms and handed to the Web
// Animations API, so only `transform` and `opacity` are ever animated and the
// whole thing stays on the compositor. Nothing here can affect layout: the
// overlay is fixed and clips its own contents.
//
// Rules this file keeps:
//   - It never runs under prefers-reduced-motion.
//   - It runs once per page arrival, and `astro:page-load` is the only trigger.
//   - If anything throws, the page is exactly as it was. Nothing depends on it.

interface Frame {
  x: number;
  y: number;
  /** degrees */
  rot: number;
  opacity: number;
  scale?: number;
  /** vertical squash, which is how a bank reads from the side */
  scaleY?: number;
}

/** A multi-layer frame, keyed by the layer's data-mascot-layer name. */
type LayeredFrame = Record<string, Frame>;

/** A path is a function of normalised time, in viewport pixels. */
type Path = (t: number, w: number, h: number, s: number) => Frame | LayeredFrame;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Fade in over the first slice, hold, fade out over the last. */
function envelope(t: number, inAt: number, outAt: number): number {
  if (t < inAt) return t / inAt;
  if (t > outAt) return Math.max(0, (1 - t) / (1 - outAt));
  return 1;
}

const PATHS: Record<string, { path: Path; ms: number; layers?: boolean }> = {
  /**
   * Home: the site waves hello and then gets out of the way.
   *
   * Four beats. The hand rises into frame and overshoots, waves from the wrist
   * with the amplitude decaying the way a real wave finishes, winds up for a
   * beat, and folds into a paper plane that flies off.
   *
   * The flight is a phugoid, which is the slow trade of height for speed that
   * every glider does and the reason a thrown paper plane dips, balloons, then
   * settles. Altitude is a sinusoid about a descending mean, and the nose
   * angle is read off the velocity vector rather than drawn, so the plane
   * always points where it is actually going. The wings foreshorten through
   * the turn, which is what a bank looks like from the side.
   */
  wave: {
    ms: 1750,
    layers: true,
    path: (t, w, h, s) => {
      // Beat boundaries as fractions of the whole, so the shape of the
      // animation survives a change to the total duration.
      const ARRIVE = 0.13;
      const WAVE_END = 0.515;
      const WIND_END = 0.577;

      // Where the hand says hello. The hero reflows twice, and the empty part
      // of the first screen moves with it, so the mark does too. On a phone the
      // figure sits below the fold and the gap under the portrait is free; on a
      // tablet the figure fills the lower two thirds and the band between the
      // name and the statement is free; on a desktop the figure is on the right
      // and the whole lower left is free. Checked against the name, the
      // portrait and the figure at 375, 768, 1280 and 1920.
      const ax = w * (w < 560 ? 0.5 : w < 1000 ? 0.45 : 0.4) - s / 2;
      const ay = h * (w < 560 ? 0.4 : w < 1000 ? 0.2 : 0.6);

      const hand = { x: ax, y: ay, rot: 0, scale: 1, scaleY: 1, opacity: 0 };
      const plane = { x: ax, y: ay, rot: 0, scale: 1, scaleY: 1, opacity: 0 };

      if (t < ARRIVE) {
        // Rises from below its mark and overshoots, so it arrives with weight
        // rather than appearing at full size.
        const u = easeOutCubic(t / ARRIVE);
        hand.y = ay + (1 - u) * h * 0.1;
        hand.scale = 0.72 + 0.34 * u - 0.06 * Math.sin(Math.PI * u);
        hand.opacity = Math.min(1, (t / ARRIVE) * 1.8);
        return { hand, plane };
      }

      if (t < WAVE_END) {
        const u = (t - ARRIVE) / (WAVE_END - ARRIVE);
        // A plain sinusoid is already eased at the extremes, because its
        // angular velocity is zero exactly where the hand changes direction.
        // 2.5 cycles reads as about three waves at this speed.
        const swing = Math.sin(Math.PI * 2 * 2.5 * u);
        // The last swing is smaller than the first, which is what a wave does
        // as it finishes and what leads into the wind-up.
        const decay = 1 - 0.36 * u;
        hand.rot = 20 * decay * swing;
        // A wrist does not pivot perfectly in place, so the hand lifts a little
        // at each extreme. Twice the frequency, because it peaks at both ends.
        hand.y = ay - Math.abs(Math.sin(Math.PI * 2 * 5 * u)) * s * 0.05;
        hand.opacity = 1;
        return { hand, plane };
      }

      if (t < WIND_END) {
        // The anticipation beat. Going straight from waving to flying reads as
        // a glitch, so the hand gathers itself first: it compresses and tips
        // forward, and the fold comes out of that.
        const u = (t - WAVE_END) / (WIND_END - WAVE_END);
        hand.rot = -14 * easeInOutQuad(u);
        hand.scale = 1 - 0.1 * easeInOutQuad(u);
        hand.scaleY = 1 - 0.14 * easeInOutQuad(u);
        hand.y = ay + s * 0.06 * easeInOutQuad(u);
        hand.opacity = 1;
        return { hand, plane };
      }

      // ---- the fold and the flight ----
      const p = (t - WIND_END) / (1 - WIND_END);

      // Horizontal speed starts low and builds, because arriving is considered
      // and leaving is quick. The constant term keeps the velocity non-zero at
      // the handoff, which is what the nose angle below is read from.
      const travel = w - ax + s * 3.2;
      const fx = 0.12 * p + 0.88 * p * p;
      const dfx = 0.12 + 1.76 * p;

      // Altitude: a sinusoid about a mean that descends, which is the phugoid.
      // It dips first, balloons above the launch height, then settles out.
      const F = 0.85;
      const AMP = h * 0.13;
      const SLOPE = h * 0.06;
      const fy = SLOPE * p + AMP * Math.sin(Math.PI * 2 * F * p);
      const dfy = SLOPE + AMP * Math.PI * 2 * F * Math.cos(Math.PI * 2 * F * p);

      plane.x = ax + travel * fx;
      plane.y = ay + fy;
      // The nose follows the velocity vector, so the attitude is derived from
      // the path rather than drawn on top of it.
      plane.rot = (Math.atan2(dfy, travel * dfx) * 180) / Math.PI;
      // Wings foreshorten through the turn and come back, which is a bank seen
      // from the side. Only transform, so it stays on the compositor.
      plane.scaleY = 1 - 0.26 * Math.pow(Math.sin(Math.PI * p), 2);
      plane.scale = 1;

      // The crossfade. Short, and entirely inside the moving part, so the eye
      // reads one object changing rather than two objects swapping.
      const FOLD = 0.23;
      const k = Math.min(1, p / FOLD);
      const fade = easeInOutQuad(k);
      // It starts leaving well before the edge, so by the time it crosses the
      // right of the screen, where the hero figure lives, it is already mostly
      // gone and reads as something departing rather than something in the way.
      plane.opacity = fade * envelope(p, 0.001, 0.62);

      // The hand keeps the plane's exact position, scale and attitude while it
      // goes, because any discontinuity here is what would read as two objects.
      hand.x = plane.x;
      hand.y = plane.y;
      hand.rot = -14 + (plane.rot + 14) * fade;
      hand.scale = 0.9 - 0.18 * fade;
      hand.scaleY = 0.86;
      hand.opacity = 1 - fade;

      return { hand, plane };
    },
  },

  /**
   * Research: carried across and set down. A monitor has a top and a bottom, so
   * it never tumbles. It travels level, bobs once in the way a carried thing
   * does, and the tilt it arrives with unwinds as it goes.
   */
  computer: {
    ms: 1350,
    path: (t, w, h, s) => {
      const u = easeInOutQuad(t);
      return {
        x: -s * 1.8 + u * (w + s * 3.6),
        y: h * 0.36 - h * 0.055 * Math.sin(Math.PI * u) + h * 0.012 * Math.sin(Math.PI * 5 * u),
        rot: -7 + 12 * u + 2.5 * Math.sin(Math.PI * 4 * u),
        opacity: envelope(t, 0.09, 0.84),
      };
    },
  },

  /**
   * Writing: a sheet coming down. Paper does not fall, it glides: it tips into
   * one side, slides, stalls, tips the other way. The rotation is driven off
   * the same phase as the sideways drift, because on a real sheet they are the
   * same motion seen twice.
   */
  notepad: {
    ms: 1750,
    path: (t, w, h, s) => {
      const phase = Math.sin(Math.PI * 2.2 * t);
      // barely accelerating, because air is holding most of the weight
      const fall = Math.pow(t, 1.25);
      return {
        x: w * 0.68 + phase * (w * 0.1) - fall * (w * 0.38),
        y: -s * 1.4 + fall * (h + s * 2.8),
        rot: phase * 20 - 8,
        opacity: envelope(t, 0.08, 0.82),
      };
    },
  },

  /**
   * Me: an actual projectile. Horizontal speed is constant and the height is a
   * parabola, which is the same arithmetic the pitch figure further down the
   * page runs, minus the drag and the Magnus term. It spins because a baseball
   * that travels without rotating looks dead.
   */
  baseball: {
    ms: 1400,
    path: (t, w, h, s) => ({
      x: -s * 1.6 + t * (w + s * 3.2),
      y: h * 0.74 - 4 * (h * 0.44) * t * (1 - t),
      rot: 790 * easeOutCubic(t),
      opacity: envelope(t, 0.07, 0.86),
    }),
  },
};

const SAMPLES = 64;

/** One transform string, built the same way for every layer. */
function toTransform(f: Frame): string {
  const sc = f.scale ?? 1;
  const sy = f.scaleY ?? 1;
  return (
    `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0)` +
    ` rotate(${f.rot.toFixed(1)}deg)` +
    ` scale(${sc.toFixed(3)}, ${(sc * sy).toFixed(3)})`
  );
}

function fly(root: HTMLElement): void {
  const glyph = root.querySelector<HTMLElement>('[data-mascot-glyph]');
  const kind = root.dataset.mascot;
  if (!glyph || !kind) return;
  const spec = PATHS[kind];
  if (!spec || typeof glyph.animate !== 'function') return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const s = glyph.offsetWidth || 42;

  // A single-glyph mascot animates the glyph box itself. A layered one leaves
  // that box alone and animates each layer inside it, so two drawings can be in
  // the same place at the same time and hand the motion between them.
  const targets: { el: HTMLElement; key: string | null }[] = spec.layers
    ? [...glyph.querySelectorAll<HTMLElement>('[data-mascot-layer]')].map((el) => ({
        el,
        key: el.dataset.mascotLayer ?? null,
      }))
    : [{ el: glyph, key: null }];
  if (targets.length === 0) return;

  const anims: Animation[] = [];
  for (const { el, key } of targets) {
    const frames: Keyframe[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const out = spec.path(t, w, h, s);
      const f = (key ? (out as LayeredFrame)[key] : (out as Frame)) as Frame | undefined;
      if (!f) continue;
      frames.push({
        transform: toTransform(f),
        opacity: f.opacity.toFixed(3),
        offset: t,
      });
    }
    if (frames.length < 2) continue;
    // Linear, because every bit of easing is already baked into the samples. An
    // easing on top of them would bend a path that was computed to be right.
    anims.push(el.animate(frames, { duration: spec.ms, easing: 'linear', fill: 'forwards' }));
  }
  if (anims.length === 0) return;

  const done = () => {
    root.hidden = true;
  };
  Promise.all(anims.map((a) => a.finished)).then(done).catch(done);
}

export function initMascot(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const el of document.querySelectorAll<HTMLElement>('[data-mascot]')) {
    // enhance.ts boots both on `astro:page-load` and directly, so without this
    // the glyph would fly twice on a first load. After a client-side navigation
    // the node is new and the flag arrives cleared with it, which is what makes
    // one arrival mean one flight.
    if (el.dataset.mascotFlew === '') continue;
    el.dataset.mascotFlew = '';
    try {
      fly(el);
    } catch {
      el.hidden = true;
    }
  }
}
