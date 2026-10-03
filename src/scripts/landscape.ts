// Live hero: the same Langevin walker and well-tempered metadynamics that the
// static figure was drawn with, run in the browser over the build-time SVG.
//
// Rules this file keeps:
//   - It never runs under prefers-reduced-motion, and it stops the moment the
//     preference changes.
//   - It pauses when off-screen, when the tab is hidden, and on demand.
//   - If anything throws, the static SVG is still there and still correct.
import { DOMAIN, V } from '../lib/landscape/mb';
import { BiasGrid, DEFAULT_PARAMS, Walker, basinOf } from '../lib/landscape/sim';

const TRAIL = 900; // trajectory points kept
const MAX_STEP_MS = 34; // never integrate more than ~2 frames of catch-up

interface Ctx {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  walker: Walker;
  bias: BiasGrid;
  trail: Float32Array;
  trailN: number;
  trailHead: number;
  raf: number;
  last: number;
  running: boolean;
  visible: boolean;
  wanted: boolean;
  hills: HTMLElement | null;
  energy: HTMLElement | null;
  basin: HTMLElement | null;
  lastReadout: number;
  w: number;
  h: number;
  dpr: number;
}

function setup(root: HTMLElement): Ctx | null {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-landscape-canvas]');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !ctx) return null;
  const bias = new BiasGrid(121, 110);
  const walker = new Walker(0.623, 0.028, DEFAULT_PARAMS, bias, 19);
  return {
    root,
    canvas,
    ctx,
    walker,
    bias,
    trail: new Float32Array(TRAIL * 2),
    trailN: 0,
    trailHead: 0,
    raf: 0,
    last: 0,
    running: false,
    visible: false,
    wanted: true,
    hills: root.querySelector('[data-r-hills]'),
    energy: root.querySelector('[data-r-energy]'),
    basin: root.querySelector('[data-r-basin]'),
    lastReadout: 0,
    w: 0,
    h: 0,
    dpr: 1,
  };
}

function resize(c: Ctx): void {
  const rect = c.canvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (w === c.canvas.width && h === c.canvas.height) return;
  c.canvas.width = w;
  c.canvas.height = h;
  c.w = rect.width;
  c.h = rect.height;
  c.dpr = dpr;
}

const toPx = (c: Ctx, x: number, y: number): [number, number] => [
  ((x - DOMAIN.x0) / (DOMAIN.x1 - DOMAIN.x0)) * c.w,
  c.h - ((y - DOMAIN.y0) / (DOMAIN.y1 - DOMAIN.y0)) * c.h,
];

const toWorld = (c: Ctx, px: number, py: number): [number, number] => [
  DOMAIN.x0 + (px / c.w) * (DOMAIN.x1 - DOMAIN.x0),
  DOMAIN.y0 + (1 - py / c.h) * (DOMAIN.y1 - DOMAIN.y0),
];

function pushTrail(c: Ctx, x: number, y: number): void {
  c.trail[c.trailHead * 2] = x;
  c.trail[c.trailHead * 2 + 1] = y;
  c.trailHead = (c.trailHead + 1) % TRAIL;
  if (c.trailN < TRAIL) c.trailN++;
}

/**
 * Draw the metadynamics bias as filled contours. This is the point of the
 * animation: you watch the basin the walker is sitting in fill up with hills
 * until it is shallow enough to escape over a saddle.
 */
