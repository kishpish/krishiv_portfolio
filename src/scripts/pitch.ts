// The live half of the pitch figure.
//
// Nothing here draws anything the build did not already draw. It imports the
// same integrator and the same projection the static figure was built from and
// calls them again as the reader moves a control, so the picture cannot say one
// thing before the script loads and another thing after.
//
// Rules this file keeps, the same ones the hero landscape keeps:
//   - It never runs under prefers-reduced-motion, and it stands down the moment
//     the preference changes.
//   - If anything throws, the three computed pitches are still on screen and
//     still correct.
import {
  simulate,
  atPlate,
  aimAngles,
  axisWord,
  rideWord,
  runWord,
  zoneWord,
  PRESETS,
  MPH,
} from '../lib/pitch/physics';
import {
  sidePath,
  breakVector,
  frontX,
  frontY,
  DIAL,
  dialKnob,
  dialAxis,
  dialAngle,
} from '../lib/pitch/project';

interface State {
  mph: number;
  rpm: number;
  eff: number;
  axisDeg: number;
}

interface Els {
  root: HTMLElement;
  controls: HTMLElement | null;
  capLead: HTMLElement | null;
  flatSide: SVGPathElement | null;
  liveSide: SVGPathElement | null;
  liveFront: SVGPathElement | null;
  liveDot: SVGCircleElement | null;
  aim: SVGGElement | null;
  dial: SVGSVGElement | null;
  dialKnob: SVGCircleElement | null;
  dialAxis: SVGLineElement | null;
  dialArm: SVGLineElement | null;
  presets: HTMLButtonElement[];
  inputs: Record<string, HTMLInputElement | undefined>;
  outs: Record<string, HTMLElement | undefined>;
}

// The release angles depend only on the speed, and the spinless reference path
// only on the speed, so both are worth keeping rather than recomputing on every
// pointer move.
const aimCache = new Map<number, { pitch: number; yaw: number }>();
function aimFor(mph: number) {
  let a = aimCache.get(mph);
  if (!a) {
    a = aimAngles(mph * MPH);
    aimCache.set(mph, a);
  }
  return a;
}

const flatCache = new Map<number, { side: string; end: ReturnType<typeof atPlate> }>();
function flatFor(mph: number) {
  let f = flatCache.get(mph);
  if (!f) {
    const path = simulate({ speed: mph * MPH, rpm: 0, axisDeg: 0, eff: 1, ...aimFor(mph) });
    f = { side: sidePath(path), end: atPlate(path) };
    flatCache.set(mph, f);
  }
  return f;
}

const nf = new Intl.NumberFormat('en-US');

