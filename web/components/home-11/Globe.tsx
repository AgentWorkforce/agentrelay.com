'use client';

import { useEffect, useRef } from 'react';

import { LAND_MASK } from './land-mask';
import s from './connect-anywhere.module.css';

type Vec = [number, number, number];

const PINS = [
  { label: 'San Francisco', lat: 37.77, lon: -122.42 },
  { label: 'Boston', lat: 42.36, lon: -71.06 },
  { label: 'Oslo', lat: 59.91, lon: 10.75 },
] as const;

/** Each pair of pins is joined by an arc; pulses run along it in turn. */
const ARCS: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 2],
];

/** Longitude and latitude the globe faces when it is centred on the pins. */
const HOME_LON = -56;
const TILT = 28;

/** One turn takes this long, lingering on the pins and hurrying round the back. */
const TURN_MS = 44_000;
const LINGER = 0.8;
const PULSE_MS = 2600;

const rad = (deg: number) => (deg * Math.PI) / 180;

function toVec(lat: number, lon: number): Vec {
  const la = rad(lat);
  const lo = rad(lon);
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}

/** Land dots, spaced evenly over the sphere and kept where the mask says land. */
function landDots(): Vec[] {
  const bits = Uint8Array.from(atob(LAND_MASK), (c) => c.charCodeAt(0));
  const isLand = (lat: number, lon: number) => {
    const row = Math.min(89, Math.floor((90 - lat) / 2));
    const col = Math.min(179, Math.floor((lon + 180) / 2));
    const k = row * 180 + col;
    return (bits[k >> 3] & (1 << (k & 7))) !== 0;
  };
  const dots: Vec[] = [];
  for (let lat = -84; lat <= 84; lat += 1.6) {
    const count = Math.max(1, Math.round(225 * Math.cos(rad(lat))));
    for (let i = 0; i < count; i++) {
      const lon = -180 + (i + 0.5) * (360 / count);
      if (isLand(lat, lon)) dots.push(toVec(lat, lon));
    }
  }
  return dots;
}

/** Points along the great circle from a to b, lifted off the surface in the middle. */
function arcPoints(a: Vec, b: Vec, steps = 48): Vec[] {
  const angle = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const lift = 0.05 + 0.2 * (angle / (Math.PI / 2));
  const points: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wa = Math.sin((1 - t) * angle) / Math.sin(angle);
    const wb = Math.sin(t * angle) / Math.sin(angle);
    const r = 1 + lift * Math.sin(Math.PI * t);
    points.push([(wa * a[0] + wb * b[0]) * r, (wa * a[1] + wb * b[1]) * r, (wa * a[2] + wb * b[2]) * r]);
  }
  return points;
}

/** The facing longitude at a point in the turn: slow past the pins, quick behind. */
function facing(u: number) {
  return HOME_LON - 180 + 360 * u + (360 * LINGER * Math.sin(2 * Math.PI * u)) / (2 * Math.PI);
}

/**
 * A dotted globe that turns slowly, with San Francisco, Boston and Oslo joined
 * by arcs that carry message pulses. Pauses off screen and in background tabs,
 * and draws one still frame for reduced-motion users.
 */
export function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dots = landDots();
    const pins = PINS.map((pin) => toVec(pin.lat, pin.lon));
    const arcs = ARCS.map(([a, b]) => arcPoints(pins[a], pins[b]));
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const font = getComputedStyle(canvas).fontFamily;

    let size = 0;
    let frame = 0;
    let running = false;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const elapsed = still ? 0 : now - start;
      // Start, and stand still, facing the pins: halfway through the turn.
      const lon = rad(facing((elapsed / TURN_MS + 0.5) % 1));
      const tilt = rad(TILT);
      const [cosL, sinL, cosT, sinT] = [Math.cos(-lon), Math.sin(-lon), Math.cos(tilt), Math.sin(tilt)];
      // Room above the globe for the arcs, which rise off the surface.
      const R = size * 0.4;
      const cx = size / 2;
      const cy = size * 0.5;

      const project = ([x, y, z]: Vec) => {
        const x1 = x * cosL + z * sinL;
        const z1 = -x * sinL + z * cosL;
        const y2 = y * cosT - z1 * sinT;
        const z2 = y * sinT + z1 * cosT;
        return { x: cx + R * x1, y: cy - R * y2, z: z2, outside: x1 * x1 + y2 * y2 > 1 };
      };

      ctx.clearRect(0, 0, size, size);

      const body = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, 'rgba(30, 64, 92, 0.55)');
      body.addColorStop(1, 'rgba(8, 20, 32, 0.9)');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(116, 184, 226, 0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const dot = Math.max(1.2, size / 400);
      for (const point of dots) {
        const p = project(point);
        if (p.z <= 0) continue;
        ctx.fillStyle = `rgba(150, 200, 235, ${(0.18 + 0.72 * p.z).toFixed(3)})`;
        ctx.fillRect(p.x - dot / 2, p.y - dot / 2, dot, dot);
      }

      arcs.forEach((points, index) => {
        const projected = points.map(project);
        const shown = (p: ReturnType<typeof project>) => p.z > 0 || p.outside;
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(116, 184, 226, 0.55)';
        ctx.beginPath();
        projected.forEach((p, i) => {
          if (!shown(p)) return;
          if (i === 0 || !shown(projected[i - 1])) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        const t = (elapsed / PULSE_MS + index / ARCS.length) % 1;
        const along = index % 2 ? 1 - t : t;
        const head = projected[Math.round(along * (projected.length - 1))];
        if (shown(head)) {
          const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 10);
          glow.addColorStop(0, 'rgba(207, 234, 255, 0.95)');
          glow.addColorStop(1, 'rgba(116, 184, 226, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.font = `500 ${Math.max(11, Math.round(size / 48))}px ${font}`;
      ctx.textAlign = 'center';
      PINS.forEach((pin, index) => {
        const p = project(pins[index]);
        if (p.z <= 0.05) return;
        const alpha = Math.min(1, p.z * 3);
        const ring = 6 + 6 * ((elapsed / 1800 + index / 3) % 1);
        ctx.strokeStyle = `rgba(207, 234, 255, ${(alpha * (1 - (ring - 6) / 6) * 0.7).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, ring, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(207, 234, 255, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(232, 238, 244, ${(alpha * 0.85).toFixed(3)})`;
        ctx.fillText(pin.label, p.x, p.y - 14);
      });
    };

    const tick = (now: number) => {
      draw(now);
      if (running) frame = requestAnimationFrame(tick);
    };

    const play = () => {
      if (running || still) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const pause = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    resize();
    draw(performance.now());

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    resizeObserver.observe(canvas);

    let inView = false;
    const viewObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !document.hidden) play();
      else pause();
    });
    viewObserver.observe(canvas);

    const onVisibility = () => {
      if (document.hidden || !inView) pause();
      else play();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      pause();
      resizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />;
}
