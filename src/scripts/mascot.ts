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
}

/** A path is a function of normalised time, in viewport pixels. */
type Path = (t: number, w: number, h: number, s: number) => Frame;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Fade in over the first slice, hold, fade out over the last. */
function envelope(t: number, inAt: number, outAt: number): number {
  if (t < inAt) return t / inAt;
  if (t > outAt) return Math.max(0, (1 - t) / (1 - outAt));
  return 1;
}

const PATHS: Record<string, { path: Path; ms: number }> = {
  /**
   * Home: the walker from the hero figure, arriving.
   *
   * The horizontal coordinate is a damped oscillator settling on its basin, and
   * the height is read off a parabolic well centred on that same point. So the
   * glyph does not follow a drawn arc, it rolls down one wall, part way up the
   * far one, and back, which is what the hero figure spends all day doing.
   */
  particle: {
    ms: 1550,
    path: (t, w, h, s) => {
      const settle = 0.8;
      const u = settle * (1 - Math.exp(-4 * t) * Math.cos(5.2 * t));
      const floor = h * 0.58;
      // chosen so the particle enters at a twelfth of the way down the viewport
      const wall = (h * 0.46) / (settle * settle);
      return {
        x: -s * 1.5 + u * (w * 0.85),
        y: floor + wall * (u - settle) * (u - settle),
        rot: 0,
        opacity: envelope(t, 0.1, 0.78),
      };
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

function fly(root: HTMLElement): void {
  const glyph = root.querySelector<HTMLElement>('[data-mascot-glyph]');
  const kind = root.dataset.mascot;
  if (!glyph || !kind) return;
  const spec = PATHS[kind];
  if (!spec || typeof glyph.animate !== 'function') return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const s = glyph.offsetWidth || 42;

  const frames: Keyframe[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const f = spec.path(t, w, h, s);
    frames.push({
      // Rounded because a sub-pixel difference between two adjacent samples is
      // invisible and the shorter string is cheaper to hand to the compositor.
      transform: `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0) rotate(${f.rot.toFixed(1)}deg)`,
      opacity: f.opacity.toFixed(3),
      offset: t,
    });
  }

  // Linear, because every bit of easing is already baked into the samples. An
  // easing on top of them would bend a path that was computed to be right.
  const anim = glyph.animate(frames, { duration: spec.ms, easing: 'linear', fill: 'forwards' });
  anim.finished
    .then(() => {
      root.hidden = true;
    })
    .catch(() => {
      root.hidden = true;
    });
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
