'use client';

import { useEffect, useRef } from 'react';

import landing from '../../app/landing.module.css';

/** Grid pitch in CSS pixels. */
const PITCH = 16;

/** Dot radius (px) at rest, and how far the slow wave breathes it. */
const BASE_RADIUS = 0.9;
const BREATH_RADIUS = 0.4;
/** Spatial and temporal frequency of the breathing wave. */
const BREATH_SCALE = 0.006;
const BREATH_SPEED = 0.35;

/** Extra radius (px) at the crest of a message pulse, and its spread. */
const PULSE_RADIUS = 2.3;
const PULSE_SIGMA = 11;
/** Pulse travel speed (px/s) and trail length (cells). */
const PULSE_SPEED = 95;
const TRAIL_CELLS = 9;
const TRAIL_STEP = PITCH / 2;
/** Trail strength relative to the crest, before its quadratic fade. */
const TRAIL_WEIGHT = 0.6;
/** Seconds between spawns (min + random extra), and how many fly at once. */
const SPAWN_MIN = 0.6;
const SPAWN_JITTER = 0.8;
const MAX_PULSES = 9;

/** Cursor push: radius of influence (px) and how far (px) a dot at its centre is shoved. */
const PUSH_RADIUS = 140;
const PUSH_MAX = 14;
/**
 * Spring each dot rides toward its pushed position: stiffness (1/s²) and
 * damping (1/s). Slightly under critical damping, so dots overshoot a touch.
 */
const PUSH_STIFFNESS = 110;
const PUSH_DAMPING = 15;
/** Longest spring integration step (s), so long frames stay stable. */
const PUSH_SUBSTEP = 1 / 120;
/** Offset (px) and speed (px/s) below which a released dot snaps home and goes idle. */
const PUSH_REST = 0.02;
const PUSH_REST_SPEED = 0.2;

/** Dot alpha at rest, and the lift a pulse adds on top. */
const BASE_ALPHA = 0.22;
const BREATH_ALPHA = 0.07;
const PULSE_ALPHA = 0.34;

const REST_RGB = '153, 194, 224';
const SIGNAL_RGB = '201, 221, 238';
/** Boost above which a dot takes the brighter signal colour. */
const SIGNAL_THRESHOLD = 0.2;

/** Quantisation of radius and alpha so the whole field draws in a few fills. */
const RADIUS_STEP = 0.25;
const RADIUS_LEVELS = 22;
const ALPHA_STEP = 0.025;
const ALPHA_LEVELS = 32;

type Pulse = {
  /** Route waypoints in CSS pixels, flattened [x0, y0, x1, y1, ...]. */
  points: number[];
  /** Cumulative path length at each waypoint. */
  lengths: number[];
  total: number;
  /** Distance the crest has travelled; runs past `total` while the trail drains in. */
  travelled: number;
};

/**
 * The hero's backdrop: an even halftone grid of tiny dots, breathing with a
 * slow wave. Messages cross it as soft bumps of larger dots that run along a
 * row, hand off onto a column and carry on along another row before draining
 * into their destination. The cursor parts the field: dots around it spring
 * radially away, leaving a small clearing, and ease back onto the grid when
 * it moves on. Static (and undisturbed) for reduced motion, and paused off
 * screen or in a hidden tab.
 */
