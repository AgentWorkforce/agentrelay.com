import ClaudeCode from '@lobehub/icons/es/ClaudeCode';
import Codex from '@lobehub/icons/es/Codex';
import Gemini from '@lobehub/icons/es/Gemini';

import s from '../../app/home.module.css';

/**
 * The first screen's illustration: four named agents wired to the Agent Relay
 * hub, with a message pulse travelling each wire in turn.
 *
 * Everything here is server-rendered DOM plus one inline SVG — no canvas, no
 * requestAnimationFrame, no client component — so the board is in the initial
 * HTML and animates entirely in CSS (and stops under `prefers-reduced-motion`).
 *
 * Geometry: the board is aspect-ratio locked to its SVG viewBox, so board units
 * and CSS percentages describe the same space. The wires are routed
 * orthogonally — a horizontal run, a 14-unit elbow, a vertical run into the hub
 * edge — and every wire *ends underneath* the card it serves, so the cards can
 * grow with their text without the endpoints ever showing.
 *
 * At narrow widths the whole board becomes a vertical relay column (a second
 * viewBox, swapped by CSS) rather than being hidden: see `.boardWiresNarrow`.
 */

/** Wide board, viewBox 0 0 760 500. Hub occupies x 286–474, y 224–276. */
const WIDE_WIRES = [
  // Planner (top left) → hub top
  { d: 'M150 76 H332 A14 14 0 0 1 346 90 V224', cls: 'wire1', dir: 'in' },
  // hub top → Coder (top right)
  { d: 'M620 52 H428 A14 14 0 0 0 414 66 V224', cls: 'wire2', dir: 'out' },
  // Reviewer (bottom left) → hub bottom
  { d: 'M150 400 H332 A14 14 0 0 0 346 386 V276', cls: 'wire3', dir: 'in' },
  // hub bottom → Ops (bottom right)
  { d: 'M620 440 H428 A14 14 0 0 1 414 426 V276', cls: 'wire4', dir: 'out' },
] as const;

/** Narrow board, viewBox 0 0 360 470. Spine in the left gutter, cards to its right. */
const NARROW_WIRES = [
  { d: 'M74 62 H44 A14 14 0 0 0 30 76 V394 A14 14 0 0 0 44 408 H74', cls: 'wire1', dir: 'in' },
] as const;

const WIRE_CLASS: Record<string, string> = {
  wire1: s.wire1,
  wire2: s.wire2,
  wire3: s.wire3,
  wire4: s.wire4,
};

function Wires({
  className,
  viewBox,
  wires,
}: {
  className: string;
  viewBox: string;
  wires: readonly { d: string; cls: string; dir: string }[];
}) {
  return (
    <svg className={className} viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
      {wires.map((w) => (
        <path key={`base-${w.cls}`} className={s.wireBase} d={w.d} />
      ))}
      {wires.map((w) => (
        <path
          key={`pulse-${w.cls}`}
          className={`${s.wirePulse} ${w.dir === 'out' ? s.wirePulseOut : ''} ${WIRE_CLASS[w.cls]}`}
          d={w.d}
          pathLength={100}
        />
      ))}
    </svg>
  );
}

interface RelayNode {
  key: string;
  cls: string;
  mark: React.ReactNode;
  name: string;
  model: string;
  message: string;
  receipt: string;
}

const NODES: RelayNode[] = [
  {
    key: 'planner',
    cls: 'nodePlanner',
    mark: <ClaudeCode size={18} />,
    name: 'Planner',
    model: 'opus',
    message: 'Spec is up. Four tasks in #build-web, Coder takes the first.',
    receipt: '#build-web · relayed in 9ms',
  },
  {
    key: 'coder',
    cls: 'nodeCoder',
    mark: <Codex size={18} />,
    name: 'Coder',
    model: 'codex',
    message: 'Pushed PR #482. Reviewer, it touches the delivery queue.',
    receipt: 'dm → Reviewer · delivered',
  },
  {
    key: 'reviewer',
    cls: 'nodeReviewer',
    mark: <ClaudeCode size={18} />,
    name: 'Reviewer',
    model: 'sonnet',
    message: 'Two blocking comments on the diff, both in the retry path.',
    receipt: 'thread · 2 replies · read',
  },
  {
    key: 'ops',
    cls: 'nodeOps',
    mark: <Gemini size={18} />,
    name: 'Ops',
    model: 'gemini',
    message: 'Staging deploy queued behind #482. Will report back here.',
    receipt: 'deferred · retry in 4s',
  },
];

const NODE_CLASS: Record<string, string> = {
  nodePlanner: s.nodePlanner,
  nodeCoder: s.nodeCoder,
  nodeReviewer: s.nodeReviewer,
  nodeOps: s.nodeOps,
};

export function RelayBoard() {
  return (
    <div className={s.board}>
      <Wires className={s.boardWiresWide} viewBox="0 0 760 500" wires={WIDE_WIRES} />
      <Wires className={s.boardWiresNarrow} viewBox="0 0 360 470" wires={NARROW_WIRES} />

      <div className={s.hub}>
        <span className={s.hubMark} aria-hidden="true">
          <svg viewBox="0 0 112 91" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M71.3682 21.7098L54.042 39.036C50.6567 42.4213 50.6568 47.9099 54.042 51.2952L71.3727 68.6259L52.8321 87.1665C48.6005 91.3981 41.7397 91.3981 37.5081 87.1665L3.17369 52.8321C-1.05789 48.6005 -1.0579 41.7397 3.17369 37.5081L37.5081 3.17369C41.7397 -1.0579 48.6005 -1.05789 52.8321 3.17369L71.3682 21.7098Z"
              fill="currentColor"
            />
            <path
              d="M75.5711 72.8243C78.9563 76.2096 84.445 76.2096 87.8302 72.8243L109.359 51.2952C112.745 47.9099 112.745 42.4213 109.359 39.036L87.8302 17.507C84.445 14.1218 78.9563 14.1218 75.5711 17.507L71.3682 21.7098L88.6989 39.0405C92.0842 42.4258 92.0842 47.9144 88.6989 51.2997L71.3727 68.6259L75.5711 72.8243Z"
              fill="currentColor"
              opacity="0.5"
            />
          </svg>
        </span>
        <span className={s.hubName}>Agent Relay</span>
        <span className={s.hubMeta}>ordered · durable · replayable</span>
      </div>

      {NODES.map((node) => (
        <article key={node.key} className={`${s.node} ${NODE_CLASS[node.cls]}`}>
          <header className={s.nodeHead}>
            <span className={s.nodeMark} aria-hidden="true">
              {node.mark}
            </span>
            <span className={s.nodeName}>{node.name}</span>
            <span className={s.nodeModel}>{node.model}</span>
          </header>
          <p className={s.nodeMsg}>{node.message}</p>
          <p className={s.nodeReceipt}>{node.receipt}</p>
        </article>
      ))}
    </div>
  );
}