function drawBias(c: Ctx): void {
  const { ctx, bias } = c;
  if (bias.hills === 0) return;
  const step = 7; // bias contour interval, in potential units
  const max = Math.max(...bias.values);
  if (max < step) return;
  const cols = bias.nx;
  const rows = bias.ny;
  const cw = c.w / (cols - 1);
  const ch = c.h / (rows - 1);
  ctx.save();
  ctx.lineWidth = 1;
  for (let level = step; level <= max; level += step) {
    ctx.beginPath();
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const v0 = bias.values[j * cols + i];
        const v1 = bias.values[j * cols + i + 1];
        const v2 = bias.values[(j + 1) * cols + i + 1];
        const v3 = bias.values[(j + 1) * cols + i];
        let code = 0;
        if (v0 > level) code |= 1;
        if (v1 > level) code |= 2;
        if (v2 > level) code |= 4;
        if (v3 > level) code |= 8;
        if (code === 0 || code === 15) continue;
        const X = (gi: number) => gi * cw;
        const Y = (gj: number) => c.h - gj * ch;
        const bx = X(i + (level - v0) / (v1 - v0));
        const ry = Y(j + (level - v1) / (v2 - v1));
        const tx = X(i + (level - v3) / (v2 - v3));
        const ly = Y(j + (level - v0) / (v3 - v0));
        const seg: number[] = [];
        switch (code) {
          case 1: case 14: seg.push(X(i), ly, bx, Y(j)); break;
          case 2: case 13: seg.push(bx, Y(j), X(i + 1), ry); break;
          case 3: case 12: seg.push(X(i), ly, X(i + 1), ry); break;
          case 4: case 11: seg.push(X(i + 1), ry, tx, Y(j + 1)); break;
          case 6: case 9: seg.push(bx, Y(j), tx, Y(j + 1)); break;
          case 7: case 8: seg.push(X(i), ly, tx, Y(j + 1)); break;
          default: seg.push(X(i), ly, bx, Y(j), X(i + 1), ry, tx, Y(j + 1));
        }
        for (let k = 0; k < seg.length; k += 4) {
          ctx.moveTo(seg[k], seg[k + 1]);
          ctx.lineTo(seg[k + 2], seg[k + 3]);
        }
      }
    }
    const t = Math.min(1, level / 110);
    ctx.strokeStyle = `rgba(240, 146, 40, ${0.1 + 0.26 * (1 - t)})`;
    ctx.stroke();
  }
  ctx.restore();
}

