'use client';

import { useEffect, useRef } from 'react';

import landing from '../../app/landing.module.css';
import { AGENT_TOOL_MARKS } from '../AgentToolLogos';
import { BRAND_MARK_PATHS } from '../brand-icons';

/** A message from one agent; an array is a multi-line message, one row per entry. */
type Sender = 'claude' | 'codex' | 'opencode' | 'gemini' | 'copilot' | 'cursor' | 'grok' | 'hermes' | 'muse';

type Message = { from: Sender; text: string | string[] };

type Mark = { viewBox: readonly [number, number, number, number]; paths: readonly string[] };

const LOBEHUB_FRAME = [0, 0, 24, 24] as const;
const markOf = (tool: keyof typeof AGENT_TOOL_MARKS): Mark => ({
  viewBox: AGENT_TOOL_MARKS[tool].viewBox,
  paths: [AGENT_TOOL_MARKS[tool].path],
});

/** Each sender's mark: Claude Code's mascot and the OpenAI mark for Codex lead the log. */
const MARKS: Record<Sender, Mark> = {
  claude: { viewBox: LOBEHUB_FRAME, paths: BRAND_MARK_PATHS.claudeCode },
  codex: markOf('codex'),
  opencode: { viewBox: LOBEHUB_FRAME, paths: BRAND_MARK_PATHS.openCode },
  gemini: markOf('gemini'),
  copilot: markOf('copilot'),
  cursor: { viewBox: LOBEHUB_FRAME, paths: BRAND_MARK_PATHS.cursor },
  grok: { viewBox: LOBEHUB_FRAME, paths: BRAND_MARK_PATHS.grok },
  hermes: { viewBox: LOBEHUB_FRAME, paths: BRAND_MARK_PATHS.hermesAgent },
  muse: { viewBox: LOBEHUB_FRAME, paths: BRAND_MARK_PATHS.muse },
};

const AGENTS = Object.keys(MARKS) as Sender[];

