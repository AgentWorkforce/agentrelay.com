'use client';

import { useEffect, useRef } from 'react';

import { LAND_MASK } from './land-mask';
import s from './globe.module.css';

type Vec = [number, number, number];

type Place = { label: string; lat: number; lon: number };

/** Always on the globe, joined by one arc. */
const FIXED: Place[] = [
  { label: 'San Francisco', lat: 37.77, lon: -122.42 },
  { label: 'Oslo', lat: 59.91, lon: 10.75 },
];

/** Joined one at a time, in this order, then round again. */
const EXTRAS: Place[] = [
  { label: 'Boston', lat: 42.36, lon: -71.06 },
  { label: 'Tokyo', lat: 35.68, lon: 139.69 },
  { label: 'Rio de Janeiro', lat: -22.91, lon: -43.17 },
  { label: 'Bangalore', lat: 12.97, lon: 77.59 },
  { label: 'Cape Town', lat: -33.92, lon: 18.42 },
  { label: 'Sydney', lat: -33.87, lon: 151.21 },
];

/** A new place joins this often; with at most this many extras, the oldest leaves as each one arrives. */
const JOIN_MS = 10_000;
const MAX_EXTRAS = 3;
const GROW_MS = 1400;
const FADE_MS = 1000;

/** Longitude the globe starts on (the Americas and Europe), and its tilt toward the north. */
const HOME_LON = -56;
const TILT = 18;

/** One turn takes this long, easing a little over the Atlantic and quicker over the Pacific. */
const TURN_MS = 48_000;
const LINGER = 0.4;
const PULSE_MS = 2600;

const rad = (deg: number) => (deg * Math.PI) / 180;
const dot3 = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

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
  // Longer hops rise higher, but never far enough to swing wide of the globe.
  const lift = 0.04 + 0.1 * Math.min(angle / (Math.PI / 2), 1.4);
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
 * A dotted globe that turns slowly. San Francisco and Oslo stay joined;
 * every 10s another place reaches in from the nearer of the two, and the
 * oldest of the extras lets go, so the network moves around the world. Arcs
 * carry message pulses. Pauses off
 * screen and in background tabs, and draws one still frame for
 * reduced-motion users.
 */
export function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dots = landDots();
    const fixed = FIXED.map((place) => toVec(place.lat, place.lon));
    const extras = EXTRAS.map((place) => toVec(place.lat, place.lon));
    const fixedArc = arcPoints(fixed[0], fixed[1]);
    const extraArcs = extras.map((at) => {
      const nearer = dot3(fixed[0], at) > dot3(fixed[1], at) ? fixed[0] : fixed[1];
      return arcPoints(nearer, at);
    });
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
      // Without motion, hold the full set of places, facing the Americas and Europe.
      const elapsed = still ? MAX_EXTRAS * JOIN_MS - 1 : now - start;
      const lon = rad(facing(still ? 0.5 : (elapsed / TURN_MS + 0.5) % 1));
      const tilt = rad(TILT);
      const [cosL, sinL, cosT, sinT] = [Math.cos(-lon), Math.sin(-lon), Math.cos(tilt), Math.sin(tilt)];
      // Room above the globe for the arcs, which rise off the surface.
      const R = size * 0.41;
      const cx = size / 2;
      const cy = size * 0.56;

      const project = ([x, y, z]: Vec) => {
        const x1 = x * cosL + z * sinL;
        const z1 = -x * sinL + z * cosL;
        const y2 = y * cosT - z1 * sinT;
        const z2 = y * sinT + z1 * cosT;
        return { x: cx + R * x1, y: cy - R * y2, z: z2 };
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

      // The places on the globe right now: the fixed pair, then the latest
      // extras, each joined to whichever of the fixed pair is nearer. Only
      // the fixed pair is always there, so no arc outlives either of its ends.
      type Live = { place: Place; at: Vec; life: number; grown: number; landed: number; arc?: Vec[] };
      const live: Live[] = FIXED.map((place, i) => ({ place, at: fixed[i], life: 1, grown: 1, landed: Infinity }));
      const newest = Math.floor(elapsed / JOIN_MS);
      for (let k = Math.max(0, newest - MAX_EXTRAS); k <= newest; k++) {
        const age = elapsed - k * JOIN_MS;
        const left = (k + MAX_EXTRAS) * JOIN_MS + FADE_MS - elapsed;
        if (left <= 0) continue;
        const index = k % EXTRAS.length;
        live.push({
          place: EXTRAS[index],
          at: extras[index],
          life: Math.min(1, left / FADE_MS),
          grown: Math.min(1, age / GROW_MS),
          landed: age - GROW_MS,
          arc: extraArcs[index],
        });
      }

      // Arcs fade out as they near the horizon, so one heading round the back
      // sets with the globe instead of stopping in mid-air.
      const facingUs = (p: ReturnType<typeof project>) => Math.max(0, Math.min(1, p.z * 12));
      const arcs = [{ points: fixedArc, drawn: 1, life: 1 }].concat(
        live.filter((l) => l.arc).map((l) => ({ points: l.arc as Vec[], drawn: l.grown, life: l.life })),
      );
      arcs.forEach(({ points, drawn, life }, index) => {
        const projected = points.slice(0, Math.max(2, Math.round(drawn * points.length))).map(project);
        ctx.lineWidth = 1.4;
        for (let i = 1; i < projected.length; i++) {
          const a = projected[i - 1];
          const b = projected[i];
          const alpha = 0.55 * life * Math.min(facingUs(a), facingUs(b));
          if (alpha <= 0) continue;
          ctx.strokeStyle = `rgba(116, 184, 226, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        // While an arc is still reaching out, its tip glows; once it lands, pulses run along it.
        const along = drawn < 1 ? 1 : index % 2 ? 1 - ((elapsed / PULSE_MS + index * 0.37) % 1) : (elapsed / PULSE_MS + index * 0.37) % 1;
        const head = drawn < 1 ? projected[projected.length - 1] : projected[Math.round(along * (projected.length - 1))];
        if (facingUs(head) > 0.5) {
          const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 10);
          glow.addColorStop(0, `rgba(207, 234, 255, ${(0.95 * life).toFixed(3)})`);
          glow.addColorStop(1, 'rgba(116, 184, 226, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.font = `500 ${Math.max(11, Math.round(size / 48))}px ${font}`;
      ctx.textAlign = 'center';
      live.forEach(({ place, at, life, grown, landed }, index) => {
        const p = project(at);
        if (p.z <= 0.05 || grown < 1) return;
        const alpha = Math.min(1, p.z * 3) * life;
        // A new place lands with one wide ring, then settles into the steady pulse.
        if (landed < 900) {
          const burst = landed / 900;
          ctx.strokeStyle = `rgba(207, 234, 255, ${(alpha * (1 - burst)).toFixed(3)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4 + 26 * burst, 0, Math.PI * 2);
          ctx.stroke();
        }
        const ring = 6 + 6 * ((elapsed / 1800 + index / 3) % 1);
        ctx.strokeStyle = `rgba(207, 234, 255, ${(alpha * (1 - (ring - 6) / 6) * 0.7).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, ring, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(207, 234, 255, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5 * Math.min(1, landed / 250), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(232, 238, 244, ${(alpha * Math.min(1, landed / 400) * 0.85).toFixed(3)})`;
        ctx.fillText(place.label, p.x, p.y - 14);
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
