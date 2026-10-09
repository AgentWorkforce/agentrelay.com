'use client';

import { useEffect, useRef } from 'react';
import { RELAY_RUSH_EVENT } from './relay-events';
import s from './login.module.css';

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Agent threads as ribbons of light. Message pulses travel left to right and
// every ribbon converges on the panel's right edge, where the sign-in form sits.
// uRush (0..1) straightens the ribbons and streaks pulses into that point;
// uFlow is the pulse clock, which speeds up during a rush without jumping.
// uHover (0..1) gathers nearby ribbons toward the pointer and lights them up.
const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform float uRush;
uniform float uFlow;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime;

  vec3 col = vec3(0.012, 0.027, 0.05);
  float haze = fbm(vec2(uv.x * aspect, uv.y) * 1.4 + vec2(t * 0.025, -t * 0.015));
  col += vec3(0.04, 0.10, 0.18) * haze;

  float focus = 0.5;
  float converge = smoothstep(0.0, 1.0 - 0.45 * uRush, uv.x);
  float pull = uHover * (1.0 - uRush) * (1.0 - converge)
            * exp(-pow((uv.x - uMouse.x) * aspect, 2.0) * 5.0);

  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float base = 0.12 + fi * 0.095;
    float wave = 0.07 * sin(uv.x * aspect * 1.7 + t * 0.22 + fi * 1.3)
               + 0.04 * sin(uv.x * aspect * 3.3 - t * 0.17 + fi * 2.1)
               + 0.05 * (noise(vec2(uv.x * aspect * 1.2 + fi * 7.0, t * 0.08)) - 0.5);
    float y = mix(base, focus, converge * 0.94) + wave * (1.0 - 0.9 * converge) * (1.0 - 0.65 * uRush);
    // Smooth in y (gap * gaussian), so a ribbon bends toward the pointer and never tears.
    float gap = uMouse.y - y;
    // Gain stays under 1 so a ribbon never overshoots the pointer and folds back.
    y += gap * 0.95 * pull * exp(-gap * gap * 16.0);
    float near = uHover * exp(-pow(length(vec2((uv.x - uMouse.x) * aspect, y - uMouse.y)), 2.0) * 16.0);

    float d = abs(uv.y - y);
    float width = (0.0011 + 0.0009 * fract(fi * 0.618)) * (1.0 + 0.7 * uRush);
    float core = smoothstep(width * 2.2, 0.0, d);
    float halo = 0.0016 / (d + 0.004);

    vec3 c = mix(vec3(0.20, 0.50, 0.78), vec3(0.02, 0.80, 0.96), fract(fi * 0.37));
    if (i == 2 || i == 6) c = vec3(0.86, 0.55, 0.42);

    float speed = 0.07 + 0.025 * fract(fi * 0.73);
    float phase = fract(uv.x * 0.9 - uFlow * speed + fi * 0.41);
    float pulse = exp(-pow((phase - 0.5) * 22.0, 2.0));
    // Comet streaks: sharp head at 0.5, tail trailing back toward the left.
    float streakPhase = fract(uv.x * 2.6 - uFlow * speed * 1.6 + fi * 0.29);
    float streak = pow(smoothstep(0.15, 0.5, streakPhase), 3.0) * (1.0 - smoothstep(0.5, 0.52, streakPhase));
    float fade = smoothstep(0.0, 0.15, uv.x);
    // Streaks get a tail-free glow; any long falloff times an x-only streak bands vertically.
    float tight = 0.7 * exp(-pow(d / 0.005, 2.0));

    col += c * (core * 0.55 + halo * 0.28) * (0.45 + 2.4 * pulse * fade + 1.8 * near);
    col += c * (core + tight) * streak * fade * uRush * 1.4;
  }

  vec2 node = vec2(1.0, focus);
  float nd = length((uv - node) * vec2(aspect, 1.0));
  col += vec3(0.30, 0.70, 0.95) * (0.012 / (nd + 0.01)) * (0.85 + 0.15 * sin(t * 2.0)) * (1.0 + 2.5 * uRush);

  col *= 1.0 - 0.55 * pow(length((uv - vec2(0.6, 0.5)) * vec2(0.9, 1.1)), 2.2);
  col += (hash(gl_FragCoord.xy + fract(t * 7.0) * 113.0) - 0.5) * 0.025;
  col = 1.0 - exp(-col * 1.35);
  gl_FragColor = vec4(col, 1.0);
}
`;

const STILL_TIME = 14;
const MAX_DPR = 1.25;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Full-bleed WebGL backdrop. Renders only while visible, sleeps in background
 * tabs, draws a single still frame for reduced-motion users, and leaves the
 * CSS gradient underneath showing when WebGL is unavailable.
 */
export function RelayField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', {
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    if (!canvas || !gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uMouse = gl.getUniformLocation(program, 'uMouse');
    const uHover = gl.getUniformLocation(program, 'uHover');
    const uRush = gl.getUniformLocation(program, 'uRush');
    const uFlow = gl.getUniformLocation(program, 'uFlow');

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const hover = { value: 0, target: 0 };
    const rush = { value: 0, target: 0 };
    let frame = 0;
    let visible = true;
    let time = STILL_TIME;
    let flow = STILL_TIME;
    let last = 0;

    const draw = () => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uFlow, flow);
      gl.uniform1f(uRush, rush.value);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uHover, hover.value);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.dataset.ready = 'true';
    };
    const loop = (now: number) => {
      // Clamp so a throttled or resumed tab doesn't lurch forward.
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      rush.value += (rush.target - rush.value) * Math.min(1, dt * 3.5);
      const follow = 1 - Math.exp(-dt * 6);
      mouse.x += (mouse.tx - mouse.x) * follow;
      mouse.y += (mouse.ty - mouse.y) * follow;
      hover.value += (hover.target - hover.value) * (1 - Math.exp(-dt * 3));
      time += dt;
      flow += dt * (1 + rush.value * 6);
      draw();
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (still || frame || !visible || document.hidden) return;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (still || !frame) draw();
    };
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(canvas);
    resize();

    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    viewObserver.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = (event.clientX - rect.left) / rect.width;
      mouse.ty = 1 - (event.clientY - rect.top) / rect.height;
      // Entering fresh: start gathering where the pointer is, not where it left.
      if (hover.value < 0.05) {
        mouse.x = mouse.tx;
        mouse.y = mouse.ty;
      }
      hover.target = 1;
    };
    const onLeave = () => {
      hover.target = 0;
    };
    if (!still) {
      canvas.parentElement?.addEventListener('pointermove', onPointer);
      canvas.parentElement?.addEventListener('pointerleave', onLeave);
    }

    const onRush = () => {
      rush.target = 1;
    };
    // Back-navigation restores the page from bfcache mid-rush.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) rush.target = rush.value = 0;
    };
    if (!still) window.addEventListener(RELAY_RUSH_EVENT, onRush);
    window.addEventListener('pageshow', onPageShow);

    const onLost = (event: Event) => {
      event.preventDefault();
      stop();
      delete canvas.dataset.ready;
    };
    canvas.addEventListener('webglcontextlost', onLost);

    start();

    return () => {
      stop();
      sizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.parentElement?.removeEventListener('pointermove', onPointer);
      canvas.parentElement?.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener(RELAY_RUSH_EVENT, onRush);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return <canvas ref={canvasRef} className={s.field} aria-hidden="true" />;
}