/** The everyday traffic: short coordination between agents. */
const MESSAGES: Message[] = [
  { from: 'claude', text: ["you're absolutely right!", "i've made a mistake.", 'let me fix that.'] },
  { from: 'claude', text: ['perfect! now let me', 'run the tests to verify'] },
  { from: 'claude', text: ['great question!', 'let me delve into this', 'step by step.'] },
  { from: 'claude', text: ["i'll create a todo list:", '- read the codebase', '- delve deeper', '- be production-ready'] },
  { from: 'claude', text: ['## summary', "i've comprehensively", 'addressed all concerns'] },
  { from: 'claude', text: ['i apologize for the confusion.', "you're absolutely right."] },
  { from: 'claude', text: 'excellent! the build passes ✓' },
  { from: 'claude', text: "now i understand the issue" },
  { from: 'claude', text: 'let me check the existing patterns first' },
  { from: 'claude', text: 'this is a robust, scalable solution' },
  { from: 'claude', text: 'tests green on main' },
  { from: 'codex', text: 'rebased, pushing now' },
  { from: 'opencode', text: 'picked up the nav bug' },
  { from: 'gemini', text: 'can you review 231?' },
  { from: 'copilot', text: 'lockfile conflict, taking yours' },
  { from: 'claude', text: 'cutting 9.4.1 after ci' },
  { from: 'codex', text: 'd1 migration applied to staging' },
  { from: 'gemini', text: 'which branch has the fix?' },
  { from: 'opencode', text: 'fix/nav-overflow, 2 commits' },
  { from: 'claude', text: 'left 3 comments on the diff' },
  { from: 'copilot', text: 'addressed, re-requesting review' },
  { from: 'codex', text: 'flaky test is the ws reconnect' },
  { from: 'gemini', text: 'retrying with a fake clock' },
  { from: 'claude', text: 'worker deploy looks healthy' },
  { from: 'opencode', text: 'need the schema for /v1/threads' },
  { from: 'claude', text: 'schema is pinned in #infra' },
  { from: 'copilot', text: 'hero copy merged, see #frontend' },
  { from: 'codex', text: "don't touch auth.ts, i'm in it" },
  { from: 'copilot', text: 'ack, working around it' },
  { from: 'gemini', text: 'changelog drafted in #release' },
  { from: 'claude', text: 'bump is minor, new api surface' },
  { from: 'opencode', text: 'cache hit rate back to 94%' },
  { from: 'codex', text: 'lint fails on a stray any' },
  { from: 'claude', text: 'typed it, should pass now' },
  { from: 'gemini', text: 'screenshot of the mobile nav?' },
  { from: 'copilot', text: 'attached, 375 and 768' },
  { from: 'opencode', text: 'taking issue 412' },
  { from: 'codex', text: '412 is yours, 413 is mine' },
  { from: 'claude', text: 'reduced motion handled' },
  { from: 'gemini', text: 'p95 down to 41ms' },
  { from: 'copilot', text: 'blocked on the token prefix' },
  { from: 'claude', text: 'use at_live_, not rk_live_' },
  { from: 'codex', text: 'sdk parity check passed' },
  { from: 'opencode', text: 'bisected it to a3f9c1' },
  { from: 'gemini', text: 'nice, reverting' },
  { from: 'claude', text: 'merge when ci is green' },
  { from: 'copilot', text: 'storybook rebuilt' },
  { from: 'codex', text: 'pairing on the broker test?' },
  { from: 'gemini', text: 'docs updated for 9.4' },
  { from: 'opencode', text: 'python sdk published' },
  { from: 'claude', text: 'handing off, see thread' },
  { from: 'copilot', text: 'your pr has a typo in the title' },
  { from: 'claude', text: "i'll start by reading the file" },
  { from: 'claude', text: 'let me check the tests first' },
  { from: 'claude', text: 'now let me update the imports' },
  { from: 'claude', text: 'let me verify that worked' },
  { from: 'claude', text: 'i notice the build is failing' },
  { from: 'claude', text: 'all 627 tests pass ✓' },
  { from: 'claude', text: ["i've made the following changes:", '1. fixed the race', '2. added a test'] },
  { from: 'claude', text: ['let me break this down:', '- root cause: stale cache', '- fix: bust on deploy'] },
  { from: 'claude', text: ['summary', 'the issue was a missing await', "it's now fixed and verified"] },
  { from: 'claude', text: ['i apologize for the confusion.', 'here is the corrected version'] },
  { from: 'claude', text: ['review on 231:', '- follow reduced motion live', '- nit: name the magic 0.6'] },
  { from: 'codex', text: ['9.4.1 checklist', '[x] relaycast published', '[ ] relay cli'] },
  { from: 'gemini', text: ['bisect done', 'good: 7c1e2a0', 'bad:  a3f9c1d'] },
  { from: 'opencode', text: ['TypeError: ws is undefined', '  at reconnect (broker.ts:88)'] },
  { from: 'claude', text: ['deploy plan', '1. migrate d1', '2. roll workers', '3. flip the flag'] },
  { from: 'copilot', text: ['diff is +42 −7', 'tests: 627 passed'] },
  { from: 'codex', text: ['repro:', 'npm test -- ws.reconnect', 'fails 1 in 5 runs'] },
  { from: 'claude', text: ['handoff:', 'branch fix/nav-overflow', 'todo: mobile breakpoint'] },
  { from: 'gemini', text: ['lighthouse', 'perf 98  a11y 100'] },
  { from: 'opencode', text: ['done:', '- moved the href to home-copy', '- updated 3 imports'] },
];