function render(els: Els, st: State): void {
  const speed = st.mph * MPH;
  const aim = aimFor(st.mph);
  const flat = flatFor(st.mph);
  const path = simulate({ speed, rpm: st.rpm, axisDeg: st.axisDeg, eff: st.eff, ...aim });
  const end = atPlate(path);

  els.flatSide?.setAttribute('d', flat.side);
  els.liveSide?.setAttribute('d', sidePath(path));
  els.liveFront?.setAttribute('d', breakVector(end, flat.end));
  if (els.liveDot) {
    els.liveDot.setAttribute('cx', frontX(end.y).toFixed(1));
    els.liveDot.setAttribute('cy', frontY(end.z).toFixed(1));
  }
  // The aim point moves with the speed, because a slower pitch has to leave on
  // a steeper angle to reach the same spot.
  els.aim?.setAttribute('transform', `translate(${frontX(0).toFixed(1)} ${frontY(flat.end.z).toFixed(1)})`);

  const word = axisWord(st.axisDeg);
  const knob = dialKnob(st.axisDeg);
  const axis = dialAxis(st.axisDeg);
  if (els.dialKnob) {
    els.dialKnob.setAttribute('cx', knob.x.toFixed(1));
    els.dialKnob.setAttribute('cy', knob.y.toFixed(1));
  }
  if (els.dialArm) {
    els.dialArm.setAttribute('x2', knob.x.toFixed(1));
    els.dialArm.setAttribute('y2', knob.y.toFixed(1));
  }
  if (els.dialAxis) {
    els.dialAxis.setAttribute('x1', axis.x1.toFixed(1));
    els.dialAxis.setAttribute('y1', axis.y1.toFixed(1));
    els.dialAxis.setAttribute('x2', axis.x2.toFixed(1));
    els.dialAxis.setAttribute('y2', axis.y2.toFixed(1));
  }
  els.dial?.setAttribute('aria-valuenow', String(Math.round(st.axisDeg) % 360));

  const ride = rideWord(end.z - flat.end.z);
  const run = runWord(end.y - flat.end.y);
  if (els.dial) els.dial.setAttribute('aria-valuetext', `${word}: ${ride}, ${run}`);

  const set = (k: string, v: string) => {
    const el = els.outs[k];
    if (el) el.textContent = v;
  };
  set('mph', `${st.mph} mph`);
  set('rpm', `${nf.format(st.rpm)} rpm`);
  set('eff', `${Math.round(st.eff * 100)}%`);
  set('axis', word);
  set('time', `${end.t.toFixed(2)} s`);
  set('ride', ride);
  set('run', run);
  set('where', zoneWord(end));

  // A preset stays lit only while the reader has not moved off it.
  const match = PRESETS.find(
    (q) =>
      q.mph === st.mph &&
      q.rpm === st.rpm &&
      Math.round(q.eff * 100) === Math.round(st.eff * 100) &&
      Math.round(q.axisDeg) === Math.round(st.axisDeg),
  );
  for (const b of els.presets) {
    b.setAttribute('aria-pressed', b.dataset.preset === match?.id ? 'true' : 'false');
  }
}

function collect(root: HTMLElement): Els {
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel);
  const inputs: Els['inputs'] = {};
  for (const el of root.querySelectorAll<HTMLInputElement>('[data-ctl]')) {
    inputs[el.dataset.ctl as string] = el;
  }
  const outs: Els['outs'] = {};
  for (const el of root.querySelectorAll<HTMLElement>('[data-out]')) {
    outs[el.dataset.out as string] = el;
  }
  return {
    root,
    controls: q<HTMLElement>('[data-controls]'),
    capLead: q<HTMLElement>('[data-cap-live]'),
    flatSide: q<SVGPathElement>('[data-flat-side]'),
    liveSide: q<SVGPathElement>('[data-live-side-path]'),
    liveFront: q<SVGPathElement>('[data-live-front-path]'),
    liveDot: q<SVGCircleElement>('[data-live-dot]'),
    aim: q<SVGGElement>('[data-aim]'),
    dial: q<SVGSVGElement>('[data-dial]'),
    dialKnob: q<SVGCircleElement>('[data-dial-knob]'),
    dialAxis: q<SVGLineElement>('[data-dial-axis]'),
    dialArm: q<SVGLineElement>('[data-dial-arm]'),
    presets: [...root.querySelectorAll<HTMLButtonElement>('[data-preset]')],
    inputs,
    outs,
  };
}

