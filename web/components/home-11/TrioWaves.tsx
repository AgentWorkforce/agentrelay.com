import s from './trio-waves.module.css';

/**
 * The homepage's wave dividers, stretched behind the three side-by-side
 * sections: one bundle sweeps through each gap between them.
 */
export function TrioWaves() {
  return (
    <svg className={s.waves} viewBox="0 0 1200 1600" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <g className={s.bundle}>
        <path d="M-120 560 C120 470 318 480 560 530 S928 600 1320 430" />
        <path d="M-120 600 C136 510 336 524 580 570 S948 636 1320 470" />
        <path d="M-120 520 C112 432 310 440 540 490 S902 560 1320 394" />
      </g>
      <g className={s.bundle}>
        <path d="M-120 1010 C140 1110 360 1100 600 1050 S960 960 1320 1080" />
        <path d="M-120 1050 C156 1150 376 1144 620 1090 S980 996 1320 1120" />
        <path d="M-120 970 C124 1070 344 1060 580 1012 S940 924 1320 1040" />
      </g>
    </svg>
  );
}
