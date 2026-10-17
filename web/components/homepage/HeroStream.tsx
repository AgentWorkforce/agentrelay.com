'use client';

import { useEffect, useRef } from 'react';

import s from '../../app/landing.module.css';

/** The bytes the stream is made of. */
const GLYPHS = '0123456789abcdef{}<>:/=+.';

/** Phrases that now and then decode out of the stream for a few seconds. */
const EASTER_EGGS = [
  "you're absolutely right",
  'controlplaneforagents',
  'great question!',
  'let me delve into this',
  'perfect! now let me',
  'i apologize for the confusion',
  'let me think step by step',
  "that's a great catch",
  'production-ready',
  "it's worth noting",
  'certainly!',
  'now i see the issue',
  'excellent point',
  'comprehensive',
];

/** Every character the atlas renders: the bytes first, then the phrases' extra letters. */
const ATLAS = [...new Set([...GLYPHS, ...EASTER_EGGS.join('')])].join('');
const GLYPH_RGB = '201, 221, 238';

/** Grid cell size in CSS pixels; the font sits a little smaller inside it. */
const CELL = 16;
const FONT_SIZE = 12;

/** Radius (px) of the patch around the cursor where the streams brighten. */
const REVEAL_RADIUS = 200;

/** Seconds a phrase holds once decoded, and between one phrase and the next. */
const EGG_HOLD = 3.2;
const EGG_GAP = 7;

type Stream = {
  /** Row of the leading byte; fractional so each column falls at its own pace. */
  head: number;
  speed: number;
  length: number;
  /** Seconds until the column starts falling again after it clears the bottom. */
  rest: number;
};

type EasterEgg = {
  row: number;
  col: number;
  glyphs: number[];
  /** Per letter: seconds after which it dissolves back into the stream. */
  release: number[];
  age: number;
};

/**
 * The hero's backdrop: slow columns of hex bytes falling, barely above the
 * page, like traffic on the relay. Around the cursor the columns brighten. Every so often a phrase decodes out of the bytes, holds, and
 * dissolves again. Static for reduced motion, and paused off screen or in a
 * hidden tab.
 */