function draw(c: Ctx): void {
  const { ctx } = c;
  ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
  ctx.clearRect(0, 0, c.w, c.h);

  drawBias(c);

  // trail, fading from old to new
  if (c.trailN > 1) {
    ctx.lineWidth = 1.7;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const segments = 14;
    const per = Math.ceil(c.trailN / segments);
    for (let s = 0; s < segments; s++) {
      const from = s * per;
      const to = Math.min(c.trailN, from + per + 1);
      if (to - from < 2) continue;
      ctx.beginPath();
      for (let k = from; k < to; k++) {
        const idx = (c.trailHead - c.trailN + k + TRAIL * 2) % TRAIL;
        const [px, py] = toPx(c, c.trail[idx * 2], c.trail[idx * 2 + 1]);
        if (k === from) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(240, 146, 40, ${(0.06 + 0.72 * ((s + 1) / segments)).toFixed(3)})`;
      ctx.stroke();
    }
  }

  // the walker
  const [px, py] = toPx(c, c.walker.x, c.walker.y);
  ctx.beginPath();
  ctx.arc(px, py, 4.2, 0, Math.PI * 2);
  ctx.fillStyle = '#f09228';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#fbfaf6';
  ctx.stroke();
}

function readout(c: Ctx, now: number): void {
  if (now - c.lastReadout < 180) return;
  c.lastReadout = now;
  if (c.energy) {
    const E = V(c.walker.x, c.walker.y);
    c.energy.textContent = E.toFixed(0);
  }
  if (c.hills) c.hills.textContent = String(c.bias.hills);
  if (c.basin) c.basin.textContent = basinOf(c.walker.x, c.walker.y);
}

function frame(c: Ctx, now: number): void {
  c.raf = 0;
  if (!c.running) return;
  const dtMs = Math.min(MAX_STEP_MS, c.last ? now - c.last : 16);
  c.last = now;
  // integrate a fixed number of substeps per millisecond of wall clock, so the
  // motion looks the same on a 60Hz and a 120Hz display
  const steps = Math.round(dtMs * 2.6);
  for (let s = 0; s < steps; s++) {
    c.walker.step();
    if (s % 9 === 0) pushTrail(c, c.walker.x, c.walker.y);
  }
  // Keep the bias bounded: once it is deep enough that the walker roams freely,
  // relax it so the figure keeps breathing instead of flattening the surface.
  if (c.bias.hills > 2600) {
    c.bias.scale(0.55);
    c.bias.hills = Math.round(c.bias.hills * 0.55);
  }
  draw(c);
  readout(c, now);
  c.raf = requestAnimationFrame((t) => frame(c, t));
}

function start(c: Ctx): void {
  if (c.running || !c.visible || !c.wanted) return;
  resize(c);
  if (c.w < 1) return;
  c.running = true;
  c.last = 0;
  c.root.setAttribute('data-live', '');
  c.raf = requestAnimationFrame((t) => frame(c, t));
}

function stop(c: Ctx): void {
  c.running = false;
  if (c.raf) cancelAnimationFrame(c.raf);
  c.raf = 0;
}

export function initLandscape(root: HTMLElement): void {
  const motionOff = window.matchMedia('(prefers-reduced-motion: reduce)');
  const c = setup(root);
  if (!c) return;

  const toggle = root.querySelector<HTMLButtonElement>('[data-landscape-toggle]');
  const toggleLabel = root.querySelector<HTMLElement>('[data-landscape-toggle-label]');
  const readoutEl = root.querySelector<HTMLElement>('[data-landscape-readout]');

  const teardown = () => {
    stop(c);
    c.root.removeAttribute('data-live');
    toggle?.setAttribute('hidden', '');
    readoutEl?.setAttribute('hidden', '');
  };

  if (motionOff.matches) {
    teardown();
  } else {
    toggle?.removeAttribute('hidden');
    readoutEl?.removeAttribute('hidden');
  }
  motionOff.addEventListener('change', (e) => {
    if (e.matches) teardown();
    else {
      toggle?.removeAttribute('hidden');
      readoutEl?.removeAttribute('hidden');
      start(c);
    }
  });

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        c.visible = e.isIntersecting;
        if (e.isIntersecting && !motionOff.matches) start(c);
        else stop(c);
      }
    },
    { threshold: 0.12 },
  );
  io.observe(root);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(c);
    else if (!motionOff.matches) start(c);
  });

  const ro = new ResizeObserver(() => {
    resize(c);
    if (c.running) draw(c);
  });
  ro.observe(root);

  toggle?.addEventListener('click', () => {
    c.wanted = !c.wanted;
    // The visible word is the accessible name, so it alone carries the state.
    if (toggleLabel) toggleLabel.textContent = c.wanted ? 'pause' : 'resume';
    if (c.wanted) start(c);
    else stop(c);
  });

  // The cursor is a repulsive Gaussian: push on the surface and the walker is
  // driven out of the basin it is sitting in.
  const stage = root.querySelector<HTMLElement>('.landscape__stage') ?? root;
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerType === 'touch') return;
    const rect = c.canvas.getBoundingClientRect();
    const [x, y] = toWorld(c, ev.clientX - rect.left, ev.clientY - rect.top);
    c.walker.external = { x, y, h: 520, s: 0.26 };
  };
  stage.addEventListener('pointermove', onMove, { passive: true });
  stage.addEventListener('pointerleave', () => {
    c.walker.external = null;
  });
}

export function initAllLandscapes(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-landscape]')) {
    // With view transitions this runs again on every client-side navigation.
    // A figure that is already wired must not get a second set of listeners,
    // and after a navigation the node is new, so the flag comes back with it.
    if (el.dataset.landscapeReady === '') continue;
    el.dataset.landscapeReady = '';
    try {
      initLandscape(el);
    } catch {
      // the static SVG underneath is the figure; losing the animation is fine
      el.removeAttribute('data-live');
    }
  }
}
