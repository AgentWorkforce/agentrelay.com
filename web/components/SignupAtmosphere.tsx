'use client';

import { useEffect, useRef } from 'react';
import { RELAY_MARK_PATHS } from '../lib/relay-mark';

type Props = { step: number; mode: string; className: string };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** The actual Relay mark, woven from responsive ribbons of light. */
export function SignupAtmosphere({ step, mode, className }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ step, mode });
  state.current = { step, mode };

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
    let phase = 0; let last = 0; let staticFrame = '';
    let shownStep = state.current.step;
    let assembled = state.current.mode === 'complete' ? 1 : 0;
    let hover = 0; let driftX = 0; let driftY = 0; let kickX = 0; let kickY = 0;
    const pointer = { x: 0, y: 0, inside: false, lastX: 0, lastY: 0, lastTime: 0 };
    const centerY = () => Math.min(height * .29, 260);
    const baseSize = () => Math.min(width * .7, height * .44, 440);
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
      const size = baseSize();
      pointer.inside = size > 0 && Math.hypot((x - width / 2) / (size * .65), (y - centerY()) / (size * .55)) < 1;
      if (pointer.inside) {
        pointer.x = clamp((x - width / 2) / size, -.6, .6);
        pointer.y = clamp((y - centerY()) / size, -.6, .6);
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

    function draw(time: number) {
      frame = requestAnimationFrame(draw);
      if (document.hidden || time - last < 32) return;
      const delta = Math.min(time - last, 50); last = time;
      const current = state.current;
      const motion = !reduced.matches && current.mode !== 'offline';
      const complete = current.mode === 'complete';
      const warm = current.mode === 'paused' || current.mode === 'failed';
      const smooth = motion ? 1 - Math.exp(-delta / 650) : 1;
      shownStep += (current.step - shownStep) * smooth;
      assembled += ((complete ? 1 : 0) - assembled) * (motion ? 1 - Math.exp(-delta / 950) : 1);
      if (assembled > .999) assembled = 1;
      const progress = clamp(shownStep / 5, 0, 1);
      if (motion) phase += delta * (warm ? .00008 : .00012 + progress * .00032) * (1 - assembled);
      hover += ((pointer.inside && motion ? 1 : 0) - hover) * .09;
      driftX += ((motion ? pointer.x * hover : 0) - driftX) * .075;
      driftY += ((motion ? pointer.y * hover : 0) - driftY) * .075;
      kickX *= .91; kickY *= .91;
      if (!motion) { hover = 0; driftX = 0; driftY = 0; kickX = 0; kickY = 0; }
      const frameKey = `${width}:${height}:${current.step}:${current.mode}`;
      if (!motion && frameKey === staticFrame) return;
      staticFrame = motion ? '' : frameKey;
      const size = baseSize() * (.86 + progress * .14);
      const scale = size / 112;
      const cx = width / 2; const cy = centerY();
      ctx!.clearRect(0, 0, width, height);
      const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, size * 1.15);
      glow.addColorStop(0, `rgba(67,145,192,${.1 + progress * .1 + hover * .035})`);
      glow.addColorStop(.5, 'rgba(30,85,126,.065)'); glow.addColorStop(1, 'rgba(10,27,40,0)');
      ctx!.fillStyle = glow; ctx!.fillRect(0, 0, width, height);
      ctx!.save();
      ctx!.translate(cx + driftX * 16, cy + driftY * 12);
      ctx!.rotate(driftX * .07 * (1 - assembled * .7));
      ctx!.globalCompositeOperation = 'screen';

      shapes.forEach((shape, shapeIndex) => {
        const tone = shapeIndex === 0 ? 1 : .55;
        for (let line = 0; line < 48; line++) {
          const strand = line / 47;
          const emphasis = Math.pow(Math.sin(strand * Math.PI), 2);
          // Loose silk outlines gradually knit inward into the two solid facets.
          const contour = (1 - assembled) * (.77 + strand * .32) + assembled * (.08 + strand * .92);
          ctx!.beginPath();
          shape.points.forEach((point, index) => {
            const t = index / 192 * Math.PI * 2;
            const wave = (1 - assembled) * (1 + progress * .35);
            const flowX = Math.sin(t * 2 + phase + strand * 2.4) * 3.5 + Math.cos(t * 3 - phase * .7) * 1.7;
            const flowY = Math.sin(t * 3 + phase * .8 + strand * 3) * 3;
            const x = (point.x - shape.centerX) * contour + shape.centerX - 56;
            const y = (point.y - 45.5) * contour;
            // Pointer velocity excites a traveling ripple, then damps naturally.
            const ripple = Math.sin(t * 2 - phase * 1.5 + strand * 4) * hover;
            const px = (x + flowX * wave) * scale + ripple * kickX * (1 - assembled * .8);
            const py = (y + flowY * wave) * scale + ripple * kickY * (1 - assembled * .8);
            if (index === 0) ctx!.moveTo(px, py); else ctx!.lineTo(px, py);
          });
          const hue = warm ? 36 + strand * 16 : 195 + strand * 19;
          ctx!.strokeStyle = `hsla(${hue}, 64%, ${58 + emphasis * 22}%, ${( .035 + emphasis * (.17 + progress * .1)) * tone * (1 - assembled * .65)})`;
          ctx!.lineWidth = .7 + progress * .18;
          ctx!.stroke();
        }
        // Resolve into the exact brand silhouette only on reported completion.
        if (assembled > .01) {
          ctx!.save();
          ctx!.scale(scale, scale); ctx!.translate(-56, -45.5);
          const fill = ctx!.createLinearGradient(25, 0, 75, 91);
          fill.addColorStop(0, '#b4e5ff'); fill.addColorStop(.5, '#79bde5'); fill.addColorStop(1, '#4485b0');
          ctx!.globalAlpha = assembled * .9 * tone;
          ctx!.fillStyle = fill; ctx!.fill(shape.fill);
          ctx!.restore();
        }
      });
      ctx!.restore();
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
