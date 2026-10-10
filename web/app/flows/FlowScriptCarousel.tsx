'use client';

import { useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import s from './flows.module.css';

type Example = {
  id: string;
  label: string;
  title: string;
  description: string;
  filename: string;
  codeHtml: string;
};

export function FlowScriptCarousel({ examples, introductoryCode }: {
  examples: Example[];
  introductoryCode: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const id = useId();
  const example = examples[active];

  return (
    <div className={`${s.codeSection} ${s.scriptCarousel}`} role="region" aria-roledescription="carousel" aria-label="Example Flow scripts">
      <div className={s.codeCopy}>
        <div id={`${id}-explanation`} className={s.selectedExplanation}>
          <h2>{active === 0 ? 'A Flow is a script that runs your agents.' : example.title}</h2>
          <p>
            {active === 0
              ? 'You write the steps in TypeScript: which agent does the work, what it should produce, and what to check before continuing.'
              : example.description}
          </p>
          <p>
            When the flow runs, you&apos;ve got a dependable, auditable script that babysits your agents for you.
          </p>
        </div>

        <Link href="/docs/relayflows" className={s.textLink}>
          Explore the docs <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <div id={`${id}-script`} className={s.codeBlock} role="group" aria-label={`${example.label} script`}>
        <div className={s.codeHeader}>
          <div className={s.codeChrome} aria-hidden="true"><span /><span /><span /></div>
          <span>{example.filename}</span>
        </div>
        <div className={s.scriptViewport}>
          <div className={s.scriptSizeReference} aria-hidden="true">{introductoryCode}</div>
          <div key={example.id} className={s.scriptScroll} tabIndex={0} role="region" aria-label={`${example.label} TypeScript example`}>

          {active === 0 ? introductoryCode : (
            <pre
              className={`${s.codePre} ${s.carouselCode}`}
              aria-label={`${example.label} TypeScript example`}
            >
              <code dangerouslySetInnerHTML={{ __html: example.codeHtml }} />
            </pre>
          )}
          </div>
        </div>
      </div>
      <div className={s.useCasePicker}>
        <p id={`${id}-picker-label`} className={s.useCaseLabel}>Explore use cases</p>
        <span className={s.visuallyHidden} aria-live="polite" aria-atomic="true">{example.label}</span>
        <div className={s.useCaseGrid} role="group" aria-labelledby={`${id}-picker-label`}>
          {examples.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={s.useCaseOption}
              aria-pressed={active === index}
              aria-controls={`${id}-explanation ${id}-script`}
              onClick={() => setActive(index)}
            >
              <span className={s.useCaseNumber}>{String(index + 1).padStart(2, '0')}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