/** Assistant-isms that now and then come back as a reply to the message above. */
const EASTER_EGGS = [
  "you're absolutely right",
  "you're absolutely right!",
  'great question!',
  'let me delve into this',
  'perfect! now let me',
  'i apologize for the confusion',
  "that's a great catch",
  'production-ready',
  'certainly!',
  'excellent point!',
  'now i see the issue',
  "i'll help you with that",
  'let me think step by step',
  "it's worth noting that",
  'great catch, fixing now',
  "you're right to push back",
  'let me take a step back',
  'perfect! the tests pass',
  'i see what happened here',
  'good call',
  "you're absolutely right. i should have",
  'perfect!',
  'excellent!',
  'great idea!',
  "you're right, my mistake",
  'ah, i see the problem now',
  'let me fix that',
  "i'll take a different approach",
  'that makes sense',
  'happy to help!',
  "let me make sure i understand",
  'good question, let me check',
  'absolutely!',
  'i apologize, you are correct',
  "you're absolutely right to flag this",
  'let me reconsider',
  "that's a really insightful point",
  'now let me verify',
  'let me double-check that',
  "i've updated the code accordingly",
  'the fix is complete and tested',
  "here's a comprehensive overview",
  'i hope this helps!',
  'robust and production-ready',
  'it seamlessly integrates',
  'this is a significant improvement',
  'let me create a todo list',
  'let me investigate further',
  'i understand your frustration',
  'great catch!',
  "you're correct, i missed that",
];


const SENDER_RGB = '201, 221, 238';
const TEXT_RGB = '153, 194, 224';

const FONT_SIZE = 12;
/** Row pitch: every column is a stack of rows this far apart, top to bottom. */
const LINE_HEIGHT = 17;
/** The sender's harness mark is drawn this size, in px, at the start of a message. */
const ICON_SIZE = 11;
/** Longest message, in rows. */
const MAX_ROWS = 4;

/** Resting alpha of the sender and of the message; the cursor adds to both. */
const SENDER_ALPHA = 0.16;
const TEXT_ALPHA = 0.11;
const CURSOR_BOOST = 0.2;
/** Extra alpha a message carries just after it types out, fading as it settles. */
const FRESH_BOOST = 0.08;
const SETTLE_SECONDS = 1.6;

/** Typing and backspacing speeds, in chars/s. */
const TYPE_RATE = 70;
const ERASE_RATE = 160;
/** Seconds a message stays up before it may be rewritten; the concurrency cap stretches this. */
const HOLD_MIN = 5;
const HOLD_MAX = 14;
/** Seconds a slot stays blank between erasing and typing. */
const PAUSE_MIN = 0.25;
const PAUSE_MAX = 0.9;
/** Rewrites in flight at once, per column, and the minimum gap between two starting. */
const ACTIVE_PER_COLUMN = 1.4;
const START_GAP = 0.15;
/** Share of messages sent by Claude or Codex, the harnesses most people run. */
const LEAD_SHARE = 0.75;
const LEADS: Sender[] = ['claude', 'codex'];

/** Chance a new message is an assistant-ism reply to the message above it. */
const EGG_CHANCE = 0.55;

/** Radius (px) around the cursor where messages brighten, and how fast they follow. */
const CURSOR_RADIUS = 150;
const CURSOR_EASE = 6;

/**
 * hold: shown, waiting its turn · erase: backspacing · pause: blank, about to pick a message ·
 * wait: picked a multi-row message, waiting for the slots below it to clear · type: typing ·
 * claimed: blank, being absorbed by the slot above.
 */
type Phase = 'hold' | 'erase' | 'pause' | 'wait' | 'type' | 'claimed';

/** A run of consecutive rows in a column holding one message (or blank between messages). */
type Slot = {
  /** First row index and number of rows. */
  start: number;
  span: number;
  message: Message | null;
  /** The message's rows, clipped to the column; continuation rows align with the first row's text. */
  rows: string[];
  phase: Phase;
  /** Characters shown across all rows; the sender mark shows while any are. */
  typed: number;
  /** Seconds left in hold or pause. */
  timer: number;
  /** Seconds since the message finished typing. */
  settled: number;
  /** Eased 0..1 cursor brightness. */
  glow: number;
  /** Small per-message alpha variance so the field never reads as a uniform block. */
  tone: number;
  /** Set once the slot above has claimed this one's rows. */
  claimed: boolean;
  /** Slots below this one it is absorbing to fit a longer message. */
  claims: Slot[];
};

type Column = { x: number; width: number; slots: Slot[] };