export function initPitchLab(root: HTMLElement): void {
  const els = collect(root);
  const motionOff = window.matchMedia('(prefers-reduced-motion: reduce)');

  const st: State = {
    mph: PRESETS[0].mph,
    rpm: PRESETS[0].rpm,
    eff: PRESETS[0].eff,
    axisDeg: PRESETS[0].axisDeg,
  };

  let queued = 0;
  const paint = () => {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      render(els, st);
    });
  };

  const syncInputs = () => {
    if (els.inputs.mph) els.inputs.mph.value = String(st.mph);
    if (els.inputs.rpm) els.inputs.rpm.value = String(st.rpm);
    if (els.inputs.eff) els.inputs.eff.value = String(Math.round(st.eff * 100));
  };

  // The controls appear straight away, but the reader's own pitch does not draw
  // over the three published ones until they have actually thrown it. Until
  // then the figure is exactly what the build produced.
  let engaged = false;
  const engage = () => {
    if (engaged) return;
    engaged = true;
    root.setAttribute('data-live', '');
  };

  const standUp = () => {
    els.controls?.removeAttribute('hidden');
    els.capLead?.removeAttribute('hidden');
    syncInputs();
    paint();
  };

  const standDown = () => {
    els.controls?.setAttribute('hidden', '');
    els.capLead?.setAttribute('hidden', '');
    root.removeAttribute('data-live');
    engaged = false;
  };

  if (motionOff.matches) standDown();
  else standUp();
  motionOff.addEventListener('change', (e) => (e.matches ? standDown() : standUp()));

  for (const [key, input] of Object.entries(els.inputs)) {
    input?.addEventListener('input', () => {
      const v = Number(input.value);
      if (key === 'mph') st.mph = Math.round(v);
      else if (key === 'rpm') st.rpm = Math.round(v);
      else if (key === 'eff') st.eff = v / 100;
      engage();
      paint();
    });
  }

  for (const b of els.presets) {
    b.addEventListener('click', () => {
      const q = PRESETS.find((p) => p.id === b.dataset.preset);
      if (!q) return;
      st.mph = q.mph;
      st.rpm = q.rpm;
      st.eff = q.eff;
      st.axisDeg = q.axisDeg;
      syncInputs();
      engage();
      paint();
    });
  }

  // The dial. A pointer anywhere on the face sets the direction straight away,
  // and holding and dragging keeps setting it, which is the behaviour anyone who
  // has used a colour wheel already expects.
  const dial = els.dial;
  if (dial) {
    const fromEvent = (ev: PointerEvent) => {
      // Straight into the SVG's own coordinates, so the padded viewBox and
      // whatever the layout did to the element are both already accounted for.
      const m = dial.getScreenCTM();
      if (!m) return;
      const loc = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
      const dx = loc.x - DIAL.c;
      const dy = loc.y - DIAL.c;
      if (Math.hypot(dx, dy) < 4) return; // dead centre has no direction
      st.axisDeg = dialAngle(dx, dy);
      engage();
      paint();
    };
    dial.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      dial.setPointerCapture(ev.pointerId);
      dial.focus();
      fromEvent(ev);
    });
    dial.addEventListener('pointermove', (ev) => {
      if (!dial.hasPointerCapture(ev.pointerId)) return;
      fromEvent(ev);
    });
    dial.addEventListener('pointerup', (ev) => {
      if (dial.hasPointerCapture(ev.pointerId)) dial.releasePointerCapture(ev.pointerId);
    });

    dial.addEventListener('keydown', (ev) => {
      const nudge: Record<string, number> = {
        ArrowRight: 5,
        ArrowUp: 5,
        ArrowLeft: -5,
        ArrowDown: -5,
        PageUp: 30,
        PageDown: -30,
      };
      if (ev.key === 'Home') {
        st.axisDeg = 180; // straight backspin, the reference every pitch tilts off
      } else if (ev.key in nudge) {
        st.axisDeg = (st.axisDeg + nudge[ev.key] + 360) % 360;
      } else {
        return;
      }
      ev.preventDefault();
      engage();
      paint();
    });
  }
}

export function initAllPitchLabs(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-pitchlab]')) {
    // With view transitions this runs again on every client-side navigation. A
    // figure already wired must not collect a second set of listeners, and
    // after a navigation the node is new, so the flag arrives fresh with it.
    if (el.dataset.pitchReady === '') continue;
    el.dataset.pitchReady = '';
    try {
      initPitchLab(el);
    } catch {
      // The build-time figure underneath is the figure. Losing the controls is
      // survivable; showing dead controls is not.
      el.removeAttribute('data-live');
      el.querySelector('[data-controls]')?.setAttribute('hidden', '');
      el.querySelector('[data-cap-live]')?.setAttribute('hidden', '');
    }
  }
}