export function HeroHalftone() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = motionQuery.matches;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let originX = 0;
    let originY = 0;
    let boost = new Float32Array(0);
    let keys = new Uint16Array(0);
    let order = new Uint32Array(0);
    /** Per-dot spring state for the cursor push: offset (px) and velocity (px/s). */
    let offX = new Float32Array(0);
    let offY = new Float32Array(0);
    let velX = new Float32Array(0);
    let velY = new Float32Array(0);
    /** Dots near the cursor or still settling; only these are integrated. */
    let active = new Uint32Array(0);
    let activeCount = 0;
    let isActive = new Uint8Array(0);
    const bucketCount = 2 * RADIUS_LEVELS * ALPHA_LEVELS;
    const bucketStart = new Uint32Array(bucketCount + 1);
    let pulses: Pulse[] = [];
    let nextSpawn = 0.4;
    let time = 0;

    let frame = 0;
    let visible = true;
    let last = performance.now();
    const pointer = { x: 0, y: 0, active: false };

    const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const dotX = (c: number) => originX + c * PITCH;
    const dotY = (r: number) => originY + r * PITCH;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(1, Math.floor(width / PITCH) + 1);
      rows = Math.max(1, Math.floor(height / PITCH) + 1);
      originX = (width - (cols - 1) * PITCH) / 2;
      originY = (height - (rows - 1) * PITCH) / 2;
      boost = new Float32Array(cols * rows);
      keys = new Uint16Array(cols * rows);
      order = new Uint32Array(cols * rows);
      offX = new Float32Array(cols * rows);
      offY = new Float32Array(cols * rows);
      velX = new Float32Array(cols * rows);
      velY = new Float32Array(cols * rows);
      active = new Uint32Array(cols * rows);
      isActive = new Uint8Array(cols * rows);
      activeCount = 0;
      pulses = [];
    };

    /** Drops every dot back onto the grid at rest. */
    const resetPush = () => {
      for (let j = 0; j < activeCount; j++) {
        const i = active[j];
        offX[i] = offY[i] = velX[i] = velY[i] = 0;
        isActive[i] = 0;
      }
      activeCount = 0;
    };

    /**
     * Springs dots toward their pushed positions. Dots under the cursor join the
     * active set; dots leave it once they have settled back on the grid.
     */
    const stepPush = (dt: number) => {
      if (pointer.active) {
        const c0 = Math.max(0, Math.floor((pointer.x - PUSH_RADIUS - originX) / PITCH));
        const c1 = Math.min(cols - 1, Math.ceil((pointer.x + PUSH_RADIUS - originX) / PITCH));
        const r0 = Math.max(0, Math.floor((pointer.y - PUSH_RADIUS - originY) / PITCH));
        const r1 = Math.min(rows - 1, Math.ceil((pointer.y + PUSH_RADIUS - originY) / PITCH));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const i = r * cols + c;
            if (isActive[i]) continue;
            isActive[i] = 1;
            active[activeCount++] = i;
          }
        }
      }
      if (activeCount === 0) return;

      const steps = Math.ceil(dt / PUSH_SUBSTEP);
      const h = dt / steps;
      const radius2 = PUSH_RADIUS * PUSH_RADIUS;
      let kept = 0;
      for (let j = 0; j < activeCount; j++) {
        const i = active[j];
        const gx = dotX(i % cols);
        const gy = dotY(Math.floor(i / cols));
        // Target: radially away from the cursor, (1 - t²)² falloff to zero at the edge.
        let tx = 0;
        let ty = 0;
        if (pointer.active) {
          const dx = gx - pointer.x;
          const dy = gy - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < radius2) {
            const d = Math.sqrt(d2);
            const fall = 1 - d2 / radius2;
            const push = PUSH_MAX * fall * fall;
            if (d > 1e-3) {
              tx = (dx / d) * push;
              ty = (dy / d) * push;
            } else {
              ty = -push;
            }
          }
        }
        let ox = offX[i];
        let oy = offY[i];
        let vx = velX[i];
        let vy = velY[i];
        for (let s = 0; s < steps; s++) {
          vx += (PUSH_STIFFNESS * (tx - ox) - PUSH_DAMPING * vx) * h;
          vy += (PUSH_STIFFNESS * (ty - oy) - PUSH_DAMPING * vy) * h;
          ox += vx * h;
          oy += vy * h;
        }
        if (
          tx === 0 &&
          ty === 0 &&
          Math.abs(ox) < PUSH_REST &&
          Math.abs(oy) < PUSH_REST &&
          Math.abs(vx) < PUSH_REST_SPEED &&
          Math.abs(vy) < PUSH_REST_SPEED
        ) {
          offX[i] = offY[i] = velX[i] = velY[i] = 0;
          isActive[i] = 0;
          continue;
        }
        offX[i] = ox;
        offY[i] = oy;
        velX[i] = vx;
        velY[i] = vy;
        active[kept++] = i;
      }
      activeCount = kept;
    };

    // A route is row, column, row (sometimes one more hand-off): a packet
    // passed between agents sitting on the grid.
    const spawnPulse = (): Pulse | null => {
      if (cols < 8 || rows < 4) return null;
      let c = randInt(2, cols - 3);
      let r = randInt(1, rows - 2);
      let dir = Math.random() < 0.5 ? 1 : -1;
      const handoffs = (Math.random() < 0.75 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
      const grid = [c, r];
      for (let leg = 0; leg <= handoffs; leg++) {
        const run = randInt(5, 16);
        if (c + dir * run < 1 || c + dir * run > cols - 2) dir = -dir;
        const nc = clamp(c + dir * run, 1, cols - 2);
        if (nc !== c) grid.push(nc, r);
        c = nc;
        if (leg === handoffs) break;
        const drop = randInt(2, 6) * (Math.random() < 0.5 ? 1 : -1);
        let nr = clamp(r + drop, 1, rows - 2);
        if (nr === r) nr = clamp(r - drop, 1, rows - 2);
        if (nr !== r) grid.push(c, nr);
        r = nr;
      }
      if (grid.length < 4) return null;
      const points: number[] = [];
      const lengths: number[] = [0];
      for (let k = 0; k < grid.length; k += 2) points.push(dotX(grid[k]), dotY(grid[k + 1]));
      for (let k = 2; k < points.length; k += 2) {
        lengths.push(lengths[lengths.length - 1] + Math.hypot(points[k] - points[k - 2], points[k + 1] - points[k - 1]));
      }
      return { points, lengths, total: lengths[lengths.length - 1], travelled: 0 };
    };

    /** Raises dots around (x, y) toward `weight` with a Gaussian falloff. */
    const stamp = (x: number, y: number, weight: number) => {
      if (weight <= 0.01) return;
      const c0 = Math.max(0, Math.floor((x - originX) / PITCH) - 2);
      const c1 = Math.min(cols - 1, Math.ceil((x - originX) / PITCH) + 2);
      const r0 = Math.max(0, Math.floor((y - originY) / PITCH) - 2);
      const r1 = Math.min(rows - 1, Math.ceil((y - originY) / PITCH) + 2);
      const k = -1 / (2 * PULSE_SIGMA * PULSE_SIGMA);
      for (let r = r0; r <= r1; r++) {
        const dy = dotY(r) - y;
        for (let c = c0; c <= c1; c++) {
          const dx = dotX(c) - x;
          const v = weight * Math.exp((dx * dx + dy * dy) * k);
          const i = r * cols + c;
          if (v > boost[i]) boost[i] = v;
        }
      }
    };

    const stampPulse = (p: Pulse) => {
      const samples = (TRAIL_CELLS * PITCH) / TRAIL_STEP;
      // The crest fades up as it leaves its sender instead of popping in.
      const launch = Math.min(1, p.travelled / (PITCH * 2));
      let seg = 0;
      for (let k = 0; k <= samples; k++) {
        const d = p.travelled - k * TRAIL_STEP;
        if (d < 0) break;
        if (d > p.total) continue;
        const fade = 1 - k / samples;
        const weight = (k === 0 ? 1 : TRAIL_WEIGHT * fade * fade) * launch;
        while (seg < p.lengths.length - 2 && p.lengths[seg + 1] < d) seg++;
        // Samples run head to tail, so step the segment index back as needed.
        while (seg > 0 && p.lengths[seg] > d) seg--;
        const span = p.lengths[seg + 1] - p.lengths[seg] || 1;
        const t = (d - p.lengths[seg]) / span;
        const x = p.points[seg * 2] + (p.points[seg * 2 + 2] - p.points[seg * 2]) * t;
        const y = p.points[seg * 2 + 1] + (p.points[seg * 2 + 3] - p.points[seg * 2 + 1]) * t;
        stamp(x, y, weight);
      }
      // Once the crest arrives, the destination holds a bump that fades as the trail drains in.
      const over = p.travelled - p.total;
      if (over > 0) {
        const n = p.points.length;
        stamp(p.points[n - 2], p.points[n - 1], Math.max(0, 1 - over / (TRAIL_CELLS * PITCH)));
      }
    };

    const step = (now: number) => {
      const dt = reduceMotion ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      time += dt;

      if (!reduceMotion) {
        stepPush(dt);
        nextSpawn -= dt;
        if (nextSpawn <= 0) {
          if (pulses.length < MAX_PULSES) {
            const pulse = spawnPulse();
            if (pulse) pulses.push(pulse);
          }
          nextSpawn = SPAWN_MIN + Math.random() * SPAWN_JITTER;
        }
        for (const p of pulses) p.travelled += PULSE_SPEED * dt;
        pulses = pulses.filter((p) => p.travelled < p.total + TRAIL_CELLS * PITCH);
      }

      boost.fill(0);
      for (const p of pulses) stampPulse(p);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const n = cols * rows;
      const phase = time * BREATH_SPEED;

      // Bucket every dot by colour, radius and alpha so each bucket is one fill.
      bucketStart.fill(0);
      for (let r = 0; r < rows; r++) {
        const y = dotY(r);
        for (let c = 0; c < cols; c++) {
          const x = dotX(c);
          const i = r * cols + c;
          const wave =
            Math.sin(x * BREATH_SCALE + phase) * Math.sin(y * BREATH_SCALE * 1.3 - phase * 0.7);
          const b = boost[i];
          const radius = BASE_RADIUS + BREATH_RADIUS * wave + PULSE_RADIUS * b;
          const alpha = BASE_ALPHA + BREATH_ALPHA * wave + PULSE_ALPHA * b;
          const rl = clamp(Math.round(radius / RADIUS_STEP), 1, RADIUS_LEVELS - 1);
          const al = clamp(Math.round(alpha / ALPHA_STEP), 0, ALPHA_LEVELS - 1);
          const key = ((b > SIGNAL_THRESHOLD ? 1 : 0) * RADIUS_LEVELS + rl) * ALPHA_LEVELS + al;
          keys[i] = key;
          bucketStart[key + 1]++;
        }
      }
      for (let k = 0; k < bucketCount; k++) bucketStart[k + 1] += bucketStart[k];
      const cursor = bucketStart.slice(0, bucketCount);
      for (let i = 0; i < n; i++) order[cursor[keys[i]]++] = i;

      for (let key = 0; key < bucketCount; key++) {
        const from = bucketStart[key];
        const to = bucketStart[key + 1];
        const al = key % ALPHA_LEVELS;
        if (from === to || al === 0) continue;
        const rl = Math.floor(key / ALPHA_LEVELS) % RADIUS_LEVELS;
        const signal = key >= RADIUS_LEVELS * ALPHA_LEVELS;
        const radius = rl * RADIUS_STEP;
        ctx.fillStyle = `rgba(${signal ? SIGNAL_RGB : REST_RGB}, ${(al * ALPHA_STEP).toFixed(3)})`;
        ctx.beginPath();
        for (let j = from; j < to; j++) {
          const i = order[j];
          // Drawn where the cursor push has moved it; the grid cell still sets its look.
          const x = dotX(i % cols) + offX[i];
          const y = dotY(Math.floor(i / cols)) + offY[i];
          ctx.moveTo(x + radius, y);
          ctx.arc(x, y, radius, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      step(now);
      frame = !reduceMotion && visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };

    const play = () => {
      if (reduceMotion) {
        step(performance.now());
        return;
      }
      if (!frame && visible && !document.hidden) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reduceMotion || event.pointerType !== 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    const onVisibility = () => play();
    // Follow the reduced-motion setting live: stop on a still frame, or resume.
    const onMotionChange = () => {
      reduceMotion = motionQuery.matches;
      cancelAnimationFrame(frame);
      frame = 0;
      pointer.active = false;
      // Settle to the same still frame reduced motion gets at load.
      resetPush();
      pulses = [];
      play();
    };

    resize();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion) step(performance.now());
    });
    resizeObserver.observe(canvas);

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      play();
    });
    intersection.observe(canvas);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    motionQuery.addEventListener('change', onMotionChange);
    play();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className={landing.heroBackdrop} aria-hidden="true" />;
}
