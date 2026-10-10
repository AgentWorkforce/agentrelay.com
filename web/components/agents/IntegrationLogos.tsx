import { INTEGRATION_LABELS, integrationLogo, type Integration } from '../../lib/agents';

/**
 * Provider logos for an agent.
 *
 * Bare (gallery rows): just the marks, for density.
 * `withLabel` (detail page): mark + provider name, where there's room to spell
 * it out. Providers Nango has no logo for fall back to a text-only chip so the
 * set still reads correctly either way.
 *
 * Plain <img> (not next/image) to match AgentArt — the SST/OpenNext optimizer
 * 500s without sharp.
 */
export function IntegrationLogos({
  integrations,
  withLabel = false,
  className,
  chipClassName,
  logoClassName,
}: {
  integrations: Integration[];
  /** Render the provider name next to its mark. */
  withLabel?: boolean;
  className?: string;
  /** Text-only chip: the labeled variant, and the no-logo fallback. */
  chipClassName?: string;
  logoClassName?: string;
}) {
  return (
    <span className={className}>
      {integrations.map((integration) => {
        const label = INTEGRATION_LABELS[integration];
        const src = integrationLogo(integration);

        if (withLabel) {
          return (
            <span key={integration} className={chipClassName}>
              {src ? <img src={src} alt="" aria-hidden="true" loading="lazy" className={logoClassName} /> : null}
              {label}
            </span>
          );
        }

        return src ? (
          <img
            key={integration}
            src={src}
            alt={label}
            title={label}
            loading="lazy"
            className={logoClassName}
          />
        ) : (
          <span key={integration} className={chipClassName} title={label}>
            {label}
          </span>
        );
      })}
    </span>
  );
}