export function HeroStream() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let glyphs = new Uint8Array(0);
    let light = new Float32Array(0);
    let streams: Stream[] = [];
    let egg: EasterEgg | null = null;
    let nextEgg = 3;
    let atlas: HTMLCanvasElement | null = null;

    let frame = 0;
    let visible = true;
    let last = performance.now();
    const pointer = { x: 0, y: 0, active: false };
    /** How present the cursor's patch is: eases in on arrival, out on leaving. */
    let reveal = 0;

    const randomGlyph = () => Math.floor(Math.random() * GLYPHS.length);

    const newStream = (scattered: boolean): Stream => ({
      head: scattered ? Math.random() * rows * 1.4 - rows * 0.4 : -Math.random() * rows * 0.5,
      speed: 2 + Math.random() * 3,
      length: 8 + Math.floor(Math.random() * 18),
      rest: 0,
    });

    // Every glyph pre-rendered once, so each frame is image copies, not text layout.
    const buildAtlas = () => {
      const mono = getComputedStyle(document.body).getPropertyValue('--font-geist-mono').trim();
      const cell = Math.ceil(CELL * dpr);
      atlas = document.createElement('canvas');
      atlas.width = cell * ATLAS.length;
      atlas.height = cell;
      const a = atlas.getContext('2d');
      if (!a) return;
      a.font = `500 ${FONT_SIZE * dpr}px ${mono || 'ui-monospace'}, ui-monospace, monospace`;
      a.textAlign = 'center';
      a.textBaseline = 'middle';
      a.fillStyle = `rgb(${GLYPH_RGB})`;
      for (let i = 0; i < ATLAS.length; i++) a.fillText(ATLAS[i], i * cell + cell / 2, cell / 2);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      cols = Math.ceil(width / CELL);
      rows = Math.ceil(height / CELL);
      glyphs = new Uint8Array(cols * rows).map(randomGlyph);
      light = new Float32Array(cols * rows);
      streams = Array.from({ length: cols }, () => newStream(true));
      egg = null;
      buildAtlas();
    };

    // Phrases land in the left or right third, clear of the centred copy.
    const spawnEgg = (): EasterEgg | null => {
      const text = EASTER_EGGS[Math.floor(Math.random() * EASTER_EGGS.length)];
      const third = Math.floor(cols / 3);
      if (text.length > cols - 2) return null;
      const span = Math.max(1, third - text.length);
      const left = Math.random() < 0.5;
      const col = text.length < third
        ? (left ? 1 : cols - third) + Math.floor(Math.random() * span)
        : Math.floor((cols - text.length) / 2);
      const row = Math.floor(rows * (0.2 + Math.random() * 0.65));
      return {
        row,
        col,
        glyphs: [...text].map((ch) => ATLAS.indexOf(ch)),
        release: [...text].map((_, k) => k * 0.05 + EGG_HOLD + Math.random() * 0.8),
        age: 0,
      };
    };

    /** 0..1: how strongly the cursor's patch covers a cell. */
    const revealAt = (c: number, r: number) => {
      if (reveal < 0.01) return 0;
      const d = Math.hypot(c * CELL + CELL / 2 - pointer.x, r * CELL + CELL / 2 - pointer.y);
      const t = Math.min(1, d / REVEAL_RADIUS);
      return reveal * (1 - t * t) ** 2;
    };

    const step = (now: number) => {
      const dt = reduceMotion ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;

      if (!reduceMotion) {
        reveal += ((pointer.active ? 1 : 0) - reveal) * (1 - 0.94 ** (dt * 60));

        if (egg) {
          egg.age += dt;
          if (egg.age > Math.max(...egg.release) + 0.5) egg = null;
        } else {
          nextEgg -= dt;
          if (nextEgg <= 0) {
            egg = spawnEgg();
            nextEgg = EGG_GAP + Math.random() * 5;
          }
        }
      }

      light.fill(0);

      // Falling columns: a leading byte with a fading tail behind it, dim
      // everywhere and brighter inside the cursor's patch.
      for (let c = 0; c < cols; c++) {
        const stream = streams[c];
        if (stream.rest > 0) {
          stream.rest -= dt;
          continue;
        }
        const before = Math.floor(stream.head);
        stream.head += stream.speed * dt;
        const head = Math.floor(stream.head);
        if (head !== before && head >= 0 && head < rows) glyphs[head * cols + c] = randomGlyph();
        if (head - stream.length > rows) {
          Object.assign(stream, newStream(false));
          stream.rest = Math.random() * 3;
          continue;
        }
        for (let k = 0; k < stream.length; k++) {
          const r = head - k;
          if (r < 0 || r >= rows) continue;
          const lit = 0.6 + 0.4 * revealAt(c, r);
          const fade = 1 - k / stream.length;
          light[r * cols + c] = Math.max(light[r * cols + c], lit * (k === 0 ? 0.32 : 0.16 * fade * fade));
        }
      }

      // Now and then flip a resting byte so the texture never quite sits still.
      if (!reduceMotion) {
        for (let n = 0; n < cols * 0.15; n++) glyphs[Math.floor(Math.random() * glyphs.length)] = randomGlyph();
      }

      // The phrase decodes left to right, scrambling just before each letter
      // lands, then lets its letters go back to the stream one by one.
      if (egg) {
        egg.glyphs.forEach((glyph, k) => {
          const i = egg!.row * cols + egg!.col + k;
          const lands = k * 0.05;
          if (egg!.age < lands - 0.35 || egg!.age > egg!.release[k]) return;
          if (egg!.age < lands) {
            glyphs[i] = randomGlyph();
            light[i] = Math.max(light[i], 0.08);
            return;
          }
          glyphs[i] = glyph;
          const fadeIn = Math.min(1, (egg!.age - lands) / 0.3);
          const fadeOut = Math.min(1, (egg!.release[k] - egg!.age) / 0.4);
          light[i] = 0.15 * Math.min(fadeIn, fadeOut);
        });
      }

      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!atlas) return;
      const cell = Math.ceil(CELL * dpr);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const alpha = light[i] + 0.035;
          ctx.globalAlpha = Math.min(0.9, alpha);
          ctx.drawImage(
            atlas,
            glyphs[i] * cell,
            0,
            cell,
            cell,
            c * CELL * dpr,
            r * CELL * dpr,
            cell,
            cell,
          );
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      step(now);
      frame = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
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
      if (event.pointerType !== 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    const onVisibility = () => play();

    resize();
    // The atlas needs the real mono face; redraw once it has loaded.
    document.fonts?.ready.then(() => {
      buildAtlas();
      if (reduceMotion) step(performance.now());
    });

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

    if (!reduceMotion) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onPointerLeave);
    }
    document.addEventListener('visibilitychange', onVisibility);
    play();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={s.heroStream} aria-hidden="true" />;
}
