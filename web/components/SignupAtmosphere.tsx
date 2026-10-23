'use client';

import { useEffect, useRef } from 'react';
import { RELAY_MARK_PATHS } from '../lib/relay-mark';

/** charge: 0 at rest, 1 while the primary action is hovered or focused, 2 while it is pressed. */
type Props = { step: number; mode: string; ride: boolean; charge?: number; still?: boolean; className: string };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; decay: number; hue: number; spin: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

/**
 * Launch choreography in seconds: the mark inhales, flies past the viewer as
 * an aurora, then springs back into a full-screen resting size.
 */
function launchProfile(t: number) {
  if (t < 0 || t > 3.2) return { scale: 1, energy: 0 };
  const inhale = t < .5 ? Math.sin(t / .5 * Math.PI) : 0;
  const x = Math.max(0, t - .32);
  const flight = 3.8 * Math.exp(-x * 2.5) * Math.sin(x * 3.3);
  return { scale: 1 - inhale * .13 + flight, energy: clamp(flight / 1.6, 0, 1) };
}

/** The actual Relay mark, woven from responsive ribbons of light. */
export function SignupAtmosphere({ step, mode, ride, charge = 0, still = false, className }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ step, mode, ride, charge, still });
  state.current = { step, mode, ride, charge, still };

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer: fine)');
    // Sample the canonical paths once. No approximated logo or per-frame DOM work.
    const shapes = RELAY_MARK_PATHS.map((d, index) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      const length = path.getTotalLength();
      return {
        fill: new Path2D(d), centerX: index === 0 ? 37 : 89,
        points: Array.from({ length: 193 }, (_, i) => {
          const point = path.getPointAtLength(i / 192 * length);
          return { x: point.x, y: point.y };
        }),
      };
    });
    let frame = 0; let width = 0; let height = 0;
    let phase = 0; let cometPhase = 0; let last = 0; let staticFrame = '';
    let shownStep = state.current.step;
    let clarity = 0;
    let assembled = state.current.mode === 'complete' ? 1 : 0;
    let immersion = state.current.ride ? 1 : 0;
    let wasRide = state.current.ride; let lastStep = Math.round(state.current.step); let wasComplete = state.current.mode === 'complete';
    let launchAt = -1; let pulseAt = -1; let pulseHue = 200;
    let gather = 0; let press = 0; let wasCharged = false;
    let hover = 0; let driftX = 0; let driftY = 0; let kickX = 0; let kickY = 0;
    const sparks: Spark[] = [];
    const geometry = { cx: 0, cy: 0, size: 0 };
    const at = { x: 0, y: 0 };
    const pointer = { x: 0, y: 0, inside: false, lastX: 0, lastY: 0, lastTime: 0 };
    const resize = () => {
      width = element.clientWidth; height = element.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      staticFrame = '';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const move = (event: PointerEvent) => {
      if (reduced.matches || !finePointer.matches || event.pointerType === 'touch') return;
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left; const y = event.clientY - rect.top;
      const { cx, cy, size } = geometry;
      pointer.inside = size > 0 && Math.hypot((x - cx) / (size * .65), (y - cy) / (size * .55)) < 1;
      if (pointer.inside) {
        pointer.x = clamp((x - cx) / size, -.6, .6);
        pointer.y = clamp((y - cy) / size, -.6, .6);
        const elapsed = event.timeStamp - pointer.lastTime;
        if (elapsed > 0 && elapsed < 120) {
          kickX = clamp(kickX + (x - pointer.lastX) / elapsed * 3, -18, 18);
          kickY = clamp(kickY + (y - pointer.lastY) / elapsed * 3, -18, 18);
        }
      }
      pointer.lastX = x; pointer.lastY = y; pointer.lastTime = event.timeStamp;
    };
    const leave = () => { pointer.inside = false; pointer.lastTime = 0; };
    const observer = new ResizeObserver(resize);
    observer.observe(element); resize();
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);

    /** Throw sparks off the mark's outline, outward and curling. */
    function burst(count: number, force: number, hue: number, hueSpread: number) {
      const { cx, cy, size } = geometry;
      const scale = size / 112;
      for (let i = 0; i < count && sparks.length < 520; i++) {
        const shape = shapes[i % 2];
        const point = shape.points[Math.floor(Math.random() * 192)];
        const x = cx + (point.x - 56) * scale; const y = cy + (point.y - 45.5) * scale;
        const angle = Math.atan2(y - cy, x - cx) + (Math.random() - .5) * .9;
        const speed = force * (.35 + Math.random() * .9) * Math.max(.6, size / 520);
        sparks.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1, decay: .006 + Math.random() * .012, hue: hue + (Math.random() - .5) * hueSpread,
          spin: (Math.random() < .5 ? -1 : 1) * (.006 + Math.random() * .02),
        });
      }
    }

    function draw(time: number) {
      frame = requestAnimationFrame(draw);
      const current = state.current;
      if (document.hidden || time - last < 32) return;
      const delta = Math.min(time - last, 50); last = time;
      const motion = !reduced.matches && !current.still && current.mode !== 'offline';
      const complete = current.mode === 'complete';
      const warm = current.mode === 'paused' || current.mode === 'failed';
      const smooth = motion ? 1 - Math.exp(-delta / 650) : 1;

      // Story beats: the launch, each new step, and the finish.
      if (current.ride && !wasRide) launchAt = motion ? time : -1;
      wasRide = current.ride;
      const stepNow = Math.round(current.step);
      if (stepNow > lastStep && motion) { pulseAt = time; pulseHue = 195; burst(48, 3, 200, 18); }
      lastStep = stepNow;
      if (complete && !wasComplete && motion) { pulseAt = time; pulseHue = 170; burst(180, 6, 195, 30); }
      wasComplete = complete;

      immersion += ((current.ride ? 1 : 0) - immersion) * (motion ? 1 - Math.exp(-delta / 520) : 1);
      if (Math.abs(immersion - (current.ride ? 1 : 0)) < .001) immersion = current.ride ? 1 : 0;
      shownStep += (current.step - shownStep) * smooth;
      assembled += ((complete ? 1 : 0) - assembled) * (motion ? 1 - Math.exp(-delta / 950) : 1);
      if (assembled > .999) assembled = 1;
      const progress = clamp(shownStep / 5, 0, 1);
      const targetClarity = complete ? 1 : current.mode === 'forming' ? .03 : .15 + progress * .66 + immersion * .06 + gather * .14;
      clarity += (targetClarity - clarity) * smooth;
      const launchT = launchAt < 0 ? -1 : (time - launchAt) / 1000;
      if (launchT > 3.2) launchAt = -1;
      const launch = launchProfile(launchT);
      if (launchT >= .34 && launchT - delta / 1000 < .34) burst(200, 9, 200, 32);
      const pulseAge = pulseAt < 0 ? 1 : (time - pulseAt) / 1400;
      if (pulseAge >= 1) pulseAt = -1;
      const pulse = pulseAt < 0 ? 0 : Math.pow(1 - pulseAge, 2);
      // The mark leans toward the primary action: it gathers on hover and inhales on press.
      const charged = !current.ride && current.charge > 0;
      gather += ((charged ? 1 : 0) - gather) * (motion ? 1 - Math.exp(-delta / 260) : 1);
      press += ((charged && current.charge > 1 ? 1 : 0) - press) * (motion ? 1 - Math.exp(-delta / 90) : 1);
      if (charged && !wasCharged && motion) burst(22, 1.4, 198, 16);
      wasCharged = charged;

      if (motion) phase += delta * (warm ? .00008 : .00012 + progress * .00032 + immersion * .00008 + gather * .00034 + launch.energy * .004) * (1 - assembled);
      if (motion) cometPhase += delta * (warm ? .00006 : current.step > 0 ? .00016 + progress * .0002 : .0001 + gather * .00022) * (1 - assembled * .6);
      hover += ((pointer.inside && motion ? 1 : 0) - hover) * .09;
      driftX += ((motion ? pointer.x * hover : 0) - driftX) * .075;
      driftY += ((motion ? pointer.y * hover : 0) - driftY) * .075;
      kickX *= .91; kickY *= .91;
      if (!motion) { gather = 0; press = 0; hover = 0; driftX = 0; driftY = 0; kickX = 0; kickY = 0; sparks.length = 0; }
      const frameKey = `${width}:${height}:${current.step}:${current.mode}:${current.ride}:${current.charge}:${current.still}`;
      if (!motion && frameKey === staticFrame) return;
      staticFrame = motion ? '' : frameKey;

      const restSize = Math.min(width * .76, height * .43, 490);
      const rideSize = Math.min(width * .85, height * .49, 640);
      const size = lerp(restSize, rideSize, immersion) * (.86 + progress * .14) * launch.scale * (1 + pulse * .05 + gather * .06 - press * .08) * (1 - assembled * .16);
      const scale = size / 112;
      const cx = width / 2;
      const cy = height * (height < 600 ? .27 : .31) + Math.sin(phase * .55) * (motion ? 3 : 0) * (1 - assembled);
      geometry.cx = cx; geometry.cy = cy; geometry.size = size / launch.scale;
      ctx!.clearRect(0, 0, width, height);
      const glowRadius = Math.max(size * 1.15, 1);
      const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      glow.addColorStop(0, `rgba(67,145,192,${.1 + progress * .1 + hover * .035 + gather * .16 + press * .1 + launch.energy * .2 + pulse * .08})`);
      glow.addColorStop(.5, 'rgba(30,85,126,.035)'); glow.addColorStop(1, 'rgba(10,27,40,0)');
      ctx!.fillStyle = glow; ctx!.fillRect(0, 0, width, height);
      ctx!.save();
      ctx!.translate(cx + driftX * 16, cy + driftY * 12);
      ctx!.rotate(driftX * .07 * (1 - assembled * .7) + launch.energy * .35);
      ctx!.globalCompositeOperation = 'screen';

      // One strand position: shared by the silk ribbons and the relay comets.
      const strandPoint = (shapeIndex: number, index: number, strand: number) => {
        const shape = shapes[shapeIndex];
        const point = shape.points[index];
        const contour = (1 - assembled) * (.68 + clarity * .28 + strand * (.44 - clarity * .35) + launch.energy * (strand - .5) * .8) + assembled * (.08 + strand * .92);
        const t = index / 192 * Math.PI * 2;
        const wave = (1 - assembled) * (1.35 - clarity * 1.25 + launch.energy * 1.8);
        const flowX = Math.sin(t * 2 + phase + strand * 2.4) * 3.5 + Math.cos(t * 3 - phase * .7) * 1.7;
        const flowY = Math.sin(t * 3 + phase * .8 + strand * 3) * 3;
        const x = (point.x - shape.centerX) * contour + shape.centerX - 56;
        const y = (point.y - 45.5) * contour;
        // Pointer velocity excites a traveling ripple, then damps naturally.
        const ripple = Math.sin(t * 2 - phase * 1.5 + strand * 4) * hover;
        at.x = (x + flowX * wave) * scale + ripple * kickX * (1 - assembled * .8);
        at.y = (y + flowY * wave) * scale + ripple * kickY * (1 - assembled * .8);
        return at;
      };

      shapes.forEach((shape, shapeIndex) => {
        const tone = shapeIndex === 0 ? 1 : .55;
        for (let line = 0; line < 32; line++) {
          const strand = line / 31;
          const emphasis = Math.pow(Math.sin(strand * Math.PI), 2);
          ctx!.beginPath();
          for (let index = 0; index < 193; index++) {
            strandPoint(shapeIndex, index, strand);
            if (index === 0) ctx!.moveTo(at.x, at.y); else ctx!.lineTo(at.x, at.y);
          }
          // Launch energy sweeps the ribbons through an aurora, then back to blue.
          const aurora = launch.energy * (strand * 30 - 10) + pulse * (strand - .5) * 15;
          const hue = (warm ? 36 + strand * 16 : 195 + strand * 19) + aurora;
          const alpha = (.05 + emphasis * (.23 + clarity * .16 + immersion * .04 + gather * .2 + launch.energy * .25)) * tone * (1 - assembled * .65);
          ctx!.strokeStyle = `hsla(${hue}, ${64 + launch.energy * 26}%, ${58 + emphasis * 22}%, ${alpha})`;
          ctx!.lineWidth = .7 + progress * .18 + immersion * .25;
          ctx!.stroke();
        }
        // A message of light travels each facet, in opposite directions: the relay.
        if (assembled < .98) {
          const direction = shapeIndex === 0 ? 1 : -1;
          const head = ((cometPhase * 192 * direction + shapeIndex * 96) % 192 + 192) % 192;
          const trail = 46;
          const visibility = (immersion + (1 - immersion) * (current.mode === 'forming' ? .28 : .12 + gather * .7)) * (1 - assembled) * (1 - launch.energy);
          const { x: hx, y: hy } = strandPoint(shapeIndex, Math.floor(head), .5);
          let lastX = hx; let lastY = hy;
          for (let i = 1; i < trail; i++) {
            const index = Math.floor(((head - i * direction) % 192 + 192) % 192);
            const { x, y } = strandPoint(shapeIndex, index, .5);
            const fade = 1 - i / trail;
            ctx!.beginPath(); ctx!.moveTo(lastX, lastY); ctx!.lineTo(x, y);
            ctx!.strokeStyle = `hsla(${warm ? 40 : 190 + i}, 90%, ${72 + fade * 20}%, ${fade * fade * .85 * visibility})`;
            ctx!.lineWidth = .6 + fade * 2.4;
            ctx!.stroke();
            lastX = x; lastY = y;
          }
          const dot = ctx!.createRadialGradient(hx, hy, 0, hx, hy, 18);
          dot.addColorStop(0, `hsla(${warm ? 42 : 196}, 100%, 96%, ${.95 * visibility})`);
          dot.addColorStop(.25, `hsla(${warm ? 38 : 200}, 80%, 75%, ${.4 * visibility})`);
          dot.addColorStop(1, `hsla(${warm ? 36 : 205}, 60%, 50%, 0)`);
          ctx!.fillStyle = dot; ctx!.fillRect(hx - 18, hy - 18, 36, 36);
        }
        // The exact silhouette emerges gradually, resolving fully only on reported completion.
        if (clarity > .2) {
          ctx!.save();
          ctx!.scale(scale, scale); ctx!.translate(-56, -45.5);
          const fill = ctx!.createLinearGradient(25, 0, 75, 91);
          fill.addColorStop(0, '#b4e5ff'); fill.addColorStop(.5, '#79bde5'); fill.addColorStop(1, '#4485b0');
          ctx!.globalAlpha = (assembled * .9 + (1 - assembled) * Math.pow(clarity, 3) * .28) * tone;
          ctx!.fillStyle = fill; ctx!.fill(shape.fill);
          ctx!.restore();
        }
      });
      ctx!.restore();

      // Brief depth parallax at handoff: light travels toward the viewer, then settles.
      // These deterministic rays exist only during the launch, never as progress signals.
      if (launch.energy > .025) {
        ctx!.save(); ctx!.globalCompositeOperation = 'screen';
        for (let i = 0; i < 48; i++) {
          const angle = i * 2.39996;
          const reach = 100 + ((i * 71) % 370) + launchT * 130;
          const tail = reach + launch.energy * (60 + i % 7 * 18);
          ctx!.beginPath();
          ctx!.moveTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach * .7);
          ctx!.lineTo(cx + Math.cos(angle) * tail, cy + Math.sin(angle) * tail * .7);
          ctx!.strokeStyle = `rgba(173,221,247,${launch.energy * .16})`;
          ctx!.lineWidth = .7; ctx!.stroke();
        }
        ctx!.restore();
      }

      // A shockwave ring for each beat of the story.
      if (pulse > 0) {
        ctx!.save();
        ctx!.globalCompositeOperation = 'screen';
        ctx!.beginPath();
        ctx!.ellipse(cx, cy, size * (.45 + pulseAge * .9), size * (.37 + pulseAge * .75), 0, 0, Math.PI * 2);
        ctx!.strokeStyle = `hsla(${pulseHue}, 80%, 78%, ${pulse * .5})`;
        ctx!.lineWidth = 1 + pulse * 3;
        ctx!.stroke();
        ctx!.restore();
      }

      if (sparks.length) {
        ctx!.save();
        ctx!.globalCompositeOperation = 'lighter';
        ctx!.lineCap = 'round';
        const step = delta / 16;
        for (let i = sparks.length - 1; i >= 0; i--) {
          const spark = sparks[i];
          const cos = Math.cos(spark.spin * step); const sin = Math.sin(spark.spin * step);
          const vx = spark.vx * cos - spark.vy * sin; const vy = spark.vx * sin + spark.vy * cos;
          const drag = Math.pow(.972, step);
          spark.vx = vx * drag; spark.vy = vy * drag;
          spark.x += spark.vx * step; spark.y += spark.vy * step;
          spark.life -= spark.decay * step;
          if (spark.life <= 0 || spark.x < -40 || spark.x > width + 40 || spark.y < -40 || spark.y > height + 40) { sparks.splice(i, 1); continue; }
          ctx!.beginPath();
          ctx!.moveTo(spark.x, spark.y);
          ctx!.lineTo(spark.x - spark.vx * 2.6, spark.y - spark.vy * 2.6);
          ctx!.strokeStyle = `hsla(${spark.hue}, 85%, 76%, ${spark.life * .8})`;
          ctx!.lineWidth = .6 + spark.life * 1.6;
          ctx!.stroke();
        }
        ctx!.restore();
      }
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
    };
  }, []);

  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}
