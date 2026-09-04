'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type MarkPosition = {
  x: number;
  y: number;
  rotation: number;
};

const INITIAL_TERMINALS = 20;
const MAX_TERMINALS = 20;
const roundStyleValue = (value: number) => Math.round(value * 10_000) / 10_000;

const orbitSettings = Array.from({ length: MAX_TERMINALS }, (_, index) => {
  const direction = index % 2 === 0 ? 1 : -1;
  return {
    phase: -1.55 + index * 1.07,
    speed: direction * (.84 + (index % 5) * .075),
    spin: direction * (.88 + (index % 4) * .09),
    radiusX: 37 + (index * 7) % 10,
    radiusY: 37 + (index * 11) % 9,
  };
});

const initialPositions = orbitSettings.map(({ phase, radiusX, radiusY }, index) => ({
  // React's server renderer serializes style numbers with limited precision.
  // Quantize the initial values so the client's first render is byte-for-byte
  // identical and hydration can safely hand the elements to the RAF loop.
  x: roundStyleValue(50 + Math.cos(phase) * radiusX),
  y: roundStyleValue(50 + Math.sin(phase) * radiusY),
  rotation: roundStyleValue(phase * 180 / Math.PI + 90 + index * 8),
}));

function getCalmPosition(index: number, count: number): MarkPosition {
  const split = count > 10;
  const isLeft = split && index % 2 === 0;
  const row = split ? Math.floor(index / 2) : index;
  const sideCount = split
    ? (isLeft ? Math.ceil(count / 2) : Math.floor(count / 2))
    : count;
  const spacing = sideCount > 8 ? 6.6 : 7.2;

  return {
    x: isLeft ? 17.5 : 82.5,
    y: 50 + (row - (sideCount - 1) / 2) * spacing,
    rotation: 0,
  };
}

export function FooterPortrait() {
  const [isCalm, setIsCalm] = useState(false);
  const [terminalCount, setTerminalCount] = useState(INITIAL_TERMINALS);
  const calmRef = useRef(false);
  const countRef = useRef(INITIAL_TERMINALS);
  const releasedAtRef = useRef(0);
  const marksRef = useRef<Array<HTMLSpanElement | null>>([]);
  const positionsRef = useRef(initialPositions.map((position) => ({ ...position })));

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startedAt = performance.now();
    let previousTime = startedAt;
    let frame = 0;

    const animate = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const delta = Math.min((now - previousTime) / 1000, .05);
      previousTime = now;
      const calm = calmRef.current;
      const releaseAge = (now - releasedAtRef.current) / 1000;
      const releaseProgress = Math.min(Math.max(releaseAge / 1.8, 0), 1);
      const response = calm ? .3 : .78 - releaseProgress * .54;
      const amount = reduceMotion ? 1 : 1 - Math.exp(-delta / response);

      orbitSettings.slice(0, countRef.current).forEach((orbit, index) => {
        const angle = orbit.phase + elapsed * orbit.speed;
        const target = calm
          ? getCalmPosition(index, countRef.current)
          : {
              x: 50 + Math.cos(angle) * orbit.radiusX,
              y: 50 + Math.sin(angle) * orbit.radiusY,
              rotation: angle * 180 / Math.PI + 90
                + elapsed * orbit.spin * 118
                + Math.sin(elapsed * 1.4 + index) * 12,
            };
        const current = positionsRef.current[index];

        current.x += (target.x - current.x) * amount;
        current.y += (target.y - current.y) * amount;
        if (calm) {
          current.rotation = 0;
        } else {
          const rotationDelta = ((target.rotation - current.rotation + 540) % 360) - 180;
          current.rotation += rotationDelta * amount;
        }

        const mark = marksRef.current[index];
        if (mark) {
          mark.style.left = `${current.x}%`;
          mark.style.top = `${current.y}%`;
          mark.style.transform = `translate(-50%, -50%) rotate(${current.rotation}deg)`;
        }
      });

      if (!reduceMotion) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const settle = () => {
    calmRef.current = true;
    setIsCalm(true);
  };

  const addTerminalAndSettle = () => {
    setTerminalCount((count) => {
      const nextCount = Math.min(count + 1, MAX_TERMINALS);
      countRef.current = nextCount;
      return nextCount;
    });
    settle();
  };

  const releaseCalm = () => {
    calmRef.current = false;
    releasedAtRef.current = performance.now();
    setIsCalm(false);
  };

  return (
    <div
      className={`footer-portrait${isCalm ? ' is-calm' : ''}`}
      role="img"
      aria-label={`Skip organizing ${terminalCount} moving workstreams`}
      tabIndex={0}
      onMouseEnter={addTerminalAndSettle}
      onMouseLeave={releaseCalm}
      onFocus={settle}
      onBlur={releaseCalm}
    >
      <div className="footer-orbit footer-orbit-outer" />
      <div className="footer-orbit footer-orbit-inner" />
      {initialPositions.slice(0, terminalCount).map((position, index) => (
        <span
          className="footer-orbit-mark"
          key={index}
          ref={(mark) => { marksRef.current[index] = mark; }}
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
          }}
        />
      ))}
      <span className="footer-avatar">
        <Image className="footer-avatar-chaos" src="/skip-assets/skip-avatar-hover.png" alt="" width={190} height={190} />
        <Image className="footer-avatar-calm" src="/skip-assets/skip-avatar.png" alt="" width={190} height={190} />
      </span>
    </div>
  );
}