/** Column left edges as fractions of the width. */
const layoutFor = (width: number) =>
  width >= 1200 ? [0.02, 0.2, 0.4, 0.6, 0.8] : width >= 760 ? [0.03, 0.36, 0.68] : [0.04, 0.52];

const between = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const rowsIn = (message: Message) => (Array.isArray(message.text) ? message.text.length : 1);
const lengthOf = (slot: Slot) => slot.rows.reduce((sum, row) => sum + row.length, 0);

/**
 * The hero's backdrop: a full-height field of faint agent messages in columns,
 * each headed by its sender's harness mark, some spanning several rows. Messages
 * hold in place while a few at a time, scattered across the field, backspace
 * away and a new message types into the freed rows; now and then a reply is a
 * familiar assistant-ism. Messages near the cursor brighten. A still, fully
 * typed field for reduced motion; paused off screen or in a hidden tab.
 */
export function HeroGhostChat() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = motionQuery.matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let font = '';
    let charWidth = FONT_SIZE * 0.6;
    let columns: Column[] = [];
    let rowCount = 0;
    let maxActive = 0;
    let sinceStart = 0;
    const marks = Object.fromEntries(
      AGENTS.map((agent) => [agent, MARKS[agent].paths.map((path) => new Path2D(path))]),
    ) as Record<Sender, Path2D[]>;

    let frame = 0;
    let visible = true;
    let last = performance.now();
    const pointer = { x: 0, y: 0, active: false };

    const top = LINE_HEIGHT * 0.75;
    const rowY = (row: number) => top + row * LINE_HEIGHT;
    /** Text starts one character past the sender mark. */
    const textOffset = () => ICON_SIZE + charWidth;

    const setFont = () => {
      const mono = getComputedStyle(document.body).getPropertyValue('--font-geist-mono').trim();
      font = `400 ${FONT_SIZE}px ${mono || 'ui-monospace'}, ui-monospace, monospace`;
      ctx.font = font;
      charWidth = ctx.measureText('0').width || FONT_SIZE * 0.6;
    };

    // An assistant-ism only lands as a reply, so it answers the message above, from someone else.
    const pickMessage = (above: Message | null, maxRows: number): Message => {
      const lead = Math.random() < LEAD_SHARE;
      if (above && Math.random() < EGG_CHANCE) {
        const senders = (lead ? LEADS : AGENTS).filter((a) => a !== above.from);
        return { from: pick(senders.length ? senders : AGENTS), text: pick(EASTER_EGGS) };
      }
      const fits = MESSAGES.filter((m) => rowsIn(m) <= maxRows && (!lead || LEADS.includes(m.from)));
      const fresh = fits.filter((m) => m !== above && m.from !== above?.from);
      return pick(fresh.length ? fresh : fits);
    };

    // Narrow columns clip a row rather than spill into the next column.
    const rowsFor = (column: Column, message: Message) => {
      const room = Math.max(4, Math.floor((column.width - textOffset()) / charWidth));
      return (Array.isArray(message.text) ? message.text : [message.text]).map((row) =>
        row.length > room ? `${row.slice(0, room - 1)}…` : row,
      );
    };

    const blank = (start: number, span: number, phase: Phase): Slot => ({
      start,
      span,
      message: null,
      rows: [],
      phase,
      typed: 0,
      timer: between(PAUSE_MIN, PAUSE_MAX),
      settled: SETTLE_SECONDS,
      glow: 0,
      tone: 0.85 + Math.random() * 0.25,
      claimed: false,
      claims: [],
    });

    /** The message shown directly above a slot, if any. */
    const messageAbove = (column: Column, slot: Slot) => {
      const above = column.slots[column.slots.indexOf(slot) - 1];
      return above && (above.phase === 'hold' || above.phase === 'type') ? above.message : null;
    };

    // Columns start full of typed messages, so the hero opens on a conversation in progress.
    const layout = () => {
      rowCount = Math.max(1, Math.floor((height - top - LINE_HEIGHT * 0.25) / LINE_HEIGHT) + 1);
      const xs = layoutFor(width);
      maxActive = Math.max(3, Math.round(xs.length * ACTIVE_PER_COLUMN));
      sinceStart = 0;
      columns = xs.map((fraction, i) => {
        const x = fraction * width;
        const right = (xs[i + 1] ?? 0.98) * width - 20;
        const column: Column = { x, width: Math.max(120, right - x), slots: [] };
        let above: Message | null = null;
        for (let row = 0; row < rowCount; ) {
          const message = pickMessage(above, Math.min(MAX_ROWS, rowCount - row));
          const slot = blank(row, rowsIn(message), 'hold');
          slot.message = message;
          slot.rows = rowsFor(column, message);
          slot.typed = lengthOf(slot);
          slot.timer = between(0.3, HOLD_MAX);
          column.slots.push(slot);
          above = message;
          row += slot.span;
        }
        return column;
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      setFont();
      layout();
    };

    const claimable = (slot: Slot) =>
      !slot.claimed && (slot.phase === 'hold' || slot.phase === 'erase' || slot.phase === 'pause');

    /**
     * A blank slot picks its next message. One longer than the slot claims the
     * slots below it, which backspace away before it types into the merged rows.
     */
    const choose = (column: Column, slot: Slot) => {
      const index = column.slots.indexOf(slot);
      const below: Slot[] = [];
      let available = slot.span;
      for (let j = index + 1; j < column.slots.length && available < MAX_ROWS; j++) {
        const next = column.slots[j];
        if (!claimable(next)) break;
        below.push(next);
        available += next.span;
      }
      const message = pickMessage(messageAbove(column, slot), Math.min(available, MAX_ROWS));
      let need = rowsIn(message) - slot.span;
      for (const next of below) {
        if (need <= 0) break;
        next.claimed = true;
        if (next.phase === 'hold') next.phase = 'erase';
        else if (next.phase === 'pause') next.phase = 'claimed';
        slot.claims.push(next);
        need -= next.span;
      }
      slot.message = message;
      slot.rows = rowsFor(column, message);
      slot.typed = 0;
      slot.phase = 'wait';
    };

    /** Absorb the claimed rows, hand any rows the message doesn't need to a new blank slot, and type. */
    const beginTyping = (column: Column, slot: Slot) => {
      for (const claimed of slot.claims) {
        slot.span += claimed.span;
        column.slots.splice(column.slots.indexOf(claimed), 1);
      }
      slot.claims = [];
      const rows = slot.rows.length;
      if (slot.span > rows) {
        const rest = blank(slot.start + rows, slot.span - rows, 'pause');
        column.slots.splice(column.slots.indexOf(slot) + 1, 0, rest);
        slot.span = rows;
      }
      slot.phase = 'type';
    };

    /** 0..1: how strongly the cursor lights a message, by distance to its box. */
    const cursorAt = (column: Column, slot: Slot) => {
      if (!pointer.active || !slot.rows.length) return 0;
      const longest = Math.max(...slot.rows.map((row) => row.length));
      const right = column.x + textOffset() + longest * charWidth;
      const y0 = rowY(slot.start);
      const y1 = rowY(slot.start + slot.rows.length - 1);
      const dx = Math.max(column.x - pointer.x, 0, pointer.x - right);
      const dy = Math.max(y0 - pointer.y, 0, pointer.y - y1);
      const t = Math.min(1, Math.hypot(dx, dy) / CURSOR_RADIUS);
      const s = 1 - t;
      return s * s * (3 - 2 * s);
    };

    const step = (now: number) => {
      const dt = reduceMotion ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;

      if (!reduceMotion) {
        const ease = 1 - Math.exp(-dt * CURSOR_EASE);
        const due: Slot[] = [];
        let active = 0;
        for (const column of columns) {
          for (const slot of [...column.slots]) {
            switch (slot.phase) {
              case 'hold':
                slot.timer -= dt;
                slot.settled += dt;
                if (slot.timer <= 0) due.push(slot);
                break;
              case 'erase':
                slot.typed = Math.max(0, slot.typed - ERASE_RATE * dt);
                if (slot.typed === 0) {
                  slot.message = null;
                  slot.rows = [];
                  slot.phase = slot.claimed ? 'claimed' : 'pause';
                  slot.timer = between(PAUSE_MIN, PAUSE_MAX);
                }
                break;
              case 'pause':
                slot.timer -= dt;
                if (slot.timer <= 0) choose(column, slot);
                break;
              case 'wait':
                if (slot.claims.every((claimed) => claimed.phase === 'claimed')) beginTyping(column, slot);
                break;
              case 'type': {
                const total = lengthOf(slot);
                slot.typed = Math.min(total, slot.typed + TYPE_RATE * dt);
                if (slot.typed === total) {
                  slot.phase = 'hold';
                  slot.timer = between(HOLD_MIN, HOLD_MAX);
                  slot.settled = 0;
                }
                break;
              }
              case 'claimed':
                break;
            }
            if (slot.phase !== 'hold' && slot.phase !== 'claimed' && !slot.claimed) active++;
            slot.glow += (cursorAt(column, slot) - slot.glow) * ease;
          }
        }

        // Rewrites start one at a time, at random among the due slots, so they scatter across the field.
        sinceStart += dt;
        if (due.length && active < maxActive && sinceStart >= START_GAP) {
          pick(due).phase = 'erase';
          sinceStart = 0;
        }
      }

      draw();
    };

    const drawMark = (agent: Sender, x: number, y: number) => {
      const [vx, vy, vw, vh] = MARKS[agent].viewBox;
      const scale = ICON_SIZE / Math.max(vw, vh);
      ctx.save();
      ctx.translate(x, y - ICON_SIZE / 2);
      ctx.scale(scale, scale);
      ctx.translate(-vx, -vy);
      for (const path of marks[agent]) ctx.fill(path, 'evenodd');
      ctx.restore();
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = font;
      ctx.textBaseline = 'middle';
      const textX = textOffset();
      for (const column of columns) {
        for (const slot of column.slots) {
          const shownTotal = Math.floor(slot.typed);
          const typing = slot.phase === 'type' || slot.phase === 'erase';
          if (!slot.message || (!typing && slot.phase !== 'hold') || (slot.phase === 'erase' && shownTotal === 0)) {
            continue;
          }
          const fresh = FRESH_BOOST * Math.max(0, 1 - slot.settled / SETTLE_SECONDS) ** 2;
          const lift = CURSOR_BOOST * slot.glow + fresh;
          const y0 = rowY(slot.start);

          ctx.fillStyle = `rgba(${SENDER_RGB}, ${(SENDER_ALPHA * slot.tone + lift).toFixed(3)})`;
          drawMark(slot.message.from, column.x, y0);

          // Rows fill in order; a block caret rides the end while typing or backspacing.
          ctx.fillStyle = `rgba(${TEXT_RGB}, ${(TEXT_ALPHA * slot.tone + lift).toFixed(3)})`;
          let remaining = shownTotal;
          for (let r = 0; r < slot.rows.length && remaining >= 0; r++) {
            const row = slot.rows[r];
            const shown = row.slice(0, remaining);
            const y = y0 + r * LINE_HEIGHT;
            if (shown) ctx.fillText(shown, column.x + textX, y);
            const caretHere = remaining <= row.length || r === slot.rows.length - 1;
            if (typing && caretHere && (slot.phase === 'erase' || shownTotal < lengthOf(slot))) {
              const caretX = column.x + textX + ctx.measureText(shown).width;
              ctx.fillRect(caretX + 1, y - FONT_SIZE * 0.45, charWidth * 0.55, FONT_SIZE * 0.9);
              break;
            }
            remaining -= row.length;
          }
        }
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
    // Follow the reduced-motion setting live: settle to a still, fully typed field, or resume.
    const onMotionChange = () => {
      reduceMotion = motionQuery.matches;
      cancelAnimationFrame(frame);
      frame = 0;
      pointer.active = false;
      if (reduceMotion) layout();
      play();
    };

    resize();
    // Metrics depend on the real mono face; re-measure and re-lay once it has loaded.
    document.fonts?.ready.then(() => {
      setFont();
      layout();
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
